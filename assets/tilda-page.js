
// Калькулятор. CALC.demo = true: цены условные, показывается пометка «демо-расчёт».
// Для заказчика: подставить его прайс в CALC и поставить demo: false (пометка исчезнет).
var CALC = {
demo: true,
types: {
bytovka: { name: 'Бытовка', area: true,
sizes: [['3×2,3 м', 6.9, 78000], ['4×2,3 м', 9.2, 98000], ['6×2,3 м', 13.8, 142000]] },
hozblok: { name: 'Хозблок', area: true,
sizes: [['2×2 м', 4, 42000], ['3×2 м', 6, 58000], ['4×2 м', 8, 74000]] },
tualet:  { name: 'Туалет', area: false,
sizes: [['1×1 м', 1, 24000], ['1,2×1,5 м', 1.8, 31000]] },
kacheli: { name: 'Качели', area: false,
sizes: [['Двухместные', 1, 28000], ['Трёхместные', 1, 36000]] }
},
wall: [['Без утепления', 0], ['50 мм', 1900], ['100 мм', 3100]],   // за м² пола
roof: [['Профнастил', 0], ['Металлочерепица', 700]],               // за м² пола
opts: {
bytovka: [['Дополнительное окно', 7500], ['Тамбур', 18000], ['Электрика', 14000], ['Мебель: стол и лавки', 9000]],
hozblok: [['Дополнительное окно', 6000], ['Полки и стеллаж', 5500], ['Электрика', 12000]],
tualet:  [['Окно', 3500], ['Утепление стен', 6500]],
kacheli: [['Навес от дождя', 9500], ['Подушки в комплекте', 3800]]
}
};
(function () {
var form = document.getElementById('calc');
if (!form) return;
var $ = function (id) { return document.getElementById(id); };
var fmt = function (n) { return Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' '); };
var uid = 0;
function seg(host, name, items, checked) {
host.innerHTML = items.map(function (it, i) {
uid++;
return '<label><input type="radio" name="' + name + '" value="' + i + '"' + (i === checked ? ' checked' : '') + '><span>' + it + '</span></label>';
}).join('');
}
function build() {
var t = CALC.types[form.type.value];
var prevSize = form.size ? +form.size.value || 0 : 0;
seg($('cSize'), 'size', t.sizes.map(function (s) { return s[0]; }), 0);
seg($('cWall'), 'wall', CALC.wall.map(function (w) { return w[0]; }), 0);
seg($('cRoof'), 'roof', CALC.roof.map(function (w) { return w[0]; }), 0);
$('cOpt').innerHTML = CALC.opts[form.type.value].map(function (o, i) {
return '<label><input type="checkbox" name="opt" value="' + i + '"><span>' + o[0] + '<small>+ ' + fmt(o[1]) + ' ₽</small></span></label>';
}).join('');
var showKit = form.type.value === 'bytovka' || form.type.value === 'hozblok';
$('fWall').hidden = !(form.type.value === 'bytovka');
$('fRoof').hidden = !showKit;
var n = 0;
[$('fWall'), $('fRoof'), $('fOpt')].forEach(function (f) { if (!f.hidden) { n++; f.querySelector('legend b').textContent = n + 2; } });
}
function calc() {
var key = form.type.value, t = CALC.types[key];
var size = t.sizes[+form.size.value || 0];
var area = size[1], rows = [], sum = size[2];
rows.push([t.name + ' ' + size[0], size[2]]);
if (!$('fWall').hidden) { var w = CALC.wall[+form.wall.value || 0]; if (w[1]) { var v = w[1] * area; sum += v; rows.push(['Утепление ' + w[0], v]); } }
if (!$('fRoof').hidden) { var r = CALC.roof[+form.roof.value || 0]; if (r[1]) { var vr = r[1] * area; sum += vr; rows.push([r[0], vr]); } }
Array.prototype.forEach.call(form.querySelectorAll('input[name=opt]:checked'), function (c) {
var o = CALC.opts[key][+c.value]; sum += o[1]; rows.push([o[0], o[1]]);
});
$('cSum').innerHTML = 'от <b>' + fmt(sum) + ' ₽</b>';
$('cRows').innerHTML = rows.map(function (x) { return '<li><span>' + x[0] + '</span><b>' + fmt(x[1]) + ' ₽</b></li>'; }).join('');
}
form.addEventListener('change', function (e) { if (e.target.name === 'type') build(); calc(); });
$('cDemo').hidden = !CALC.demo;
// «Рассчитать стоимость» в каталоге выбирает нужное изделие
Array.prototype.forEach.call(document.querySelectorAll('.cat__link[data-type]'), function (a) {
a.addEventListener('click', function () {
var r = form.querySelector('input[name=type][value=' + a.getAttribute('data-type') + ']');
if (r) { r.checked = true; build(); calc(); }
});
});
build(); calc();
})();
Vibe.mount(document.querySelector('.v-page'));
// Титул: «стройка наоборот». Четыре кадра одного ракурса лежат стопкой (в DOM снизу вверх:
// участок, фундамент, каркас, дом). Прозрачность трёх верхних ведётся от --v-p акта:
// каждое состояние владеет четвертью пролёта, плато около 65% четверти, кроссфейд около 35%
// вокруг границы четвертей. Гаснет всегда верхний кадр, нижний под ним непрозрачный,
// поэтому переход чистый, без просвета сквозь два слоя. Подпись и шкала переключаются
// на середине кроссфейда.
(function () {
var act = document.getElementById('cover');
var imgs = act.querySelectorAll('.cover__img');
var states = document.getElementById('coverState').children;
var dots = document.getElementById('coverScale').children;
var n = imgs.length, live = false, lastF = -1, lastK = -1;
function ss(t) { t = t < 0 ? 0 : t > 1 ? 1 : t; return t * t * (3 - 2 * t); }
function paint(f) {
// f: 0 = дом, n-1 = участок. Слой i (считая снизу) держится, пока f < n-1-i, и гаснет за один шаг
for (var i = 1; i < n; i++) { var o = 1 - (f - (n - 1 - i)); imgs[i].style.opacity = (o < 0 ? 0 : o > 1 ? 1 : o).toFixed(3); }
var k = Math.round(f);
if (k !== lastK) {
lastK = k;
for (var j = 0; j < n; j++) {
states[j].classList.toggle('is-on', j === k);
dots[j].classList.toggle('is-on', j === k);
dots[j].classList.toggle('is-done', j < k);
}
}
}
function tick() {
var p = parseFloat(getComputedStyle(act).getPropertyValue('--v-p')) || 0;
var x = p * n, f = 0;
for (var b = 1; b < n; b++) f += ss((x - (b - 0.175)) / 0.35);
if (f !== lastF) { lastF = f; paint(f); }
if (live) requestAnimationFrame(tick);
}
new IntersectionObserver(function (es) { live = es[0].isIntersecting; if (live) tick(); }).observe(act);
tick();
})();
// Шапка: меню на телефоне и подсветка текущего раздела
(function () {
var b = document.getElementById('hdrBurger'), nav = document.getElementById('hdrNav');
function set(o) { nav.classList.toggle('is-open', o); b.setAttribute('aria-expanded', o ? 'true' : 'false'); }
b.addEventListener('click', function () { set(b.getAttribute('aria-expanded') !== 'true'); });
nav.addEventListener('click', function (e) { if (e.target.tagName === 'A') set(false); });
document.addEventListener('keydown', function (e) { if (e.key === 'Escape') set(false); });
var links = {};
Array.prototype.forEach.call(nav.querySelectorAll('a[href^="#"]'), function (a) { links[a.getAttribute('href').slice(1)] = a; });
var io = new IntersectionObserver(function (es) {
es.forEach(function (e) { var a = links[e.target.id]; if (a) a.classList.toggle('is-on', e.isIntersecting); });
}, { rootMargin: '-45% 0px -50% 0px' });
Object.keys(links).forEach(function (id) { var s = document.getElementById(id); if (s) io.observe(s); });
})();
// Фирменный ход: линия стройки на полях. Пять точек-этапов заполняются
// по мере глав, активная подписана. Ведётся от положения интертитров.
// На тёплой плашке (глава 2) и тёмной главе (4) фолио меняет схему.
(function () {
var chapters = Array.prototype.slice.call(document.querySelectorAll('[data-chapter]'));
var end = document.getElementById('cena');
var folio = document.getElementById('folio'), fill = document.getElementById('folioFill');
var dots = Array.prototype.slice.call(folio.querySelectorAll('.folio__dot'));
var fm = document.getElementById('folioM'), fmText = document.getElementById('folioMText'), fmBar = document.getElementById('folioMBar');
var names = ['Основание', 'Каркас', 'Кровля', 'Отделка', 'Доставка'];
var darkFrom = 0, darkTo = 0, warmFrom = 0, warmTo = 0, tops = [], endTop = 0, lastIdx = -2, lastDark = null, lastWarm = null, ticking = false;
function measure() {
var y = window.scrollY;
tops = chapters.map(function (c) { return c.getBoundingClientRect().top + y; });
endTop = end.getBoundingClientRect().top + y;
var d1 = document.querySelector('.inter--dark'), d2 = document.querySelector('.chapter--dark'), w = document.querySelector('.inter--wood');
darkFrom = d1.getBoundingClientRect().top + y;
darkTo = d2.getBoundingClientRect().bottom + y;
warmFrom = w.getBoundingClientRect().top + y;
warmTo = w.getBoundingClientRect().bottom + y;
lastIdx = -2; lastDark = null; lastWarm = null; frame();
}
function frame() {
ticking = false;
var y = window.scrollY, vh = window.innerHeight, probe = y + vh * 0.45;
var idx = -1, i;
for (i = 0; i < tops.length; i++) if (probe >= tops[i]) idx = i;
var frac;
if (idx < 0) frac = 0;
else {
var a = tops[idx], b = idx + 1 < tops.length ? tops[idx + 1] : endTop;
frac = (idx + Math.min(Math.max((probe - a) / Math.max(b - a, 1), 0), 1)) / (tops.length - 1);
}
if (probe >= endTop) frac = 1;
frac = Math.min(frac, 1);
fill.style.height = (frac * 100).toFixed(2) + '%';
fmBar.style.transform = 'scaleX(' + frac.toFixed(3) + ')';
var dark = probe >= darkFrom && probe < darkTo;
if (dark !== lastDark) { lastDark = dark; folio.classList.toggle('is-dark', dark); fm.classList.toggle('is-dark', dark); }
var warm = probe >= warmFrom && probe < warmTo;
if (warm !== lastWarm) { lastWarm = warm; folio.classList.toggle('is-warm', warm); fm.classList.toggle('is-warm', warm); }
if (idx !== lastIdx) {
lastIdx = idx;
dots.forEach(function (d, k) {
d.classList.toggle('is-done', k < idx);
d.classList.toggle('is-active', k === idx);
});
fm.classList.toggle('is-on', idx >= 0);
if (idx >= 0) fmText.innerHTML = '<b>0' + (idx + 1) + '</b> · ' + names[idx];
}
}
function onScroll() { if (!ticking) { ticking = true; requestAnimationFrame(frame); } }
window.addEventListener('scroll', onScroll, { passive: true });
window.addEventListener('resize', function () { clearTimeout(measure._t); measure._t = setTimeout(measure, 150); });
window.addEventListener('load', measure);
if (document.fonts && document.fonts.ready) document.fonts.ready.then(measure);
measure();
})();
