(function () {
  // Mobile menu
  var nav = document.getElementById('nav');
  var btn = document.getElementById('menuBtn');
  if (nav && btn) {
    btn.addEventListener('click', function () {
      var open = nav.classList.toggle('open');
      btn.setAttribute('aria-expanded', String(open));
      btn.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    });
  }

  // Filter chips on module pages
  var chips = document.querySelectorAll('.chip[data-filter]');
  var cards = document.querySelectorAll('#cards .card');
  var none = document.getElementById('noMatch');
  chips.forEach(function (chip) {
    chip.addEventListener('click', function () {
      var f = chip.getAttribute('data-filter');
      chips.forEach(function (c) { c.setAttribute('aria-pressed', String(c === chip)); });
      var shown = 0;
      cards.forEach(function (card) {
        var tags = Array.prototype.map.call(card.querySelectorAll('.tags span'), function (s) { return s.textContent; });
        var match = f === 'all' || card.getAttribute('data-type') === f || tags.indexOf(f) !== -1;
        card.hidden = !match;
        if (match) shown++;
      });
      if (none) none.hidden = shown !== 0;
    });
  });

  // Homepage planner: jump to the chosen module
  var go = document.getElementById('plannerGo');
  var what = document.getElementById('pWhat');
  if (go && what) {
    go.addEventListener('click', function () { window.location.href = what.value + '/'; });
  }
})();
