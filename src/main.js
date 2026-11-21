// ChatHub - tiến trình chính (main process).
// Nguyên tắc bảo mật:
//  - Không gửi dữ liệu đi đâu cả: không telemetry, không auto-update, không tải code từ mạng.
//  - Mỗi tài khoản chạy trong một session riêng (cookie/đăng nhập tách biệt).
//  - Trang chat chạy sandbox, không có quyền Node.js, không bị chèn script.
//  - Chỉ cấp quyền: thông báo, micro/camera (gọi thoại, ghi âm), ghi clipboard, toàn màn hình.
//  - Link lạ mở bằng trình duyệt mặc định; giao thức lạ (bytedance://, zalo://...) bị chặn.

const {
  app, BrowserWindow, WebContentsView, ipcMain, session, shell, Menu, clipboard, Notification
} = require('electron');
const path = require('node:path');
const fs = require('node:fs');
const crypto = require('node:crypto');
const SERVICES = require('./services');

// Chế độ portable: lưu toàn bộ dữ liệu vào thư mục "ChatHub-data" cạnh file .exe thay vì %APPDATA%,
// để mang theo USB / dùng máy không có quyền admin. Bật khi:
//  - chạy bản 1 file ChatHub-Portable.exe (biến PORTABLE_EXECUTABLE_DIR), hoặc
//  - chạy bản ZIP: cạnh ChatHub.exe có sẵn thư mục "ChatHub-data".
// Phải đặt trước khi app sẵn sàng, để cookie/đăng nhập cũng nằm ở đó.
const exeDir = path.dirname(process.execPath);
const portableDir = process.env.PORTABLE_EXECUTABLE_DIR ||
  (app.isPackaged && fs.existsSync(path.join(exeDir, 'ChatHub-data')) ? exeDir : null);
if (portableDir) {
  app.setPath('userData', path.join(portableDir, 'ChatHub-data'));
}

const SIDEBAR_W = 72;
const ALLOWED_PERMISSIONS = new Set(['notifications', 'media', 'clipboard-sanitized-write', 'fullscreen']);

// ---------- Lưu trữ cục bộ (file JSON trong thư mục dữ liệu của app) ----------
const dataFile = (name) => path.join(app.getPath('userData'), name);

function readJSON(name, fallback) {
  try { return JSON.parse(fs.readFileSync(dataFile(name), 'utf8')); } catch { return fallback; }
}
function writeJSON(name, value) {
  const file = dataFile(name);
  fs.writeFileSync(file + '.tmp', JSON.stringify(value, null, 2), { mode: 0o600 });
  fs.renameSync(file + '.tmp', file);
}

let accounts = [];      // [{id, service, name, url, sleep}]
let quickReplies = [];  // [{id, title, text}]
const views = new Map(); // id -> WebContentsView
const unread = new Map(); // id -> number
let win = null;
let activeId = null;
let rightPanel = 0;   // độ rộng panel trả lời nhanh (px)
let overlay = false;  // đang mở hộp thoại trong sidebar -> ẩn trang chat

// ---------- Tiện ích ----------
function isHttp(url) {
  try { const u = new URL(url); return u.protocol === 'https:' || u.protocol === 'http:'; } catch { return false; }
}
function hostMatches(url, domains) {
  try {
    const h = new URL(url).hostname;
    return domains.some((d) => h === d || h.endsWith('.' + d));
  } catch { return false; }
}
function accountDomains(acc) {
  const svc = SERVICES[acc.service];
  const list = [...(svc?.domains || [])];
  if (acc.url) { try { list.push(new URL(acc.url).hostname); } catch {} }
  return list;
}
// Bỏ chữ "Electron" khỏi User-Agent để WhatsApp/Zalo không chặn trình duyệt "lạ".
function cleanUA(ua) {
  return ua.replace(/\s?Electron\/\S+/i, '').replace(/\s?chathub\/\S+/i, '');
}
function sendState() {
  if (!win || win.isDestroyed()) return;
  win.webContents.send('state', {
    accounts: accounts.map((a) => ({ ...a, unread: unread.get(a.id) || 0, loaded: views.has(a.id) })),
    activeId,
    quickReplies,
    services: SERVICES
  });
  const total = [...unread.values()].reduce((s, n) => s + n, 0);
  app.setBadgeCount(total);
  win.setTitle(total ? `(${total}) ChatHub` : 'ChatHub');
}

// ---------- Tạo trang chat cho từng tài khoản ----------
function setupSession(partition) {
  const ses = session.fromPartition(partition);
  ses.setUserAgent(cleanUA(ses.getUserAgent()));
  ses.setPermissionRequestHandler((_wc, permission, cb) => cb(ALLOWED_PERMISSIONS.has(permission)));
  ses.setPermissionCheckHandler((_wc, permission) => ALLOWED_PERMISSIONS.has(permission));
  return ses;
}

function attachGuestHandlers(wc, acc) {
  const domains = accountDomains(acc);

  // Popup / link mở tab mới
  wc.setWindowOpenHandler(({ url }) => {
    if (!isHttp(url)) return { action: 'deny' };              // chặn bytedance://, zalo://, file:// ...
    if (hostMatches(url, domains)) {
      return {
        action: 'allow',
        overrideBrowserWindowOptions: {
          width: 1000, height: 760, autoHideMenuBar: true,
          webPreferences: { sandbox: true, contextIsolation: true, nodeIntegration: false }
        }
      };
    }
    shell.openExternal(url);                                    // link ngoài -> trình duyệt mặc định
    return { action: 'deny' };
  });

  // Chặn điều hướng sang giao thức không phải http(s)
  wc.on('will-navigate', (e, url) => { if (!isHttp(url)) e.preventDefault(); });
  wc.on('will-redirect', (e, url) => { if (!isHttp(url)) e.preventDefault(); });

  // Đếm tin chưa đọc từ tiêu đề trang, ví dụ "(3) Messenger" -> 3. Không chèn script vào trang.
  wc.on('page-title-updated', (_e, title) => {
    const m = title.match(/\((\d+)\+?\)/);
    const n = m ? parseInt(m[1], 10) : 0;
    if ((unread.get(acc.id) || 0) !== n) { unread.set(acc.id, n); sendState(); }
  });

  // Menu chuột phải: copy / paste / mở link
  wc.on('context-menu', (_e, p) => {
    const items = [];
    if (p.linkURL && isHttp(p.linkURL)) {
      items.push({ label: 'Mở link bằng trình duyệt', click: () => shell.openExternal(p.linkURL) });
      items.push({ label: 'Sao chép link', click: () => clipboard.writeText(p.linkURL) });
      items.push({ type: 'separator' });
    }
    if (p.isEditable) items.push({ role: 'cut', label: 'Cắt' });
    if (p.selectionText || p.isEditable) items.push({ role: 'copy', label: 'Sao chép' });
    if (p.isEditable) items.push({ role: 'paste', label: 'Dán' }, { role: 'selectAll', label: 'Chọn tất cả' });
    if (p.mediaType === 'image' && p.srcURL) {
      items.push({ label: 'Sao chép ảnh', click: () => wc.copyImageAt(p.x, p.y) });
    }
    if (items.length) Menu.buildFromTemplate(items).popup({ window: win });
  });

  wc.on('render-process-gone', () => { views.delete(acc.id); unread.delete(acc.id); layout(); sendState(); });
}

function ensureView(acc) {
  if (views.has(acc.id)) return views.get(acc.id);
  const partition = `persist:acct-${acc.id}`;
  setupSession(partition);
  const view = new WebContentsView({
    webPreferences: {
      partition,
      sandbox: true,
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: true,
      allowRunningInsecureContent: false,
      spellcheck: false
    }
  });
  view.setBackgroundColor('#ffffff');
  attachGuestHandlers(view.webContents, acc);
  const url = acc.service === 'custom' ? acc.url : SERVICES[acc.service].url;
  view.webContents.loadURL(url);
  views.set(acc.id, view);
  return view;
}

function destroyView(id) {
  const view = views.get(id);
  if (!view) return;
  try { win.contentView.removeChildView(view); } catch {}
  view.webContents.close();
  views.delete(id);
  unread.delete(id);
}

// Chỉ hiển thị trang của tài khoản đang chọn; các trang khác vẫn chạy nền để nhận thông báo.
function layout() {
  if (!win || win.isDestroyed()) return;
  const [w, h] = win.getContentSize();
  for (const [id, view] of views) {
    const show = id === activeId && !overlay;
    const attached = win.contentView.children.includes(view);
    if (show && !attached) win.contentView.addChildView(view);
    if (!show && attached) win.contentView.removeChildView(view);
    if (show) view.setBounds({ x: SIDEBAR_W, y: 0, width: Math.max(0, w - SIDEBAR_W - rightPanel), height: h });
  }
}

function activate(id) {
  const acc = accounts.find((a) => a.id === id);
  if (!acc) return;
  if (acc.sleep) { acc.sleep = false; writeJSON('accounts.json', accounts); }
  activeId = id;
  const view = ensureView(acc);
  layout();
  view.webContents.focus();
  sendState();
}

// ---------- Cửa sổ chính ----------
function createWindow() {
  win = new BrowserWindow({
    width: 1360, height: 860, minWidth: 800, minHeight: 500,
    title: 'ChatHub',
    icon: path.join(__dirname, 'icon.png'),
    autoHideMenuBar: true,
    backgroundColor: '#0f172a',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      sandbox: true, contextIsolation: true, nodeIntegration: false
    }
  });
  win.loadFile(path.join(__dirname, 'renderer', 'index.html'));
  win.webContents.on('will-navigate', (e) => e.preventDefault());
  win.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  win.on('resize', layout);
  win.webContents.on('did-finish-load', () => {
    sendState();
    // Tải sẵn các tài khoản không ở chế độ ngủ để nhận thông báo/đếm tin mới.
    for (const acc of accounts) if (!acc.sleep) ensureView(acc);
    if (accounts.length) activate(accounts.find((a) => !a.sleep)?.id || accounts[0].id);
  });
  win.on('closed', () => { win = null; });
}

function buildAppMenu() {
  const switchItems = Array.from({ length: 9 }, (_, i) => ({
    label: `Tài khoản ${i + 1}`,
    accelerator: `CmdOrCtrl+${i + 1}`,
    click: () => { if (accounts[i]) activate(accounts[i].id); }
  }));
  Menu.setApplicationMenu(Menu.buildFromTemplate([
    ...(process.platform === 'darwin' ? [{ role: 'appMenu' }] : []),
    { role: 'editMenu', label: 'Sửa' },
    {
      label: 'Xem',
      submenu: [
        { label: 'Tải lại trang chat', accelerator: 'CmdOrCtrl+R', click: () => views.get(activeId)?.webContents.reload() },
        { label: 'Phóng to', accelerator: 'CmdOrCtrl+=', click: () => zoom(0.5) },
        { label: 'Thu nhỏ', accelerator: 'CmdOrCtrl+-', click: () => zoom(-0.5) },
        { label: 'Cỡ gốc', accelerator: 'CmdOrCtrl+0', click: () => views.get(activeId)?.webContents.setZoomLevel(0) },
        { type: 'separator' },
        ...switchItems,
        { type: 'separator' },
        { role: 'togglefullscreen', label: 'Toàn màn hình' }
      ]
    },
    { role: 'windowMenu', label: 'Cửa sổ' }
  ]));
}
function zoom(delta) {
  const wc = views.get(activeId)?.webContents;
  if (wc) wc.setZoomLevel(wc.getZoomLevel() + delta);
}

// ---------- IPC từ sidebar ----------
function registerIpc() {
  ipcMain.on('ready', sendState);
  ipcMain.on('activate', (_e, id) => activate(id));

  ipcMain.on('account:add', (_e, { service, name, url }) => {
    if (!SERVICES[service]) return;
    if (service === 'custom' && !isHttp(url)) return;
    const acc = {
      id: crypto.randomUUID(),
      service,
      name: String(name || SERVICES[service].name).slice(0, 60),
      url: service === 'custom' ? url : '',
      sleep: false
    };
    accounts.push(acc);
    writeJSON('accounts.json', accounts);
    activate(acc.id);
  });

  ipcMain.on('account:rename', (_e, { id, name }) => {
    const acc = accounts.find((a) => a.id === id);
    if (!acc) return;
    acc.name = String(name).slice(0, 60) || acc.name;
    writeJSON('accounts.json', accounts);
    sendState();
  });

  ipcMain.on('account:move', (_e, { id, dir }) => {
    const i = accounts.findIndex((a) => a.id === id);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= accounts.length) return;
    [accounts[i], accounts[j]] = [accounts[j], accounts[i]];
    writeJSON('accounts.json', accounts);
    sendState();
  });

  ipcMain.on('account:menu', (_e, id) => {
    const acc = accounts.find((a) => a.id === id);
    if (!acc) return;
    Menu.buildFromTemplate([
      { label: 'Tải lại', click: () => views.get(id)?.webContents.reload() },
      { label: 'Về trang chủ dịch vụ', click: () => views.get(id)?.webContents.loadURL(acc.url || SERVICES[acc.service].url) },
      { label: 'Đổi tên…', click: () => win.webContents.send('rename-request', id) },
      { label: 'Lên trên', click: () => ipcMain.emit('account:move', null, { id, dir: -1 }) },
      { label: 'Xuống dưới', click: () => ipcMain.emit('account:move', null, { id, dir: 1 }) },
      {
        label: acc.sleep ? 'Đánh thức' : 'Cho ngủ (giải phóng RAM, tắt thông báo)',
        click: () => {
          acc.sleep = !acc.sleep;
          writeJSON('accounts.json', accounts);
          if (acc.sleep) {
            destroyView(id);
            if (activeId === id) activeId = null;
            layout(); sendState();
          } else activate(id);
        }
      },
      { type: 'separator' },
      { label: 'Xóa tài khoản & đăng xuất…', click: () => win.webContents.send('delete-request', id) }
    ]).popup({ window: win });
  });

  ipcMain.on('account:delete', async (_e, id) => {
    destroyView(id);
    accounts = accounts.filter((a) => a.id !== id);
    writeJSON('accounts.json', accounts);
    // Xóa sạch cookie, đăng nhập, cache của tài khoản này khỏi máy
    const ses = session.fromPartition(`persist:acct-${id}`);
    await ses.clearStorageData();
    await ses.clearCache();
    if (activeId === id) activeId = null;
    if (!activeId && accounts.length) activate(accounts[0].id); else { layout(); sendState(); }
  });

  ipcMain.on('layout', (_e, opts) => {
    rightPanel = Math.max(0, Math.min(600, Number(opts.rightPanel) || 0));
    overlay = !!opts.overlay;
    layout();
  });

  // Trả lời nhanh: lưu mẫu và chèn chữ vào ô chat đang focus
  ipcMain.on('qr:save', (_e, list) => {
    if (!Array.isArray(list)) return;
    quickReplies = list.slice(0, 200).map((q) => ({
      id: String(q.id || crypto.randomUUID()),
      title: String(q.title || '').slice(0, 60),
      text: String(q.text || '').slice(0, 5000)
    }));
    writeJSON('quickreplies.json', quickReplies);
    sendState();
  });
  ipcMain.on('qr:insert', (_e, text) => {
    const wc = views.get(activeId)?.webContents;
    if (!wc) return;
    wc.focus();
    wc.insertText(String(text));
  });
  ipcMain.on('qr:copy', (_e, text) => clipboard.writeText(String(text)));
}

// ---------- Khởi động ----------
if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on('second-instance', () => { if (win) { if (win.isMinimized()) win.restore(); win.focus(); } });

  // Không cho bất kỳ trang nào nhúng <webview> hay tự gắn preload
  app.on('web-contents-created', (_e, contents) => {
    contents.on('will-attach-webview', (e) => e.preventDefault());
  });

  app.whenReady().then(() => {
    app.userAgentFallback = cleanUA(app.userAgentFallback);
    accounts = readJSON('accounts.json', []);
    quickReplies = readJSON('quickreplies.json', [
      { id: 'mau-1', title: 'Chào khách', text: 'Dạ em chào anh/chị ạ! Anh/chị cần em hỗ trợ gì ạ?' },
      { id: 'mau-2', title: 'Xin SĐT', text: 'Anh/chị cho em xin số điện thoại để bên em tư vấn chi tiết hơn nhé ạ.' }
    ]);
    if (!Notification.isSupported()) console.warn('Hệ điều hành không hỗ trợ thông báo.');
    buildAppMenu();
    registerIpc();
    createWindow();
  });

  app.on('window-all-closed', () => app.quit());
}
