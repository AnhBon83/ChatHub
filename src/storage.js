// Quản lý dung lượng lưu trữ của từng tài khoản.
//
// Mỗi tài khoản có một thư mục riêng: <dữ liệu app>/Partitions/acct-<id>/
// Trình duyệt bên trong không lưu file kèm đuôi .jpg/.mp4, nên ta nhận dạng loại file bằng
// "chữ ký" ở vài byte đầu (ảnh JPEG bắt đầu bằng FF D8 FF, PDF bắt đầu bằng %PDF...) và
// đuôi của địa chỉ URL (nếu bộ nhớ đệm có lưu URL).
//
// Chỉ các file trong BỘ NHỚ ĐỆM (cache) mới được xóa theo từng loại: xóa xong, ảnh/video vẫn xem
// lại được vì trang sẽ tải lại từ máy chủ. Dữ liệu đăng nhập & dữ liệu trang (cookie, IndexedDB,
// Local Storage...) KHÔNG xóa lẻ từng file vì sẽ làm hỏng trang — chỉ xóa nguyên khối bằng API
// chính thức của Electron.

const fs = require('node:fs');
const fsp = require('node:fs/promises');
const path = require('node:path');

const CATEGORIES = ['image', 'video', 'audio', 'document', 'web', 'data', 'other'];

// Thư mục bộ nhớ đệm an toàn để xóa từng file (tính từ thư mục của tài khoản)
const CACHE_DIRS = [
  ['Cache'],
  ['Code Cache'],
  ['Service Worker', 'CacheStorage'],
  ['Service Worker', 'ScriptCache']
];
// Thư mục chứa nội dung có thể nhận dạng loại (nhưng không xóa lẻ)
const SNIFF_ONLY_DIRS = [['IndexedDB'], ['File System'], ['blob_storage']];

const SIMPLE_CACHE_MAGIC = Buffer.from([0x30, 0x5c, 0x72, 0xa7, 0x1b, 0x6d, 0xfb, 0xfc]);
const HEAD_BYTES = 8192;

const EXT = {
  image: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'avif', 'heic', 'bmp', 'ico', 'svg', 'tif', 'tiff'],
  video: ['mp4', 'm4v', 'mov', 'webm', 'mkv', 'avi', 'flv', '3gp', 'ts', 'm3u8'],
  audio: ['mp3', 'm4a', 'aac', 'ogg', 'oga', 'opus', 'wav', 'flac', 'amr', 'weba'],
  document: ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'zip', 'rar', '7z', 'txt', 'csv', 'rtf', 'odt', 'ods'],
  web: ['js', 'mjs', 'css', 'html', 'htm', 'json', 'wasm', 'woff', 'woff2', 'ttf', 'otf', 'map']
};
const EXT_TO_CAT = Object.fromEntries(Object.entries(EXT).flatMap(([cat, list]) => list.map((e) => [e, cat])));

function within(child, parent) {
  const rel = path.relative(parent, child);
  return rel && !rel.startsWith('..') && !path.isAbsolute(rel);
}

// Nhận dạng loại nội dung từ các byte đầu
function sniff(b) {
  if (!b || b.length < 4) return null;
  const s = (start, str) => b.length >= start + str.length && b.toString('latin1', start, start + str.length) === str;
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return 'image';
  if (s(0, '\x89PNG') || s(0, 'GIF87a') || s(0, 'GIF89a') || s(0, 'BM') && b.length > 14 && b[14] < 200) return 'image';
  if (s(0, 'RIFF') && s(8, 'WEBP')) return 'image';
  if (s(0, '\x00\x00\x01\x00') || s(0, '<svg') || s(0, '<?xml') && b.toString('latin1', 0, 300).includes('<svg')) return 'image';
  if (s(4, 'ftyp')) {
    const brand = b.toString('latin1', 8, 12);
    if (/^(avif|avis|heic|heix|mif1|msf1)/.test(brand)) return 'image';
    if (/^(M4A |M4B )/.test(brand)) return 'audio';
    return 'video';
  }
  if (b[0] === 0x1a && b[1] === 0x45 && b[2] === 0xdf && b[3] === 0xa3) return 'video'; // webm / mkv
  if (s(0, 'FLV') || s(0, 'RIFF') && s(8, 'AVI ')) return 'video';
  if (s(0, 'ID3') || s(0, 'OggS') || s(0, 'fLaC') || s(0, '#!AMR') || s(0, 'RIFF') && s(8, 'WAVE')) return 'audio';
  if (b[0] === 0xff && (b[1] & 0xe0) === 0xe0 && (b[1] & 0x06) !== 0) return 'audio'; // khung MP3 / AAC
  if (s(0, '%PDF') || s(0, 'PK\x03\x04') || s(0, 'Rar!') || s(0, '7z\xbc\xaf') || s(0, '{\\rtf')) return 'document';
  if (b[0] === 0xd0 && b[1] === 0xcf && b[2] === 0x11 && b[3] === 0xe0) return 'document'; // Word/Excel cũ
  if (s(0, '\x00asm') || s(0, 'wOFF') || s(0, 'wOF2') || s(0, 'OTTO')) return 'web';
  return null;
}

function categoryFromUrl(url) {
  if (!url) return null;
  try {
    const ext = path.extname(new URL(url).pathname).slice(1).toLowerCase();
    return EXT_TO_CAT[ext] || null;
  } catch { return null; }
}

// Đọc 1 file bộ nhớ đệm, trả về loại nội dung
async function classifyFile(file, size, location) {
  if (location === 'code') return 'web';
  if (size === 0) return 'other';
  let head;
  try {
    const fh = await fsp.open(file, 'r');
    try {
      head = Buffer.alloc(Math.min(size, HEAD_BYTES));
      await fh.read(head, 0, head.length, 0);
    } finally { await fh.close(); }
  } catch { return 'other'; }

  let body = head;
  let url = null;
  // Định dạng "simple cache" của Chromium:
  //   [magic 8][version 4][độ dài key 4][hash 4][đệm 4 (từ version 5)][key = URL][nội dung]
  if (head.length > 24 && head.subarray(0, 8).equals(SIMPLE_CACHE_MAGIC)) {
    const version = head.readUInt32LE(8);
    const keyLen = head.readUInt32LE(12);
    const keyStart = version >= 5 ? 24 : 20;
    if (keyLen > 0 && keyStart + keyLen <= head.length) {
      const key = head.toString('utf8', keyStart, keyStart + keyLen);
      url = key.split(' ').pop().replace(/^\d+\/\d+\/(_dk_)?/, '');
      body = head.subarray(keyStart + keyLen);
    } else {
      body = Buffer.alloc(0);
    }
  }
  return sniff(body) || categoryFromUrl(url) || 'other';
}

// Duyệt đệ quy một thư mục, gọi onFile(fullPath, size)
async function walk(dir, onFile) {
  let entries;
  try { entries = await fsp.readdir(dir, { withFileTypes: true }); } catch { return; }
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) await walk(full, onFile);
    else if (e.isFile()) {
      try { const st = await fsp.stat(full); await onFile(full, st.size); } catch {}
    }
  }
}

function emptyReport() {
  return Object.fromEntries(CATEGORIES.map((c) => [c, { size: 0, count: 0, deletable: 0 }]));
}

function locationOf(rel) {
  const parts = rel.split(path.sep);
  const match = (list) => list.some((p) => p.every((seg, i) => parts[i] === seg));
  if (match([['Code Cache']])) return 'code';
  if (match(CACHE_DIRS)) return 'cache';
  if (match(SNIFF_ONLY_DIRS)) return parts[0] === 'IndexedDB' && !parts.some((p) => p.endsWith('.blob')) ? 'data' : 'sniff';
  return 'data';
}

// Chạy các tác vụ với số lượng song song giới hạn
async function pool(items, limit, fn) {
  let i = 0;
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (i < items.length) { const item = items[i++]; await fn(item); }
  }));
}

// Quét 1 thư mục tài khoản. Trả về { total, cats: {image:{size,count,deletable}, ...} }
async function scanDir(root, { collect } = {}) {
  const files = [];
  await walk(root, async (full, size) => files.push({ full, size, rel: path.relative(root, full) }));
  const cats = emptyReport();
  let total = 0;
  const deletableFiles = [];
  await pool(files, 32, async (f) => {
    const loc = locationOf(f.rel);
    const cat = loc === 'data' ? 'data' : await classifyFile(f.full, f.size, loc);
    total += f.size;
    cats[cat].size += f.size;
    cats[cat].count += 1;
    // Không xóa file chỉ mục/quản lý của bộ nhớ đệm, chỉ xóa file chứa nội dung
    const isIndex = /^(index|index-dir|the-real-index|data_\d+|LOCK|LOG|MANIFEST.*|CURRENT|.*\.ldb|.*\.log)$/i.test(path.basename(f.full));
    if (loc === 'cache' || loc === 'code') {
      if (!isIndex) {
        cats[cat].deletable += f.size;
        if (collect) deletableFiles.push({ full: f.full, size: f.size, cat });
      }
    }
  });
  return { total, cats, files: collect ? deletableFiles : undefined };
}

async function dirSize(root, skip) {
  let total = 0;
  await walk(root, async (full, size) => { if (!skip || !within(full, skip)) total += size; });
  return total;
}

// Xóa các file bộ nhớ đệm thuộc loại `category` ('all' = mọi loại) của một thư mục tài khoản.
// File đang bị khóa (Windows) được đưa vào danh sách xóa ở lần mở app sau.
async function deleteByCategory(root, category, pending) {
  const { files } = await scanDir(root, { collect: true });
  let freed = 0, count = 0, locked = 0;
  for (const f of files) {
    if (category !== 'all' && f.cat !== category) continue;
    try {
      await fsp.unlink(f.full);
      freed += f.size; count++;
    } catch (err) {
      if (err.code === 'ENOENT') continue;
      locked++; pending.add(f.full);
    }
  }
  return { freed, count, locked };
}

// Xóa các file còn tồn đọng từ lần trước (gọi khi khởi động, trước khi mở bất kỳ trang nào)
function processPending(list, userData) {
  const left = [];
  for (const file of list || []) {
    if (typeof file !== 'string' || !within(file, path.join(userData, 'Partitions'))) continue;
    try { fs.unlinkSync(file); } catch (err) { if (err.code !== 'ENOENT') left.push(file); }
  }
  return left;
}

module.exports = { CATEGORIES, scanDir, dirSize, deleteByCategory, processPending, sniff, within };
