/* iCompare backend client: stats, reports, reviews (Cloudflare Worker API, no cookies) */
(function () {
  var API = "https://icompare-api.hvc9594852.workers.dev";
  var ON = /^https:\/\//.test(API);
  // never record bots/automation or the site owner (any browser that has opened /admin/)
  var UA = navigator.userAgent || "";
  var BOT = navigator.webdriver || /bot|crawl|spider|slurp|headless|lighthouse|pagespeed|google|bing|yandex|baidu|preview|phantom|puppeteer|playwright|selenium/i.test(UA) || !(navigator.languages && navigator.languages.length);
  var OWNER = false; try { OWNER = localStorage.getItem("icmp-notrack") === "1"; } catch (e) {}
  var REC = ON && !BOT && !OWNER;
  var sid;
  try { sid = sessionStorage.getItem("icb-sid"); if (!sid) { sid = Math.random().toString(36).slice(2) + Date.now().toString(36); sessionStorage.setItem("icb-sid", sid); } } catch (e) { sid = "x" + Math.random().toString(36).slice(2); }
  var device = /iPad|Tablet/i.test(navigator.userAgent) ? "tablet" : (/Mobi|Android|iPhone/i.test(navigator.userAgent) ? "mobile" : "desktop");
  function api(path, opt) {
    if (!ON) return Promise.reject(new Error("backend not configured"));
    opt = opt || {};
    return fetch(API + path, { method: opt.method || "GET", headers: opt.body ? { "Content-Type": "application/json" } : {}, body: opt.body ? JSON.stringify(opt.body) : undefined, keepalive: !!opt.keepalive })
      .then(function (r) { return r.json().then(function (j) { if (!r.ok) throw new Error(j.error || r.status); return j; }); });
  }
  var lastKey = "";
  function track(type, d) {
    if (!REC) return;
    d = d || {};
    var key = type + "|" + (d.cat || "") + "|" + (d.items || []).join(",");
    if (type !== "view" && key === lastKey) return; lastKey = key;
    var ref = "";
    try { if (document.referrer && new URL(document.referrer).host !== location.host) ref = document.referrer.slice(0, 300); } catch (e) {}
    api("/e", { method: "POST", keepalive: true, body: { type: type, path: location.pathname.slice(0, 300), cat: d.cat || null, items: d.items ? d.items.slice(0, 3) : null, ref: type === "view" ? ref || null : null, sid: sid, device: device } }).catch(function () {});
  }
  var esc = function (s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); };
  var stars = function (n) { n = Math.round(n); return "★★★★★".slice(0, n) + "☆☆☆☆☆".slice(0, 5 - n); };

  // ---------- styles ----------
  var css = ".icb{font:inherit}.icb h3{font-size:19px;margin:28px 0 10px}.icb .sum{display:flex;align-items:center;gap:10px;margin-bottom:8px}.icb .big{font-size:30px;font-weight:600}.icb .st{color:#f5a623;letter-spacing:2px}" +
    ".icb .rv{border-bottom:1px solid rgba(16,17,19,.09);padding:12px 0}.icb .rv b{font-weight:600}.icb .rv small{color:#8b8e94;margin-left:6px}.icb .rv p{margin:4px 0 0;white-space:pre-wrap}" +
    ".icb form{display:grid;gap:10px;background:#f3f3f1;border-radius:18px;padding:16px;margin-top:14px;max-width:640px}.icb input,.icb textarea,.icb select{font:inherit;padding:10px 12px;border:1px solid rgba(16,17,19,.15);border-radius:12px;background:#fff;width:100%}" +
    ".icb textarea{min-height:90px;resize:vertical}.icb .rate{display:flex;gap:4px;font-size:28px;cursor:pointer;color:#ccc;user-select:none}.icb .rate span.on{color:#f5a623}.icb button{font:inherit;border:0;border-radius:999px;padding:10px 18px;background:#2337e6;color:#fff;font-weight:500;cursor:pointer;justify-self:start}" +
    ".icb button[disabled]{opacity:.5}.icb .msg{font-size:14px}.icb .hp{position:absolute;left:-9999px}.icb .muted{color:#8b8e94;font-size:14px}" +
    ".icb-modal{position:fixed;inset:0;z-index:100;background:rgba(16,17,19,.45);display:grid;place-items:center;padding:16px}.icb-modal .box{background:#fff;border-radius:24px;max-width:520px;width:100%;padding:8px 20px 20px;max-height:90vh;overflow:auto}.icb-modal .x{float:right;background:none;color:#4e5157;font-size:22px;padding:6px 10px}";
  function addCss() { if (document.getElementById("icb-css")) return; var s = document.createElement("style"); s.id = "icb-css"; s.textContent = css; document.head.appendChild(s); }

  function reportForm(pre) {
    pre = pre || {};
    return '<form data-f="report"><input class="hp" name="website" tabindex="-1" autocomplete="off">' +
      '<label>หัวข้อ<select name="kind"><option value="price">ราคาไม่ถูกต้อง</option><option value="spec">สเปกไม่ถูกต้อง</option><option value="photo">รูปไม่ถูกต้อง/ไม่สวย</option><option value="missing">อยากให้เพิ่มรุ่นนี้</option><option value="other">อื่นๆ</option></select></label>' +
      '<label>รุ่นที่เกี่ยวข้อง<input name="product_name" maxlength="160" value="' + esc(pre.name || "") + '" placeholder="เช่น iPhone 17 Pro"></label>' +
      '<label>รายละเอียด<textarea name="message" maxlength="2000" required placeholder="บอกว่าข้อมูลไหนผิด และค่าที่ถูกต้องคืออะไร (ถ้ามีลิงก์อ้างอิงยิ่งดี)"></textarea></label>' +
      '<label>ช่องทางติดต่อกลับ (ไม่บังคับ)<input name="contact" maxlength="160" placeholder="อีเมลหรือ LINE"></label>' +
      '<input type="hidden" name="product_id" value="' + esc(pre.id || "") + '"><button>ส่งแจ้ง</button><div class="msg" aria-live="polite"></div></form>';
  }
  function reviewForm(pid, name) {
    return '<form data-f="review"><input class="hp" name="website" tabindex="-1" autocomplete="off"><div class="muted">ให้คะแนน ' + esc(name) + '</div>' +
      '<div class="rate" role="radiogroup" aria-label="ให้ดาว">' + [1, 2, 3, 4, 5].map(function (i) { return '<span role="radio" tabindex="0" data-v="' + i + '" aria-label="' + i + ' ดาว">★</span>'; }).join("") + '</div>' +
      '<input type="hidden" name="rating" value="0"><label>ชื่อที่แสดง<input name="name" maxlength="60" required placeholder="ชื่อเล่น"></label>' +
      '<label>รีวิว<textarea name="body" maxlength="2000" required placeholder="ใช้งานจริงเป็นยังไง ข้อดี ข้อเสีย"></textarea></label>' +
      '<input type="hidden" name="product_id" value="' + esc(pid) + '"><input type="hidden" name="product_name" value="' + esc(name) + '"><button>ส่งรีวิว</button>' +
      '<div class="muted">รีวิวจะแสดงหลังผ่านการตรวจสอบ</div><div class="msg" aria-live="polite"></div></form>';
  }
  function wire(root) {
    var t0 = Date.now();
    root.querySelectorAll(".rate").forEach(function (r) {
      var set = function (v) { r.parentNode.querySelector('[name=rating]').value = v; r.querySelectorAll("span").forEach(function (s) { s.classList.toggle("on", +s.dataset.v <= v); s.setAttribute("aria-checked", +s.dataset.v === v); }); };
      r.addEventListener("click", function (e) { if (e.target.dataset.v) set(+e.target.dataset.v); });
      r.addEventListener("keydown", function (e) { if ((e.key === "Enter" || e.key === " ") && e.target.dataset.v) { e.preventDefault(); set(+e.target.dataset.v); } });
    });
    root.querySelectorAll("form[data-f]").forEach(function (f) {
      f.addEventListener("submit", function (e) {
        e.preventDefault();
        var m = f.querySelector(".msg"), b = f.querySelector("button"), fd = Object.fromEntries(new FormData(f));
        if (fd.website || Date.now() - t0 < 2500) { m.textContent = "ขอบคุณครับ"; return; }
        delete fd.website;
        if (f.dataset.f === "review" && !(+fd.rating >= 1)) { m.textContent = "กรุณาเลือกจำนวนดาว"; return; }
        if (f.dataset.f === "review") fd.rating = +fd.rating;
        if (f.dataset.f === "report") fd.page = location.href.slice(0, 300);
        Object.keys(fd).forEach(function (k) { if (fd[k] === "") fd[k] = null; });
        b.disabled = true; m.textContent = "กำลังส่ง…";
        api(f.dataset.f === "review" ? "/review" : "/report", { method: "POST", body: fd })
          .then(function () { f.reset(); f.querySelectorAll(".rate span").forEach(function (s) { s.classList.remove("on"); }); m.textContent = f.dataset.f === "review" ? "ส่งรีวิวแล้ว ขอบคุณครับ! จะแสดงหลังตรวจสอบ" : "ได้รับแจ้งแล้ว ขอบคุณที่ช่วยให้ข้อมูลถูกต้องขึ้นครับ"; })
          .catch(function (er) { m.textContent = /rate/.test(er.message) ? "ส่งบ่อยเกินไป ลองใหม่ภายหลัง" : "ส่งไม่สำเร็จ ลองใหม่อีกครั้ง"; })
          .then(function () { b.disabled = false; });
      });
    });
  }
  function mountProduct(el, pid, name) {
    if (!ON || !el) return; addCss();
    el.className = (el.className + " icb").trim();
    el.innerHTML = '<h3>รีวิวจากผู้ใช้</h3><div class="icb-list muted">กำลังโหลดรีวิว…</div>' + reviewForm(pid, name) +
      '<h3>เจอข้อมูลผิด?</h3><div class="muted">แจ้งเราได้ ทีมงานจะตรวจสอบและแก้ไข</div>' + reportForm({ id: pid, name: name });
    wire(el);
    api("/reviews?pid=" + encodeURIComponent(pid)).then(function (rows) {
      var L = el.querySelector(".icb-list");
      if (!rows.length) { L.textContent = "ยังไม่มีรีวิว เป็นคนแรกที่รีวิวรุ่นนี้"; return; }
      var avg = rows.reduce(function (a, r) { return a + r.rating; }, 0) / rows.length;
      L.className = "icb-list";
      L.innerHTML = '<div class="sum"><span class="big">' + avg.toFixed(1) + '</span><span class="st">' + stars(avg) + '</span><span class="muted">' + rows.length + ' รีวิว</span></div>' +
        rows.map(function (r) { return '<div class="rv"><span class="st">' + stars(r.rating) + '</span> <b>' + esc(r.name) + '</b><small>' + new Date(r.ts).toLocaleDateString("th-TH") + '</small><p>' + esc(r.body) + '</p></div>'; }).join("");
    }).catch(function () { el.querySelector(".icb-list").textContent = ""; });
  }
  function openReport(pre) {
    if (!ON) return; addCss();
    var w = document.createElement("div"); w.className = "icb-modal icb"; w.setAttribute("role", "dialog"); w.setAttribute("aria-modal", "true");
    w.innerHTML = '<div class="box"><button class="x" aria-label="ปิด">×</button><h3>แจ้งข้อมูลผิด / ขอเพิ่มรุ่น</h3>' + reportForm(pre) + '</div>';
    var close = function () { w.remove(); document.removeEventListener("keydown", k); };
    var k = function (e) { if (e.key === "Escape") close(); };
    w.addEventListener("click", function (e) { if (e.target === w || e.target.classList.contains("x")) close(); });
    document.addEventListener("keydown", k);
    document.body.appendChild(w); wire(w); setTimeout(function () { var t = w.querySelector("textarea"); if (t) t.focus(); }, 50);
  }
  window.iCB = { on: ON, track: track, mountProduct: mountProduct, openReport: openReport, popular: popular };
  track("view");
  // a /vs/a--b/ page is itself a comparison
  var vs = location.pathname.match(/^\/vs\/([^/]+?)--([^/]+?)\/?$/);
  if (vs) track("compare", { items: [decodeURIComponent(vs[1]), decodeURIComponent(vs[2])], cat: (document.documentElement.getAttribute("data-cat") || null) });
  // time on site: send visible time in small deltas when the tab is hidden or closed (text/plain beacon: no CORS preflight)
  var shown = document.visibilityState === "visible" ? Date.now() : 0, acc = 0;
  function flush() {
    if (shown) { acc += Date.now() - shown; shown = 0; }
    if (!REC || acc < 1000) return;
    var body = JSON.stringify({ type: "leave", dur: acc, path: location.pathname.slice(0, 300), sid: sid, device: device });
    acc = 0;
    try { if (navigator.sendBeacon && navigator.sendBeacon(API + "/e", new Blob([body], { type: "text/plain" }))) return; } catch (e) {}
    try { fetch(API + "/e", { method: "POST", body: body, keepalive: true, headers: { "Content-Type": "text/plain" } }); } catch (e) {}
  }
  document.addEventListener("visibilitychange", function () { if (document.visibilityState === "hidden") flush(); else shown = Date.now(); });
  window.addEventListener("pagehide", flush);
  function popular(cat) { return api("/popular?days=14" + (cat ? "&cat=" + encodeURIComponent(cat) : "")); }
  document.addEventListener("DOMContentLoaded", function () {
    var m = document.getElementById("icb-product"); if (m) mountProduct(m, m.dataset.id, m.dataset.name);
    document.querySelectorAll("[data-icb-report]").forEach(function (b) { b.addEventListener("click", function (e) { e.preventDefault(); openReport({}); }); if (ON) b.hidden = false; });
  });
})();
