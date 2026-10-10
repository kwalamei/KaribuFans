/* KaribuFans · visitor accounts and saved places.
   Loaded on every page after site.js. It does nothing at all unless accounts are on for this browser:
     - "accounts": {"live": true} in data/site.json switches them on for everyone;
     - while live is false, opening any page with ?preview=accounts switches them on for that browser only
       (remembered as kf_preview_accounts); ?preview=off switches them off again.
   Every account element is in the page with the hidden attribute; this file un-hides them.

   Saved places live in the browser (kf_saved) and work signed out. Each entry is {id, page} plus at most one mark:
     u: <user id>   it is in that person's account (set only when a read of the account shows it)
     p: <user id>   that person wants it in their account; not yet seen there (it is sent again on the next sync)
     k: <user id>   that person chose to keep it on this device only
     no mark        saved on this device, nobody has been asked yet
   Places on the device are never added to an account without a yes (the prompt on the account page).
   kf_saved_gone holds, per user id, places removed here that the account has not yet been told about.
   The Supabase library is fetched only on the account page, or on other pages when this browser holds a sign-in.

   After signing in the visitor is taken back into the site:
     - the account page notes the page of this site the visitor came from (kf_return: path and time, used for an hour);
     - a first sign-in (no display name yet) stays on the account page for the name step ("Save and continue" or
       "Skip for now"), then goes to the first stop of the route (START: Stays; the address comes from data-start on
       the account page); if places saved on this device are waiting for the "Add them to your account?" question, it
       stays on the account page for that answer first, and "Continue to the site" leads on to the first stop;
     - a returning sign-in goes straight to the remembered page (the first stop if there is none), unless places on
       this device are waiting for the "Add them to your account?" question;
     - a later visit to the account page while signed in never moves the visitor anywhere.
   The page arrived at shows "Signed in as ..." once (kf_hello in sessionStorage, removed as soon as it is read). */
(function () {
  'use strict';
  var KF = window.KF, tag = document.getElementById('kfAccount');
  if (!KF || !KF.store || !tag) return;
  var store = KF.store;
  function $(id) { return document.getElementById(id); }
  function each(list, fn) { Array.prototype.forEach.call(list, fn); }
  function show(el, yes) { if (el) el.hidden = !yes; }
  function text(el, t) { if (el && el.textContent !== t) el.textContent = t; }   // unchanged text is left alone, so it is not read out twice
  function map() { return Object.create(null); }
  function plural(n, one, many) { return n + ' ' + (n === 1 ? one : many); }

  // ---- The switch ----
  var params = new URLSearchParams(location.search), pv = params.get('preview');
  if (pv === 'accounts' || pv === 'off') {
    if (pv === 'accounts') store.set('preview_accounts', true); else store.del('preview_accounts');
    try {   // keep the switch out of the address, so a shared link does not carry it
      params.delete('preview'); var qs = params.toString();
      history.replaceState(history.state, '', location.pathname + (qs ? '?' + qs : '') + location.hash);
    } catch (e) {}
  }
  if (!tag.getAttribute('data-live') && store.get('preview_accounts') !== true) return;

  var ROOT = tag.getAttribute('data-root') || './';
  var SB_URL = tag.getAttribute('data-url') || '', SB_KEY = tag.getAttribute('data-key') || '';
  var LIB = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.117.2';
  var TABLE = 'saved_places', MAX = 100, WAIT = 8000;
  var SESSION_KEY = '';   // where the Supabase library keeps the sign-in: sb-<project ref>-auth-token
  try { SESSION_KEY = 'sb-' + new URL(SB_URL).hostname.split('.')[0] + '-auth-token'; } catch (e) {}
  function hasSession() { try { return !!(SESSION_KEY && localStorage.getItem(SESSION_KEY)); } catch (e) { return false; } }
  var REDIRECT = '';      // where Google and the emailed link send the visitor back to: this site's account page
  try { var ru = new URL(ROOT + 'account/', location.href); REDIRECT = ru.origin + ru.pathname; } catch (e) {}

  var acct = $('acctOn');                      // present on the account page only
  var client = null, unsub = null, gen = 0, user = null, known = false, lib = '', remote = '', lastView = '', stayed = 0;

  // ---- The way back into the site after signing in ----
  var HOME = '/';          // the homepage, as a path
  try { HOME = new URL(ROOT, location.href).pathname; } catch (e) {}
  if (HOME.charAt(0) !== '/' || /^\/[\/\\]/.test(HOME)) HOME = '/';
  // A page of this site as path + query, or '' for anything else: another site, an odd scheme, a path outside the
  // site, the account page itself. Checked once as written and once more after the browser has normalised it,
  // because "/.//other.example" is harmless as written and "//other.example" (another site) once normalised.
  function safePath(v) {
    var bad = /^\/[\/\\]|[\\\u0000-\u0020\u007f]/, u, out;
    if (typeof v !== 'string' || v.length > 300 || v.indexOf(HOME) !== 0 || bad.test(v)) return '';
    try {
      u = new URL(v, location.origin);
      if (u.origin !== location.origin || u.pathname.indexOf(HOME) !== 0 || /^account(\/|\.html|$)/i.test(u.pathname.slice(HOME.length))) return '';
      u.searchParams.delete('preview');
      out = u.pathname + u.search;
      if (bad.test(out) || new URL(out, location.origin).origin !== location.origin) return '';
      return out;
    } catch (e) { return ''; }
  }
  function readReturn() {
    var r = store.get('return'), now = Date.now();
    var p = r && typeof r === 'object' && typeof r.t === 'number' && r.t <= now + 60000 && now - r.t <= 3600000 ? safePath(r.p) : '';
    if (r !== null && !p) store.del('return');   // out of date or not usable: do not keep it
    return p;
  }
  var from = '';           // account page: the page of this site the visitor came from, if any
  if (acct) { try { var ref = new URL(document.referrer); if (ref.origin === location.origin) from = safePath(ref.pathname + ref.search); } catch (e) {} }
  // Kept in localStorage, not sessionStorage, because an emailed sign-in link opens in a new tab.
  function remember() { if (from) store.set('return', { p: from, t: Date.now() }); }
  if (acct) { readReturn(); remember(); }
  // Where a signed-in visitor starts when no page is remembered: the first stop of the route. The address is written
  // into the account page by the template (data-start on #acctOn), so it follows the route if the first stop changes.
  var START = '';
  if (acct) { try { START = safePath(new URL(acct.getAttribute('data-start') || '', location.href).pathname); } catch (e) {} }
  START = START || HOME;
  function backTo() { return readReturn() || START; }
  var fresh = false;       // this visit to the account page is a sign-in that has just come back
  var firstIn = false;     // ... and it is the first sign-in of this account: it goes on to the first stop
  var welcome = false;     // ... a first sign-in: the name step is showing
  var leaving = false;     // ... a returning sign-in: on the way to the remembered page
  var departed = false, onSynced = null;
  var hello = false;       // one-shot: this page is where the visitor landed after signing in
  try { hello = sessionStorage.getItem('kf_hello') === '1'; if (hello) sessionStorage.removeItem('kf_hello'); } catch (e) {}
  if (acct) hello = false;
  function who(u) { var m = (u && u.user_metadata) || {}; return String(m.display_name || (u && u.email) || m.full_name || m.name || 'a visitor').replace(/\s+/g, ' ').trim().slice(0, 80); }
  function greetNext() { store.del('return'); try { sessionStorage.setItem('kf_hello', '1'); } catch (e) {} }
  // Leave the account page for a page of this site. The address is always built on this site's own origin.
  function depart(to, replace) {
    var url = location.origin + (safePath(to) || START);
    departed = true; greetNext();
    if (replace) location.replace(url); else location.href = url;   // replace: the Back button must not land on a page that sends the visitor forward again
  }
  // Did this visit to the account page come back from Google or an emailed link? Noted before the library can touch the address.
  var cameBack = !!acct && /(^|[#?&])(error|error_code|error_description)=/.test(location.hash + '&' + location.search);
  // What went wrong, in one word, for the message. Only known codes are matched; the service's own text is never shown.
  var whyBack = '';
  if (cameBack) {
    try {
      var bq = new URLSearchParams(location.search), bh = new URLSearchParams(location.hash.replace(/^#/, ''));
      var bget = function (k) { return String(bh.get(k) || bq.get(k) || ''); };
      var bcode = bget('error_code') + ' ' + bget('error'), bdesc = bget('error_description');
      // The code first; the description only when no code says more. A Google sign-in that lost its place
      // (bad_oauth_state, "OAuth state not found or expired") is not an expired email link: it gets the general message.
      if (/bad_oauth_state|bad_oauth_callback/i.test(bcode)) whyBack = '';
      else if (/otp_expired|flow_state_expired|flow_state_not_found/i.test(bcode)) whyBack = 'expired';
      else if (/provider_disabled|signup_disabled/i.test(bcode)) whyBack = 'off';
      else if (/email link/i.test(bdesc) && /expired|invalid/i.test(bdesc)) whyBack = 'expired';
      else if (/not enabled|unsupported provider|provider is disabled/i.test(bdesc)) whyBack = 'off';
      else if (/access_denied/i.test(bcode)) whyBack = 'denied';
    } catch (e) {}
  }
  // Email sign-in is offered only when the account page has the email form (methods in data/site.json lists "email");
  // without it, nothing here mentions emailed links.
  var emailOn = !!$('acctEmailForm');
  function backMsg(signedIn) {   // the message for a sign-in that came back with an error
    var tail = signedIn ? ' You are still signed in.' : ' You can try again below.';
    if (!emailOn) {
      if (whyBack === 'expired') return 'That sign-in took too long or has been used already.' + tail;
      if (whyBack === 'off') return 'That way of signing in is not switched on yet.' + (signedIn ? tail : ' Please try again later.');
      if (whyBack === 'denied') return 'That sign-in was cancelled or not allowed, so nothing changed.' + tail;
      return 'That sign-in did not finish.' + tail;
    }
    if (whyBack === 'expired') return 'That sign-in link has expired or has been used already.' + (signedIn ? tail : ' You can ask for a new one below.');
    if (whyBack === 'off') return 'That way of signing in is not switched on yet.' + (signedIn ? tail : ' Please use another one below.');
    if (whyBack === 'denied') return 'That sign-in was cancelled or not allowed, so nothing changed.' + tail;
    return 'That sign-in did not finish. If you used an emailed link, it may have expired or been used already.' + (signedIn ? tail : ' You can ask for a new one below.');
  }
  var returned = !!acct && (cameBack || /(^|[#&])(access_token|refresh_token)=/.test(location.hash) || /(^|[?&])code=/.test(location.search));

  // One small status line fixed to the bottom of the screen, for feedback on the save toggles.
  var toast = document.createElement('p'), toastT = 0;
  toast.className = 'toast'; toast.setAttribute('role', 'status'); toast.setAttribute('aria-live', 'polite');
  function say(t) {
    clearTimeout(toastT); toast.textContent = '';
    toastT = setTimeout(function () { toast.textContent = t; toastT = setTimeout(function () { toast.textContent = ''; }, 7000); }, 40);
  }

  // ---- Saved places in the browser ----
  var ID = /^[a-z0-9][a-z0-9_-]{0,79}$/i, UID = /^[a-z0-9-]{1,64}$/i;
  function uidOk(v) { return typeof v === 'string' && UID.test(v); }
  function readSaved() {
    var a = store.get('saved'), out = [], seen = map();
    if (!Array.isArray(a)) return out;
    a.forEach(function (it) {
      if (!it || typeof it.id !== 'string' || typeof it.page !== 'string' || !ID.test(it.id) || !ID.test(it.page) || seen[it.id]) return;
      var e = { id: it.id, page: it.page };
      if (uidOk(it.u)) e.u = it.u; else if (uidOk(it.p)) e.p = it.p; else if (uidOk(it.k)) e.k = it.k;
      seen[it.id] = 1; out.push(e);
    });
    return out.slice(0, MAX);
  }
  function writeSaved(list) { store.set('saved', list.slice(0, MAX)); }
  function at(list, id) { for (var i = 0; i < list.length; i++) if (list[i].id === id) return i; return -1; }
  function onDevice(it) { return !it.u && !it.p; }                 // not in, and not on its way to, any account
  function readGone() {
    var g = store.get('saved_gone'), out = map();
    if (!g || typeof g !== 'object' || Array.isArray(g)) return out;
    Object.keys(g).slice(-5).forEach(function (k) {
      if (uidOk(k) && Array.isArray(g[k])) out[k] = g[k].filter(function (id) { return typeof id === 'string' && ID.test(id); }).slice(-MAX);
    });
    return out;
  }
  function writeGone(g) {
    var o = {}, any = false;
    for (var k in g) if (g[k].length) { o[k] = g[k]; any = true; }
    if (any) store.set('saved_gone', o); else store.del('saved_gone');
  }
  function goneOf(uid) { return readGone()[uid] || []; }
  function goneAdd(uid, id) {
    var g = readGone(), a = g[uid] || (g[uid] = []);
    if (a.indexOf(id) === -1) a.push(id);
    if (a.length > MAX) a.splice(0, a.length - MAX);
    writeGone(g);
  }
  function goneDrop(uid, ids) {
    var g = readGone();
    if (!g[uid]) return;
    g[uid] = g[uid].filter(function (id) { return ids.indexOf(id) === -1; }); writeGone(g);
  }
  // Signed out: the account's places leave this device (they are safe in the account); everything else stays.
  function leave() {
    var list = readSaved(), next = [];
    list.forEach(function (it) { if (it.u) return; if (it.p) delete it.p; next.push(it); });
    if (JSON.stringify(next) !== JSON.stringify(list)) writeSaved(next);
    return next.filter(function (it) { return !idxNow || idxNow[it.id]; }).length;   // how many listed places stay
  }
  // Someone else signed in on this browser: the earlier person's places leave this device only. Their account is not touched.
  function evict(uid) {
    var list = readSaved(), next = [];
    list.forEach(function (it) { if (it.u && it.u !== uid) return; if (it.p && it.p !== uid) delete it.p; next.push(it); });
    if (JSON.stringify(next) !== JSON.stringify(list)) writeSaved(next);
  }

  // ---- The account's copy (Supabase table saved_places) ----
  // Every call goes through one queue, so a save, a removal and a sync can never overtake each other.
  // A call that fails or does not answer in time gives null; nothing on the device is lost because of it.
  var queue = Promise.resolve(), sent = map(), syncing = false, again = false, told = false, offline = false;
  function chain(fn) { queue = queue.then(fn).then(null, function () {}); }
  function call(run) {
    return new Promise(function (done) {
      var t = setTimeout(function () { offline = true; done(null); }, WAIT);
      function end(r) {
        clearTimeout(t);
        // Was the service unreachable (no answer at all), or did it answer with a refusal (table missing, not allowed)?
        offline = !r || navigator.onLine === false || (!!r.error && !r.status && /fetch|network|load failed|timeout/i.test(String(r.error.message || '')));
        done(r && !r.error ? r : null);
      }
      try { Promise.resolve(run(client.from(TABLE))).then(end, function () { end(null); }); } catch (e) { offline = false; clearTimeout(t); done(null); }
    });
  }
  function mine(uid) { return !!client && !!user && user.id === uid; }
  var UPSERT = { onConflict: 'user_id,place_id', ignoreDuplicates: true };
  function upload(uid, ids) {   // send the places this person wants in their account (marked p)
    chain(function () {
      if (!mine(uid)) return;
      var rows = readSaved().filter(function (it) { return it.p === uid && ids.indexOf(it.id) !== -1; });
      if (!rows.length) return;
      return call(function (t) { return t.upsert(rows.map(function (it) { return { user_id: uid, place_id: it.id, page: it.page }; }), UPSERT); }).then(function (r) {
        if (r) { rows.forEach(function (it) { sent[it.id] = 1; }); return; }
        remote = 'fail'; note();
        if (!told) { told = true; say(offline ? 'Saved on this device. It will be added to your account when the connection is back.' : 'Saved on this device. We could not add it to your account just now.'); }
      });
    });
  }
  function flushGone(uid) {     // tell the account about places removed here
    chain(function () {
      if (!mine(uid)) return;
      var ids = goneOf(uid);
      if (!ids.length) return;
      return call(function (t) { return t.delete().eq('user_id', uid).in('place_id', ids); }).then(function (r) {
        if (r) goneDrop(uid, ids); else { remote = 'fail'; note(); }
      });
    });
  }

  function save(id, page) {
    var list = readSaved(), uid = user && user.id;
    if (at(list, id) !== -1) return true;
    if (list.length >= MAX) return false;
    var it = { id: id, page: page };
    if (uid) it.p = uid;          // saved while signed in: it belongs in the account
    list.push(it); writeSaved(list);
    if (uid) { goneDrop(uid, [id]); upload(uid, [id]); }
    return true;
  }
  function unsave(id) {
    var list = readSaved(), i = at(list, id);
    if (i === -1) return;
    var uid = list[i].u || list[i].p;
    list.splice(i, 1); writeSaved(list); delete sent[id];
    if (uid) { goneAdd(uid, id); flushGone(uid); }   // remembered until the account confirms, so it cannot come back
  }

  var indexP = null, idxNow = null;
  function loadIndex() {   // every listed place by id (dist/search-index.json); null if it could not load
    if (!indexP) {
      indexP = fetch(ROOT + 'search-index.json').then(function (r) { return r.ok ? r.json() : null; }).then(function (d) {
        if (!Array.isArray(d)) return null;
        var m = map(); d.forEach(function (v) { if (v && typeof v.id === 'string' && v.id) m[v.id] = v; }); idxNow = m; return m;
      }).catch(function () { return null; });
    }
    return indexP;
  }

  // Bring this device and the account in step: on sign-in and on each later page load while signed in.
  //   1. tell the account about removals it has not heard of;  2. send the places waiting to go up;  3. read the account;
  //   4. merge, looking at the device as it is at that moment, so anything the visitor did meanwhile is kept:
  //        in the account and here                      -> mark as in the account
  //        marked as in this account, no longer there   -> removed on another device, so remove it here
  //        anything else here                           -> left exactly as it is (never uploaded, never deleted)
  //        in the account only                          -> add here
  //      If a place this session has just sent is missing from the read, the read is not trusted and nothing is removed.
  function sync() {
    var uid = user && user.id;
    if (!uid || !client) return;
    if (syncing) { again = true; return; }
    syncing = true;
    flushGone(uid);
    loadIndex().then(function (idx) {
      upload(uid, readSaved().filter(function (it) { return it.p === uid && idx && idx[it.id]; }).map(function (it) { return it.id; }));
      chain(function () {
        if (!mine(uid)) return;
        return call(function (t) { return t.select('place_id,page').eq('user_id', uid); }).then(function (r) {
          if (!mine(uid)) return;
          if (!r || !Array.isArray(r.data)) { remote = 'fail'; return; }
          merge(uid, r.data, idx);
        });
      });
      chain(function () {
        syncing = false; paint(); drawSaved(); note();
        if (again) { again = false; sync(); }
        else if (onSynced) { var f = onSynced; onSynced = null; f(); }
      });
    });
  }
  function merge(uid, rows, idx) {
    var there = map(), gone = goneOf(uid), next = [], unsure = false;
    rows.forEach(function (x) {
      if (x && typeof x.place_id === 'string' && ID.test(x.place_id) && gone.indexOf(x.place_id) === -1) there[x.place_id] = ID.test(String(x.page)) ? String(x.page) : 'stays';
    });
    var list = readSaved();
    list.forEach(function (it) { if (it.p === uid && sent[it.id] && !there[it.id]) unsure = true; });
    list.forEach(function (it) {
      if (there[it.id]) { next.push({ id: it.id, page: it.page, u: uid }); delete there[it.id]; }
      else if (it.u === uid && !unsure) { /* removed on another device */ }
      else next.push(it);
    });
    for (var id in there) next.push({ id: id, page: idx && idx[id] ? idx[id].page : there[id], u: uid });
    writeSaved(next);
    remote = unsure ? 'unsure' : 'ok';
  }

  // ---- Save toggles on cards and in the details drawer: the name stays "Save <place>", aria-pressed carries the state ----
  function paint() {
    var on = map();
    readSaved().forEach(function (it) { on[it.id] = 1; });
    each(document.querySelectorAll('.save-btn'), function (b) {
      var id = b.getAttribute('data-id'), yes = String(!!(id && on[id])), name = 'Save ' + (b.getAttribute('data-name') || 'this place');
      if (b.getAttribute('aria-pressed') !== yes) b.setAttribute('aria-pressed', yes);
      if (b.getAttribute('aria-label') !== name) b.setAttribute('aria-label', name);
    });
  }
  document.addEventListener('click', function (e) {
    var b = e.target.closest ? e.target.closest('.save-btn') : null;
    if (!b) return;
    var id = b.getAttribute('data-id'), page = b.getAttribute('data-page');
    if (!id || !page) return;
    if (b.getAttribute('aria-pressed') === 'true') unsave(id);
    else if (!save(id, page)) say('You can save up to ' + MAX + ' places. Remove one on the account page first.');
    paint();
  });

  // ---- Header entry: a person icon, or the first letter of the name once signed in ----
  function nameOf(u) {
    var m = (u && u.user_metadata) || {};
    var n = m.display_name || m.full_name || m.name || String((u && u.email) || '').split('@')[0];
    return String(n || '').replace(/\s+/g, ' ').trim().slice(0, 60) || 'Visitor';
  }
  function header() {
    var a = $('acctLink'), ini = $('acctInitial');
    if (!a || !ini) return;
    var n = user ? nameOf(user) : '', label = user ? 'Account: ' + n : 'Account';
    a.classList.toggle('is-in', !!user);
    if (a.getAttribute('aria-label') !== label) a.setAttribute('aria-label', label);
    text(ini, user ? (n.codePointAt ? String.fromCodePoint(n.codePointAt(0)) : n.charAt(0)).toUpperCase() : '');
    show(ini, !!user);
  }

  // ---- The Supabase library: fetched only when needed, and never waited on for more than a few seconds ----
  function loadLib() {
    if (lib) return;
    lib = 'loading';
    var s = document.createElement('script');
    s.src = LIB; s.async = true;
    s.onload = start; s.onerror = down;
    setTimeout(down, WAIT);
    document.head.appendChild(s);
  }
  function down() { if (known || lib === 'down') return; lib = 'down'; view(); }
  function start() {
    try {
      // Only the account page is ever a sign-in return address, so only it lets the library read the address.
      // When the address carries an error (an expired link) the library is kept away from it altogether, because it
      // would also throw away a sign-in that is still good; the fixed message below is shown instead.
      var g = ++gen;   // answers from a client that has been retired are ignored
      client = window.supabase.createClient(SB_URL, SB_KEY, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: !!acct && !cameBack && !known } });
      // The library asks that nothing else is called from inside this callback, hence the timer.
      var s = client.auth.onAuthStateChange(function (ev, session) { setTimeout(function () { if (g === gen) setUser(session ? session.user : null); }, 0); });
      unsub = s && s.data ? s.data.subscription : null;
      client.auth.getSession().then(function (r) { if (g === gen) setUser(r && r.data && r.data.session ? r.data.session.user : null); }, function () { if (g === gen) down(); });
    } catch (e) { client = null; down(); }
  }
  function dropKey() { try { localStorage.removeItem(SESSION_KEY); localStorage.removeItem(SESSION_KEY + '-code-verifier'); } catch (e) {} }
  // After a sign-out the library could not complete: stop using that client altogether, and for a few seconds make
  // sure nothing it still had in flight puts the sign-in back. A new client is made if the visitor signs in again.
  function retire() {
    var old = client, n = 0;
    gen++; client = null;
    try { if (unsub && unsub.unsubscribe) unsub.unsubscribe(); } catch (e) {}
    unsub = null;
    try { var r = old && old.auth.stopAutoRefresh ? old.auth.stopAutoRefresh() : null; if (r && r.then) r.then(null, function () {}); } catch (e) {}
    var t = setInterval(function () { if (hasSession()) { try { localStorage.removeItem(SESSION_KEY); } catch (e) {} } if (++n >= 24) clearInterval(t); }, 250);
  }
  function connected() {   // a client to sign in with; made afresh after retire()
    if (!client && lib === 'ready' && window.supabase) { dropKey(); start(); }
    return !!client;
  }
  // Which sign-in methods the project has switched on. Asked once per page, when the signed-out view is shown, so that
  // a method that is off can be explained here instead of sending the visitor to the service's own error page.
  // The answer is null when it cannot be asked (no reply within 4 seconds, an error): sign-in then goes ahead as usual.
  var settingsP = null, settingsIn = false;
  function settings() {
    if (!settingsP) settingsP = new Promise(function (done) {
      var ctl = null, over = false;
      try { ctl = new AbortController(); } catch (e) {}
      var end = function (d) {
        if (over) return;
        over = true; settingsIn = true; clearTimeout(t);
        var x = d && typeof d === 'object' ? d.external : null;
        done(x && typeof x === 'object' ? { google: x.google !== false, email: x.email !== false } : null);
      };
      var t = setTimeout(function () { end(null); try { if (ctl) ctl.abort(); } catch (e) {} }, 4000);
      try {
        fetch(SB_URL.replace(/\/+$/, '') + '/auth/v1/settings', { headers: { apikey: SB_KEY }, credentials: 'omit', signal: ctl ? ctl.signal : undefined })
          .then(function (r) { return r.ok ? r.json() : null; }).then(end, function () { end(null); });
      } catch (e) { end(null); }
    });
    return settingsP;
  }
  function onward() { return firstIn ? START : backTo(); }   // where "Continue to the site" leads
  // The name step is done (saved or skipped). On to the first stop, unless places on this device are waiting for the
  // question: then the account page stays, now showing the saved places and the question, and says why.
  // As in settle(), a read of the account still under way is waited for first (up to 6 seconds), because places on
  // this device may turn out to be in the account already, and then there is nothing to ask.
  var askNote = false;     // the status line is showing "Before you go on: ..."
  function afterWelcome(msg) {
    var lead = msg ? msg + ' ' : '', over = false;
    welcome = false; header();
    var end = function () {
      if (over) return;
      over = true; onSynced = null;
      if (!user || !leaving) return;
      leaving = false;
      if (!asking()) { depart(START, false); return; }
      view(); askNote = true;
      text($('acctStatus'), lead + 'Before you go on: what about the places saved on this device?');
      var h = $('savedH'); if (h) h.focus();
      drawSaved();
    };
    leaving = true;
    if (!syncing) { end(); return; }
    view(); text($('acctStatus'), lead + 'Checking your saved places…'); $('acctH').focus();   // the name form has gone: keep focus at the top
    onSynced = end;
    setTimeout(end, 6000);
  }
  function named(u) { var m = (u && u.user_metadata) || {}; return typeof m.display_name === 'string' && !!m.display_name.trim(); }
  function asking() {      // are places on this device waiting for "Add them to your account?"
    var uid = user && user.id;
    return !!uid && readSaved().some(function (it) { return onDevice(it) && it.k !== uid && (!idxNow || idxNow[it.id]); });
  }
  // A returning sign-in: straight back to where the visitor was. If places on this device might need the question,
  // wait for the account to be read first (they may already be in it); if they still need it, or the account does
  // not answer in time, stay on the account page, where "Continue to the site" leads on.
  function settle() {
    if (!asking()) { depart(backTo(), true); return; }
    var over = false, end = function (stay) {
      if (over) return;
      over = true; onSynced = null;
      if (!leaving || !user) return;
      if (stay || asking()) { leaving = false; view(); } else depart(backTo(), true);
    };
    onSynced = function () { end(false); };
    setTimeout(function () { end(true); }, 6000);
  }
  function setUser(u) {
    var was = user ? user.id : null, first = !known;
    known = true; lib = 'ready';
    user = u && u.id ? u : null;
    if (first) {
      tidyAddress();
      // A sign-in has just come back to the account page: name step the first time, otherwise on into the site.
      if (user && returned && !cameBack) { fresh = true; if (named(user)) leaving = true; else welcome = firstIn = true; }
    }
    if (user) evict(user.id);
    else { remote = ''; welcome = leaving = false; if (!hasSession()) stayed = leave(); }   // only once the sign-in is really gone from this browser
    header(); view();
    if (hello && user) { hello = false; say('Signed in as ' + who(user) + '.'); }
    if (user && user.id !== was) { sent = map(); told = false; paint(); sync(); if (leaving) settle(); }
    else if (first || was) { paint(); drawSaved(); }              // the library repeats itself (tab refocus): nothing to redo
  }
  function tidyAddress() {   // after a sign-in return, leave the bare address: no tokens, no error, no stray "#"
    if (!returned) return;
    try {
      var q = new URLSearchParams(location.search);
      ['code', 'error', 'error_code', 'error_description'].forEach(function (k) { q.delete(k); });
      var s = q.toString();
      history.replaceState(history.state, '', location.pathname + (s ? '?' + s : ''));
    } catch (e) {}
  }
  function human(err) {   // the service's reason, short and in plain words
    var m = String((err && (err.message || err.error_description)) || ''), code = err && err.status;
    if (code === 429 || /rate limit|security purposes|too many/i.test(m)) return 'Too many tries. Please wait a minute and try again.';
    if (!m || /failed to fetch|networkerror|load failed|network request/i.test(m)) return 'The sign-in service could not be reached. Check your connection and try again.';
    if (/email/i.test(m) && /invalid|valid/i.test(m)) return 'That email address was not accepted. Check it and try again.';
    if (/not allowed|not enabled|disabled|unsupported/i.test(m)) return 'This way of signing in is not open yet.';
    m = m.replace(/\s+/g, ' ').trim();
    if (/^[{\[]/.test(m)) return 'It did not work. Please try again in a moment.';   // never the service's raw answer
    return 'It did not work: ' + (m.length > 90 ? m.slice(0, 89) + '…' : m);
  }

  // ---- Account page ----
  var data = {};
  try { data = JSON.parse($('acctData').textContent); } catch (e) {}
  var stops = Array.isArray(data.stops) ? data.stops : [];
  function busy(btn, yes) { if (!btn) return; if (yes) btn.setAttribute('aria-disabled', 'true'); else btn.removeAttribute('aria-disabled'); }
  function isBusy(btn) { return btn.getAttribute('aria-disabled') === 'true'; }

  function view() {
    if (!acct) return;
    var v = known ? (user ? (leaving ? 'leaving' : (welcome ? 'welcome' : 'in')) : 'out') : (lib === 'down' ? 'down' : 'checking');
    var inn = v === 'in' || v === 'welcome';
    show($('acctDown'), v === 'down'); show($('acctOut'), v === 'out'); show($('acctIn'), inn); show($('acctFoot'), v === 'in');
    show($('acctSaved'), v !== 'welcome' && v !== 'leaving');
    text($('acctH'), v === 'welcome' ? 'Karibu! What should we call you?' : (v === 'in' ? 'Karibu, ' + nameOf(user) : (v === 'out' ? 'Sign in' : 'Your account')));
    if (inn) text($('acctWho'), user.email || '');
    if (v !== lastView) {
      var msg = ''; askNote = false;
      if (v === 'checking') msg = 'Checking your account…';
      else if (v === 'leaving') msg = asking() ? 'You are signed in. Checking your saved places…' : 'You are signed in. Taking you back to the site…';
      else if (v === 'out' && lastView === 'in' && !hasSession()) msg = 'You are signed out. The places in your account are kept there.' + (stayed ? ' ' + plural(stayed, 'place stays', 'places stay') + ' on this device.' : '');
      else if ((v === 'out' || v === 'in') && cameBack) msg = backMsg(v === 'in');
      text($('acctStatus'), msg);
      if (v === 'out' || v === 'in') cameBack = false;
      if (v === 'out') { busy($('acctGoogle'), false); busy($('acctEmailGo'), false); busy($('acctSignOut'), false); settings(); }
      if (inn) {   // the same name form serves as the welcome step on a first sign-in and as the profile afterwards
        var w = v === 'welcome', m = user.user_metadata || {}, nGo = $('acctNameGo');
        $('acctName').value = w ? String(m.full_name || m.name || '').replace(/\s+/g, ' ').trim().slice(0, 60) : nameOf(user);
        text($('acctNameLabel'), w ? 'Your name' : 'Display name');
        text(nGo, w ? 'Save and continue' : 'Save name'); nGo.classList.toggle('btn-primary', w); nGo.classList.toggle('btn-ghost', !w);
        show($('acctSkipP'), w); show($('acctGoP'), !w);
        $('acctGo').href = onward(); $('acctSkip').href = START;
        nameMsg('Shown only to you, on this page and in the menu bar.', false);
        if (w || lastView === 'welcome' || lastView === 'leaving') $('acctH').focus();
      }
      lastView = v;
    }
    note();
  }
  function note() {   // one quiet line above the saved list: where the places are kept
    if (!acct) return;
    var list = readSaved(), uid = user && user.id, inAcct = 0, waiting = 0, loose = 0;
    list.forEach(function (it) {
      if (idxNow && !idxNow[it.id]) return;   // count what the list shows
      if (uid && it.u === uid) inAcct++; if (uid && it.p === uid) waiting++; if (uid && onDevice(it)) loose++;
    });
    var t = '';
    if (uid && remote === 'ok' && !waiting) t = inAcct && loose ? inAcct + ' in your account, ' + loose + ' on this device only.' : (inAcct ? 'Saved to your account. Sign in on any phone to see them.' : '');
    else if (list.length) t = 'Saved on this device' + (uid ? ' for now.' : (known ? '. Sign in to keep them on any phone.' : '.'));
    text($('savedNote'), t);
  }
  var focusRow = -1, drawn = null;
  function drawSaved() {
    var box = $('savedGroups');
    if (!box) return;
    loadIndex().then(function (idx) {
      var list = readSaved(), uid = user && user.id, by = map(), shown = 0, loose = 0, unasked = 0;
      var sig = JSON.stringify([uid, !!idx, list]);
      if (sig === drawn && focusRow === -1) { note(); return; }   // nothing changed: leave the list, and the keyboard focus, alone
      // Remember which control has the keyboard, to hand focus back to its twin after the list is rebuilt.
      var act = document.activeElement, had = box.contains(act) ? (act.getAttribute('data-remove') ? 'data-remove' : 'data-open') : '', hadId = had ? act.getAttribute(had) : '';
      if (had && focusRow === -1) focusRow = Array.prototype.indexOf.call(box.querySelectorAll('[data-remove]'), act.parentNode.querySelector('[data-remove]'));
      drawn = sig; box.textContent = '';
      if (!idx) { show($('savedEmpty'), false); show($('savedGone'), false); show($('savedAsk'), false); show($('savedLater'), false); focusRow = -1; text($('savedNote'), list.length ? 'Your saved places could not load. Please refresh the page.' : ''); return; }
      list.forEach(function (it) {
        var v = idx[it.id];
        if (!v) return;
        (by[v.page] = by[v.page] || []).push({ v: v, loose: !!uid && onDevice(it) });
        if (uid && onDevice(it)) { loose++; if (it.k !== uid) unasked++; }
      });
      stops.forEach(function (s) {
        var rows = by[s.slug];
        if (!rows) return;
        var sec = document.createElement('div'), h = document.createElement('h3'), ul = document.createElement('ul');
        sec.className = 'saved-group'; ul.className = 'results saved-list';
        h.textContent = 'Stop ' + s.stop + ' · ' + s.label;
        rows.forEach(function (x) {
          var v = x.v, li = document.createElement('li'), a = document.createElement('a'), t = document.createElement('strong'), m = document.createElement('span'), b = document.createElement('button');
          a.href = ROOT + v.page + '/#place-' + encodeURIComponent(v.id); a.setAttribute('data-open', v.id);
          t.textContent = v.name; m.textContent = v.type + ' · ' + v.area + (x.loose ? ' · on this device only' : '');
          b.type = 'button'; b.className = 'chip'; b.textContent = 'Remove';
          b.setAttribute('aria-label', 'Remove ' + v.name + ' from saved'); b.setAttribute('data-remove', v.id); b.setAttribute('data-name', v.name);
          a.appendChild(t); a.appendChild(m); li.appendChild(a); li.appendChild(b); ul.appendChild(li); shown++;
        });
        sec.appendChild(h); sec.appendChild(ul); box.appendChild(sec);
      });
      var gone = list.length - shown;
      show($('savedEmpty'), shown === 0);
      show($('savedGone'), gone > 0);
      text($('savedGoneText'), plural(gone, 'saved place is', 'saved places are') + ' no longer listed.');
      // Places on this device that are not in the account: ask once; after a "no", keep a quiet way to change that.
      show($('savedAsk'), unasked > 0); show($('savedLater'), unasked === 0 && loose > 0);
      if (askNote && unasked === 0) { askNote = false; text($('acctStatus'), ''); }   // nothing is left to ask: drop "Before you go on" 
      text($('savedAskText'), 'You have ' + plural(loose, 'place', 'places') + ' saved on this device. Add ' + (loose === 1 ? 'it' : 'them') + ' to your account?');
      text($('savedLaterText'), plural(loose, 'place is', 'places are') + ' on this device only.');
      note();
      if (focusRow !== -1) {
        var twin = hadId ? box.querySelector('[' + had + '="' + hadId + '"]') : null, btns = box.querySelectorAll('[data-remove]');
        var to = twin || btns[Math.min(focusRow, btns.length - 1)] || $('savedH');
        focusRow = -1; if (to) to.focus();
      }
    });
  }
  function nameMsg(t, bad) {
    var el = $('acctNameMsg'), box = $('acctName');
    text(el, t); el.classList.toggle('field-err', !!bad);
    if (bad) box.setAttribute('aria-invalid', 'true'); else box.removeAttribute('aria-invalid');
  }
  function emailErr(t, soft) {   // soft: not a mistake in the field
    var el = $('acctEmailErr'), box = $('acctEmail');
    text(el, t); show(el, !!t);
    if (t && !soft) box.setAttribute('aria-invalid', 'true'); else box.removeAttribute('aria-invalid');
  }

  if (acct) {
    var google = $('acctGoogle'), eForm = $('acctEmailForm'), nForm = $('acctNameForm');
    if (google) google.addEventListener('click', function () {
      if (isBusy(google) || !connected()) return;
      var oops = function (err) { busy(google, false); text($('acctStatus'), ''); text($('acctGoogleMsg'), 'Google sign-in did not start. ' + human(err)); };
      busy(google, true); text($('acctGoogleMsg'), ''); text($('acctStatus'), settingsIn ? 'Opening Google…' : 'One moment…');
      settings().then(function (s) {
        if (s && !s.google) {   // the project has not switched Google on: say so here instead of sending the visitor to an error page
          busy(google, false); text($('acctStatus'), '');
          text($('acctGoogleMsg'), 'Google sign-in is not switched on yet.' + (eForm && s.email ? ' Use an email link for now.' : ''));
          return;
        }
        if (!connected()) { busy(google, false); text($('acctStatus'), ''); return; }
        remember(); text($('acctStatus'), 'Opening Google…');
        try { client.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: REDIRECT } }).then(function (r) { if (r && r.error) oops(r.error); }, oops); } catch (e) { oops(e); }
      });
    });
    // Back from Google with the Back button: the page may be shown again exactly as it was left, so make the button usable.
    window.addEventListener('pageshow', function (e) {
      busy(google, false); busy($('acctEmailGo'), false); busy($('acctNameGo'), false);
      if (/^(Opening Google|One moment)…$/.test($('acctStatus').textContent)) text($('acctStatus'), '');
      // Back to this page after it sent the visitor on: it is now an ordinary visit, so show the profile and stay put.
      if (e.persisted && departed) { departed = fresh = firstIn = welcome = leaving = false; view(); }
    });
    if (eForm) {
      var eBox = $('acctEmail'), eGo = $('acctEmailGo'), sentBox = $('acctSent');
      eBox.addEventListener('input', function () { if (eBox.getAttribute('aria-invalid')) emailErr(''); });
      eForm.addEventListener('submit', function (e) {
        e.preventDefault();
        if (isBusy(eGo) || !connected()) return;
        var email = eBox.value.trim();
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) { emailErr('Enter your email address, for example name@example.com.'); eBox.focus(); return; }
        var oops = function (err) { busy(eGo, false); text($('acctStatus'), ''); emailErr(human(err)); eBox.focus(); };
        emailErr(''); busy(eGo, true); text($('acctStatus'), 'Sending your sign-in link…');
        settings().then(function (s) {
          if (s && !s.email) { busy(eGo, false); text($('acctStatus'), ''); emailErr('Email sign-in is not switched on yet.', true); return; }
          if (!connected()) { busy(eGo, false); text($('acctStatus'), ''); return; }
          remember();
          try {
            client.auth.signInWithOtp({ email: email, options: { emailRedirectTo: REDIRECT } }).then(function (r) {
              if (r && r.error) { oops(r.error); return; }
              busy(eGo, false); text($('acctStatus'), '');
              text($('acctSentTo'), email); show(eForm, false); show(sentBox, true); sentBox.focus();
            }, oops);
          } catch (x) { oops(x); }
        });
      });
      $('acctSentBack').addEventListener('click', function () { show(sentBox, false); show(eForm, true); eBox.focus(); });
    }
    nForm.addEventListener('submit', function (e) {
      e.preventDefault();
      var go = $('acctNameGo'), box = $('acctName'), n = box.value.replace(/\s+/g, ' ').trim();
      if (!client || !user || isBusy(go)) return;
      if (!n || n.length > 60) { nameMsg('Enter a name of up to 60 characters.', true); box.focus(); return; }
      var oops = function (err) { busy(go, false); nameMsg(human(err), true); };
      busy(go, true); nameMsg('Saving…', false);
      try {
        client.auth.updateUser({ data: { display_name: n } }).then(function (r) {
          if (r && r.error) { oops(r.error); return; }
          busy(go, false);
          if (r && r.data && r.data.user && user && r.data.user.id === user.id) user = r.data.user;
          if (welcome) { afterWelcome('Name saved.'); return; }   // first sign-in: on to the first stop
          header(); view(); box.value = nameOf(user); nameMsg('Name saved.', false);
        }, oops);
      } catch (x) { oops(x); }
    });
    // Sign out of this browser. The library asks the service first and can leave the sign-in in place when the service
    // cannot be reached, so afterwards the stored sign-in is checked and, if it is still there, removed here.
    $('acctSignOut').addEventListener('click', function () {
      var go = $('acctSignOut'), over = false;
      if (!client || isBusy(go)) return;
      // clean: the library said it signed out. Anything else (an error, a rejection, no answer in 4 seconds, or the
      // sign-in still being in storage) is a forced sign-out: the sign-in is removed here and that client is retired.
      var finish = function (clean) {
        if (over) return;
        over = true; clearTimeout(timer);
        if (!clean || hasSession()) { dropKey(); if (!hasSession()) retire(); }
        if (hasSession()) { busy(go, false); text($('acctStatus'), 'Signing out did not work in this browser. Please try again.'); return; }
        store.del('return');
        setUser(null);
        var h = $('acctH'); if (h) h.focus();
      };
      var timer = setTimeout(function () { finish(false); }, 4000);
      busy(go, true);
      try { client.auth.signOut({ scope: 'local' }).then(function (r) { finish(!(r && r.error)); }, function () { finish(false); }); } catch (e) { finish(false); }
    });
    $('acctRetry').addEventListener('click', function () { location.reload(); });
    // First sign-in, no name for now: on to the first stop (the link's own address), or to the device-places question.
    $('acctSkip').addEventListener('click', function (e) {
      if (!welcome || e.ctrlKey || e.metaKey || e.shiftKey || e.altKey || e.button !== 0) return;   // a new tab or window: let the browser have it
      e.preventDefault(); afterWelcome('');
    });
    // "Continue to the site" straight after a sign-in (the visitor stayed to answer about device places): greet there too.
    $('acctGo').addEventListener('click', function () { if (fresh) { fresh = false; greetNext(); } });
    $('savedGroups').addEventListener('click', function (e) {
      var b = e.target.closest ? e.target.closest('[data-remove]') : null;
      if (!b) return;
      focusRow = Array.prototype.indexOf.call($('savedGroups').querySelectorAll('[data-remove]'), b);
      unsave(b.getAttribute('data-remove'));
      text($('savedMsg'), 'Removed ' + b.getAttribute('data-name') + '.');
      drawSaved();
    });
    $('savedGoneClear').addEventListener('click', function () {
      loadIndex().then(function (idx) {
        if (!idx) return;
        readSaved().forEach(function (it) { if (!idx[it.id]) unsave(it.id); });
        text($('savedMsg'), 'Cleared.'); focusRow = 0; drawSaved();
      });
    });
    // The answer to "Add them to your account?"
    var answer = function (yes) {
      var uid = user && user.id;
      if (!uid) return;
      loadIndex().then(function (idx) {
        var list = readSaved(), n = 0;
        list.forEach(function (it) {
          if (!onDevice(it) || !idx || !idx[it.id]) return;
          delete it.k; n++;
          if (yes) it.p = uid; else it.k = uid;
        });
        writeSaved(list);
        text($('savedMsg'), yes ? 'Adding ' + plural(n, 'place', 'places') + ' to your account.' : plural(n, 'place stays', 'places stay') + ' on this device only.');
        var h = $('savedH'); if (h) h.focus();
        if (yes) sync();
        drawSaved();
      });
    };
    $('savedAskAdd').addEventListener('click', function () { answer(true); });
    $('savedAskKeep').addEventListener('click', function () { answer(false); });
    $('savedLaterAdd').addEventListener('click', function () { answer(true); });
  }

  // ---- Switch on ----
  document.documentElement.classList.add('kf-accounts');
  each(document.querySelectorAll('[data-acct]'), function (el) { el.hidden = false; });
  document.body.appendChild(toast);
  if (acct) { show($('acctOff'), false); show(acct, true); }
  paint(); header();
  document.addEventListener('kf:place', paint);   // site.js: the drawer now shows another place
  window.addEventListener('storage', function (e) { if (e.key === 'kf_saved') { paint(); drawSaved(); } });
  window.addEventListener('pageshow', function (e) { if (e.persisted) { paint(); drawSaved(); } });
  if (acct || hasSession()) loadLib(); else leave();
  view(); drawSaved();
})();
