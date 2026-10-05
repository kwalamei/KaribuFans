(function () {
  'use strict';
  var store = {
    get: function (k) { try { return JSON.parse(localStorage.getItem('kf_' + k)); } catch (e) { return null; } },
    set: function (k, v) { try { localStorage.setItem('kf_' + k, JSON.stringify(v)); } catch (e) {} }
  };
  function $(id) { return document.getElementById(id); }

  // Mobile menu
  var nav = $('nav'), menuBtn = $('menuBtn');
  if (nav && menuBtn) {
    menuBtn.addEventListener('click', function () {
      var open = nav.classList.toggle('open');
      menuBtn.setAttribute('aria-expanded', String(open));
      menuBtn.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    });
  }

  // Language (remembered; only English content exists so far)
  var langBtns = document.querySelectorAll('.langs [data-lang]');
  var langs = Array.prototype.map.call(langBtns, function (b) { return b.getAttribute('data-lang'); });
  function setLang(l) {
    if (langs.indexOf(l) === -1) l = 'EN';
    store.set('lang', l);
    if ($('langBtn')) $('langBtn').textContent = l;
    langBtns.forEach(function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-lang') === l)); });
    var note = $('langNote');
    if (note) note.textContent = l === 'EN' ? 'Kiswahili, French, Arabic and Portuguese coming after launch.' : 'This language is coming soon. The site is shown in English for now.';
  }
  langBtns.forEach(function (b) { b.addEventListener('click', function () { setLang(b.getAttribute('data-lang')); }); });
  if ($('langBtn')) $('langBtn').addEventListener('click', function () {
    var cur = store.get('lang') || 'EN';
    setLang(langs[(langs.indexOf(cur) + 1) % langs.length]);
  });
  setLang(store.get('lang') || 'EN');

  // Nairobi time (EAT, UTC+3, no daylight saving)
  function nairobiMinutes() {
    var d = new Date();
    return ((d.getUTCHours() + 3) % 24) * 60 + d.getUTCMinutes();
  }
  function toMin(s) { var p = String(s).split(':'); return (+p[0]) * 60 + (+p[1] || 0); }
  function isOpen(open, close) {
    var n = nairobiMinutes(), o = toMin(open), c = toMin(close);
    return c > o ? (n >= o && n < c) : (n >= o || n < c);
  }

  // Listings: open-now badges, filters and search, remembered per page
  var grid = $('cards');
  if (grid && grid.getAttribute('data-page') !== 'stays') {
    var page = grid.getAttribute('data-page');
    var cards = grid.querySelectorAll('.card');
    var chips = document.querySelectorAll('.chip[data-filter]');
    var box = $('pageSearch'), none = $('noMatch');
    cards.forEach(function (c) {
      var o = c.getAttribute('data-open'), cl = c.getAttribute('data-close'), el = c.querySelector('.open-state');
      if (o && cl && el) {
        var open = isOpen(o, cl);
        c.setAttribute('data-now', open ? 'open' : 'closed');
        el.textContent = open ? 'Open now' : 'Closed';
        el.className = 'open-state ' + (open ? 'is-open' : 'is-closed');
      }
    });
    var state = store.get('filter_' + page) || { chip: 'all', q: '' };
    function apply() {
      var q = (state.q || '').trim().toLowerCase(), shown = 0;
      cards.forEach(function (c) {
        var tags = Array.prototype.map.call(c.querySelectorAll('.tags span'), function (s) { return s.textContent; });
        var f = state.chip;
        var okChip = f === 'all' || (f === 'open-now' ? c.getAttribute('data-now') === 'open' : (c.getAttribute('data-type') === f || tags.indexOf(f) !== -1));
        var okText = !q || (c.getAttribute('data-search') || '').indexOf(q) !== -1;
        c.hidden = !(okChip && okText);
        if (!c.hidden) shown++;
      });
      chips.forEach(function (ch) { ch.setAttribute('aria-pressed', String(ch.getAttribute('data-filter') === state.chip)); });
      if (none) none.hidden = shown !== 0;
      store.set('filter_' + page, state);
    }
    chips.forEach(function (ch) { ch.addEventListener('click', function () { state.chip = ch.getAttribute('data-filter'); apply(); }); });
    if (box) { box.value = state.q || ''; box.addEventListener('input', function () { state.q = box.value; apply(); }); }
    if (!document.querySelector('.chip[data-filter="' + state.chip + '"]')) state.chip = 'all';
    apply();
  }

  // Stays: area / vibe / type filters, details drawer, WhatsApp enquiry
  var sd = $('staysData');
  if (sd && grid) {
    var S = JSON.parse(sd.textContent), byId = {};
    S.listings.forEach(function (v) { byId[v.id] = v; });
    var sCards = grid.querySelectorAll('.card');
    var fA = $('fArea'), fV = $('fVibe'), fT = $('fType'), sBox = $('pageSearch');
    var st = store.get('filter_stays2') || { a: '', v: '', t: '', q: '' };
    var bar = $('stayFilters'), navEl = $('nav');
    function setTop() { if (bar && navEl) bar.style.top = navEl.offsetHeight + 'px'; }
    setTop(); window.addEventListener('resize', setTop);
    function has(sel, val) { return Array.prototype.some.call(sel.options, function (o) { return o.value === val; }); }
    if (!has(fA, st.a)) st.a = ''; if (!has(fV, st.v)) st.v = ''; if (!has(fT, st.t)) st.t = '';
    function applyStays() {
      var q = (st.q || '').trim().toLowerCase(), shown = 0;
      sCards.forEach(function (c) {
        var ok = (!st.a || (st.a === '__near' ? c.getAttribute('data-near') === '1' : c.getAttribute('data-area') === st.a)) &&
          (!st.v || c.getAttribute('data-vibe') === st.v) &&
          (!st.t || c.getAttribute('data-type') === st.t) &&
          (!q || (c.getAttribute('data-search') || '').indexOf(q) !== -1);
        c.hidden = !ok; if (ok) shown++;
      });
      fA.value = st.a; fV.value = st.v; fT.value = st.t;
      [fA, fV, fT].forEach(function (s) { s.parentNode.classList.toggle('on', !!s.value); });
      var any = !!(st.a || st.v || st.t || q);
      $('fClear').hidden = !any;
      $('stayCount').textContent = shown + (shown === 1 ? ' stay' : ' stays');
      $('noMatch').hidden = shown !== 0;
      var help = $('vibeHelp'), vb = S.vibes.filter(function (x) { return x.name === st.v; })[0];
      help.hidden = !vb; if (vb) help.textContent = vb.icon + ' ' + vb.name + ': ' + vb.desc;
      store.set('filter_stays2', st);
    }
    function clearStays() { st = { a: '', v: '', t: '', q: '' }; sBox.value = ''; applyStays(); }
    fA.addEventListener('change', function () { st.a = fA.value; applyStays(); });
    fV.addEventListener('change', function () { st.v = fV.value; applyStays(); });
    fT.addEventListener('change', function () { st.t = fT.value; applyStays(); });
    sBox.value = st.q || ''; sBox.addEventListener('input', function () { st.q = sBox.value; applyStays(); });
    $('fClear').addEventListener('click', clearStays); $('noMatchClear').addEventListener('click', clearStays);
    applyStays();

    // Drawer
    var dr = $('stayDrawer'), veil = $('stayVeil'), cur = null, lastFocus = null;
    var dIn = $('dIn'), dOut = $('dOut'), dGuests = $('dGuests'), dWho = $('dWho'), dWa = $('dWa');
    function iso(d) { return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2); }
    var MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    function nice(s) { var p = s.split('-'); return (+p[2]) + ' ' + MON[+p[1] - 1] + ' ' + p[0]; }
    dIn.min = iso(new Date());
    var saved = store.get('stay_dates') || {};
    if (saved.i && saved.i >= dIn.min) dIn.value = saved.i;
    if (saved.o && saved.o > (dIn.value || dIn.min)) dOut.value = saved.o;
    if (saved.g) dGuests.value = saved.g;
    function message() {
      var err = $('dErr'), bad = dIn.value && dOut.value && dOut.value <= dIn.value;
      err.hidden = !bad; if (bad) err.textContent = 'Check-out needs to be after check-in.';
      var t = 'Hi ' + cur.name + '! I found your stay on ' + S.site + ' and would love to check availability';
      if (dIn.value && dOut.value && !bad) t += ' for ' + nice(dIn.value) + ' to ' + nice(dOut.value);
      else if (dIn.value) t += ' from ' + nice(dIn.value);
      if (dGuests.value) t += ', ' + dGuests.value + (dGuests.value === '1' ? ' guest' : ' guests');
      t += '. My name is ' + (dWho.value.trim() ? dWho.value.trim() + '.' : '');
      $('dPreview').textContent = t;
      if (cur.whatsapp && !bad) { dWa.href = 'https://wa.me/' + cur.whatsapp + '?text=' + encodeURIComponent(t); dWa.removeAttribute('aria-disabled'); }
      else { dWa.removeAttribute('href'); dWa.setAttribute('aria-disabled', 'true'); }
      dOut.min = dIn.value || dIn.min;
      store.set('stay_dates', { i: dIn.value, o: dOut.value, g: dGuests.value });
    }
    [dIn, dOut, dGuests, dWho].forEach(function (el) { el.addEventListener('input', function () { if (cur) message(); }); });
    function fill(v) {
      cur = v;
      var ph = $('dPhotos'); ph.textContent = '';
      for (var i = 0; i < 3; i++) {
        var box = document.createElement('div'); box.className = 'd-photo';
        if (v.photos && v.photos[i]) { var im = document.createElement('img'); im.src = v.photos[i]; im.alt = v.name + ', photo ' + (i + 1); im.loading = 'lazy'; box.appendChild(im); }
        else { box.textContent = 'Photo ' + (i + 1); }
        ph.appendChild(box);
      }
      $('dSample').hidden = !v.sample;
      $('dName').textContent = v.name;
      var vb = S.vibes.filter(function (x) { return x.name === v.vibe; })[0];
      $('dMeta').textContent = v.type + ' · ' + v.area + (vb ? ' · ' + vb.icon + ' ' + vb.name : '');
      $('dPrice').textContent = v.price;
      $('dChecked').hidden = !v.price_checked; $('dChecked').textContent = v.price_checked ? 'Price last confirmed ' + v.price_checked + '. Ask the host for your dates.' : '';
      $('dAbout').textContent = v.about || ''; $('dAbout').hidden = !v.about;
      var ul = $('dAmen'); ul.textContent = '';
      (v.amenities || []).forEach(function (a) { var li = document.createElement('li'); li.textContent = (S.icons[a] ? S.icons[a] + ' ' : '') + a; ul.appendChild(li); });
      $('dDist').hidden = !v.dist; $('dDist').textContent = v.dist || '';
      $('dWaNote').hidden = !!v.whatsapp;
      var call = $('dCall'); call.hidden = !v.phone; if (v.phone) call.href = 'tel:' + v.phone;
      $('dMap').href = 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(v.map_query || (v.name + ' ' + v.area + ' Nairobi'));
      message();
    }
    function show(id, push) {
      var v = byId[id]; if (!v) return;
      if (dr.hidden) lastFocus = document.activeElement;
      fill(v);
      dr.hidden = false; veil.hidden = false; document.body.classList.add('drawer-open');
      requestAnimationFrame(function () { dr.classList.add('in'); veil.classList.add('in'); });
      dr.querySelector('.drawer-scroll').scrollTop = 0; dr.focus();
      if (push) history.pushState({ stay: id }, '', '#stay-' + id);
    }
    function hide() {
      if (dr.hidden) return;
      dr.classList.remove('in'); veil.classList.remove('in'); document.body.classList.remove('drawer-open');
      dr.hidden = true; veil.hidden = true; cur = null;
      if (lastFocus && lastFocus.focus) lastFocus.focus();
    }
    function close() { if (history.state && history.state.stay) history.back(); else { history.replaceState(null, '', location.pathname + location.search); hide(); } }
    function fromHash() { var m = /^#stay-(.+)$/.exec(location.hash); if (m && byId[m[1]]) show(m[1], false); else hide(); }
    grid.addEventListener('click', function (e) { var b = e.target.closest('.stay-open'); if (b) show(b.getAttribute('data-id'), true); });
    $('dClose').addEventListener('click', close); veil.addEventListener('click', close);
    window.addEventListener('popstate', fromHash);
    document.addEventListener('keydown', function (e) {
      if (dr.hidden) return;
      if (e.key === 'Escape') { close(); return; }
      if (e.key !== 'Tab') return;
      var f = dr.querySelectorAll('button:not([hidden]),a[href]:not([hidden]),input,select'), first = f[0], last = f[f.length - 1];
      if (e.shiftKey && (document.activeElement === first || document.activeElement === dr)) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    });
    dWa.addEventListener('click', function (e) { if (dWa.getAttribute('aria-disabled') === 'true') e.preventDefault(); });
    $('dShare').addEventListener('click', function () {
      var btn = $('dShare'), url = location.href.split('#')[0] + '#stay-' + cur.id;
      function done(t) { btn.textContent = t; setTimeout(function () { btn.textContent = 'Share this stay'; }, 2000); }
      if (navigator.share) navigator.share({ title: cur.name + ' · ' + S.site, url: url }).catch(function () {});
      else if (navigator.clipboard) navigator.clipboard.writeText(url).then(function () { done('Link copied'); }, function () { done('Copy the address bar link'); });
      else done('Copy the address bar link');
    });
    fromHash();
  }

  // Site-wide search page
  var gs = $('globalSearch');
  if (gs) {
    var root = window.KF_ROOT || '../', index = [], out = $('results'), count = $('searchCount');
    fetch(root + 'search-index.json').then(function (r) { return r.json(); }).then(function (d) { index = d; run(); }).catch(function () { count.textContent = 'Search could not load. Please refresh the page.'; });
    var q0 = new URLSearchParams(location.search).get('q');
    if (q0) gs.value = q0;
    function run() {
      var q = gs.value.trim().toLowerCase();
      out.textContent = '';
      if (!q) { count.textContent = 'Type to search stays, food, matchday, nightlife and movies & games.'; return; }
      var hits = index.filter(function (v) { return (v.name + ' ' + v.type + ' ' + v.area + ' ' + v.page_label + ' ' + v.tags.join(' ')).toLowerCase().indexOf(q) !== -1; });
      count.textContent = hits.length ? hits.length + (hits.length === 1 ? ' result' : ' results') : 'No results yet. Try another word, or browse a section from the menu.';
      hits.forEach(function (v) {
        var li = document.createElement('li'), a = document.createElement('a');
        a.href = root + v.page + '/';
        var t = document.createElement('strong'); t.textContent = v.name;
        var s = document.createElement('span'); s.textContent = v.page_label + ' · ' + v.type + ' · ' + v.area + (v.sample ? ' · sample' : '');
        a.appendChild(t); a.appendChild(s); li.appendChild(a); out.appendChild(li);
      });
    }
    gs.addEventListener('input', run);
  }

  // Rides: Uber link with destination
  var rideTo = $('rideTo'), uber = $('uberLink');
  if (rideTo && uber) {
    function uberHref() {
      var opt = rideTo.options[rideTo.selectedIndex];
      var url = 'https://m.uber.com/ul/?action=setPickup&pickup=my_location';
      var cid = uber.getAttribute('data-client');
      if (cid) url += '&client_id=' + encodeURIComponent(cid);
      if (opt.value) url += '&dropoff[nickname]=' + encodeURIComponent(opt.getAttribute('data-name')) + '&dropoff[formatted_address]=' + encodeURIComponent(opt.value);
      uber.href = url;
    }
    rideTo.addEventListener('change', uberHref); uberHref();
  }

  // Matchday: add a fixture to the calendar (.ics)
  document.querySelectorAll('.add-cal').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var fx = btn.closest('.fx'), d = fx.getAttribute('data-date').replace(/-/g, ''), t = (fx.getAttribute('data-time') || '00:00').replace(':', '');
      var ics = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//KaribuFans//EN', 'BEGIN:VEVENT', 'UID:' + d + t + '@karibufans', 'DTSTAMP:' + new Date().toISOString().replace(/[-:]/g, '').slice(0, 15) + 'Z', 'DTSTART;TZID=Africa/Nairobi:' + d + 'T' + t + '00', 'DURATION:PT2H', 'SUMMARY:' + fx.getAttribute('data-title'), 'LOCATION:Talanta Stadium, Nairobi', 'END:VEVENT', 'END:VCALENDAR'].join('\r\n');
      var a = document.createElement('a');
      a.href = URL.createObjectURL(new Blob([ics], { type: 'text/calendar' }));
      a.download = 'match.ics'; document.body.appendChild(a); a.click(); a.remove();
    });
  });

  // WhatsApp-composed forms (vendor sign-up, ticket alerts)
  function waForm(btnId, okId, msgId, build) {
    var btn = $(btnId); if (!btn) return;
    btn.addEventListener('click', function () {
      var msg = $(msgId), wa = btn.getAttribute('data-wa');
      if (!$(okId).checked) { msg.textContent = 'Please tick the consent box first.'; return; }
      var text = build(); if (!text) return;
      if (!wa) { msg.textContent = 'Our WhatsApp line is being set up. Please try again soon.'; return; }
      window.open('https://wa.me/' + wa + '?text=' + encodeURIComponent(text), '_blank', 'noopener');
      msg.textContent = 'WhatsApp opened with your message. Press send to finish.';
    });
  }
  waForm('joinGo', 'jOk', 'joinMsg', function () {
    var name = $('jName').value.trim();
    if (!name) { $('joinMsg').textContent = 'Please add your business name.'; return ''; }
    return 'New listing request\nBusiness: ' + name + '\nType: ' + $('jType').value + '\nArea: ' + $('jArea').value + '\nContact: ' + $('jContact').value + '\nWhatsApp: ' + $('jPhone').value + '\nNotes: ' + $('jNote').value;
  });
  waForm('alertGo', 'alertOk', 'alertMsg', function () { return 'Ticket alert please: ' + $('alertMatch').value; });

  // Homepage planner: jump to the chosen section
  var go = $('plannerGo'), what = $('pWhat');
  if (go && what) go.addEventListener('click', function () { window.location.href = what.value + '/'; });
})();
