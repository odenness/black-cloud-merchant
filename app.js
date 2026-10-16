(function () {
  var GENERA = ['Cogni', 'Fera', 'Natura', 'Varian'];
  var pets = window.PETS.slice().sort(function (a, b) { return a.n.localeCompare(b.n); });
  var state = { q: '', genus: 'all', showFarm: false, hideOwned: false };
  var owned = load('bcl-owned', {});
  var prefs = load('bcl-prefs', {});
  if (typeof prefs.showFarm === 'boolean') state.showFarm = prefs.showFarm;
  if (typeof prefs.hideOwned === 'boolean') state.hideOwned = prefs.hideOwned;

  var $ = function (id) { return document.getElementById(id); };
  var list = $('list'), empty = $('empty'), hint = $('hint'), q = $('q');
  $('showFarm').checked = state.showFarm;
  $('hideOwned').checked = state.hideOwned;

  function load(key, fallback) {
    try { return JSON.parse(localStorage.getItem(key)) || fallback; } catch (e) { return fallback; }
  }
  function save(key, val) {
    try { localStorage.setItem(key, JSON.stringify(val)); } catch (e) {}
  }
  function esc(s) {
    return s.replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; });
  }
  function norm(s) { return s.toLowerCase().replace(/['’]/g, '').replace(/\s+/g, ' ').trim(); }

  var CHECK = '<svg viewBox="0 0 16 16" width="12" height="12" aria-hidden="true"><path d="m3.5 8.5 3 3 6-7" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';

  function tile(p) {
    var isOwned = !!owned[p.id];
    var cls = 'pet' + (p.x ? '' : ' farm') + (isOwned ? ' owned' : '');
    var label = p.n + (p.x ? ', shop only' : ', farmable') + (isOwned ? ', owned' : '');
    return '<button type="button" class="' + cls + '" data-g="' + p.g + '" data-id="' + p.id + '" aria-pressed="' + isOwned + '" aria-label="' + esc(label) + '">' +
      '<span class="art"><img src="icons/' + p.i + '.webp" alt="" width="64" height="64" loading="lazy"></span>' +
      (p.x ? '<span class="stamp buy">Shop only</span>' : '<span class="stamp skip">Farm</span>') +
      '<span class="own">' + CHECK + '</span>' +
      '<span class="name">' + esc(p.n) + '</span>' +
      '<span class="tag">' + p.g + '</span>' +
      (p.x ? '' : '<span class="drops">Drops from ' + esc(p.d) + '</span>') +
      '</button>';
  }

  function row(p) {
    var isOwned = !!owned[p.id];
    var verdict, small, cls = 'row';
    if (p.x && isOwned) { verdict = 'Owned'; small = 'shop only'; cls += ' owned'; }
    else if (p.x) { verdict = 'Buy it'; small = 'shop only'; cls += ' buy'; }
    else { verdict = 'Skip'; small = 'farmable'; cls += ' farm'; }
    var sub = p.x ? p.g + ' · no monster drops its soul' : p.g + ' · drops from ' + p.d;
    return '<button type="button" class="' + cls + '" data-g="' + p.g + '" data-id="' + p.id + '" aria-pressed="' + isOwned + '">' +
      '<span class="art"><img src="icons/' + p.i + '.webp" alt="" width="64" height="64"></span>' +
      '<span><span class="name">' + esc(p.n) + '</span><span class="sub">' + esc(sub) + '</span></span>' +
      '<span class="verdict">' + verdict + '<small>' + small + '</small></span>' +
      '</button>';
  }

  function matchesGenus(p) { return state.genus === 'all' || p.g === state.genus; }

  function render() {
    var html = '';
    var nq = norm(state.q);

    if (nq) {
      // Searching always checks every pet, so a farmable name still gets a clear "Skip".
      var hits = pets.filter(function (p) { return matchesGenus(p) && norm(p.n).indexOf(nq) !== -1; });
      hits.sort(function (a, b) {
        var as = norm(a.n).indexOf(nq) === 0 ? 0 : 1, bs = norm(b.n).indexOf(nq) === 0 ? 0 : 1;
        return (b.x - a.x) || (as - bs) || a.n.localeCompare(b.n);
      });
      html = hits.length ? '<div class="results">' + hits.slice(0, 40).map(row).join('') + '</div>' : '';
      hint.hidden = true;
      empty.hidden = hits.length > 0;
    } else {
      GENERA.forEach(function (g) {
        if (state.genus !== 'all' && state.genus !== g) return;
        var ex = pets.filter(function (p) { return p.g === g && p.x; });
        var shown = ex.filter(function (p) { return !(state.hideOwned && owned[p.id]); });
        var farm = state.showFarm ? pets.filter(function (p) { return p.g === g && !p.x && !(state.hideOwned && owned[p.id]); }) : [];
        if (!shown.length && !farm.length) return;
        var have = ex.filter(function (p) { return owned[p.id]; }).length;
        html += '<section class="group" data-g="' + g + '"><div class="group-head"><h2>' + g + '</h2>' +
          '<span class="group-count">' + have + '/' + ex.length + ' shop-only owned' + (farm.length ? ' · ' + farm.length + ' farmable' : '') + '</span></div>' +
          '<div class="grid">' + shown.map(tile).join('') + farm.map(tile).join('') + '</div></section>';
      });
      hint.hidden = false;
      empty.hidden = true;
    }
    list.classList.toggle('mixed', state.showFarm);
    list.innerHTML = html;
    stats();
  }

  function stats() {
    var ex = pets.filter(function (p) { return p.x; });
    $('statEx').textContent = ex.length;
    $('exCount').textContent = ex.length;
    $('statFarm').textContent = pets.length - ex.length;
    $('statOwnedOf').textContent = ex.length;
    $('statOwned').textContent = ex.filter(function (p) { return owned[p.id]; }).length;
  }

  list.addEventListener('click', function (e) {
    var el = e.target.closest('[data-id]');
    if (!el) return;
    var id = el.getAttribute('data-id');
    if (owned[id]) delete owned[id]; else owned[id] = 1;
    save('bcl-owned', owned);
    render();
  });

  q.addEventListener('input', function () { state.q = q.value; render(); });

  $('genus').addEventListener('click', function (e) {
    var b = e.target.closest('button');
    if (!b) return;
    state.genus = b.getAttribute('data-g');
    Array.prototype.forEach.call(this.querySelectorAll('button'), function (x) { x.setAttribute('aria-pressed', x === b); });
    render();
  });

  $('showFarm').addEventListener('change', function () { state.showFarm = this.checked; savePrefs(); render(); });
  $('hideOwned').addEventListener('change', function () { state.hideOwned = this.checked; savePrefs(); render(); });
  function savePrefs() { save('bcl-prefs', { showFarm: state.showFarm, hideOwned: state.hideOwned }); }

  document.addEventListener('keydown', function (e) {
    if (e.key === '/' && document.activeElement !== q) { e.preventDefault(); q.focus(); q.select(); }
    else if (e.key === 'Escape' && document.activeElement === q) { q.value = ''; state.q = ''; render(); }
  });

  $('themeBtn').addEventListener('click', function () {
    var root = document.documentElement;
    var dark = root.dataset.theme ? root.dataset.theme === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches;
    root.dataset.theme = dark ? 'light' : 'dark';
    try { localStorage.setItem('bcl-theme', root.dataset.theme); } catch (e) {}
  });

  render();
})();
