// Cầu nối an toàn giữa sidebar và tiến trình chính.
// Chỉ dùng cho giao diện sidebar của ChatHub, KHÔNG được nạp vào các trang chat.
const { contextBridge, ipcRenderer } = require('electron');

const send = (channel, payload) => ipcRenderer.send(channel, payload);

contextBridge.exposeInMainWorld('chathub', {
  ready: () => send('ready'),
  activate: (id) => send('activate', id),
  addAccount: (data) => send('account:add', data),
  renameAccount: (id, name) => send('account:rename', { id, name }),
  deleteAccount: (id) => send('account:delete', id),
  accountMenu: (id) => send('account:menu', id),
  setLayout: (opts) => send('layout', opts),
  saveQuickReplies: (list) => send('qr:save', list),
  insertQuickReply: (text) => send('qr:insert', text),
  copyQuickReply: (text) => send('qr:copy', text),
  storageScan: () => ipcRenderer.invoke('storage:scan'),
  storageDelete: (id, category) => ipcRenderer.invoke('storage:delete', { id, category }),
  storageClearSite: (id) => ipcRenderer.invoke('storage:clear-site', id),
  openDataFolder: () => ipcRenderer.invoke('storage:open-folder'),
  onState: (cb) => ipcRenderer.on('state', (_e, s) => cb(s)),
  onRenameRequest: (cb) => ipcRenderer.on('rename-request', (_e, id) => cb(id)),
  onDeleteRequest: (cb) => ipcRenderer.on('delete-request', (_e, id) => cb(id))
});
