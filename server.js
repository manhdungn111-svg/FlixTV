// FlixTV: máy chủ đăng nhập bằng mã QR. Chạy: node server.js   (cần Node 16 trở lên, không cần cài thêm gì)
// Biến môi trường: PORT (mặc định 3000), PUBLIC_URL (địa chỉ điện thoại mở được, ví dụ http://192.168.1.10:3000)
'use strict';
const http = require('http'), fs = require('fs'), path = require('path'), crypto = require('crypto'), os = require('os');
const PORT = +process.env.PORT || 3000;
const DB = path.join(__dirname, 'users.json');
const QR_TTL = 3 * 60 * 1000, SESSION_TTL = 30 * 24 * 3600 * 1000;

let users = {};
try { users = JSON.parse(fs.readFileSync(DB, 'utf8')); } catch (e) {}
const saveUsers = () => { try { fs.writeFileSync(DB + '.tmp', JSON.stringify(users)); fs.renameSync(DB + '.tmp', DB); } catch (e) { console.error('Không lưu được users.json', e.message); } };

const tokens = new Map();   // token -> {exp, user, name}
const sessions = new Map(); // session -> {user, exp}
const hits = new Map();     // ip -> {n, reset}

function lanIp() {
  for (const list of Object.values(os.networkInterfaces()))
    for (const i of list || []) if (i.family === 'IPv4' && !i.internal) return i.address;
  return 'localhost';
}
const PUBLIC = (process.env.PUBLIC_URL || '').replace(/\/+$/, '');
const baseUrl = req => PUBLIC || ('http://' + (req.headers.host || ('localhost:' + PORT)));

function limited(req, max) {
  const ip = req.socket.remoteAddress || '?', now = Date.now();
  let h = hits.get(ip);
  if (!h || now > h.reset) { h = { n: 0, reset: now + 60000 }; hits.set(ip, h); }
  return ++h.n > max;
}
setInterval(() => {
  const now = Date.now();
  for (const [k, v] of tokens) if (now > v.exp + 60000) tokens.delete(k);
  for (const [k, v] of sessions) if (now > v.exp) sessions.delete(k);
  for (const [k, v] of hits) if (now > v.reset) hits.delete(k);
}, 30000).unref();

function hash(pass, salt) { return crypto.scryptSync(pass, salt, 32).toString('hex'); }
function body(req) {
  return new Promise((res, rej) => {
    let d = ''; req.on('data', c => { d += c; if (d.length > 262144) { rej(new Error('big')); req.destroy(); } });
    req.on('end', () => { try { res(JSON.parse(d || '{}')); } catch (e) { rej(e); } });
  });
}
function send(res, code, obj, extra) {
  const b = typeof obj === 'string' ? obj : JSON.stringify(obj);
  res.writeHead(code, Object.assign({ 'Content-Type': typeof obj === 'string' ? 'text/html; charset=utf-8' : 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }, typeof obj === 'string' ? {} : CORS, extra || {}));
  res.end(b);
}
const CORS = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET,POST,OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type' };
const okToken = t => typeof t === 'string' && /^[0-9a-f]{24}$/.test(t);
const UN = /^[a-z0-9_.]{3,20}$/;

const PAGE = require('fs').readFileSync(path.join(__dirname, 'approve.html'), 'utf8');

const server = http.createServer(async (req, res) => {
  const u = new URL(req.url, 'http://x'), p = u.pathname;
  try {
    if (req.method === 'OPTIONS') { res.writeHead(204, CORS); return res.end(); }

    // Ứng dụng TV
    if (req.method === 'GET' && ['/', '/index.html', '/tv', '/tv.html', '/phone', '/phone.html'].includes(p)) {
      const ua = String(req.headers['user-agent'] || '');
      const isPhone = /iPhone|iPod|Android.*Mobile|Mobile Safari/i.test(ua) && !/TV|SMART-TV|SmartTV|Tizen|Web0S|BRAVIA|Aquos/i.test(ua);
      let name = p.startsWith('/tv') ? 'tv.html' : p.startsWith('/phone') ? 'phone.html' : (u.searchParams.has('tv') ? 'tv.html' : u.searchParams.has('phone') || isPhone ? 'phone.html' : 'tv.html');
      let html = fs.readFileSync(path.join(__dirname, name), 'utf8');
      html = html.replace(/const AUTH_API=\(new URLSearchParams[^\n]*\n/, () => "const AUTH_API=" + JSON.stringify(baseUrl(req)) + ";\n");
      return send(res, 200, html);
    }

    // Trang trên điện thoại sau khi quét mã
    if (req.method === 'GET' && p === '/qr/approve') return send(res, 200, PAGE);

    // TV hỏi trạng thái mã
    if (req.method === 'GET' && p === '/qr/status') {
      const t = u.searchParams.get('token');
      if (!okToken(t)) return send(res, 400, { status: 'bad' }, CORS);
      const r = tokens.get(t);
      if (!r) return send(res, 200, { status: 'pending' }, CORS);
      if (Date.now() > r.exp) { tokens.delete(t); return send(res, 200, { status: 'expired' }, CORS); }
      if (!r.user) return send(res, 200, { status: 'pending' }, CORS);
      tokens.delete(t); // dùng một lần
      return send(res, 200, { status: 'ok', user: r.user, name: r.name, session: newSession(r.user) }, CORS);
    }

    // Đồng bộ dữ liệu tài khoản (lịch sử, yêu thích, avatar)
    if (req.method === 'GET' && p === '/api/sync') {
      if (limited(req, 120)) return send(res, 429, { ok: false, error: 'Quá nhiều yêu cầu.' });
      const s = sessions.get(String(u.searchParams.get('session') || ''));
      if (!s || Date.now() > s.exp || !users[s.user]) return send(res, 401, { ok: false, relogin: true });
      return send(res, 200, { ok: true, name: users[s.user].name, data: users[s.user].data || {} });
    }

    // Điện thoại: kiểm tra mã còn hiệu lực
    if (req.method === 'GET' && p === '/qr/check') {
      const t = u.searchParams.get('token');
      const r = tokens.get(t);
      if (!okToken(t)) return send(res, 200, { valid: false });
      // mã do TV tự sinh nên máy chủ chưa biết: coi là hợp lệ, hết hạn tính từ lần đầu thấy
      if (!r) tokens.set(t, { exp: Date.now() + QR_TTL });
      else if (Date.now() > r.exp) return send(res, 200, { valid: false });
      return send(res, 200, { valid: true });
    }

    if (req.method === 'POST') {
      if (limited(req, 30)) return send(res, 429, { ok: false, error: 'Thử quá nhiều lần. Đợi một phút rồi thử lại.' });
      const b = await body(req);

      if (p === '/api/register') {
        const user = String(b.user || '').trim().toLowerCase(), name = String(b.name || '').trim().slice(0, 24), pass = String(b.pass || '');
        if (!name) return send(res, 400, { ok: false, error: 'Hãy nhập tên hiển thị.' });
        if (!UN.test(user)) return send(res, 400, { ok: false, error: 'Tên đăng nhập gồm 3 đến 20 ký tự: chữ, số, dấu chấm hoặc gạch dưới.' });
        if (pass.length < 6 || pass.length > 64) return send(res, 400, { ok: false, error: 'Mật khẩu cần từ 6 đến 64 ký tự.' });
        if (users[user]) return send(res, 409, { ok: false, error: 'Tên đăng nhập này đã có người dùng.' });
        const salt = crypto.randomBytes(16).toString('hex');
        users[user] = { name, salt, hash: hash(pass, salt) }; saveUsers();
        return send(res, 200, { ok: true, session: newSession(user), name });
      }

      if (p === '/api/login') {
        const user = String(b.user || '').trim().toLowerCase(), pass = String(b.pass || '');
        const rec = users[user];
        const good = rec && crypto.timingSafeEqual(Buffer.from(hash(pass, rec.salt), 'hex'), Buffer.from(rec.hash, 'hex'));
        if (!good) return send(res, 401, { ok: false, error: 'Sai tên đăng nhập hoặc mật khẩu.' });
        return send(res, 200, { ok: true, session: newSession(user), name: rec.name });
      }

      if (p === '/api/sync') {
        const s = sessions.get(String(b.session || ''));
        if (!s || Date.now() > s.exp || !users[s.user]) return send(res, 401, { ok: false, relogin: true });
        const cur = users[s.user].data || (users[s.user].data = {}), d = b.data || {};
        const cleanList = (a, n) => (Array.isArray(a) ? a : []).filter(x => x && typeof x.slug === 'string' && JSON.stringify(x).length < 2000).slice(0, n);
        const num = v => (Number.isFinite(+v) ? +v : 0);
        if (num(d.favT) >= num(cur.favT)) { cur.fav = cleanList(d.fav, 300); cur.favT = num(d.favT); }
        if (num(d.profT) >= num(cur.profT)) {
          cur.av = Number.isInteger(d.av) && d.av >= 0 && d.av < 100 ? d.av : 0;
          const ph = typeof d.photo === 'string' ? d.photo : '';
          cur.photo = ph.length <= 90000 && /^(data:image\/(jpeg|png|webp);base64,|https?:\/\/)/i.test(ph) ? ph : '';
          cur.profT = num(d.profT);
        }
        // lịch sử: gộp theo thời điểm xem, xóa lịch sử thì bỏ các mục cũ hơn mốc xóa
        cur.histClr = Math.max(num(cur.histClr), num(d.histClr));
        const m = new Map();
        for (const x of [...(cur.hist || []), ...cleanList(d.hist, 60)]) {
          if (num(x.t) <= cur.histClr) continue;
          const o = m.get(x.slug);
          if (!o || num(x.t) >= num(o.t)) m.set(x.slug, x);
        }
        cur.hist = [...m.values()].sort((a, b2) => num(b2.t) - num(a.t)).slice(0, 40);
        saveUsers();
        return send(res, 200, { ok: true, data: cur });
      }

      if (p === '/qr/confirm') {
        const s = sessions.get(String(b.session || ''));
        if (!s || Date.now() > s.exp) return send(res, 401, { ok: false, error: 'Phiên đăng nhập đã hết hạn. Hãy đăng nhập lại.', relogin: true });
        if (!okToken(b.token)) return send(res, 400, { ok: false, error: 'Mã QR không hợp lệ.' });
        let r = tokens.get(b.token);
        if (!r) { r = { exp: Date.now() + QR_TTL }; tokens.set(b.token, r); }
        if (Date.now() > r.exp) return send(res, 410, { ok: false, error: 'Mã QR đã hết hạn. Hãy làm mới mã trên TV.' });
        if (r.user) return send(res, 409, { ok: false, error: 'Mã này đã được dùng.' });
        r.user = s.user; r.name = users[s.user].name;
        return send(res, 200, { ok: true, name: r.name });
      }
    }
    send(res, 404, { error: 'Không tìm thấy' });
  } catch (e) {
    send(res, 400, { ok: false, error: 'Yêu cầu không hợp lệ.' });
  }
});
function newSession(user) { const s = crypto.randomBytes(24).toString('hex'); sessions.set(s, { user, exp: Date.now() + SESSION_TTL }); return s; }

server.listen(PORT, '0.0.0.0', () => {
  const ip = PUBLIC || 'http://' + lanIp() + ':' + PORT;
  console.log('FlixTV chạy tại:');
  console.log('  Trên TV, mở:      ' + ip);
  console.log('  (máy này)         http://localhost:' + PORT);
  console.log('Điện thoại và TV cần cùng mạng Wi-Fi, hoặc đặt PUBLIC_URL nếu chạy trên internet.');
});
