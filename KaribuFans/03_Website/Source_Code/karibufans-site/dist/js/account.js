/* KaribuFans · visitor accounts and saved places.
   Loaded on every page after site.js. It does nothing at all unless accounts are on for this browser:
     - "accounts": {"live": true} in data/site.json switches them on for everyone;
     - while live is false, opening any page with ?preview=accounts switches them on for that browser only
       (remembered as kf_preview_accounts); ?preview=off switches them off again.
   Every account element is in the page with the hidden attribute; this file un-hides them.
   Saved places live in the browser (kf_saved) and work signed out. When the visitor is signed in they are
   also kept in the Supabase table saved_places. The Supabase library is fetched only on the account page,
   or on other pages when this browser already holds a sign-in. */
(function () {
  'use strict';
  var KF = window.KF, tag = document.getElementById('kfAccount');
  if (!KF || !KF.store || !tag) return;
  var store = KF.store;
  function $(id) { return document.getElementById(id); }
  function each(list, fn) { Array.prototype.forEach.call(list, fn); }
  function show(el, yes) { if (el) el.hidden = !yes; }
  function text(el, t) { if (el) el.textContent = t; }
  function map() { return Object.create(null); }

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
  var client = null, user = null, known = false, lib = '', remote = '', lastView = '';
  var cameBack = acct && /(^|[#?&])(error|error_code|error_description)=/.test(location.hash + '&' + location.search);
  var live = document.createElement('p');      // quiet announcements on pages without their own status line
  live.className = 'sr-only'; live.setAttribute('role', 'status'); live.setAttribute('aria-live', 'polite');

  // ---- Saved places in the browser: a list of {id, page}; s: 1 marks an entry known to be in the account ----
  var ID = /^[a-z0-9][a-z0-9_-]{0,79}$/i;
  function readSaved() {
    var a = store.get('saved'), out = [], seen = map();
    if (!Array.isArray(a)) return out;
    a.forEach(function (it) {
      if (!it || typeof it.id !== 'string' || typeof it.page !== 'string' || !ID.test(it.id) || !ID.test(it.page) || seen[it.id]) return;
      seen[it.id] = 1; out.push(it.s ? { id: it.id, page: it.page, s: 1 } : { id: it.id, page: it.page });
    });
    return out.slice(0, MAX);
  }
  function writeSaved(list) { store.set('saved', list.slice(0, MAX)); }
  function at(list, id) { for (var i = 0; i < list.length; i++) if (list[i].id === id) return i; return -1; }
  function mark(ids) {   // these ids are now in the account
    var list = readSaved(), hit = false;
    list.forEach(function (it) { if (ids.indexOf(it.id) !== -1 && !it.s) { it.s = 1; hit = true; } });
    if (hit) writeSaved(list);
  }
  function unmark() {    // signed out: keep every place on this device, forget which were in the account
    var list = readSaved(), hit = false;
    list.forEach(function (it) { if (it.s) { delete it.s; hit = true; } });
    if (hit) writeSaved(list);
  }

  // ---- The account's copy (Supabase table saved_places). Any failure is silent: the place stays saved on this device. ----
  function db(run, ok) {
    if (!client || !user) return;
    var bad = function () { remote = 'fail'; note(); };
    try { run(client.from(TABLE), user.id).then(function (r) { if (r && !r.error) { if (ok) ok(r); } else bad(); }, bad); } catch (e) { bad(); }
  }
  function row(it, uid) { return { user_id: uid, place_id: it.id, page: it.page }; }
  var UPSERT = { onConflict: 'user_id,place_id', ignoreDuplicates: true };

  function save(id, page) {
    var list = readSaved();
    if (at(list, id) !== -1) return true;
    if (list.length >= MAX) return false;
    var it = { id: id, page: page }; list.push(it); writeSaved(list);
    db(function (t, uid) { return t.upsert(row(it, uid), UPSERT); }, function () { mark([id]); });
    return true;
  }
  function unsave(id) {
    var list = readSaved(), i = at(list, id);
    if (i === -1) return;
    list.splice(i, 1); writeSaved(list);
    db(function (t, uid) { return t.delete().eq('user_id', uid).eq('place_id', id); });
  }

  var indexP = null;
  function loadIndex() {   // every listed place by id (dist/search-index.json); null if it could not load
    if (!indexP) {
      indexP = fetch(ROOT + 'search-index.json').then(function (r) { return r.ok ? r.json() : null; }).then(function (d) {
        if (!Array.isArray(d)) return null;
        var m = map(); d.forEach(function (v) { if (v && typeof v.id === 'string' && v.id) m[v.id] = v; }); return m;
      }).catch(function () { return null; });
    }
    return indexP;
  }

  // On sign-in, and on each later page load while signed in: bring this device and the account in step.
  //   in both                         -> keep
  //   here only, never in the account -> add to the account (saved while signed out, or while offline)
  //   here only, was in the account   -> removed on another device, so remove it here too
  //   in the account only             -> add here
  function sync() {
    var uid = user && user.id;
    if (!uid) return;
    loadIndex().then(function (idx) {
      db(function (t) { return t.select('place_id,page').eq('user_id', uid); }, function (r) {
        if (!user || user.id !== uid || !Array.isArray(r.data)) return;
        var there = map(), next = [], push = [];
        r.data.forEach(function (x) { if (x && typeof x.place_id === 'string' && ID.test(x.place_id)) there[x.place_id] = ID.test(String(x.page)) ? String(x.page) : 'stays'; });
        readSaved().forEach(function (it) {
          if (there[it.id]) { it.s = 1; next.push(it); delete there[it.id]; }
          else if (!it.s) { next.push(it); if (idx && idx[it.id]) push.push(it); }   // only places still listed go to the account
        });
        for (var id in there) next.push({ id: id, page: idx && idx[id] ? idx[id].page : there[id], s: 1 });
        writeSaved(next); remote = 'ok';
        if (push.length) db(function (t) { return t.upsert(push.map(function (it) { return row(it, uid); }), UPSERT); }, function () { mark(push.map(function (it) { return it.id; })); });
        paint(); drawSaved();
      });
    });
  }

  // ---- Save toggles on cards and in the details drawer ----
  function paint() {
    var on = map();
    readSaved().forEach(function (it) { on[it.id] = 1; });
    each(document.querySelectorAll('.save-btn'), function (b) {
      var id = b.getAttribute('data-id'), name = b.getAttribute('data-name') || 'this place', yes = !!(id && on[id]);
      b.setAttribute('aria-pressed', String(yes));
      b.setAttribute('aria-label', yes ? 'Remove ' + name + ' from saved' : 'Save ' + name);
    });
  }
  document.addEventListener('click', function (e) {
    var b = e.target.closest ? e.target.closest('.save-btn') : null;
    if (!b) return;
    var id = b.getAttribute('data-id'), page = b.getAttribute('data-page');
    if (!id || !page) return;
    text(live, '');
    if (b.getAttribute('aria-pressed') === 'true') unsave(id);
    else if (!save(id, page)) text(live, 'You can save up to ' + MAX + ' places. Remove one on the account page first.');
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
    var n = user ? nameOf(user) : '';
    a.classList.toggle('is-in', !!user);
    a.setAttribute('aria-label', user ? 'Account: ' + n : 'Account');
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
      client = window.supabase.createClient(SB_URL, SB_KEY, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } });
      // The library asks that nothing else is called from inside this callback, hence the timer.
      client.auth.onAuthStateChange(function (ev, session) { setTimeout(function () { setUser(session ? session.user : null); }, 0); });
      client.auth.getSession().then(function (r) { setUser(r && r.data && r.data.session ? r.data.session.user : null); }, down);
    } catch (e) { client = null; down(); }
  }
  function setUser(u) {
    var was = user ? user.id : null, first = !known;
    known = true; lib = 'ready';
    user = u && u.id ? u : null;
    if (first) tidyAddress();
    if (!user) { unmark(); remote = ''; }
    header(); view();
    if (user && user.id !== was) sync(); else if (first || was) drawSaved();   // redraw only when something changed
  }
  function tidyAddress() {   // after a sign-in redirect, take the tokens (or the error) out of the address bar
    if (!acct) return;
    try {
      var q = new URLSearchParams(location.search), hit = /(^|[#&])(access_token|refresh_token|error|error_code|error_description)=/.test(location.hash);
      ['code', 'error', 'error_code', 'error_description'].forEach(function (k) { if (q.has(k)) { q.delete(k); hit = true; } });
      if (hit) { var s = q.toString(); history.replaceState(history.state, '', location.pathname + (s ? '?' + s : '')); }
    } catch (e) {}
  }
  function human(err) {   // the service's reason, short and in plain words
    var m = String((err && (err.message || err.error_description)) || ''), code = err && err.status;
    if (code === 429 || /rate limit|security purposes|too many/i.test(m)) return 'Too many tries. Please wait a minute and try again.';
    if (!m || /failed to fetch|networkerror|load failed|network request/i.test(m)) return 'The sign-in service could not be reached. Check your connection and try again.';
    if (/email/i.test(m) && /invalid|valid/i.test(m)) return 'That email address was not accepted. Check it and try again.';
    if (/not allowed|not enabled|disabled|unsupported/i.test(m)) return 'This way of signing in is not open yet.';
    m = m.replace(/\s+/g, ' ').trim();
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
    var v = known ? (user ? 'in' : 'out') : (lib === 'down' ? 'down' : 'checking');
    show($('acctDown'), v === 'down'); show($('acctOut'), v === 'out'); show($('acctIn'), v === 'in'); show($('acctFoot'), v === 'in');
    text($('acctH'), v === 'in' ? 'Karibu, ' + nameOf(user) : (v === 'out' ? 'Sign in' : 'Your account'));
    if (v === 'in') text($('acctWho'), user.email || '');
    if (v !== lastView) {
      var msg = '';
      if (v === 'checking') msg = 'Checking your account…';
      else if (v === 'out' && lastView === 'in') msg = 'You are signed out. Your saved places stay on this device.';
      else if (v === 'out' && cameBack) msg = 'That sign-in link did not work. It may have expired or been used already. Ask for a new one below.';
      text($('acctStatus'), msg);
      if (v === 'out') { cameBack = false; busy($('acctGoogle'), false); busy($('acctEmailGo'), false); }
      if (v === 'in') { $('acctName').value = nameOf(user); nameMsg('Shown only to you, on this page and in the menu bar.', false); }
      lastView = v;
    }
    note();
  }
  function note() {   // one quiet line above the saved list: where the places are kept
    if (!acct) return;
    var n = readSaved().length;
    text($('savedNote'), user && remote === 'ok' ? 'Saved to your account. Sign in on any phone to see them.' :
      (n ? 'Saved on this device' + (user ? ' for now.' : (known ? '. Sign in to keep them on any phone.' : '.')) : ''));
  }
  var focusRow = -1;
  function drawSaved() {
    var box = $('savedGroups');
    if (!box) return;
    loadIndex().then(function (idx) {
      var list = readSaved(), by = map(), shown = 0;
      box.textContent = '';
      if (!idx) { show($('savedEmpty'), false); show($('savedGone'), false); text($('savedNote'), list.length ? 'Your saved places could not load. Please refresh the page.' : ''); return; }
      list.forEach(function (it) { var v = idx[it.id]; if (v) (by[v.page] = by[v.page] || []).push(v); });
      stops.forEach(function (s) {
        var rows = by[s.slug];
        if (!rows) return;
        var sec = document.createElement('div'), h = document.createElement('h3'), ul = document.createElement('ul');
        sec.className = 'saved-group'; ul.className = 'results saved-list';
        h.textContent = 'Stop ' + s.stop + ' · ' + s.label;
        rows.forEach(function (v) {
          var li = document.createElement('li'), a = document.createElement('a'), t = document.createElement('strong'), m = document.createElement('span'), b = document.createElement('button');
          a.href = ROOT + v.page + '/#place-' + encodeURIComponent(v.id);
          t.textContent = v.name; m.textContent = v.type + ' · ' + v.area;
          b.type = 'button'; b.className = 'chip'; b.textContent = 'Remove';
          b.setAttribute('aria-label', 'Remove ' + v.name + ' from saved'); b.setAttribute('data-remove', v.id); b.setAttribute('data-name', v.name);
          a.appendChild(t); a.appendChild(m); li.appendChild(a); li.appendChild(b); ul.appendChild(li); shown++;
        });
        sec.appendChild(h); sec.appendChild(ul); box.appendChild(sec);
      });
      var gone = list.length - shown;
      show($('savedEmpty'), shown === 0);
      show($('savedGone'), gone > 0);
      text($('savedGoneText'), gone + (gone === 1 ? ' saved place is' : ' saved places are') + ' no longer listed.');
      note();
      if (focusRow !== -1) {   // after Remove: keep the keyboard where it was
        var btns = box.querySelectorAll('[data-remove]'), to = btns[Math.min(focusRow, btns.length - 1)] || $('savedH');
        focusRow = -1; if (to) to.focus();
      }
    });
  }
  function nameMsg(t, bad) {
    var el = $('acctNameMsg'), box = $('acctName');
    text(el, t); el.classList.toggle('field-err', !!bad);
    if (bad) box.setAttribute('aria-invalid', 'true'); else box.removeAttribute('aria-invalid');
  }
  function emailErr(t) {
    var el = $('acctEmailErr'), box = $('acctEmail');
    text(el, t); show(el, !!t);
    if (t) box.setAttribute('aria-invalid', 'true'); else box.removeAttribute('aria-invalid');
  }

  if (acct) {
    var google = $('acctGoogle'), eForm = $('acctEmailForm'), nForm = $('acctNameForm');
    if (google) google.addEventListener('click', function () {
      if (!client || isBusy(google)) return;
      var oops = function (err) { busy(google, false); text($('acctStatus'), 'Google sign-in did not start. ' + human(err)); };
      busy(google, true); text($('acctStatus'), 'Opening Google…');
      try { client.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: REDIRECT } }).then(function (r) { if (r && r.error) oops(r.error); }, oops); } catch (e) { oops(e); }
    });
    if (eForm) {
      var eBox = $('acctEmail'), eGo = $('acctEmailGo'), sent = $('acctSent');
      eBox.addEventListener('input', function () { if (eBox.getAttribute('aria-invalid')) emailErr(''); });
      eForm.addEventListener('submit', function (e) {
        e.preventDefault();
        if (!client || isBusy(eGo)) return;
        var email = eBox.value.trim();
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) { emailErr('Enter your email address, for example name@example.com.'); eBox.focus(); return; }
        var oops = function (err) { busy(eGo, false); text($('acctStatus'), ''); emailErr(human(err)); eBox.focus(); };
        emailErr(''); busy(eGo, true); text($('acctStatus'), 'Sending your sign-in link…');
        try {
          client.auth.signInWithOtp({ email: email, options: { emailRedirectTo: REDIRECT } }).then(function (r) {
            if (r && r.error) { oops(r.error); return; }
            busy(eGo, false); text($('acctStatus'), '');
            text($('acctSentTo'), email); show(eForm, false); show(sent, true); sent.focus();
          }, oops);
        } catch (x) { oops(x); }
      });
      $('acctSentBack').addEventListener('click', function () { show(sent, false); show(eForm, true); eBox.focus(); });
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
          header(); view(); box.value = nameOf(user); nameMsg('Name saved.', false);
        }, oops);
      } catch (x) { oops(x); }
    });
    $('acctSignOut').addEventListener('click', function () {
      if (!client) return;
      var done = function () { if (user) setUser(null); var h = $('acctH'); if (h) h.focus(); };
      // If the service cannot be reached, still sign out on this device.
      try { client.auth.signOut().then(function (r) { if (r && r.error) return client.auth.signOut({ scope: 'local' }); }).then(done, done); } catch (e) { done(); }
    });
    $('acctRetry').addEventListener('click', function () { location.reload(); });
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
  }

  // ---- Switch on ----
  document.documentElement.classList.add('kf-accounts');
  each(document.querySelectorAll('[data-acct]'), function (el) { el.hidden = false; });
  document.body.appendChild(live);
  if (acct) { show($('acctOff'), false); show(acct, true); }
  paint(); header();
  document.addEventListener('kf:place', paint);   // site.js: the drawer now shows another place
  window.addEventListener('storage', function (e) { if (e.key === 'kf_saved') { paint(); drawSaved(); } });
  window.addEventListener('pageshow', function (e) { if (e.persisted) { paint(); drawSaved(); } });
  if (acct || hasSession()) loadLib(); else unmark();
  view(); drawSaved();
})();
