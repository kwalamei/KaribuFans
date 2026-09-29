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
  if (grid) {
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
