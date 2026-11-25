/* Home sections (hm-*): entrances, the through-line, what people say, the
   count-up, the credibility wall and the booking steps. Progressive
   enhancement; all motion respects prefers-reduced-motion. The hidden
   entrance states in css/home-sections.css apply only once html.hm-js is
   set, as the last line here. */
(function () {
  "use strict";
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var hasIO = "IntersectionObserver" in window;

  /* ---- Entrances ---- */
  var revealEls = [].slice.call(document.querySelectorAll(".hm-reveal"));
  if (reduce || !hasIO) {
    revealEls.forEach(function (el) { el.classList.add("is-in"); });
  } else {
    var ro = new IntersectionObserver(function (entries, obs) {
      entries.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add("is-in"); obs.unobserve(e.target); } });
    }, { threshold: 0.05, rootMargin: "0px 0px 10% 0px" });
    revealEls.forEach(function (el) { ro.observe(el); });
  }

  /* ---- Image entrances: a clip-path wipe and a blur to focus, armed only
     on images that start well below the fold, so nothing on screen hides */
  (function () {
    var els = [].slice.call(document.querySelectorAll(".hm-clip, .hm-focus"));
    if (!els.length || reduce) return;
    var armed = els.filter(function (e) {
      if (e.getBoundingClientRect().top > innerHeight * 1.05) { e.classList.add("is-armed"); return true; }
      return false;
    });
    if (!armed.length) return;
    function check() {
      for (var i = armed.length - 1; i >= 0; i--) {
        if (armed[i].getBoundingClientRect().top < innerHeight * 0.9) { armed[i].classList.add("is-in"); armed.splice(i, 1); }
      }
      if (!armed.length) window.removeEventListener("scroll", check);
    }
    window.addEventListener("scroll", check, { passive: true });
    check();
  })();

  /* ---- Count-up: the markup carries the final figures; they drop to 0
     only when the count will run ---- */
  (function () {
    function fmt(n) { return n >= 1000 ? n.toLocaleString("en-US") : String(n); }
    var nums = [].slice.call(document.querySelectorAll("[data-hm-count]"));
    if (!nums.length || reduce || !hasIO) return;
    function run(el) {
      var t = parseFloat(el.getAttribute("data-hm-count")), suf = el.getAttribute("data-suffix") || "";
      var dur = 1500, s = null;
      (function step(ts) {
        if (!s) s = ts;
        var p = Math.min((ts - s) / dur, 1), e = 1 - Math.pow(1 - p, 3);
        el.textContent = fmt(Math.round(t * e)) + suf;
        if (p < 1) requestAnimationFrame(step);
      })(0);
    }
    nums.forEach(function (el) { el.textContent = "0"; });
    var so = new IntersectionObserver(function (entries, obs) {
      entries.forEach(function (e) { if (e.isIntersecting) { run(e.target); obs.unobserve(e.target); } });
    }, { threshold: 0.6 });
    nums.forEach(function (el) { so.observe(el); });
  })();

  /* ---- What people say: the strike draws, the line underneath rises.
     One trigger per row, one way; hover, focus and press replay it. */
  (function () {
    var rows = [].slice.call(document.querySelectorAll(".hm-trow"));
    if (!rows.length) return;
    function show(r) { r.classList.add("is-revealed"); }
    function replay(r) {
      if (reduce) { show(r); return; }
      r.classList.remove("is-revealed");
      void r.offsetWidth;
      show(r);
    }
    if (reduce || !hasIO) {
      rows.forEach(show);
    } else {
      var io = new IntersectionObserver(function (entries, obs) {
        entries.forEach(function (e) {
          if (!e.isIntersecting) return;
          show(e.target); obs.unobserve(e.target);
        });
      }, { threshold: 0.45 });
      rows.forEach(function (r) { io.observe(r); });
    }
    rows.forEach(function (r) {
      r.addEventListener("pointerenter", function (e) {
        if (e.pointerType === "touch") return;
        replay(r);
      });
      r.addEventListener("focus", function () { replay(r); });
      r.addEventListener("click", function () {
        var on = r.getAttribute("aria-pressed") !== "true";
        r.setAttribute("aria-pressed", on ? "true" : "false");
        replay(r);
      });
    });
  })();
})();

/* ===== The through-line: one dot, carried by the scroll ===== */
(function () {
  "use strict";
  var settle = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  [].slice.call(document.querySelectorAll("section.hm-thread")).forEach(function (sec) {
    var inner    = sec.querySelector(".hm-thread__inner");
    var svg      = sec.querySelector(".hm-thread__svg");
    var guide    = sec.querySelector(".hm-thread__guide");
    var drawn    = sec.querySelector(".hm-thread__drawn");
    var pulse    = sec.querySelector(".hm-thread__pulse");
    var rail     = sec.querySelector(".hm-thread__rail");
    var railFill = rail ? rail.querySelector("b") : null;
    var stations = [].slice.call(sec.querySelectorAll(".hm-station"));
    var dots     = stations.map(function (s) { return s.querySelector(".hm-station__dot"); });
    var stills   = stations.map(function (s) { return s.querySelector(".hm-station__still"); });
    var bgs      = [].slice.call(sec.querySelectorAll(".hm-thread__bg img"));
    if (!inner || !svg || !guide || !drawn || !stations.length) return;

    var mq = window.matchMedia("(max-width: 720px)");
    var CURSOR = 0.62;            /* the dot rides this fraction of the viewport */
    var len = 0, ticking = false, active = -1;

    /* the path runs through the measured dot centres, entering at the top
       of the wrap and leaving at the bottom of the section */
    function build() {
      var r = sec.getBoundingClientRect();
      var w = Math.round(r.width), h = Math.round(r.height);
      if (!w || !h) return;
      svg.setAttribute("viewBox", "0 0 " + w + " " + h);
      var ir = inner.getBoundingClientRect();
      var cx = ir.left - r.left + ir.width / 2;
      var pts = dots.map(function (d) {
        var b = d.getBoundingClientRect();
        return { x: b.left - r.left + b.width / 2, y: b.top - r.top + b.height / 2 };
      });
      pts.unshift({ x: cx, y: 0 });
      pts.push({ x: cx, y: h });
      var d = "M " + pts[0].x.toFixed(2) + " " + pts[0].y.toFixed(2);
      for (var i = 1; i < pts.length; i++) {
        var a = pts[i - 1], b = pts[i], dy = (b.y - a.y) * 0.5;
        d += " C " + a.x.toFixed(2) + " " + (a.y + dy).toFixed(2) +
             " " + b.x.toFixed(2) + " " + (b.y - dy).toFixed(2) +
             " " + b.x.toFixed(2) + " " + b.y.toFixed(2);
      }
      guide.setAttribute("d", d);
      drawn.setAttribute("d", d);
      len = drawn.getTotalLength();
      drawn.style.strokeDasharray = len.toFixed(2);
      apply();
    }

    /* the control points are vertical, so y only increases along the path:
       a binary search finds the length that sits at a given y */
    function lengthAtY(yT) {
      var lo = 0, hi = len, mid;
      for (var i = 0; i < 22; i++) {
        mid = (lo + hi) / 2;
        if (drawn.getPointAtLength(mid).y < yT) lo = mid; else hi = mid;
      }
      return (lo + hi) / 2;
    }

    /* one station carries the ground; the passed ones stay lit */
    function setActive(i) {
      if (i === active) return;
      active = i;
      for (var k = 0; k < stations.length; k++) stations[k].classList.toggle("is-active", k === i);
      for (var j = 0; j < bgs.length; j++) bgs[j].classList.toggle("is-on", j === i);
    }
    function light(yT, top) {
      var last = -1;
      for (var i = 0; i < stations.length; i++) {
        var b = dots[i].getBoundingClientRect();
        if (b.top + b.height / 2 - top <= yT) { stations[i].classList.add("is-lit"); last = i; }
      }
      setActive(last < 0 ? 0 : last);
    }
    function parallax() {
      if (settle) return;
      var vh = window.innerHeight;
      for (var i = 0; i < stills.length; i++) {
        var b = stills[i].getBoundingClientRect();
        var t = (b.top + b.height / 2) / vh;
        var y = Math.max(-10, Math.min(10, (0.5 - t) * 20));
        stills[i].style.transform = "translate3d(0," + y.toFixed(1) + "px,0)";
      }
    }

    /* the dot sits on the cursor line and the line is drawn to it */
    function apply() {
      var r = sec.getBoundingClientRect();
      var h = r.height;
      if (!h) return;
      if (settle) {
        if (len) drawn.style.strokeDashoffset = "0";
        if (railFill) railFill.style.height = "100%";
        for (var i = 0; i < stations.length; i++) stations[i].classList.add("is-lit");
        setActive(0);
        if (pulse) pulse.style.opacity = "0";
        sec.style.setProperty("--px", "50%");
        sec.style.setProperty("--py", (h / 2).toFixed(1) + "px");
        return;
      }
      var raw = window.innerHeight * CURSOR - r.top;
      var yT  = Math.min(h, Math.max(0, raw));
      var px, py;
      if (mq.matches) {
        var rr = rail ? rail.getBoundingClientRect() : null;
        px = rr ? rr.left - r.left + rr.width / 2 : r.width / 2;
        py = yT;
        if (railFill) railFill.style.height = yT.toFixed(2) + "px";
      } else {
        var s = len ? lengthAtY(yT) : 0;
        if (len) drawn.style.strokeDashoffset = (len - s).toFixed(2);
        var p = len ? drawn.getPointAtLength(s) : { x: r.width / 2, y: yT };
        px = p.x; py = p.y;
      }
      if (pulse) {
        pulse.style.transform = "translate3d(" + px.toFixed(2) + "px," + py.toFixed(2) + "px,0)";
        pulse.style.opacity = (raw > 0 && raw < h) ? "1" : "0";
      }
      sec.style.setProperty("--px", px.toFixed(2) + "px");
      sec.style.setProperty("--py", py.toFixed(2) + "px");
      light(yT, r.top);
    }

    function onScroll() {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(function () { ticking = false; apply(); parallax(); });
    }
    var rebuild = 0;
    function queueBuild() { clearTimeout(rebuild); rebuild = setTimeout(build, 60); }

    build();
    apply(); parallax();
    if (!settle) {
      window.addEventListener("scroll", onScroll, { passive: true });
      window.addEventListener("resize", function () { queueBuild(); onScroll(); }, { passive: true });
      if ("ResizeObserver" in window) new ResizeObserver(queueBuild).observe(sec);
    }
    window.addEventListener("load", function () { build(); apply(); parallax(); });
    [].slice.call(sec.querySelectorAll("img")).forEach(function (im) {
      if (!im.complete) im.addEventListener("load", queueBuild);
    });
  });
})();

/* ===== What happens when you book: the scene holds, the steps advance ===== */
(function () {
  "use strict";
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduce) return;
  [].slice.call(document.querySelectorAll(".hm-steps__track")).forEach(function (track) {
    var stills = track.querySelectorAll(".hm-steps__still");
    var items = track.querySelectorAll(".hm-steps__list li");
    var TOTAL = Math.min(stills.length, items.length);
    if (!TOTAL) return;
    var current = -1, ticking = false;

    function setActive(idx) {
      if (idx === current) return;
      for (var i = 0; i < TOTAL; i++) {
        stills[i].classList.toggle("is-on", i === idx);
        items[i].classList.toggle("is-on", i === idx);
      }
      current = idx;
    }
    function measure() {
      ticking = false;
      var r = track.getBoundingClientRect(), span = track.offsetHeight - window.innerHeight;
      var p = span > 0 ? Math.min(Math.max(-r.top / span, 0), 1) : 0;
      setActive(Math.min(TOTAL - 1, Math.floor(p * TOTAL)));
    }
    function onScroll() { if (ticking) return; ticking = true; requestAnimationFrame(measure); }

    /* the remaining stills load before the scene arrives, so a crossfade
       never lands on a blank frame */
    function preload() {
      for (var i = 1; i < TOTAL; i++) {
        stills[i].setAttribute("loading", "eager");
        var im = new Image();
        if (stills[i].srcset) im.srcset = stills[i].srcset;
        im.sizes = stills[i].sizes || "100vw";
        im.src = stills[i].src;
      }
    }
    if ("IntersectionObserver" in window) {
      var io = new IntersectionObserver(function (e) {
        if (!e[0].isIntersecting) return;
        io.disconnect(); preload();
      }, { rootMargin: "800px 0px" });
      io.observe(track);
    } else { preload(); }

    addEventListener("scroll", onScroll, { passive: true });
    addEventListener("resize", onScroll, { passive: true });
    measure();
  });
})();

/* ===== Credibility wall: two rows of tiles, then the seam opens =====
   768px and up with motion: the section is a pinned track on the page's
   scroll spine (js/main.js). The first lane's rows drift in opposite
   directions across the whole pass; each tile's cover lifts away as the
   section arrives, in a stagger along the row; then the rows part to the
   stage's top and bottom, the first heading leaves, and the second lane
   opens out of the seam, its heading and tiles rising in turn. All of it
   is scrubbed, so it runs backwards on the way up.
   Every tile answers with the card: hover or focus on a pointer device,
   a tap on touch. Phones and reduced motion: no pin, plain rows. */
(function () {
  "use strict";
  var sec = document.querySelector(".hm-orgband");
  if (!sec) return;
  var stage = sec.querySelector(".hm-orgband__stage");
  var card = sec.querySelector(".hm-card");
  var wall = sec.querySelector(".hm-wall"), seen = sec.querySelector(".hm-seen");
  var tiles = [].slice.call(sec.querySelectorAll(".hm-tile"));
  if (!stage || !card || !tiles.length) return;
  var cName = card.querySelector("b"), cQuote = card.querySelector("p"), cBy = card.querySelector("cite");

  function clamp(v) { return v < 0 ? 0 : (v > 1 ? 1 : v); }
  function seg(p, a, b) { return clamp((p - a) / (b - a)); }

  /* ---- the card ---- */
  var cur = null, curBy = "";
  function lifted(t) { var c = parseFloat(t.style.getPropertyValue("--cover")); return !(c > 0.5); }
  function place(t) {
    var s = stage.getBoundingClientRect(), r = t.getBoundingClientRect();
    var w = card.offsetWidth, h = card.offsetHeight;
    var x = Math.max(8, Math.min(r.left - s.left + r.width / 2 - w / 2, s.width - w - 8));
    var above = r.top - s.top - h - 10;
    var y = above > 0 ? above : r.bottom - s.top + 10;
    card.style.transform = "translate(" + Math.round(x) + "px," + Math.round(y) + "px)";
  }
  function show(t, by) {
    if (t && !lifted(t)) t = null;
    if (cur === t) { if (t) curBy = by; return; }
    if (cur) cur.classList.remove("on");
    cur = t; curBy = t ? by : "";
    card.classList.toggle("on", !!t);
    sec.classList.toggle("is-card", !!t);
    if (!t) return;
    t.classList.add("on");
    cName.textContent = t.getAttribute("data-n") || "";
    cQuote.textContent = t.getAttribute("data-q") || "";
    cBy.textContent = t.getAttribute("data-by") || "";
    place(t);
  }
  tiles.forEach(function (t) {
    t.addEventListener("pointerenter", function (e) { if (e.pointerType === "mouse") show(t, "pointer"); });
    t.addEventListener("pointerleave", function (e) { if (e.pointerType === "mouse" && curBy === "pointer") show(null); });
    t.addEventListener("click", function () { show(cur === t && !t.matches(":hover") ? null : t, "tap"); });
    if (t.tagName === "BUTTON") {
      t.addEventListener("focus", function () { if (t.matches(":focus-visible")) show(t, "focus"); });
      t.addEventListener("blur", function () { if (cur === t) show(null); });
    }
  });
  document.addEventListener("keydown", function (e) { if (cur && (e.key === "Escape" || e.key === "Esc")) show(null); });
  document.addEventListener("pointerdown", function (e) { if (cur && !e.target.closest(".hm-tile")) show(null); }, { passive: true });
  /* the tiles move with the page, so a card from the pointer or a tap lets
     go as soon as it scrolls; one from the keyboard follows its tile */
  function onMove() {
    if (!cur) return;
    if (curBy === "focus") place(cur); else show(null);
  }
  window.addEventListener("scroll", onMove, { passive: true });
  [].slice.call(sec.querySelectorAll(".hm-wall__row, .hm-seen__tiles")).forEach(function (row) {
    row.addEventListener("scroll", onMove, { passive: true });
  });

  /* ---- the pinned pass ---- */
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var wide = window.matchMedia("(min-width: 768px)");
  var rows = wall ? [].slice.call(wall.querySelectorAll(".hm-wall__row")) : [];
  var title = wall && wall.querySelector(".hm-orgband__h");
  var seenH = seen && seen.querySelector(".hm-orgband__h");
  var seenTiles = seen ? [].slice.call(seen.querySelectorAll(".hm-tile")) : [];
  var covered = [];
  rows.forEach(function (row) {
    [].slice.call(row.children).forEach(function (t, i) { covered.push({ el: t, s: (i % 6) * 0.12, v: -1 }); });
  });
  if (reduce || rows.length < 2 || !seen) return;

  function quart(t) { return t < 0.5 ? 8 * t * t * t * t : 1 - Math.pow(-2 * t + 2, 4) / 2; }
  function cubic(t) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }
  function out(t) { return 1 - Math.pow(1 - t, 3); }
  function pageY(el) { var y = 0; for (var n = el; n; n = n.offsetParent) y += n.offsetTop; return y; }

  var pin = false;
  var vh = 1, top = 0, H = 1, wA = 0, wB = 0, mA = 0, mB = 0, eT = 0, eB = 0, Hh = 1;
  function measure() {
    vh = window.innerHeight || 1;
    top = pageY(sec); H = sec.offsetHeight;
    if (!pin) return;
    var box = rows[0].parentNode, nav = document.querySelector(".nav");
    wA = rows[0].scrollWidth; wB = rows[1].scrollWidth;
    Hh = stage.clientHeight;
    mA = box.offsetTop + rows[0].offsetTop + rows[0].offsetHeight / 2;
    mB = box.offsetTop + rows[1].offsetTop + rows[1].offsetHeight / 2;
    eT = (nav ? nav.offsetHeight : 64) + 24 + rows[0].offsetHeight / 2;
    eB = rows[1].offsetHeight / 2 + 24;
  }
  function fade(el, t, d) {
    el.style.opacity = t.toFixed(3);
    el.style.transform = t < 1 ? "translateY(" + (d * (1 - t)).toFixed(1) + "px)" : "";
  }
  function clear() {
    rows.concat(title ? [title] : [], seenH ? [seenH] : [], seenTiles).forEach(function (el) {
      el.style.transform = ""; el.style.opacity = "";
    });
    seen.style.clipPath = "";
    covered.forEach(function (o) { o.el.style.removeProperty("--cover"); o.v = -1; });
  }
  function render(p, y) {
    if (!pin) return;
    /* the drift: across the whole pass, the rows in opposite directions */
    var xa = -0.3 * wA * p, xb = -0.3 * wB * (1 - p);
    /* the covers: from the section's top at mid-screen to half a screen
       past the top, each tile in its turn along the row */
    var ct = clamp((y - (top - vh * 0.5)) / vh) * 1.1;
    for (var i = 0; i < covered.length; i++) {
      var o = covered[i], v = Math.round((1 - cubic(clamp((ct - o.s) / 0.5))) * 1000) / 1000;
      if (v !== o.v) { o.v = v; o.el.style.setProperty("--cover", v); }
    }
    /* the hand-off, while the stage is held */
    var q = clamp((y - top) / Math.max(1, H - vh));
    var e = quart(seg(q, 0.26, 0.6)), et = quart(seg(q, 0.26, 0.54));
    rows[0].style.transform = "translate3d(" + xa.toFixed(1) + "px," + ((eT - mA) * e).toFixed(1) + "px,0)";
    rows[1].style.transform = "translate3d(" + xb.toFixed(1) + "px," + ((Hh - eB - mB) * e).toFixed(1) + "px,0)";
    if (title) { title.style.transform = "translateY(" + ((eT - mA - 40) * et).toFixed(1) + "px)"; title.style.opacity = (1 - et).toFixed(3); }
    var c = (50 * (1 - e)).toFixed(2);
    seen.style.clipPath = "inset(" + c + "% 0 " + c + "% 0)";
    if (seenH) fade(seenH, out(seg(q, 0.4, 0.56)), 14);
    seenTiles.forEach(function (t, k) { fade(t, out(seg(q, 0.46 + 0.035 * k, 0.6 + 0.035 * k)), 16); });
  }
  function setPin() {
    var on = wide.matches && !!window.spkSpine;
    if (on === pin) return;
    pin = on;
    sec.classList.toggle("is-pin", pin);
    if (!pin) clear();
    show(null);
    if (window.spkSpine) window.spkSpine.measure();
  }
  /* a keyboard visitor reaching the second lane is taken to where it is open */
  seen.addEventListener("focusin", function () {
    if (!pin) return;
    var y = top + 0.8 * (H - vh), now = window.scrollY || 0;
    if (now >= y - 4) return;
    if (window.spkLenis && window.spkLenis.scrollTo) window.spkLenis.scrollTo(y, { immediate: true });
    else window.scrollTo(0, y);
  });
  function init() {
    if (!window.spkSpine) return;
    setPin();
    window.spkSpine.add({
      start: function () { measure(); return top - vh; },
      end: function () { return top + H; },
      update: render
    });
    if (wide.addEventListener) wide.addEventListener("change", setPin);
    else if (wide.addListener) wide.addListener(setPin);
    tiles.forEach(function (t) {
      var im = t.querySelector("img");
      if (im && !im.complete) im.addEventListener("load", function () { if (pin) window.spkSpine.measure(); });
    });
  }
  /* the spine is set up by js/main.js, which runs after this file */
  if (window.spkSpine) init();
  else document.addEventListener("DOMContentLoaded", init);
})();

document.documentElement.classList.add("hm-js");
