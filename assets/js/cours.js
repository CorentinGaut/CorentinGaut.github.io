// Navigation par chapitre des pages de cours : un chapitre affiché à la fois, adressé par l'ancre (#c1, #c2…).
// Sans JavaScript, tous les chapitres restent visibles les uns sous les autres.
(function () {
    var root = document.querySelector('.cours');
    if (!root) return;
    var chaps = Array.prototype.slice.call(root.querySelectorAll('.chap'));
    var toc = root.querySelector('.toc ol');
    if (!chaps.length || !toc) return;
    root.classList.add('js');

    var title = function (c) { return c.getAttribute('data-title') || c.querySelector('h2').textContent; };

    // Sommaire et liens précédent / suivant générés à partir des sections
    chaps.forEach(function (c, i) {
        var li = document.createElement('li'), a = document.createElement('a');
        a.href = '#' + c.id; a.textContent = title(c);
        li.appendChild(a); toc.appendChild(li);

        var nav = document.createElement('nav'); nav.className = 'pager'; nav.setAttribute('aria-label', 'Chapitres');
        [[chaps[i - 1], 'prev', '← Chapitre précédent'], [chaps[i + 1], 'next', 'Chapitre suivant →']].forEach(function (x) {
            if (!x[0]) return;
            var l = document.createElement('a'); l.href = '#' + x[0].id; l.className = x[1];
            var s = document.createElement('small'); s.textContent = x[2];
            l.appendChild(s); l.appendChild(document.createTextNode(title(x[0])));
            nav.appendChild(l);
        });
        c.appendChild(nav);
    });

    function show(scroll) {
        var id = decodeURIComponent(location.hash.slice(1)), cur = chaps[0];
        chaps.forEach(function (c) { if (c.id === id || (id && c.querySelector('[id="' + id + '"]'))) cur = c; });
        chaps.forEach(function (c) { c.classList.toggle('on', c === cur); });
        toc.querySelectorAll('a').forEach(function (a) { a.setAttribute('aria-current', a.getAttribute('href') === '#' + cur.id ? 'true' : 'false'); });
        document.title = title(cur) + ' — ' + root.getAttribute('data-course');
        if (scroll) {
            var target = id && id !== cur.id ? document.getElementById(id) : root.querySelector('.layout');
            if (target) target.scrollIntoView({ block: 'start' });
        }
    }
    window.addEventListener('hashchange', function () { show(true); });
    show(false);

    // Flèches gauche / droite (hors champs de saisie) pour changer de chapitre
    document.addEventListener('keydown', function (e) {
        if (e.altKey || e.ctrlKey || e.metaKey || /input|textarea|select/i.test(e.target.tagName)) return;
        var i = chaps.findIndex(function (c) { return c.classList.contains('on'); });
        if (e.key === 'ArrowRight' && chaps[i + 1]) location.hash = chaps[i + 1].id;
        if (e.key === 'ArrowLeft' && chaps[i - 1]) location.hash = chaps[i - 1].id;
    });
})();
