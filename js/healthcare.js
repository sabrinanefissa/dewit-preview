/* Healthcare page (/healthcare/): the lifting stack.
   One instance per [data-hc-lift] (rendered by the hc-talk block). The
   things caregivers carry are stacked as lines over the outcomes. As the
   reader scrolls through the section (progress-driven, nothing pinned,
   about half a screen: data-span), the lines lift away one at a time,
   top first, and the rest close up under the label; when the last has gone, the outcomes come up in the same
   place (the two lists share one grid cell while armed, so the page
   never changes height). It runs once and never reverses.
   Motion is CSS transitions on transform, opacity and filter (see
   css/healthcare.css); this file only adds classes at scroll thresholds.
   Durations come from the block (data-lift, data-settle, in ms).
   The page height never changes, so nothing below ever moves.
   The kept line (.hc-lift__kept, "for leaders to lift") is not a
   .hc-lift__line, so nothing here touches it: it stays in place, the same
   with motion, without it, and without script.
   Reduced motion, Save-Data or no IntersectionObserver: nothing is armed,
   and both lists stand as plain text. Self-contained ES5; loaded before
   js/main.js with defer, so it waits for DOMContentLoaded. */
(function () {
  "use strict";

  function init() {
    var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    var save = !!(navigator.connection && navigator.connection.saveData);
    if (reduce || save || !("IntersectionObserver" in window)) return;
    var els = document.querySelectorAll("[data-hc-lift]");
    for (var i = 0; i < els.length; i++) lift(els[i]);
  }

  function num(el, name, d) {
    var v = parseFloat(el.getAttribute(name));
    return isNaN(v) || v < 0 ? d : v;
  }

  function lift(root) {
    var lines = [].slice.call(root.querySelectorAll(".hc-lift__line"));
    var carry = root.querySelector(".hc-lift__carry");
    var out = root.querySelector(".hc-lift__out");
    if (!lines.length || !carry || !out) return;

    var SPAN = num(root, "data-span", 0.45);     /* screens of scroll for the whole stack */
    var LIFT = num(root, "data-lift", 640);      /* ms, one line lifting */
    var SETTLE = num(root, "data-settle", 520);  /* ms, each outcome coming up */
    var START = 0.55;                            /* progress 0: the stack top at 55% of the screen */
    var GAP = 90;                                /* ms between lines when several are due at once */
    var n = lines.length;

    root.style.setProperty("--hc-lift", LIFT + "ms");
    root.style.setProperty("--hc-settle", SETTLE + "ms");

    var lifted = 0, queued = 0, cleared = false, pumping = false, listening = false, ticking = false;

    function clear() {
      if (cleared) return;
      cleared = true;
      root.classList.add("is-clear");
      stop();
    }

    /* lines lift strictly in order; a burst of due lines is spaced GAP apart.
       The lines still to go close up under the label by the height of
       those already lifted (--hc-shift), so the stack never shows a gap
       above it; a lifting line leaves from where it stood (--hc-from). */
    var shift = 0;
    function pump() {
      pumping = false;
      if (lifted >= queued) return;
      var ln = lines[lifted++];
      ln.style.setProperty("--hc-from", shift + "px");
      ln.classList.add("is-lifted");
      shift += ln.offsetHeight;
      root.style.setProperty("--hc-shift", shift + "px");
      if (lifted >= n) { setTimeout(clear, Math.round(LIFT * 0.55)); return; }
      if (lifted < queued) { pumping = true; setTimeout(pump, GAP); }
    }
    function due(count) {
      queued = count;
      if (!pumping) pump();
    }

    function frame() {
      ticking = false;
      if (cleared) return;
      var vh = window.innerHeight;
      var p = (START * vh - root.getBoundingClientRect().top) / (SPAN * vh);
      if (p <= 0) return;
      /* line k goes at (k + 1) / (n + 1); the last a little before the end */
      var count = Math.min(n, Math.floor(p * (n + 1) + 1e-6));
      if (count > queued) due(count);
    }
    function onScroll() {
      if (!ticking) { ticking = true; requestAnimationFrame(frame); }
    }
    function start() {
      if (listening || cleared) return;
      listening = true;
      window.addEventListener("scroll", onScroll, { passive: true });
      frame();
    }
    function stop() {
      if (!listening) return;
      listening = false;
      window.removeEventListener("scroll", onScroll);
    }

    /* Already scrolled past it on arrival (a reload further down): show the
       finished state at once, without playing it out of sight. */
    if (root.getBoundingClientRect().bottom < 0) {
      for (var k = 0; k < n; k++) lines[k].classList.add("is-lifted");
      lifted = queued = n;
      root.classList.add("is-armed");
      clear();
      return;
    }

    root.classList.add("is-armed");

    var io = new IntersectionObserver(function (es) {
      if (cleared) { io.disconnect(); return; }
      if (es[0].isIntersecting) start(); else stop();
    }, { rootMargin: "0px 0px -20% 0px", threshold: 0 });
    io.observe(root);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
