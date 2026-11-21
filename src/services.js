// Danh sách dịch vụ hỗ trợ. Muốn thêm dịch vụ mới chỉ cần thêm 1 dòng ở đây.
// domains: các tên miền được phép mở popup ngay trong app (ví dụ cửa sổ đăng nhập).
// Link tới tên miền khác sẽ được mở bằng trình duyệt mặc định của máy.
module.exports = {
  zalo: {
    name: 'Zalo',
    short: 'Za',
    color: '#0068ff',
    url: 'https://chat.zalo.me/',
    domains: ['zalo.me', 'zaloapp.com', 'zadn.vn']
  },
  messenger: {
    name: 'Messenger',
    short: 'Me',
    color: '#a033ff',
    url: 'https://www.messenger.com/',
    domains: ['messenger.com', 'facebook.com', 'fbcdn.net']
  },
  fanpage: {
    name: 'Fanpage (Meta Business)',
    short: 'FP',
    color: '#1877f2',
    url: 'https://business.facebook.com/latest/inbox/',
    domains: ['facebook.com', 'fbcdn.net', 'messenger.com']
  },
  whatsapp: {
    name: 'WhatsApp',
    short: 'WA',
    color: '#25d366',
    url: 'https://web.whatsapp.com/',
    domains: ['whatsapp.com', 'whatsapp.net']
  },
  telegram: {
    name: 'Telegram',
    short: 'Tg',
    color: '#2aabee',
    url: 'https://web.telegram.org/k/',
    domains: ['telegram.org', 't.me']
  },
  shopee: {
    name: 'Shopee Kênh Người Bán',
    short: 'Sp',
    color: '#ee4d2d',
    url: 'https://banhang.shopee.vn/webchat/conversations',
    domains: ['shopee.vn', 'shopee.com']
  },
  tiktokshop: {
    name: 'TikTok Shop Seller',
    short: 'TT',
    color: '#111111',
    url: 'https://seller-vn.tiktok.com/homepage',
    domains: ['tiktok.com', 'tiktokshop.com', 'tiktokglobalshop.com']
  },
  custom: {
    name: 'Trang web khác',
    short: 'W',
    color: '#64748b',
    url: '',
    domains: []
  }
};
