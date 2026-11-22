// Giao diện sidebar. Chạy trong sandbox, chỉ giao tiếp qua window.chathub (preload.js).
const api = window.chathub;
const $ = (s) => document.querySelector(s);
let state = { accounts: [], activeId: null, quickReplies: [], services: {} };
let qrOpen = false;
const QR_WIDTH = 300;

function el(tag, attrs = {}, ...children) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'class') node.className = v;
    else if (k === 'style') Object.assign(node.style, v);
    else if (k.startsWith('on')) node.addEventListener(k.slice(2), v);
    else node.setAttribute(k, v);
  }
  for (const c of children) if (c != null) node.append(c); // append() chỉ chèn text, không chèn HTML
  return node;
}

function syncLayout() {
  api.setLayout({ rightPanel: qrOpen ? QR_WIDTH : 0, overlay: !$('#modal').hidden || !$('#storage').hidden });
}

// ---------- Danh sách tài khoản ----------
function renderAccounts() {
  const box = $('#accounts');
  box.replaceChildren();
  for (const acc of state.accounts) {
    const svc = state.services[acc.service] || {};
    const btn = el('button', {
      class: 'acct' + (acc.id === state.activeId ? ' active' : '') + (acc.sleep ? ' sleep' : ''),
      style: { background: svc.color },
      title: `${acc.name} — ${svc.name}${acc.sleep ? ' (đang ngủ)' : ''}\nChuột phải để xem tùy chọn`,
      onclick: () => { if (!$('#storage').hidden) toggleStorage(false); api.activate(acc.id); },
      oncontextmenu: (e) => { e.preventDefault(); api.accountMenu(acc.id); }
    }, svc.short, el('span', { class: 'initial' }, acc.name.trim().charAt(0).toUpperCase()));
    if (acc.unread > 0) btn.append(el('span', { class: 'badge' }, acc.unread > 99 ? '99+' : String(acc.unread)));
    box.append(btn);
  }
  $('#empty').style.display = state.accounts.length ? 'none' : '';
}

// ---------- Hộp thoại ----------
let modalSubmit = null;
function openModal(title, bodyNodes, { okText = 'OK', danger = false, onSubmit }) {
  $('#modal-title').textContent = title;
  $('#modal-body').replaceChildren(...bodyNodes);
  $('#modal-ok').textContent = okText;
  $('#modal-ok').className = danger ? 'danger' : 'primary';
  modalSubmit = onSubmit;
  $('#modal').hidden = false;
  syncLayout();
  setTimeout(() => $('#modal-body input:not([type=radio]), #modal-body textarea')?.focus(), 0);
}
function closeModal() {
  $('#modal').hidden = true;
  modalSubmit = null;
  syncLayout();
}
$('#modal-cancel').addEventListener('click', closeModal);
$('#modal').addEventListener('mousedown', (e) => { if (e.target.id === 'modal') closeModal(); });
document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !$('#modal').hidden) closeModal(); });
$('#modal-form').addEventListener('submit', (e) => {
  e.preventDefault();
  if (modalSubmit && modalSubmit(new FormData(e.target)) === false) return;
  closeModal();
});

function showAddAccount() {
  const grid = el('div', { class: 'svc-grid' });
  Object.entries(state.services).forEach(([key, svc], i) => {
    grid.append(el('label', {},
      el('input', { type: 'radio', name: 'service', value: key, ...(i === 0 ? { checked: '' } : {}) }),
      el('span', { class: 'svc-dot', style: { background: svc.color } }, svc.short),
      svc.name));
  });
  const urlWrap = el('div', { hidden: '' },
    el('label', { for: 'f-url' }, 'Địa chỉ trang web (https://…)'),
    el('input', { id: 'f-url', name: 'url', type: 'url', placeholder: 'https://' }));
  grid.addEventListener('change', (e) => { urlWrap.hidden = e.target.value !== 'custom'; });
  openModal('Thêm tài khoản', [
    el('p', { class: 'muted small' }, 'Mỗi tài khoản có vùng đăng nhập riêng, nên có thể thêm nhiều nick cùng một dịch vụ.'),
    grid,
    el('label', { for: 'f-name' }, 'Tên gợi nhớ'),
    el('input', { id: 'f-name', name: 'name', maxlength: '60', placeholder: 'VD: Zalo shop chính' }),
    urlWrap
  ], {
    okText: 'Thêm',
    onSubmit: (fd) => {
      const service = fd.get('service');
      const url = String(fd.get('url') || '').trim();
      if (service === 'custom' && !/^https?:\/\//i.test(url)) { alert('Vui lòng nhập địa chỉ bắt đầu bằng https://'); return false; }
      api.addAccount({ service, name: String(fd.get('name') || '').trim() || state.services[service].name, url });
    }
  });
}
$('#btn-add').addEventListener('click', showAddAccount);
$('#btn-add-empty').addEventListener('click', showAddAccount);

api.onRenameRequest((id) => {
  const acc = state.accounts.find((a) => a.id === id);
  if (!acc) return;
  const input = el('input', { name: 'name', maxlength: '60' });
  input.value = acc.name;
  openModal('Đổi tên tài khoản', [input], { onSubmit: (fd) => api.renameAccount(id, String(fd.get('name')).trim()) });
});

api.onDeleteRequest((id) => {
  const acc = state.accounts.find((a) => a.id === id);
  if (!acc) return;
  openModal(`Xóa "${acc.name}"?`, [
    el('p', {}, 'Tài khoản sẽ bị đăng xuất và toàn bộ cookie, cache, dữ liệu đăng nhập của nó bị xóa khỏi máy này.')
  ], { okText: 'Xóa', danger: true, onSubmit: () => api.deleteAccount(id) });
});

// ---------- Trả lời nhanh ----------
function renderQuickReplies() {
  const q = $('#qr-search').value.trim().toLowerCase();
  const list = $('#qr-list');
  list.replaceChildren();
  for (const item of state.quickReplies) {
    if (q && !(item.title + ' ' + item.text).toLowerCase().includes(q)) continue;
    list.append(el('li', { class: 'qr-item', title: item.text, onclick: () => api.insertQuickReply(item.text) },
      el('div', { class: 'row' },
        el('span', { class: 'title' }, item.title || '(không tên)'),
        el('button', { class: 'icon', title: 'Sao chép', onclick: (e) => { e.stopPropagation(); api.copyQuickReply(item.text); } }, '⧉'),
        el('button', { class: 'icon', title: 'Sửa', onclick: (e) => { e.stopPropagation(); editQuickReply(item); } }, '✎')),
      el('div', { class: 'text' }, item.text)));
  }
}
function editQuickReply(item) {
  const isNew = !item;
  item = item || { id: '', title: '', text: '' };
  const title = el('input', { name: 'title', maxlength: '60', placeholder: 'VD: Chào khách' });
  const text = el('textarea', { name: 'text', maxlength: '5000', placeholder: 'Nội dung tin nhắn…' });
  title.value = item.title; text.value = item.text;
  const body = [el('label', {}, 'Tên mẫu'), title, el('label', {}, 'Nội dung'), text];
  if (!isNew) {
    body.push(el('button', {
      type: 'button', class: 'danger', style: { marginTop: '12px' },
      onclick: () => { api.saveQuickReplies(state.quickReplies.filter((x) => x.id !== item.id)); closeModal(); }
    }, 'Xóa mẫu này'));
  }
  openModal(isNew ? 'Mẫu trả lời mới' : 'Sửa mẫu', body, {
    okText: 'Lưu',
    onSubmit: (fd) => {
      const next = { id: item.id || crypto.randomUUID(), title: String(fd.get('title')).trim(), text: String(fd.get('text')) };
      if (!next.text.trim()) { alert('Nội dung không được để trống'); return false; }
      api.saveQuickReplies(isNew ? [...state.quickReplies, next] : state.quickReplies.map((x) => (x.id === item.id ? next : x)));
    }
  });
}
function toggleQr(open = !qrOpen) {
  qrOpen = open;
  $('#qr-panel').hidden = !qrOpen;
  $('#btn-qr').classList.toggle('on', qrOpen);
  syncLayout();
  if (qrOpen) $('#qr-search').focus();
}
$('#btn-qr').addEventListener('click', () => toggleQr());
$('#qr-close').addEventListener('click', () => toggleQr(false));
$('#qr-new').addEventListener('click', () => editQuickReply(null));
$('#qr-search').addEventListener('input', renderQuickReplies);

// ---------- Dung lượng lưu trữ ----------
const CAT = {
  all: { label: 'Tất cả', color: '#0f172a' },
  image: { label: 'Hình ảnh', icon: '🖼️', color: '#0ea5e9' },
  video: { label: 'Video', icon: '🎬', color: '#8b5cf6' },
  audio: { label: 'Âm thanh', icon: '🎵', color: '#f59e0b' },
  document: { label: 'Tài liệu & file', icon: '📄', color: '#10b981' },
  web: { label: 'Mã trang web', icon: '🧩', color: '#64748b' },
  data: { label: 'Đăng nhập & dữ liệu trang', icon: '🔐', color: '#f43f5e' },
  other: { label: 'Khác', icon: '📦', color: '#a8a29e' }
};
const CAT_KEYS = Object.keys(CAT).filter((k) => k !== 'all');
let stFilter = 'all';
let stReport = null;
let stBusy = false;

function fmt(bytes) {
  if (!bytes) return '0 B';
  const u = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.min(u.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)));
  const v = bytes / 1024 ** i;
  return `${v >= 100 || i === 0 ? Math.round(v) : v.toFixed(1)} ${u[i]}`;
}
const sizeOf = (r, cat) => (cat === 'all' ? r.total : r.cats[cat].size);
const deletableOf = (r, cat) => (cat === 'all' ? CAT_KEYS.reduce((n, k) => n + r.cats[k].deletable, 0) : r.cats[cat].deletable);

function setBusy(on) {
  stBusy = on;
  document.querySelectorAll('#storage button').forEach((b) => { if (b.id !== 'st-close') b.disabled = on; });
}
function showResult(text, isError) {
  const box = $('#st-result');
  box.textContent = text;
  box.className = 'st-result' + (isError ? ' err' : '');
  box.hidden = !text;
}

async function scanStorage() {
  setBusy(true);
  $('#st-summary').textContent = 'Đang quét dung lượng… (có thể mất vài giây)';
  try {
    stReport = await api.storageScan();
    renderStorage();
  } catch (e) {
    showResult('Không quét được: ' + e.message, true);
  } finally { setBusy(false); }
}

function renderStorage() {
  if (!stReport) return;
  const rows = stReport.accounts
    .map((r) => ({ ...r, acc: state.accounts.find((a) => a.id === r.id) }))
    .filter((r) => r.acc);
  const grand = rows.reduce((n, r) => n + r.total, 0) + stReport.shared;
  $('#st-summary').textContent = `Tổng ${fmt(grand)} trên máy · ${rows.length} tài khoản`;
  $('#st-folder').title = 'Mở thư mục dữ liệu: ' + stReport.dataPath;

  // Bộ lọc
  const filters = $('#st-filters');
  filters.replaceChildren();
  for (const [key, c] of Object.entries(CAT)) {
    const total = rows.reduce((n, r) => n + sizeOf(r, key), 0);
    filters.append(el('button', {
      class: 'chip' + (stFilter === key ? ' on' : ''), role: 'tab', 'aria-selected': String(stFilter === key),
      onclick: () => { stFilter = key; renderStorage(); }
    }, key === 'all' ? null : el('span', { class: 'dot', style: { background: c.color } }), c.label, el('span', { class: 'sz' }, fmt(total))));
  }

  // Danh sách tài khoản, sắp theo dung lượng của loại đang lọc
  rows.sort((a, b) => sizeOf(b, stFilter) - sizeOf(a, stFilter));
  const maxTotal = Math.max(1, ...rows.map((r) => r.total));
  const list = $('#st-list');
  list.replaceChildren();
  if (!rows.length) list.append(el('p', { class: 'muted' }, 'Chưa có tài khoản nào.'));

  for (const r of rows) {
    const svc = state.services[r.acc.service] || {};
    const shown = sizeOf(r, stFilter);
    const bar = el('div', { class: 'bar', style: { width: `${Math.max(2, (r.total / maxTotal) * 100)}%` } });
    for (const k of CAT_KEYS) {
      if (!r.cats[k].size) continue;
      bar.append(el('span', {
        class: stFilter !== 'all' && stFilter !== k ? 'dim' : '',
        title: `${CAT[k].label}: ${fmt(r.cats[k].size)}`,
        style: { width: `${(r.cats[k].size / Math.max(1, r.total)) * 100}%`, background: CAT[k].color }
      }));
    }
    const brk = el('div', { class: 'st-break' });
    for (const k of CAT_KEYS) {
      if (r.cats[k].size) brk.append(el('span', {}, `${CAT[k].icon} ${CAT[k].label}: `, el('b', {}, fmt(r.cats[k].size))));
    }

    const btns = el('div', { class: 'st-btns' });
    const del = deletableOf(r, stFilter);
    if (stFilter === 'all') {
      btns.append(el('button', { class: 'primary', ...(del ? {} : { disabled: '' }), onclick: () => confirmDelete(r, 'all') },
        `🧹 Xóa bộ nhớ đệm (${fmt(del)})`));
    } else if (stFilter !== 'data') {
      btns.append(el('button', { class: 'primary', ...(del ? {} : { disabled: '' }), onclick: () => confirmDelete(r, stFilter) },
        `🧹 Xóa ${CAT[stFilter].label.toLowerCase()} (${fmt(del)})`));
      const inData = r.cats[stFilter].size - del;
      if (inData > 0) btns.append(el('span', { class: 'hint' }, `${fmt(inData)} nằm trong dữ liệu trang, không xóa lẻ được`));
    }
    if (stFilter === 'all' || stFilter === 'data') {
      btns.append(el('button', { class: 'danger', onclick: () => confirmClearSite(r) }, '🔐 Xóa dữ liệu trang…'));
    }

    list.append(el('div', { class: 'st-row' },
      el('div', { class: 'tile', style: { background: svc.color } }, svc.short),
      el('div', { class: 'name' }, r.acc.name, el('small', {}, svc.name)),
      el('div', { class: 'size' }, fmt(shown), el('small', {}, stFilter === 'all' ? 'tổng' : CAT[stFilter].label.toLowerCase())),
      bar, brk, btns));
  }

  list.append(el('div', { class: 'st-row shared' },
    el('div', { class: 'tile' }, '⚙'),
    el('div', { class: 'name' }, 'ChatHub (dùng chung)', el('small', {}, 'cài đặt, mẫu trả lời, bộ nhớ đệm đồ họa')),
    el('div', { class: 'size' }, fmt(stReport.shared))));
  if (stReport.pending) showResult(`${stReport.pending} file đang được sử dụng sẽ tự xóa ở lần mở app sau.`);
}

function confirmDelete(r, cat) {
  const amount = fmt(deletableOf(r, cat));
  const what = cat === 'all' ? 'toàn bộ bộ nhớ đệm' : `${CAT[cat].label.toLowerCase()} trong bộ nhớ đệm`;
  openModal(`Xóa ${what} của "${r.acc.name}"?`, [
    el('p', {}, `Giải phóng khoảng ${amount}. Bạn vẫn đăng nhập bình thường.`),
    el('p', { class: 'muted small' }, 'Ảnh, video, file trong cuộc trò chuyện không bị mất — trang sẽ tải lại từ máy chủ khi bạn mở lại (có thể chậm hơn một chút lần đầu).')
  ], {
    okText: 'Xóa', danger: true,
    onSubmit: () => { runDelete(() => api.storageDelete(r.id, cat)); }
  });
}
function confirmClearSite(r) {
  openModal(`Xóa dữ liệu trang của "${r.acc.name}"?`, [
    el('p', {}, `Xóa dữ liệu offline của trang (IndexedDB, Local Storage, Service Worker) và toàn bộ bộ nhớ đệm — khoảng ${fmt(r.cats.data.size + deletableOf(r, 'all'))}.`),
    el('p', {}, el('b', {}, 'Có thể phải đăng nhập lại'), ' (Zalo, WhatsApp lưu khóa đăng nhập ở đây). Tin nhắn trên máy chủ không bị mất.')
  ], { okText: 'Xóa dữ liệu trang', danger: true, onSubmit: () => { runDelete(() => api.storageClearSite(r.id), true); } });
}
async function runDelete(fn, isSite) {
  setBusy(true);
  showResult('Đang xóa…');
  try {
    const before = stReport;
    const res = await fn();
    await scanStorage();
    if (isSite) {
      showResult('Đã xóa dữ liệu trang. Nếu trang yêu cầu, hãy đăng nhập lại.');
    } else {
      const total = (r) => r.accounts.reduce((n, a) => n + a.total, 0);
      const freed = Math.max(res.freed, total(before) - total(stReport));
      let msg = `Đã giải phóng ${fmt(freed)} (${res.count} file).`;
      if (res.locked) msg += ` ${res.locked} file đang được sử dụng sẽ tự xóa ở lần mở app sau.`;
      showResult(msg);
    }
  } catch (e) {
    showResult('Không xóa được: ' + e.message, true);
  } finally { setBusy(false); }
}

function toggleStorage(open) {
  $('#storage').hidden = !open;
  $('#btn-storage').classList.toggle('on', open);
  if (open && qrOpen) toggleQr(false);
  syncLayout();
  if (open) { showResult(''); scanStorage(); }
}
$('#btn-storage').addEventListener('click', () => toggleStorage($('#storage').hidden));
$('#st-close').addEventListener('click', () => toggleStorage(false));
$('#st-refresh').addEventListener('click', () => { showResult(''); scanStorage(); });
$('#st-folder').addEventListener('click', () => api.openDataFolder());
document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && $('#modal').hidden && !$('#storage').hidden) toggleStorage(false); });

// ---------- Nhận trạng thái từ main ----------
api.onState((s) => {
  state = s;
  renderAccounts();
  renderQuickReplies();
  if (!$('#storage').hidden) renderStorage();
});
api.ready();
