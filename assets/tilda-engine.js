(function () {
"use strict";
var W = window, D = document;
var RM = W.matchMedia("(prefers-reduced-motion: reduce)").matches;
var FINE = W.matchMedia("(hover: hover) and (pointer: fine)").matches;
var COARSE = W.matchMedia("(pointer: coarse)").matches;
var clamp = function (v, a, b) { return v < a ? a : v > b ? b : v; };
var num = function (s, d) { var n = parseFloat(s); return isNaN(n) ? d : n; };
var easeOut = function (t) { return 1 - Math.pow(1 - t, 3); };
var smooth = function (t) { return t * t * (3 - 2 * t); };
var $$ = function (sel, el) { return Array.prototype.slice.call((el || D).querySelectorAll(sel)); };
function parseCue(s) {
var a = String(s).trim().split(/\s+/).map(Number);
var from = num(a[0], 0), to = a.length > 1 ? num(a[1], 1) : 2;
var win = Math.max(Math.min(to, 1) - from, 0.0001);
var ri = a.length > 2 ? num(a[2], 0.3 * win) : 0.3 * win;
var ro = a.length > 3 ? num(a[3], 0.3 * win) : 0.3 * win;
return { from: from, to: to, ri: ri, ro: ro, hold: a.length < 2 };
}
function cueVal(c, p) {
var q = c.ri <= 0 ? (p >= c.from ? 1 : 0) : clamp((p - c.from) / c.ri, 0, 1);
var o = q;
if (!c.hold) {
var out = c.ro <= 0 ? ((p >= c.to && c.to < 1) ? 0 : 1) : 1 - clamp((p - (c.to - c.ro)) / c.ro, 0, 1);
o = Math.min(q, out);
}
return { o: smooth(o), q: q };
}
function splitKinetic(el, mode) {
if (el.__vk) return el.__vk;
var text = el.textContent.replace(/\s+/g, " ").trim();
var words = text.split(" ");
el.textContent = "";
var inners = [];
words.forEach(function (w, i) {
var o = D.createElement("span"); o.className = "v-k";
var n = D.createElement("span"); n.className = "v-ki"; n.textContent = w;
o.appendChild(n); el.appendChild(o);
if (i < words.length - 1) el.appendChild(D.createTextNode(" "));
inners.push(n);
});
var units = inners.map(function (n) { return { el: n, g: 0 }; });
var group = function () {
if (mode === "words") { units.forEach(function (u, i) { u.g = i; }); return; }
var tops = [], last = null, g = -1;
units.forEach(function (u) {
var t = u.el.parentNode.offsetTop;
if (last === null || Math.abs(t - last) > 2) { g++; last = t; }
u.g = g;
});
};
group();
if (D.fonts && D.fonts.ready) D.fonts.ready.then(group);
el.__vk = { units: units, regroup: group };
return el.__vk;
}
function driveKinetic(k, q, o) {
var n = 0; k.units.forEach(function (u) { if (u.g > n) n = u.g; }); n += 1;
var s = 0.55 / n;
var len = 1 - s * (n - 1);
k.units.forEach(function (u) {
var t = clamp((q - u.g * s) / len, 0, 1);
var e = easeOut(t);
u.el.style.opacity = e * o;
u.el.style.transform = "translateY(" + ((1 - e) * 110) + "%)";
});
}
function Act(el) {
this.el = el;
this.type = el.getAttribute("data-v-act") || "flow";
this.pinned = this.type === "pin" || (this.type === "pan" && !COARSE);
this.span = num(el.getAttribute("data-v-span"), 2);
if (this.pinned) el.style.setProperty("--v-span", this.span);
this.stage = el.querySelector("[data-v-stage]");
this.drift = el.getAttribute("data-v-drift");
this.cues = $$("[data-v-cue]", el).map(function (c) {
var kEl = c.hasAttribute("data-v-kinetic") ? c : c.querySelector("[data-v-kinetic]");
return {
el: c, cue: parseCue(c.getAttribute("data-v-cue")),
rise: num(c.getAttribute("data-v-rise"), 14),
kin: kEl ? splitKinetic(kEl, kEl.getAttribute("data-v-kinetic")) : null,
kinSelf: kEl === c, on: null, peak: 0
};
});
this.reveals = $$("[data-v-reveal]", el).map(function (r) {
var at = (r.getAttribute("data-v-reveal-at") || "0.1 0.5").split(/\s+/).map(Number);
return { el: r, dir: r.getAttribute("data-v-reveal"), a: num(at[0], 0.1), b: num(at[1], 0.5) };
});
this.parallax = $$("[data-v-parallax]", el).map(function (l) {
return { el: l, rate: num(l.getAttribute("data-v-parallax"), 0) };
});
this.pan = el.querySelector("[data-v-pan]");
this.panOver = this.pan ? num(this.pan.getAttribute("data-v-pan"), 0) : 0;
this.top = 0; this.h = 0; this.p = -1;
}
Act.prototype.measure = function (scrollY) {
var r = this.el.getBoundingClientRect();
this.top = r.top + scrollY; this.h = r.height;
if (this.pan) {
var sw = this.pan.scrollWidth, vw = this.stage ? this.stage.clientWidth : W.innerWidth;
this.panTravel = Math.max(sw - vw, 0) * (1 + this.panOver) + (this.panOver ? 0 : 0);
if ((RM || COARSE) && this.stage) { this.stage.style.overflowX = "auto"; }
}
};
Act.prototype.progress = function (y, vh) {
return this.pinned
? clamp((y - this.top) / Math.max(this.h - vh, 1), 0, 1)
: clamp((y + vh - this.top) / (this.h + vh), 0, 1);
};
Act.prototype.visible = function (y, vh) {
return this.top < y + vh * 1.3 && this.top + this.h > y - vh * 0.3;
};
Act.prototype.apply = function (p) {
if (p === this.p) return;
this.p = p;
this.el.style.setProperty("--v-p", p.toFixed(4));
var i, c, v;
for (i = 0; i < this.cues.length; i++) {
c = this.cues[i];
if (RM) { c.el.classList.add("v-cue-on"); continue; }
v = cueVal(c.cue, p);
if (v.o > c.peak) c.peak = v.o;
if (c.kin && c.kinSelf) {
c.el.style.opacity = 1;
driveKinetic(c.kin, v.q, v.o);
} else if (c.kin) {
driveKinetic(c.kin, v.q, 1);
c.el.style.opacity = v.o;
if (c.rise) c.el.style.transform = "translateY(" + ((1 - v.o) * c.rise).toFixed(2) + "px)";
} else {
c.el.style.opacity = v.o;
if (c.rise) c.el.style.transform = "translateY(" + ((1 - v.o) * c.rise).toFixed(2) + "px)";
}
var on = v.o > 0.5;
if (on !== c.on) { c.on = on; c.el.classList.toggle("v-cue-on", on); }
}
if (!RM) {
for (i = 0; i < this.reveals.length; i++) {
var r = this.reveals[i], t = clamp((p - r.a) / Math.max(r.b - r.a, 0.0001), 0, 1);
var k = ((1 - easeOut(t)) * 100).toFixed(2) + "%";
var ins = r.dir === "down" ? "0 0 " + k + " 0" : r.dir === "left" ? "0 " + k + " 0 0"
: r.dir === "right" ? "0 0 0 " + k : k + " 0 0 0";
r.el.style.clipPath = "inset(" + ins + ")";
}
for (i = 0; i < this.parallax.length; i++) {
var l = this.parallax[i];
l.el.style.transform = "translate3d(0," + (l.rate * (p - 0.5) * 100).toFixed(1) + "px,0)";
}
if (this.pan && !COARSE) this.pan.style.transform = "translate3d(" + (-this.panTravel * p).toFixed(1) + "px,0,0)";
}
};
var acts = [], root = null, counts = [], ticking = false, lastY = -1, vh = 0, progressEl = null;
var pointers = [];
function measureAll() {
var y = W.scrollY; vh = W.innerHeight;
acts.forEach(function (a) { a.measure(y); });
acts.forEach(function (a) { if (a.cues) a.cues.forEach(function (c) { if (c.kin) c.kin.regroup(); }); });
lastY = -1; frame();
}
function frame() {
ticking = false;
var y = W.scrollY;
if (y === lastY) return;
lastY = y;
var driftAct = null, driftBest = -1;
for (var i = 0; i < acts.length; i++) {
var a = acts[i];
if (!a.visible(y, vh)) { if (a.p !== 0 && a.p !== 1) a.apply(a.top > y ? 0 : 1); continue; }
var p = a.progress(y, vh);
a.apply(p);
if (a.drift) {
var mid = y + vh / 2, cov = mid >= a.top && mid <= a.top + a.h ? 1 : 0;
if (cov > driftBest) { driftBest = cov; driftAct = a; }
}
}
if (driftAct && driftBest > 0) root.style.setProperty("--v-canvas", driftAct.drift);
if (progressEl) {
var doc = Math.max(D.documentElement.scrollHeight - vh, 1);
progressEl.style.transform = "scaleX(" + clamp(y / doc, 0, 1).toFixed(4) + ")";
}
}
function onScroll() { if (!ticking) { ticking = true; W.requestAnimationFrame(frame); } }
function setupIn(r) {
var els = $$("[data-v-in]", r);
els.forEach(function (el) {
var st = el.getAttribute("data-v-stagger");
if (st) el.style.setProperty("--v-stagger", st + "ms");
Array.prototype.forEach.call(el.children, function (ch, i) { ch.style.setProperty("--v-i", i); });
});
if (!("IntersectionObserver" in W)) { els.forEach(function (el) { el.classList.add("v-on"); }); return; }
var io = new IntersectionObserver(function (es) {
es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add("v-on"); io.unobserve(e.target); } });
}, { rootMargin: "0px 0px -12% 0px", threshold: 0.05 });
els.forEach(function (el) { io.observe(el); });
}
function fmt(n, dec, sep) {
var s = n.toFixed(dec);
if (sep) { var parts = s.split("."); parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, " "); s = parts.join(","); }
else if (dec) s = s.replace(".", ",");
return s;
}
function setupCount(r) {
var els = $$("[data-v-count]", r);
if (!els.length) return;
var run = function (el) {
var a = el.getAttribute("data-v-count").trim().split(/\s+/);
var raw = a[a.length - 1], sep = /[\s ]/.test(raw) || raw.length > 4;
var to = parseFloat(raw.replace(/[\s ]/g, "").replace(",", ".")), from = a.length > 1 ? parseFloat(a[0]) : 0;
var dec = (raw.split(/[.,]/)[1] || "").length;
var ms = num(el.getAttribute("data-v-count-ms"), 1400);
el.style.fontVariantNumeric = "tabular-nums";
if (RM) { el.textContent = fmt(to, dec, sep); return; }
var t0 = null;
var step = function (ts) {
if (!t0) t0 = ts;
var t = clamp((ts - t0) / ms, 0, 1);
el.textContent = fmt(from + (to - from) * easeOut(t), dec, sep);
if (t < 1) W.requestAnimationFrame(step);
};
W.requestAnimationFrame(step);
};
var io = new IntersectionObserver(function (es) {
es.forEach(function (e) { if (e.isIntersecting) { run(e.target); io.unobserve(e.target); } });
}, { threshold: 0.5 });
els.forEach(function (el) { io.observe(el); });
}
function setupPointer(r) {
if (!FINE || RM) return;
$$("[data-v-tilt]", r).forEach(function (el) {
var max = num(el.getAttribute("data-v-tilt"), 6), tx = 0, ty = 0, cx = 0, cy = 0, raf = null;
var loop = function () {
cx += (tx - cx) * 0.12; cy += (ty - cy) * 0.12;
el.style.transform = "perspective(900px) rotateX(" + cy.toFixed(2) + "deg) rotateY(" + cx.toFixed(2) + "deg)";
raf = (Math.abs(tx - cx) > 0.01 || Math.abs(ty - cy) > 0.01) ? W.requestAnimationFrame(loop) : null;
};
el.addEventListener("pointermove", function (e) {
var b = el.getBoundingClientRect();
tx = ((e.clientX - b.left) / b.width - 0.5) * 2 * max;
ty = -((e.clientY - b.top) / b.height - 0.5) * 2 * max;
if (!raf) raf = W.requestAnimationFrame(loop);
});
el.addEventListener("pointerleave", function () { tx = 0; ty = 0; if (!raf) raf = W.requestAnimationFrame(loop); });
});
$$("[data-v-magnet]", r).forEach(function (el) {
var k = num(el.getAttribute("data-v-magnet"), 0.25), tx = 0, ty = 0, cx = 0, cy = 0, raf = null;
var loop = function () {
cx += (tx - cx) * 0.14; cy += (ty - cy) * 0.14;
el.style.transform = "translate3d(" + cx.toFixed(2) + "px," + cy.toFixed(2) + "px,0)";
raf = (Math.abs(tx - cx) > 0.05 || Math.abs(ty - cy) > 0.05) ? W.requestAnimationFrame(loop) : null;
};
var zone = el.parentNode;
zone.addEventListener("pointermove", function (e) {
var b = el.getBoundingClientRect(), mx = b.left + b.width / 2, my = b.top + b.height / 2;
var dx = e.clientX - mx, dy = e.clientY - my, dist = Math.hypot(dx, dy);
var reach = Math.max(b.width, b.height) * 1.4;
if (dist < reach) { tx = dx * k; ty = dy * k; } else { tx = 0; ty = 0; }
if (!raf) raf = W.requestAnimationFrame(loop);
});
zone.addEventListener("pointerleave", function () { tx = 0; ty = 0; if (!raf) raf = W.requestAnimationFrame(loop); });
});
$$("[data-v-spotlight]", r).forEach(function (el) {
el.addEventListener("pointermove", function (e) {
var b = el.getBoundingClientRect();
el.style.setProperty("--v-mx", ((e.clientX - b.left) / b.width).toFixed(3));
el.style.setProperty("--v-my", ((e.clientY - b.top) / b.height).toFixed(3));
});
});
}
function setupFocus() {
D.addEventListener("focusin", function (e) {
var t = e.target, cue = t.closest && t.closest("[data-v-cue]");
if (cue && parseFloat(cue.style.opacity || 1) < 0.85) {
var act = cue.closest("[data-v-act]");
if (act) { var a = acts.filter(function (x) { return x.el === act; })[0]; if (a && a.pinned) { W.scrollTo({ top: a.top + (a.h - vh) * 0.6, behavior: "instant" }); return; } }
t.scrollIntoView({ block: "center", behavior: "instant" });
}
});
}
var Vibe = {
mount: function (r) {
root = r || D.body;
root.classList.add("v-page");
acts = $$("[data-v-act]", root).map(function (el) { return new Act(el); });
progressEl = root.querySelector("[data-v-progress]");
setupIn(root); setupCount(root); setupPointer(root); setupFocus();
measureAll();
W.addEventListener("scroll", onScroll, { passive: true });
W.addEventListener("resize", function () { clearTimeout(Vibe._rt); Vibe._rt = setTimeout(measureAll, 120); });
if (W.ResizeObserver) new ResizeObserver(function () { clearTimeout(Vibe._rt); Vibe._rt = setTimeout(measureAll, 120); }).observe(root);
if (D.fonts && D.fonts.ready) D.fonts.ready.then(measureAll);
W.addEventListener("load", measureAll);
return Vibe;
},
remeasure: measureAll,
state: function () {
return acts.map(function (a, i) {
return { i: i, type: a.type, top: a.top, h: a.h, p: a.p, cues: a.cues.map(function (c) { return { text: c.el.textContent.trim().slice(0, 40), peak: c.peak, o: parseFloat(c.el.style.opacity || 1) }; }) };
});
},
reduced: RM,
coarse: COARSE
};
W.Vibe = Vibe;
})();