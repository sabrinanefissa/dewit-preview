/* Home sections (hm-*): entrances, the through-line, what people say, the
   count-up, the credibility ribbon and the booking steps. Progressive
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

/* ===== Credibility ribbon: drifting lanes, timed spotlight =====
   Each lane drifts. The highlight is a timed tick with two slots, so a
   mark lights, holds and fades on its own clock and two never light at
   once. Lane two runs half a tick out of phase with lane one. */
(function () {
  "use strict";
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var lanes = [].slice.call(document.querySelectorAll(".hm-cred__lane"));
  if (!lanes.length) return;

  var small = window.matchMedia("(max-width: 700px)").matches;
  var TICK  = small ? 1000 : 1100;   /* ms between ignitions on a lane */
  var SPELL = 2200;                  /* ms a mark stays lit */
  /* small screens hold two or three marks at once, so the candidate band
     opens wider there */
  var INNER = small ? 0.92 : 0.76;   /* candidates sit inside this much of the viewport */
  var HISTORY = 3;                   /* never relight one of the last 3 */
  var FADE  = 640;                   /* ms a mark takes to fall back to rest */

  lanes.forEach(function (lane, laneIndex) {
    var vp = lane.querySelector(".hm-cred__viewport");
    var track = lane.querySelector(".hm-cred__track");
    if (!vp || !track || !track.children.length) return;
    var speed = parseFloat(lane.getAttribute("data-speed"));
    if (isNaN(speed)) speed = 0.3;

    /* repeat the set until it covers the viewport twice over, so the wrap
       never opens a gap */
    var originalCount = track.children.length;
    var originals = [].slice.call(track.children);
    function addSet() {
      for (var k = 0; k < originalCount; k++) {
        var c = originals[k].cloneNode(true);
        c.setAttribute("aria-hidden", "true");
        c.setAttribute("alt", "");
        track.appendChild(c);
      }
    }
    addSet();
    var guard = 0;
    while (track.scrollWidth < vp.clientWidth * 2 + 40 && guard++ < 8) addSet();
    var imgs = [].slice.call(track.children);
    var setW = 0, pos = 0, rafId = null;

    function measure() {
      setW = imgs[originalCount].offsetLeft - imgs[0].offsetLeft;
      for (var i = 0; i < imgs.length; i++) imgs[i]._cx = imgs[i].offsetLeft + imgs[i].offsetWidth / 2;
    }
    function frame() {
      pos -= speed;
      if (setW > 0) { if (pos <= -setW) pos += setW; else if (pos > 0) pos -= setW; }
      track.style.transform = "translate3d(" + pos.toFixed(2) + "px,0,0)";
      rafId = requestAnimationFrame(frame);
    }

    measure();
    window.addEventListener("resize", function () { measure(); });
    imgs.forEach(function (im) { if (!im.complete) im.addEventListener("load", measure); });

    if (reduce) return;

    var slots = [null, null];
    var recent = [];
    var timers = [];
    var tickId = null, phaseId = null, tickCount = 0;
    var hoverHeld = null;

    function now() { return (window.performance && performance.now) ? performance.now() : Date.now(); }
    function isLit(el) { return el && el.classList.contains("lit"); }
    /* lit, held by the pointer, or still on its way back down */
    function isBusy(el) {
      if (!el) return false;
      if (isLit(el) || el === hoverHeld) return true;
      return !!el._fadeUntil && el._fadeUntil > now();
    }
    function extinguish(slot) {
      var el = slots[slot];
      if (!el) return;
      slots[slot] = null;
      if (el === hoverHeld) return;
      el.classList.remove("lit");
      el._fadeUntil = now() + FADE;
      setTimeout(function () { if (!el.classList.contains("lit")) el.classList.remove("next"); }, FADE);
    }
    function pick() {
      var r = vp.getBoundingClientRect();
      if (!r.width) return null;
      var centre = r.width / 2;
      var lo = r.width * (1 - INNER) / 2, hi = r.width - lo;
      var best = null, bestD = Infinity;
      for (var i = 0; i < imgs.length; i++) {
        var el = imgs[i];
        if (isBusy(el)) continue;
        if (recent.indexOf(el) > -1) continue;
        if (isBusy(imgs[i - 1]) || isBusy(imgs[i + 1])) continue;
        var x = pos + el._cx;
        if (x < lo || x > hi) continue;
        var d = Math.abs(x - centre);
        if (d < bestD) { bestD = d; best = el; }
      }
      return best;
    }
    function ignite(slot) {
      var el = pick();
      if (!el) return;
      extinguish(slot);
      slots[slot] = el;
      recent.push(el);
      while (recent.length > HISTORY) recent.shift();
      /* queued first, so the compositing hint lands a frame before the move */
      el.classList.add("next");
      requestAnimationFrame(function () {
        if (slots[slot] !== el) return;
        el._fadeUntil = 0;
        el.classList.add("lit");
        el.classList.remove("next");
      });
      timers.push(setTimeout(function () { if (slots[slot] === el) extinguish(slot); }, SPELL));
      if (timers.length > 8) timers.splice(0, timers.length - 8);
    }
    function tick() { ignite(tickCount++ % 2); }
    function startTicks() {
      if (tickId || phaseId) return;
      var offset = laneIndex % 2 ? Math.round(TICK / 2) : 0;
      phaseId = setTimeout(function () {
        phaseId = null;
        tick();
        tickId = setInterval(tick, TICK);
      }, offset);
    }
    function stopTicks() {
      if (phaseId) { clearTimeout(phaseId); phaseId = null; }
      if (tickId) { clearInterval(tickId); tickId = null; }
      timers.forEach(clearTimeout); timers = [];
      extinguish(0); extinguish(1);
    }

    /* on a pointer device, hover takes a mark and holds it */
    if (window.matchMedia("(hover: hover)").matches) {
      imgs.forEach(function (el) {
        el.addEventListener("pointerenter", function (e) {
          if (e.pointerType === "touch") return;
          hoverHeld = el;
          el.classList.add("lit");
        });
        el.addEventListener("pointerleave", function () {
          if (hoverHeld !== el) return;
          hoverHeld = null;
          if (slots[0] !== el && slots[1] !== el) {
            el.classList.remove("lit");
            el._fadeUntil = now() + FADE;
          }
        });
      });
    }

    var inView = false;
    function sync() {
      var run = inView && !document.hidden;
      if (run) {
        if (rafId == null) { measure(); rafId = requestAnimationFrame(frame); }
        startTicks();
      } else {
        if (rafId != null) { cancelAnimationFrame(rafId); rafId = null; }
        stopTicks();
      }
    }
    if ("IntersectionObserver" in window) {
      new IntersectionObserver(function (e) { inView = e[0].isIntersecting; sync(); }, { threshold: 0 }).observe(lane);
    } else { inView = true; sync(); }
    document.addEventListener("visibilitychange", sync);
  });
})();

document.documentElement.classList.add("hm-js");
