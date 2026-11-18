// FlixTV - máy chủ đồng bộ chạy trên Cloudflare Workers (miễn phí). Cần 1 KV namespace gắn với tên biến: DB
const PAGE = "<!doctype html>\n<html lang=\"vi\">\n<head>\n<meta charset=\"utf-8\">\n<meta name=\"viewport\" content=\"width=device-width,initial-scale=1,viewport-fit=cover\">\n<meta name=\"color-scheme\" content=\"dark\">\n<title>Đăng nhập FlixTV</title>\n<style>\n:root{--bg:#07090f;--fg:#f4f6fa;--mute:rgba(235,240,250,.64);--blue:#0a7bff;--grad:linear-gradient(135deg,#0a7bff,#00229a);--glass:rgba(255,255,255,.09);--line:rgba(255,255,255,.16)}\n*{box-sizing:border-box;-webkit-tap-highlight-color:transparent}\nhtml,body{margin:0;min-height:100%;background:var(--bg);color:var(--fg);font:16px/1.45 -apple-system,\"SF Pro Text\",\"Segoe UI\",Roboto,Arial,sans-serif}\nbody{min-height:100vh;min-height:100dvh;display:flex;align-items:center;justify-content:center;padding:max(20px,env(safe-area-inset-top)) max(16px,env(safe-area-inset-right)) max(20px,env(safe-area-inset-bottom)) max(16px,env(safe-area-inset-left));background:radial-gradient(120% 70% at 50% -10%,rgba(10,123,255,.35),transparent 60%),var(--bg)}\n.card{width:100%;max-width:26rem;padding:1.6rem 1.4rem 1.5rem;border-radius:1.8rem;background:var(--glass);border:1px solid var(--line);box-shadow:inset 0 1px 0 rgba(255,255,255,.2),0 1.2rem 3rem rgba(0,0,0,.45);-webkit-backdrop-filter:blur(1.4rem) saturate(1.6);backdrop-filter:blur(1.4rem) saturate(1.6)}\n.logo{display:flex;align-items:center;gap:.6rem;font-weight:800;font-size:1.35rem;margin-bottom:1.2rem}\n.logo i{width:2rem;height:2rem;border-radius:50%;background:var(--grad);display:inline-flex;align-items:center;justify-content:center}\n.logo i::after{content:\"\";border-left:.6rem solid #fff;border-top:.4rem solid transparent;border-bottom:.4rem solid transparent;margin-left:.15rem}\n.logo b{color:#4da3ff}\nh1{font-size:1.4rem;margin:0 0 .3rem}\np{color:var(--mute);margin:0 0 1rem}\n.tabs{display:flex;gap:.4rem;padding:.25rem;border-radius:3rem;background:rgba(255,255,255,.08);margin-bottom:1.1rem}\n.tabs button{flex:1;border:0;border-radius:3rem;padding:.6rem 0;background:none;color:var(--mute);font:inherit;font-weight:600}\n.tabs button.on{background:var(--grad);color:#fff}\nlabel{display:block;font-size:.85rem;color:var(--mute);margin:.7rem .3rem .25rem}\ninput{width:100%;padding:.85rem 1rem;border-radius:1rem;border:1px solid var(--line);background:rgba(255,255,255,.08);color:var(--fg);font:inherit;font-size:1rem;outline:none}\ninput:focus{border-color:#4da3ff;box-shadow:0 0 0 3px rgba(77,163,255,.3)}\n.btn{display:block;width:100%;margin-top:1.1rem;padding:.9rem 1rem;border:0;border-radius:3rem;background:var(--grad);color:#fff;font:inherit;font-weight:700;font-size:1.05rem}\n.btn:disabled{opacity:.55}\n.btn.ghost{background:rgba(255,255,255,.12);margin-top:.6rem;font-weight:600}\n.err{min-height:1.3rem;margin-top:.8rem;color:#ff8a8a;font-size:.92rem}\n.who{display:flex;align-items:center;gap:.9rem;padding:1rem;border-radius:1.2rem;background:rgba(255,255,255,.08);margin-bottom:1rem}\n.av{width:3.2rem;height:3.2rem;border-radius:50%;background:var(--grad);display:flex;align-items:center;justify-content:center;font-weight:800;font-size:1.4rem;flex:none}\n.who b{display:block;font-size:1.1rem}\n.ok{text-align:center;padding:.5rem 0}\n.tick{width:4.4rem;height:4.4rem;border-radius:50%;background:var(--grad);margin:0 auto 1rem;display:flex;align-items:center;justify-content:center}\n.tick svg{width:2.2rem;height:2.2rem;fill:none;stroke:#fff;stroke-width:3.2;stroke-linecap:round;stroke-linejoin:round}\n[hidden]{display:none!important}\n</style>\n</head>\n<body>\n<div class=\"card\">\n  <div class=\"logo\"><i></i><span>Flix<b>TV</b></span></div>\n\n  <div id=\"bad\" hidden>\n    <h1>Mã QR không hợp lệ</h1>\n    <p>Hãy quét lại mã đang hiện trên TV. Nếu mã đã hết hạn, chọn \"Làm mới mã\" trên TV.</p>\n  </div>\n\n  <div id=\"auth\" hidden>\n    <h1>Đăng nhập TV</h1>\n    <p>Đăng nhập để xác nhận cho chiếc TV vừa quét mã.</p>\n    <div class=\"tabs\"><button id=\"tl\" class=\"on\" type=\"button\">Đăng nhập</button><button id=\"tr\" type=\"button\">Đăng ký</button></div>\n    <form id=\"f\" autocomplete=\"on\">\n      <div id=\"nm\" hidden><label for=\"name\">Tên hiển thị</label><input id=\"name\" maxlength=\"24\" autocomplete=\"nickname\"></div>\n      <label for=\"user\">Tên đăng nhập</label><input id=\"user\" maxlength=\"20\" autocapitalize=\"none\" autocorrect=\"off\" spellcheck=\"false\" autocomplete=\"username\">\n      <label for=\"pass\">Mật khẩu</label><input id=\"pass\" type=\"password\" maxlength=\"64\" autocomplete=\"current-password\">\n      <div id=\"p2w\" hidden><label for=\"pass2\">Nhập lại mật khẩu</label><input id=\"pass2\" type=\"password\" maxlength=\"64\" autocomplete=\"new-password\"></div>\n      <div class=\"err\" id=\"err1\"></div>\n      <button class=\"btn\" id=\"go\" type=\"submit\">Đăng nhập</button>\n    </form>\n  </div>\n\n  <div id=\"conf\" hidden>\n    <h1>Xác nhận đăng nhập</h1>\n    <p>Một chiếc TV đang yêu cầu đăng nhập bằng tài khoản này. Chỉ xác nhận nếu chính bạn vừa quét mã.</p>\n    <div class=\"who\"><div class=\"av\" id=\"cav\"></div><div><b id=\"cname\"></b><span style=\"color:var(--mute)\" id=\"cuser\"></span></div></div>\n    <div class=\"err\" id=\"err2\"></div>\n    <button class=\"btn\" id=\"yes\" type=\"button\">Đăng nhập trên TV</button>\n    <button class=\"btn ghost\" id=\"other\" type=\"button\">Dùng tài khoản khác</button>\n  </div>\n\n  <div id=\"done\" class=\"ok\" hidden>\n    <div class=\"tick\"><svg viewBox=\"0 0 24 24\"><path d=\"M5 12.5l4.5 4.5L19 7.5\"/></svg></div>\n    <h1>Đã đăng nhập trên TV</h1>\n    <p>Bạn có thể đóng trang này.</p>\n  </div>\n</div>\n\n<script>\nconst $=s=>document.querySelector(s);\nconst token=new URLSearchParams(location.search).get('token')||'';\nconst KEY='flixtv_phone';\nlet mode='login',me=null;\nconst load=()=>{try{return JSON.parse(localStorage.getItem(KEY));}catch(e){return null;}};\nconst save=v=>{try{if(v)localStorage.setItem(KEY,JSON.stringify(v));else localStorage.removeItem(KEY);}catch(e){}};\nconst view=id=>['bad','auth','conf','done'].forEach(v=>$('#'+v).hidden=v!==id);\nasync function post(path,data){\n  const r=await fetch(path,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)});\n  let j={};try{j=await r.json();}catch(e){}\n  return j;\n}\nfunction setMode(m){\n  mode=m;$('#tl').classList.toggle('on',m==='login');$('#tr').classList.toggle('on',m==='register');\n  $('#nm').hidden=$('#p2w').hidden=m==='login';$('#go').textContent=m==='login'?'Đăng nhập':'Tạo tài khoản';$('#err1').textContent='';\n  $('#pass').autocomplete=m==='login'?'current-password':'new-password';\n}\nfunction showConfirm(){\n  $('#cname').textContent=me.name||me.user;$('#cuser').textContent='@'+me.user;\n  $('#cav').textContent=String(me.name||me.user).charAt(0).toUpperCase();$('#err2').textContent='';view('conf');\n}\n$('#tl').onclick=()=>setMode('login');$('#tr').onclick=()=>setMode('register');\n$('#f').addEventListener('submit',async e=>{\n  e.preventDefault();const err=$('#err1'),btn=$('#go');err.textContent='';\n  const user=$('#user').value.trim().toLowerCase(),pass=$('#pass').value;\n  if(!user||!pass){err.textContent='Hãy nhập tên đăng nhập và mật khẩu.';return;}\n  if(mode==='register'){\n    if(!$('#name').value.trim()){err.textContent='Hãy nhập tên hiển thị.';return;}\n    if(pass!==$('#pass2').value){err.textContent='Hai mật khẩu chưa khớp.';return;}\n  }\n  btn.disabled=true;\n  try{\n    const j=await post(mode==='login'?'/api/login':'/api/register',{user:user,pass:pass,name:$('#name').value.trim()});\n    if(!j.ok){err.textContent=j.error||'Không thực hiện được. Thử lại.';return;}\n    me={user:user,name:j.name,session:j.session};save(me);$('#pass').value=$('#pass2').value='';showConfirm();\n  }catch(x){err.textContent='Không kết nối được máy chủ.';}\n  finally{btn.disabled=false;}\n});\n$('#yes').onclick=async()=>{\n  const b=$('#yes');b.disabled=true;$('#err2').textContent='';\n  try{\n    const j=await post('/qr/confirm',{token:token,session:me.session});\n    if(j.ok){view('done');return;}\n    if(j.relogin){save(null);me=null;view('auth');$('#err1').textContent=j.error;return;}\n    $('#err2').textContent=j.error||'Không xác nhận được. Thử lại.';\n  }catch(x){$('#err2').textContent='Không kết nối được máy chủ.';}\n  finally{b.disabled=false;}\n};\n$('#other').onclick=()=>{save(null);me=null;view('auth');setMode('login');};\n(async function init(){\n  if(!/^[0-9a-f]{24}$/.test(token)){view('bad');return;}\n  try{const r=await fetch('/qr/check?token='+token),j=await r.json();if(!j.valid){view('bad');return;}}catch(e){}\n  me=load();if(me&&me.session&&me.user)showConfirm();else{view('auth');setMode('login');}\n})();\n</script>\n</body>\n</html>\n";
const CORS = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET,POST,OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type' };
const UN = /^[a-z0-9_.]{3,20}$/, TK = /^[0-9a-f]{24}$/;
const SESSION_TTL = 30 * 24 * 3600, QR_TTL = 180;
const ITER = 20000;

const json = (o, code = 200) => new Response(JSON.stringify(o), { status: code, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...CORS } });
const hex = b => [...new Uint8Array(b)].map(x => x.toString(16).padStart(2, '0')).join('');
const rnd = n => hex(crypto.getRandomValues(new Uint8Array(n)));
async function hashPass(pass, salt) {
  const k = await crypto.subtle.importKey('raw', new TextEncoder().encode(pass), 'PBKDF2', false, ['deriveBits']);
  return hex(await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: new TextEncoder().encode(salt), iterations: ITER }, k, 256));
}
const getU = async (env, u) => { const v = await env.DB.get('u:' + u); return v ? JSON.parse(v) : null; };
const putU = (env, u, rec) => env.DB.put('u:' + u, JSON.stringify(rec));
async function newSession(env, user) { const s = rnd(24); await env.DB.put('s:' + s, user, { expirationTtl: SESSION_TTL }); return s; }
async function sessionUser(env, s) { s = String(s || ''); return /^[0-9a-f]{48}$/.test(s) ? await env.DB.get('s:' + s) : null; }
const num = v => (Number.isFinite(+v) ? +v : 0);
const cleanList = (a, n) => (Array.isArray(a) ? a : []).filter(x => x && typeof x.slug === 'string' && JSON.stringify(x).length < 2000).slice(0, n);

export default {
  async fetch(req, env) {
    const u = new URL(req.url), p = u.pathname;
    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });
    try {
      if (req.method === 'GET' && (p === '/' || p === '/health')) return new Response('FlixTV sync OK', { headers: { 'Content-Type': 'text/plain; charset=utf-8', ...CORS } });
      if (req.method === 'GET' && p === '/qr/approve') return new Response(PAGE, { headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' } });

      if (req.method === 'GET' && p === '/qr/status') {
        const t = u.searchParams.get('token');
        if (!TK.test(t || '')) return json({ status: 'bad' }, 400);
        const raw = await env.DB.get('t:' + t);
        if (!raw) return json({ status: 'pending' });
        const r = JSON.parse(raw);
        if (Date.now() > r.exp) { await env.DB.delete('t:' + t); return json({ status: 'expired' }); }
        if (!r.user) return json({ status: 'pending' });
        await env.DB.delete('t:' + t);
        return json({ status: 'ok', user: r.user, name: r.name, session: await newSession(env, r.user) });
      }
      if (req.method === 'GET' && p === '/qr/check') {
        const t = u.searchParams.get('token');
        if (!TK.test(t || '')) return json({ valid: false });
        const raw = await env.DB.get('t:' + t);
        if (!raw) { await env.DB.put('t:' + t, JSON.stringify({ exp: Date.now() + QR_TTL * 1000 }), { expirationTtl: 600 }); return json({ valid: true }); }
        return json({ valid: Date.now() <= JSON.parse(raw).exp });
      }
      if (req.method === 'GET' && p === '/api/sync') {
        const user = await sessionUser(env, u.searchParams.get('session'));
        const rec = user && await getU(env, user);
        if (!rec) return json({ ok: false, relogin: true }, 401);
        return json({ ok: true, name: rec.name, data: rec.data || {} });
      }

      if (req.method === 'POST') {
        const raw = await req.text();
        if (raw.length > 262144) return json({ ok: false, error: 'Dữ liệu quá lớn.' }, 413);
        let b = {}; try { b = JSON.parse(raw || '{}'); } catch (e) { return json({ ok: false, error: 'Yêu cầu không hợp lệ.' }, 400); }

        if (p === '/api/register') {
          const user = String(b.user || '').trim().toLowerCase(), name = String(b.name || '').trim().slice(0, 24), pass = String(b.pass || '');
          if (!name) return json({ ok: false, error: 'Hãy nhập tên hiển thị.' }, 400);
          if (!UN.test(user)) return json({ ok: false, error: 'Tên đăng nhập gồm 3 đến 20 ký tự: chữ, số, dấu chấm hoặc gạch dưới.' }, 400);
          if (pass.length < 6 || pass.length > 64) return json({ ok: false, error: 'Mật khẩu cần từ 6 đến 64 ký tự.' }, 400);
          if (await getU(env, user)) return json({ ok: false, error: 'Tên đăng nhập này đã có người dùng.' }, 409);
          const salt = rnd(16);
          await putU(env, user, { name, salt, hash: await hashPass(pass, salt), data: {} });
          return json({ ok: true, session: await newSession(env, user), name });
        }
        if (p === '/api/login') {
          const user = String(b.user || '').trim().toLowerCase(), pass = String(b.pass || '');
          const rec = UN.test(user) ? await getU(env, user) : null;
          if (!rec || (await hashPass(pass, rec.salt)) !== rec.hash) return json({ ok: false, error: 'Sai tên đăng nhập hoặc mật khẩu.' }, 401);
          return json({ ok: true, session: await newSession(env, user), name: rec.name });
        }
        if (p === '/api/sync') {
          const user = await sessionUser(env, b.session);
          const rec = user && await getU(env, user);
          if (!rec) return json({ ok: false, relogin: true }, 401);
          const before = JSON.stringify(rec);
          const cur = rec.data || (rec.data = {}), d = b.data || {};
          if (num(d.favT) >= num(cur.favT)) { cur.fav = cleanList(d.fav, 300); cur.favT = num(d.favT); }
          if (num(d.profT) >= num(cur.profT)) {
            cur.av = Number.isInteger(d.av) && d.av >= 0 && d.av < 100 ? d.av : 0;
            const ph = typeof d.photo === 'string' ? d.photo : '';
            cur.photo = ph.length <= 90000 && /^(data:image\/(jpeg|png|webp);base64,|https?:\/\/)/i.test(ph) ? ph : '';
            cur.profT = num(d.profT);
          }
          cur.histClr = Math.max(num(cur.histClr), num(d.histClr));
          const m = new Map();
          for (const x of [...(cur.hist || []), ...cleanList(d.hist, 60)]) {
            if (num(x.t) <= cur.histClr) continue;
            const o = m.get(x.slug);
            if (!o || num(x.t) >= num(o.t)) m.set(x.slug, x);
          }
          cur.hist = [...m.values()].sort((a, c) => num(c.t) - num(a.t)).slice(0, 40);
          if (JSON.stringify(rec) !== before) await putU(env, user, rec); // chỉ ghi khi có thay đổi (KV miễn phí giới hạn 1000 lượt ghi/ngày)
          return json({ ok: true, data: cur });
        }
        if (p === '/qr/confirm') {
          const user = await sessionUser(env, b.session);
          const rec = user && await getU(env, user);
          if (!rec) return json({ ok: false, error: 'Phiên đăng nhập đã hết hạn. Hãy đăng nhập lại.', relogin: true }, 401);
          if (!TK.test(String(b.token || ''))) return json({ ok: false, error: 'Mã QR không hợp lệ.' }, 400);
          const key = 't:' + b.token, raw2 = await env.DB.get(key);
          const r = raw2 ? JSON.parse(raw2) : { exp: Date.now() + QR_TTL * 1000 };
          if (Date.now() > r.exp) return json({ ok: false, error: 'Mã QR đã hết hạn. Hãy làm mới mã trên TV.' }, 410);
          if (r.user) return json({ ok: false, error: 'Mã này đã được dùng.' }, 409);
          r.user = user; r.name = rec.name;
          await env.DB.put(key, JSON.stringify(r), { expirationTtl: 600 });
          return json({ ok: true, name: rec.name });
        }
      }
      return json({ error: 'Không tìm thấy' }, 404);
    } catch (e) {
      return json({ ok: false, error: 'Lỗi máy chủ.' }, 500);
    }
  }
};
