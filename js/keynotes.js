/* Keynotes page (/keynotes/): the org chart that dissolves into the
   lines between people. ES5, no dependencies. Loaded on this page only
   (keynotes.json "scripts").

   The SVG in the markup is the END state (dots, the lines between them,
   four of the lines named). That is what shows with no script and under
   reduced motion. Here the chart is set back to its start (boxes titled
   CEO, VP, Director, Manager on reporting lines; no phrases), and the
   scroll through the intro plays it forward, once:

     progress   what happens                         curve
     0.00-0.30  reporting lines retract to the top   ease-out (0.23, 1, 0.32, 1)
     0.12-0.32  reporting lines fade                 linear
     0.18-0.48  boxes shrink to 0.35 (ease-in-out)
     0.20-0.44  boxes and their titles fade (linear, so they cross-fade
                with the dots)
     0.22-0.70  people travel to where they connect  ease-in-out (0.77, 0, 0.175, 1)
     0.22-0.46  dots come up (scale 0.3 -> 1)        ease-out
     0.46-0.95  ten lines draw between people,       ease-out, 0.22 each,
                nearest the centre first             0.03 apart
     with each  a named line's phrase fades in over  linear, from 0.05
     draw       the later part of that line's draw   into the draw to its end
                and rides the line's midpoint

   Progress is the scroll that carries the chart's top from 55% of the
   screen to the top of the screen (at least 35% of a screen of scroll),
   so all of it happens with the chart in view; nothing pins. It only ever moves forward: the
   furthest point reached is kept, and once it reaches 1 every listener
   is removed and the chart stays as it is. The shown value eases toward
   the scroll's value (a frame-rate-independent lerp, 0.14 per 60 Hz
   frame), so a wheel step reads as motion rather than a jump.

   Cost: one rAF chain, running only while the chart is on screen and the
   shown value is still catching up; the scroll listener only reads
   pageYOffset; layout is measured on load and resize only. Every write
   is an SVG attribute (transform, opacity, stroke-dashoffset, d) on 27
   elements. Phones hide the phrases in CSS; they are written anyway. */
(function () {
  "use strict";
  var figs = [].slice.call(document.querySelectorAll("[data-kn-chart]"));
  if (!figs.length) return;
  var rmq = window.matchMedia("(prefers-reduced-motion: reduce)");
  if (rmq.matches) return;

  /* cubic-bezier(x1, y1, x2, y2) as a function of t (Newton, then
     bisection), so the curves are the named ones, not approximations */
  function bezier(x1, y1, x2, y2) {
    function a(p1, p2) { return 1 - 3 * p2 + 3 * p1; }
    function b(p1, p2) { return 3 * p2 - 6 * p1; }
    function c(p1) { return 3 * p1; }
    function at(t, p1, p2) { return ((a(p1, p2) * t + b(p1, p2)) * t + c(p1)) * t; }
    function slope(t, p1, p2) { return 3 * a(p1, p2) * t * t + 2 * b(p1, p2) * t + c(p1); }
    function tFor(x) {
      var t = x, i, s, cx;
      for (i = 0; i < 6; i++) {
        s = slope(t, x1, x2);
        if (Math.abs(s) < 1e-6) break;
        cx = at(t, x1, x2) - x;
        t -= cx / s;
      }
      if (t >= 0 && t <= 1 && Math.abs(at(t, x1, x2) - x) < 1e-5) return t;
      var lo = 0, hi = 1;
      t = x;
      for (i = 0; i < 30; i++) {
        cx = at(t, x1, x2);
        if (Math.abs(cx - x) < 1e-6) break;
        if (cx < x) lo = t; else hi = t;
        t = (lo + hi) / 2;
      }
      return t;
    }
    return function (x) { return x <= 0 ? 0 : x >= 1 ? 1 : at(tFor(x), y1, y2); };
  }
  var OUT = bezier(0.23, 1, 0.32, 1);
  var IN_OUT = bezier(0.77, 0, 0.175, 1);
  function seg(p, a, b) { return p <= a ? 0 : p >= b ? 1 : (p - a) / (b - a); }
  function mix(a, b, t) { return a + (b - a) * t; }
  function f(n, d) { return n.toFixed(d); }

  figs.forEach(chart);

  function chart(fig) {
    var people = [].slice.call(fig.querySelectorAll(".kn-chart__person")).map(function (g) {
      var c = g.getAttribute("data-c").split(" ").map(Number);
      var n = g.getAttribute("data-n").split(" ").map(Number);
      return { g: g, box: g.querySelector(".kn-chart__box"), dot: g.querySelector(".kn-chart__dot"),
               c: c, n: n, x: n[0], y: n[1] };
    });
    var reports = [].slice.call(fig.querySelectorAll(".kn-chart__reports path"));
    var links = [].slice.call(fig.querySelectorAll(".kn-chart__links path")).map(function (el) {
      return { el: el, a: people[+el.getAttribute("data-a")], b: people[+el.getAttribute("data-b")], phrase: null };
    });
    if (!people.length) return;
    /* each phrase rides the link it names (data-link: its index in links) */
    [].slice.call(fig.querySelectorAll(".kn-chart__phrase")).forEach(function (el) {
      var l = links[+el.getAttribute("data-link")];
      if (l) l.phrase = el;
    });
    var DEG = 180 / Math.PI;

    function render(q) {
      /* reporting lines: retract toward the manager, and fade */
      var off = f(OUT(seg(q, 0, 0.30)), 4), rop = f(1 - seg(q, 0.12, 0.32), 3);
      for (var i = 0; i < reports.length; i++) {
        reports[i].setAttribute("stroke-dashoffset", off);
        reports[i].setAttribute("opacity", rop);
      }
      /* people: travel, the box goes, the dot comes */
      var tm = IN_OUT(seg(q, 0.22, 0.70));
      var bs = f(mix(1, 0.35, IN_OUT(seg(q, 0.18, 0.48))), 3);
      var bo = f(1 - seg(q, 0.20, 0.44), 3);
      var td = OUT(seg(q, 0.22, 0.46));
      var dop = f(td, 3), ds = f(mix(0.3, 1, td), 3);
      for (var k = 0; k < people.length; k++) {
        var p = people[k];
        p.x = mix(p.c[0], p.n[0], tm); p.y = mix(p.c[1], p.n[1], tm);
        p.g.setAttribute("transform", "translate(" + f(p.x, 1) + " " + f(p.y, 1) + ")");
        p.box.setAttribute("opacity", bo);
        p.box.setAttribute("transform", "scale(" + bs + ")");
        p.dot.setAttribute("opacity", dop);
        p.dot.setAttribute("transform", "scale(" + ds + ")");
      }
      /* the lines between people draw in, one after another */
      for (var j = 0; j < links.length; j++) {
        var l = links[j], s = 0.46 + j * 0.03;
        l.el.setAttribute("d", "M" + f(l.a.x, 1) + " " + f(l.a.y, 1) + "L" + f(l.b.x, 1) + " " + f(l.b.y, 1));
        l.el.setAttribute("stroke-dashoffset", f(1 - OUT(seg(q, s, s + 0.22)), 4));
        if (l.phrase) {
          /* upright: measured from whichever end is on the left */
          var L = l.a.x <= l.b.x ? l.a : l.b, R = L === l.a ? l.b : l.a;
          var deg = Math.atan2(R.y - L.y, R.x - L.x) * DEG;
          l.phrase.setAttribute("transform", "translate(" + f((L.x + R.x) / 2, 1) + " " + f((L.y + R.y) / 2, 1) +
            ") rotate(" + f(deg, 2) + ")");
          l.phrase.setAttribute("opacity", f(seg(q, s + 0.05, s + 0.22), 3));
        }
      }
    }

    var target = 0, shown = 0, raf = 0, last = 0, done = false, visible = false;
    var s0 = 0, s1 = 1, io = null, rsT = 0;

    function measure() {
      var r = fig.getBoundingClientRect(), vh = window.innerHeight || 1, y = window.pageYOffset;
      var top = r.top + y;
      /* it starts once the chart's top is above 55% of the screen and is
         done as its top reaches the top of the screen, so the whole
         dissolve happens with the chart in view (about half a screen of
         scroll on a laptop, a bit more on a phone; at least 35%) */
      s0 = Math.max(0, top - 0.55 * vh);
      s1 = Math.max(s0 + 0.35 * vh, top - 0.04 * vh);
    }
    function read() {
      var p = (window.pageYOffset - s0) / (s1 - s0);
      p = p < 0 ? 0 : p > 1 ? 1 : p;
      if (p > target) { target = p; wake(); }
    }
    function frame(now) {
      raf = 0;
      if (done) return;
      var dt = last ? Math.min(64, now - last) : 16.7;
      last = now;
      var q = shown + (target - shown) * (1 - Math.pow(0.86, dt / 16.7));
      if (target - q < 0.0015) q = target;
      shown = q;
      render(q);
      if (q >= 1) { finish(); return; }
      if (q < target && visible && !document.hidden) raf = requestAnimationFrame(frame);
      else last = 0;
    }
    function wake() {
      if (!raf && !done && visible && !document.hidden && shown < target) raf = requestAnimationFrame(frame);
    }
    function onResize() { clearTimeout(rsT); rsT = setTimeout(function () { measure(); read(); }, 150); }
    function onVis() { if (document.hidden) { if (raf) { cancelAnimationFrame(raf); raf = 0; } last = 0; } else wake(); }
    function finish() {
      done = true;
      if (raf) { cancelAnimationFrame(raf); raf = 0; }
      render(1);
      window.removeEventListener("scroll", read);
      window.removeEventListener("resize", onResize);
      document.removeEventListener("visibilitychange", onVis);
      if (io) io.disconnect();
      fig.classList.add("is-done");
    }

    /* arrived below the chart already (a link to one of the talks, or a
       restored scroll position): it is simply finished */
    if (fig.getBoundingClientRect().bottom < 0) { finish(); return; }

    render(0);
    fig.classList.add("is-live");
    measure();

    if ("IntersectionObserver" in window) {
      io = new IntersectionObserver(function (es) {
        visible = es[es.length - 1].isIntersecting;
        if (visible) wake();
      }, { threshold: 0 });
      io.observe(fig);
    } else { visible = true; }

    window.addEventListener("scroll", read, { passive: true });
    window.addEventListener("resize", onResize, { passive: true });
    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("load", function () { if (!done) { measure(); read(); } });
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { if (!done) { measure(); read(); } });
    /* reduced motion switched on mid-visit: go straight to the end */
    var onRm = function () { if (rmq.matches && !done) finish(); };
    if (rmq.addEventListener) rmq.addEventListener("change", onRm);
    else if (rmq.addListener) rmq.addListener(onRm);
    read();
  }
})();
