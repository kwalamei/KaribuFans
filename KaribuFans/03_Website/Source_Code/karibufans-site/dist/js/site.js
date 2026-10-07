(function () {
  'use strict';
  var store = {
    get: function (k) { try { return JSON.parse(localStorage.getItem('kf_' + k)); } catch (e) { return null; } },
    set: function (k, v) { try { localStorage.setItem('kf_' + k, JSON.stringify(v)); } catch (e) {} },
    del: function (k) { try { localStorage.removeItem('kf_' + k); } catch (e) {} }
  };
  window.KF = { store: store };   // shared with js/account.js (saved places, accounts)
  function $(id) { return document.getElementById(id); }
  function each(list, fn) { Array.prototype.forEach.call(list, fn); }
  var params = new URLSearchParams(location.search);

  // Motion. Everything here is an extra: without it the page simply updates at once.
  var html = document.documentElement;
  function calm() { return !window.matchMedia || window.matchMedia('(prefers-reduced-motion: reduce)').matches; }
  // Scroll reveals (homepage route, example day, steps). Groups already on screen (or above it) when this script
  // runs are marked as shown first; only then is kf-reveal set, which lets the CSS hide the groups still below the
  // screen until they scroll into view. So nothing readable ever waits on a timer, and without this script nothing hides.
  var rvs = document.querySelectorAll('.rv');
  if (rvs.length && window.IntersectionObserver && !calm()) {
    try {
      each(rvs, function (el) { if (el.getBoundingClientRect().top < window.innerHeight) el.classList.add('is-in'); });
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add('is-in'); io.unobserve(en.target); } });
      }, { rootMargin: '0px 0px -10% 0px' });
      each(rvs, function (el) { if (!el.classList.contains('is-in')) io.observe(el); });
      html.classList.add('kf-reveal');
    } catch (e) { html.classList.remove('kf-reveal'); }
  }

  // Mobile menu
  var nav = $('nav'), menuBtn = $('menuBtn');
  if (nav && menuBtn) {
    menuBtn.addEventListener('click', function () {
      var open = nav.classList.toggle('open');
      menuBtn.setAttribute('aria-expanded', String(open));
      menuBtn.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    });
  }

  // Languages. Only languages marked live in data/site.json switch; the rest say when they arrive.
  var langNote = $('langNote'), langDefault = langNote ? langNote.textContent : '';
  each(document.querySelectorAll('.langs [data-lang]'), function (b) {
    b.addEventListener('click', function () {
      if (!langNote) return;
      langNote.textContent = b.getAttribute('data-live') ? langDefault : b.getAttribute('data-name') + ' is coming after launch. The site is in English for now.';
    });
  });

  // The chosen area travels with the visitor from stop to stop.
  // It lives in the address (?area=) and in the browser, so it survives a click on any menu link.
  var area = params.has('area') ? params.get('area') : (store.get('area') || '');
  function carryArea() {
    each(document.querySelectorAll('.nav-links a, .routebar a, .next-stop a, .stop a'), function (a) {
      var u = new URL(a.href, location.href);
      if (u.origin !== location.origin || /\/(rides|tickets)\/?$/.test(u.pathname) || u.pathname === new URL(document.querySelector('.brand').href).pathname) return;
      if (area) u.searchParams.set('area', area); else u.searchParams.delete('area');
      a.href = u.pathname + u.search + u.hash;
    });
  }

  // Nairobi time (EAT, UTC+3, no daylight saving)
  function nairobiMinutes() { var d = new Date(); return ((d.getUTCHours() + 3) % 24) * 60 + d.getUTCMinutes(); }
  function toMin(s) { var p = String(s).split(':'); return (+p[0]) * 60 + (+p[1] || 0); }
  function isOpen(open, close) { var n = nairobiMinutes(), o = toMin(open), c = toMin(close); return c > o ? (n >= o && n < c) : (n >= o || n < c); }

  // Listing pages: filters, count, details drawer
  var grid = $('cards'), pd = $('placeData');
  if (grid && pd) {
    var S = JSON.parse(pd.textContent), byId = {};
    S.listings.forEach(function (v) { byId[v.id] = v; });
    var page = S.page, noun = grid.getAttribute('data-noun') || 'places';
    var cards = grid.querySelectorAll('.card[data-id]');
    var fA = $('fArea'), fT = $('fType'), fV = $('fVibe'), box = $('pageSearch');
    var st = store.get('f_' + page) || { t: '', v: '', q: '', near: false };
    var bar = $('filters');
    function setTop() { if (bar && nav) bar.style.top = (getComputedStyle(nav).position === 'sticky' ? nav.offsetHeight : 0) + 'px'; }
    setTop(); window.addEventListener('resize', setTop);
    function has(sel, val) { return !!sel && Array.prototype.some.call(sel.options, function (o) { return o.value === val; }); }
    if (!has(fT, st.t)) st.t = ''; if (!has(fV, st.v)) st.v = '';

    each(cards, function (c) {
      var o = c.getAttribute('data-open'), cl = c.getAttribute('data-close'), el = c.querySelector('.open-state');
      if (o && cl && el) { var open = isOpen(o, cl); el.textContent = open ? 'Open now' : 'Closed'; el.className = 'open-state ' + (open ? 'is-open' : 'is-closed'); }
    });

    function apply() {
      var here = st.near && has(fA, '__near') ? '__near' : (has(fA, area) ? area : '');   // the area, if this page has listings there
      var q = (st.q || '').trim().toLowerCase(), shown = 0;
      each(cards, function (c) {
        var ok = (!here || (here === '__near' ? c.getAttribute('data-near') === '1' : c.getAttribute('data-area') === here)) &&
          (!st.t || c.getAttribute('data-type') === st.t) &&
          (!st.v || c.getAttribute('data-vibe') === st.v) &&
          (!q || (c.getAttribute('data-search') || '').indexOf(q) !== -1);
        c.hidden = !ok; if (ok) shown++;
      });
      if (fA) fA.value = here; if (fT) fT.value = st.t; if (fV) fV.value = st.v;
      [fA, fT, fV].forEach(function (s) { if (s) s.parentNode.classList.toggle('on', !!s.value); });
      var label = here === '__near' ? S.nearLabel : here;
      $('fClear').hidden = !(here || st.t || st.v || q);
      $('listCount').textContent = shown + ' ' + (shown === 1 ? noun.replace(/s$/, '').replace('places to', 'place to') : noun) + (label ? (here === '__near' ? ' ' + label.charAt(0).toLowerCase() + label.slice(1) : ' in ' + label) : '');
      $('noMatch').hidden = shown !== 0;
      var crumb = $('crumbArea'); if (crumb) { crumb.hidden = !label; crumb.textContent = label || ''; }
      var note = $('areaNote');
      if (note) { var miss = area && !here; note.hidden = !miss; if (miss) note.textContent = 'Nothing is listed in ' + area + ' on this page yet, so you are seeing every area. Your area is kept for the other stops.'; }
      store.set('f_' + page, st); store.set('area', area);
      var u = new URL(location.href);
      if (area) u.searchParams.set('area', area); else u.searchParams.delete('area');
      history.replaceState(history.state, '', u.pathname + u.search + u.hash);
      carryArea();
    }
    // A filter change re-flows the cards inside a view transition where the browser has one; otherwise it applies at once.
    // Each card has its own name (--vt) so it can slide to its new place. Only cards on or near the screen (.kf-near,
    // kept up to date by an IntersectionObserver) use it, and only while html.kf-filtering is set: naming all of
    // them made the browser snapshot the whole list and the filter felt slow to respond.
    var flow = null, qTimer = 0;
    if (document.startViewTransition && window.IntersectionObserver && !calm()) {
      var near = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) { en.target.classList.toggle('kf-near', en.isIntersecting); });
      }, { rootMargin: '120px 0px' });
      each(grid.children, function (c, i) { c.style.setProperty('--vt', 'kf-card-' + i); near.observe(c); });
    }
    function update() {
      clearTimeout(qTimer);
      if (!document.startViewTransition || calm()) { apply(); return; }
      var t, done = function () { if (flow === t) { flow = null; html.classList.remove('kf-filtering'); } };
      html.classList.add('kf-filtering');
      try { t = flow = document.startViewTransition(apply); } catch (e) { flow = null; html.classList.remove('kf-filtering'); apply(); return; }
      t.ready.then(null, function () {}); t.finished.then(done, done);
    }
    function clearAll() { area = ''; st = { t: '', v: '', q: '', near: false }; if (box) box.value = ''; update(); }
    if (fA) fA.addEventListener('change', function () { st.near = fA.value === '__near'; if (!st.near) area = fA.value; update(); });
    if (fT) fT.addEventListener('change', function () { st.t = fT.value; update(); });
    if (fV) fV.addEventListener('change', function () { st.v = fV.value; update(); });
    // Typing: wait for a short pause, so there is one transition per word and not one per keystroke.
    if (box) { box.value = st.q || ''; box.addEventListener('input', function () { st.q = box.value; clearTimeout(qTimer); qTimer = setTimeout(update, 160); }); }
    $('fClear').addEventListener('click', clearAll); $('noMatchClear').addEventListener('click', clearAll);
    apply();

    // Drawer
    var dr = $('placeDrawer'), veil = $('placeVeil'), cur = null, lastFocus = null, isUp = false, shut = 0;
    var dIn = $('dIn'), dOut = $('dOut'), dGuests = $('dGuests'), dWho = $('dWho'), dWa = $('dWa');
    function iso(d) { return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2); }
    var MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    function nice(s) { var p = s.split('-'); return (+p[2]) + ' ' + MON[+p[1] - 1] + ' ' + p[0]; }
    dIn.min = iso(new Date());
    var saved = store.get('stay_dates') || {};
    if (saved.i && saved.i >= dIn.min) dIn.value = saved.i;
    if (saved.o && saved.o > (dIn.value || dIn.min)) dOut.value = saved.o;
    if (saved.g) dGuests.value = saved.g;
    function withDates() { return page === 'stays'; }
    function message() {
      var t = 'Hi ' + cur.name + '! I found you on ' + S.site, bad = false;
      if (withDates()) {
        var err = $('dErr'); bad = !!(dIn.value && dOut.value && dOut.value <= dIn.value);
        err.hidden = !bad; if (bad) err.textContent = 'Check-out needs to be after check-in.';
        t += ' and would love to check availability';
        if (dIn.value && dOut.value && !bad) t += ' for ' + nice(dIn.value) + ' to ' + nice(dOut.value);
        else if (dIn.value) t += ' from ' + nice(dIn.value);
        if (dGuests.value) t += ', ' + dGuests.value + (dGuests.value === '1' ? ' guest' : ' guests');
        t += '.' + (dWho.value.trim() ? ' My name is ' + dWho.value.trim() + '.' : '');
        $('dPreview').textContent = t;
        dOut.min = dIn.value || dIn.min;
        store.set('stay_dates', { i: dIn.value, o: dOut.value, g: dGuests.value });
      } else { t += '.'; }
      if (cur.whatsapp && !bad) { dWa.href = 'https://wa.me/' + cur.whatsapp + '?text=' + encodeURIComponent(t); dWa.removeAttribute('aria-disabled'); }
      else { dWa.removeAttribute('href'); dWa.setAttribute('aria-disabled', 'true'); }
    }
    [dIn, dOut, dGuests, dWho].forEach(function (el) { el.addEventListener('input', function () { if (cur) message(); }); });

    function routeLinks(v) {
      var ul = $('dRouteList'); ul.textContent = '';
      S.stops.forEach(function (s) {
        var n = (S.route[s.slug] || {})[v.zone] || 0;
        if (s.slug === page || !n) return;
        add(s.label + ' in ' + v.zone, n + (n === 1 ? ' place' : ' places') + ' →', S.root + s.slug + '/?area=' + encodeURIComponent(v.zone));
      });
      add('Get a ride here', 'Uber or Bolt →', S.root + 'rides/');
      function add(title, meta, href) {
        var li = document.createElement('li'), a = document.createElement('a'), sp = document.createElement('span');
        a.href = href; a.textContent = title; sp.textContent = meta; a.appendChild(sp); li.appendChild(a); ul.appendChild(li);
      }
      $('dRoute').hidden = false;
    }
    function fill(v) {
      cur = v;
      var un = v.status === 'unclaimed';
      var ph = $('dPhotos'); ph.textContent = '';
      var photos = (v.photos || []).filter(Boolean);
      ph.classList.toggle('has-photos', photos.length > 0);
      if (photos.length) {
        photos.slice(0, 3).forEach(function (src, i) {
          var b = document.createElement('div'); b.className = 'd-photo';
          var im = document.createElement('img'); im.src = src; im.alt = v.name + ', photo ' + (i + 1); im.loading = 'lazy'; b.appendChild(im); ph.appendChild(b);
        });
      } else {
        var art = document.querySelector('#card-' + CSS.escape(v.id) + ' .un-art-svg');
        if (art) ph.appendChild(art.cloneNode(true));
      }
      var badge = $('dBadge'); badge.className = 'badge ' + (un ? 'badge-directory' : 'badge-verified'); badge.textContent = un ? 'Directory listing' : 'Verified by the business';
      $('dName').textContent = v.name;
      var vb = S.vibes.filter(function (x) { return x.name === v.vibe; })[0];
      $('dMeta').textContent = v.type + ' · ' + v.area + (vb ? ' · ' + vb.icon + ' ' + vb.name : '');
      var street = $('dStreet'); street.hidden = !v.street;
      if (v.street) { street.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21s-6-5.5-6-10a6 6 0 0 1 12 0c0 4.5-6 10-6 10zM12 9a2 2 0 1 0 0 4a2 2 0 1 0 0-4"/></svg>'; street.appendChild(document.createTextNode(v.street)); }
      $('dPrice').hidden = !v.price; $('dPrice').textContent = v.price || '';
      $('dChecked').hidden = !v.price_checked; $('dChecked').textContent = v.price_checked ? 'Price last confirmed ' + v.price_checked + '. Ask the business for your dates.' : '';
      $('dAbout').textContent = v.about || ''; $('dAbout').hidden = !v.about;
      var ul = $('dAmen'); ul.textContent = '';
      (v.amenities || v.tags || []).forEach(function (a) { var li = document.createElement('li'); li.textContent = (S.icons[a] ? S.icons[a] + ' ' : '') + a; ul.appendChild(li); });
      var dist = v.near_stadium ? S.nearLabel : (v.dist || '');
      $('dDist').hidden = !dist; $('dDist').textContent = dist;
      $('dUnclaimed').hidden = !un;
      if (un) $('dSource').textContent = 'Name and location from the business’s own website, checked ' + v.checked + '.';
      $('dForm').hidden = un || !withDates();
      dWa.hidden = un; $('dPay').hidden = un;
      var site = $('dSite'); site.hidden = !v.website; if (v.website) site.href = v.website;
      var call = $('dCall'); call.hidden = !v.phone; if (v.phone) call.href = 'tel:' + v.phone;
      $('dMap').href = 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(v.map_query || (v.name + ' ' + v.area + ' Nairobi'));
      var claim = $('dClaim'); claim.hidden = !un; claim.href = S.root + 'list-your-business/?claim=' + encodeURIComponent(v.name);
      routeLinks(v);
      if (!un) message();
      // Tell the save toggle in the drawer head which place is showing; js/account.js does the rest.
      var sv = $('dSave'); if (sv) { sv.setAttribute('data-id', v.id); sv.setAttribute('data-name', v.name); }
      try { document.dispatchEvent(new CustomEvent('kf:place')); } catch (e) {}
    }
    function show(id, push) {
      var v = byId[id]; if (!v) return;
      if (!isUp) lastFocus = document.activeElement;
      clearTimeout(shut); isUp = true; dr.inert = false;   // also cancels a close that is still sliding out
      fill(v);
      dr.hidden = false; veil.hidden = false; document.body.classList.add('drawer-open');
      requestAnimationFrame(function () { dr.classList.add('in'); veil.classList.add('in'); });
      dr.querySelector('.drawer-scroll').scrollTop = 0; dr.focus();
      if (push) history.pushState({ place: id }, '', location.pathname + location.search + '#place-' + id);
    }
    function hide() {
      if (!isUp) return;
      isUp = false; dr.inert = true;   // closed for keyboard and screen readers straight away
      dr.classList.remove('in'); veil.classList.remove('in'); document.body.classList.remove('drawer-open');
      if (lastFocus && lastFocus.focus) lastFocus.focus();
      // Let the slide-out play, then take the drawer out of the page. No transition (reduced motion) means no wait.
      var gone = function () { dr.hidden = true; veil.hidden = true; cur = null; };
      var ms = (parseFloat(getComputedStyle(dr).transitionDuration) || 0) * 1000;
      clearTimeout(shut);
      if (ms) shut = setTimeout(gone, ms + 40); else gone();
    }
    function close() { if (history.state && history.state.place) history.back(); else { history.replaceState(null, '', location.pathname + location.search); hide(); } }
    function fromHash() { var m = /^#(?:place|stay)-(.+)$/.exec(location.hash); if (m && byId[decodeURIComponent(m[1])]) show(decodeURIComponent(m[1]), false); else hide(); }
    grid.addEventListener('click', function (e) { var b = e.target.closest('.place-open'); if (b) show(b.getAttribute('data-id'), true); });
    $('dClose').addEventListener('click', close); veil.addEventListener('click', close);
    window.addEventListener('popstate', fromHash);
    document.addEventListener('keydown', function (e) {
      if (!isUp) return;
      if (e.key === 'Escape') { close(); return; }
      if (e.key !== 'Tab') return;
      var f = Array.prototype.filter.call(dr.querySelectorAll('button,a[href],input,select'), function (el) { return el.offsetParent !== null; });
      var first = f[0], last = f[f.length - 1];
      if (e.shiftKey && (document.activeElement === first || document.activeElement === dr)) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    });
    dWa.addEventListener('click', function (e) { if (dWa.getAttribute('aria-disabled') === 'true') e.preventDefault(); });
    $('dShare').addEventListener('click', function () {
      var btn = $('dShare'), url = location.origin + location.pathname + '#place-' + cur.id;
      function done(t) { btn.textContent = t; setTimeout(function () { btn.textContent = 'Share'; }, 2000); }
      if (navigator.share) navigator.share({ title: cur.name + ' · ' + S.site, url: url }).catch(function () {});
      else if (navigator.clipboard) navigator.clipboard.writeText(url).then(function () { done('Link copied'); }, function () { done('Copy the address bar link'); });
      else done('Copy the address bar link');
    });
    fromHash();
  } else {
    carryArea();
  }

  // Site-wide search page: each result opens that place's details
  var gs = $('globalSearch');
  if (gs) {
    var root = window.KF_ROOT || '../', index = [], out = $('results'), count = $('searchCount');
    fetch(root + 'search-index.json').then(function (r) { return r.json(); }).then(function (d) { index = d; run(); }).catch(function () { count.textContent = 'Search could not load. Please refresh the page.'; });
    if (params.get('q')) gs.value = params.get('q');
    function run() {
      var q = gs.value.trim().toLowerCase();
      out.textContent = '';
      if (!q) { count.textContent = 'Type to search stays, food, matchday, nightlife and movies & games.'; return; }
      var hits = index.filter(function (v) { return (v.name + ' ' + v.type + ' ' + v.area + ' ' + v.street + ' ' + v.page_label + ' ' + v.tags.join(' ')).toLowerCase().indexOf(q) !== -1; });
      count.textContent = hits.length ? hits.length + (hits.length === 1 ? ' result' : ' results') : 'No results yet. Try another word, or browse a section from the menu.';
      hits.forEach(function (v) {
        var li = document.createElement('li'), a = document.createElement('a');
        a.href = root + v.page + '/' + (v.id ? '#place-' + v.id : '');
        var t = document.createElement('strong'); t.textContent = v.name;
        var s = document.createElement('span'); s.textContent = v.page_label + ' · ' + v.type + ' · ' + v.area;
        a.appendChild(t); a.appendChild(s); li.appendChild(a); out.appendChild(li);
      });
    }
    gs.addEventListener('input', run);
  }

  // Rides: Uber link with destination
  var rideTo = $('rideTo'), uber = $('uberLink');
  if (rideTo && uber) {
    var uberHref = function () {
      var opt = rideTo.options[rideTo.selectedIndex];
      var url = 'https://m.uber.com/ul/?action=setPickup&pickup=my_location';
      var cid = uber.getAttribute('data-client');
      if (cid) url += '&client_id=' + encodeURIComponent(cid);
      if (opt.value) url += '&dropoff[nickname]=' + encodeURIComponent(opt.getAttribute('data-name')) + '&dropoff[formatted_address]=' + encodeURIComponent(opt.value);
      uber.href = url;
    };
    rideTo.addEventListener('change', uberHref); uberHref();
  }

  // Matchday: add a fixture to the calendar (.ics)
  each(document.querySelectorAll('.add-cal'), function (btn) {
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
  var claim = params.get('claim');
  if (claim && $('jName')) { $('jName').value = claim.slice(0, 120); if ($('jNote') && !$('jNote').value) $('jNote').value = 'I want to claim (or remove) the existing listing for this business.'; }
  waForm('joinGo', 'jOk', 'joinMsg', function () {
    var name = $('jName').value.trim();
    if (!name) { $('joinMsg').textContent = 'Please add your business name.'; return ''; }
    return 'New listing request\nBusiness: ' + name + '\nType: ' + $('jType').value + '\nArea: ' + $('jArea').value + '\nContact: ' + $('jContact').value + '\nWhatsApp: ' + $('jPhone').value + '\nNotes: ' + $('jNote').value;
  });
  waForm('alertGo', 'alertOk', 'alertMsg', function () { return 'Ticket alert please: ' + $('alertMatch').value; });

  // Homepage: jump to the chosen section, carrying the chosen area
  var go = $('plannerGo'), what = $('pWhat'), pArea = $('pArea');
  if (go && what) {
    if (pArea && area && Array.prototype.some.call(pArea.options, function (o) { return o.value === area; })) pArea.value = area;
    go.addEventListener('click', function () {
      var a = pArea ? pArea.value : '';
      store.set('area', a);
      window.location.href = what.value + '/' + (a && what.value !== 'rides' ? '?area=' + encodeURIComponent(a) : '');
    });
  }
})();
