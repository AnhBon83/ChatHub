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
  api.setLayout({ rightPanel: qrOpen ? QR_WIDTH : 0, overlay: !$('#modal').hidden });
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
      onclick: () => api.activate(acc.id),
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

// ---------- Nhận trạng thái từ main ----------
api.onState((s) => {
  state = s;
  renderAccounts();
  renderQuickReplies();
});
api.ready();
