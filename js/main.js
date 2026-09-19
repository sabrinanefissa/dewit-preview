/* Dr. Stephen de Wit - homepage interactions. Progressive enhancement;
   all motion respects prefers-reduced-motion. */
(function () {
  "use strict";
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---- Loader ---- */
  var loader = document.getElementById("loader");
  var bar = document.getElementById("loaderBar");
  function dismissLoader() {
    if (!loader || loader.classList.contains("is-done")) return;
    if (bar) bar.style.width = "100%";
    setTimeout(function () { loader.classList.add("is-done"); }, reduce ? 0 : 260);
    setTimeout(function () { if (loader) loader.style.display = "none"; }, 1100);
  }
  if (loader) {
    if (bar && !reduce) { requestAnimationFrame(function(){ bar.style.transition = "width 1.1s cubic-bezier(.4,0,.2,1)"; bar.style.width = "72%"; }); }
    window.addEventListener("load", function () { setTimeout(dismissLoader, reduce ? 0 : 500); });
    setTimeout(dismissLoader, 2600); // safety
  }

  /* ---- Nav solid on scroll past hero ----
     Two inputs, one writer: the hero observer and the hero card scrub both
     feed syncNav() so they never fight over the .is-solid class. */
  var nav = document.querySelector(".nav");
  var hero = document.querySelector(".hero");
  var heroRatio = 1; // last intersectionRatio reported for the hero
  var heroP = 0;     // hero -> framed-card progress, 0..1
  function syncNav() {
    if (!nav) return;
    nav.classList.toggle("is-solid", heroRatio < 0.12 || heroP > 0.25);
  }
  if (nav && hero && "IntersectionObserver" in window) {
    new IntersectionObserver(function (e) {
      heroRatio = e[0].intersectionRatio; syncNav();
    }, { threshold: [0, 0.12, 1], rootMargin: "-72px 0px 0px 0px" }).observe(hero);
  } else if (nav) { nav.classList.add("is-solid"); }

  /* ---- Reveals (.reveal + .lines) ---- */
  var revealEls = document.querySelectorAll(".reveal, .lines");
  if (reduce || !("IntersectionObserver" in window)) {
    revealEls.forEach(function (el) { el.classList.add("in"); });
  } else {
    var ro = new IntersectionObserver(function (entries, obs) {
      entries.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add("in"); obs.unobserve(e.target); } });
    }, { threshold: 0.05, rootMargin: "0px 0px 10% 0px" });
    revealEls.forEach(function (el) { ro.observe(el); });
  }

  /* ---- Stat count-up ---- */
  function fmt(n) { return n >= 1000 ? n.toLocaleString("en-US") : String(n); }
  var stats = document.querySelectorAll("[data-count]");
  function runCount(el) {
    var t = parseFloat(el.getAttribute("data-count")), suf = el.getAttribute("data-suffix") || "";
    if (reduce) { el.textContent = fmt(t) + suf; return; }
    var dur = 1500, s = null;
    (function step(ts){ if(!s)s=ts; var p=Math.min((ts-s)/dur,1), e=1-Math.pow(1-p,3);
      el.textContent = fmt(Math.round(t*e)) + suf; if(p<1) requestAnimationFrame(step); })(0);
  }
  if (stats.length && "IntersectionObserver" in window) {
    var so = new IntersectionObserver(function (entries, obs) {
      entries.forEach(function (e) { if (e.isIntersecting) { runCount(e.target); obs.unobserve(e.target); } });
    }, { threshold: 0.6 });
    stats.forEach(function (s) { so.observe(s); });
  } else { stats.forEach(function (s) { s.textContent = fmt(parseFloat(s.getAttribute("data-count"))) + (s.getAttribute("data-suffix")||""); }); }

  /* ---- Parallax + scale on full-bleed media ---- */
  var px = document.querySelectorAll("[data-parallax]");
  if (!reduce && px.length) {
    var tick = false;
    function onScroll() {
      if (tick) return; tick = true;
      requestAnimationFrame(function () {
        var vh = innerHeight;
        px.forEach(function (el) {
          var host = el.closest(".media") ? el.closest(".media").parentElement : el.parentElement;
          var r = host.getBoundingClientRect();
          if (r.bottom < -50 || r.top > vh + 50) return;
          var prog = (r.top + r.height / 2 - vh / 2) / vh; // -1..1
          el.style.transform = "scale(1.16) translateY(" + (prog * -34).toFixed(1) + "px)";
        });
        tick = false;
      });
    }
    addEventListener("scroll", onScroll, { passive: true }); onScroll();
  }

  /* ---- Hero ambient keynote loop (skipped under reduced-motion / Save-Data) ---- */
  var heroVideo = document.querySelector(".hero__video");
  var saveData = navigator.connection && navigator.connection.saveData;
  if (heroVideo && !reduce && !saveData) {
    var small = window.matchMedia("(max-width: 820px)").matches;
    var canWebm = heroVideo.canPlayType && heroVideo.canPlayType('video/webm; codecs="vp9"');
    var src = small ? heroVideo.getAttribute("data-src-mp4-sm")
            : (canWebm ? heroVideo.getAttribute("data-src-webm") : heroVideo.getAttribute("data-src-mp4"));
    heroVideo.setAttribute("src", src);
    heroVideo.addEventListener("playing", function () { heroVideo.classList.add("is-playing"); }, { once: true });
    heroVideo.load();
    var tryPlay = function () { heroVideo.muted = true; var p = heroVideo.play(); return p && p.catch ? p.catch(function(){}) : p; };
    tryPlay();
    // If muted autoplay is gated, start on the first user interaction / when tab becomes visible.
    var kick = function () { if (heroVideo.paused) tryPlay(); };
    ["pointerdown", "touchstart", "keydown", "scroll"].forEach(function (ev) {
      window.addEventListener(ev, kick, { once: true, passive: true });
    });
    document.addEventListener("visibilitychange", function () { if (!document.hidden) kick(); });
  }

  /* ---- Hero to framed-card handoff ----
     Scrubs --hp from 0 to 1 over the first 0.6 viewport heights while the hero
     is pinned by .hero-track. CSS turns --hp into the clip-path inset that
     contracts the media into a rounded card, and fades the hero copy out. */
  var heroTrack = document.querySelector(".hero-track");
  if (hero && heroTrack && !reduce) {
    var hpTick = false, hpLast = -1;
    var setHeroProgress = function () {
      hpTick = false;
      var span = 0.6 * window.innerHeight;
      var raw = span > 0 ? window.scrollY / span : 0;
      var p = raw < 0 ? 0 : (raw > 1 ? 1 : raw);
      p = 1 - Math.pow(1 - p, 3); // ease-out cubic
      if (Math.abs(p - hpLast) <= 0.001) return;
      hpLast = p; heroP = p;
      hero.style.setProperty("--hp", p.toFixed(4));
      syncNav();
    };
    var onHeroScroll = function () {
      if (hpTick) return; hpTick = true; requestAnimationFrame(setHeroProgress);
    };
    addEventListener("scroll", onHeroScroll, { passive: true });
    addEventListener("resize", onHeroScroll, { passive: true });
    setHeroProgress();
  }

  /* ---- Video lightbox ---- */
  var lb = document.querySelector(".lb"), lbFrame = lb && lb.querySelector(".lb__frame"), last = null;
  function openLB(src) {
    if (!lb) return; last = document.activeElement;
    if (src) {
      if (/\.(mp4|webm)(\?|#|$)/i.test(src)) {
        var sm = src.replace("-1080.mp4", "-720.mp4");
        var small = window.matchMedia("(max-width: 700px)").matches && sm !== src;
        lbFrame.innerHTML = '<video class="lb__video" controls autoplay playsinline preload="auto" ' +
          'poster="assets/img/reel-poster.jpg" src="' + (small ? sm : src) + '"></video>';
      } else {
        lbFrame.innerHTML = '<iframe src="' + src + '" allow="autoplay; fullscreen; encrypted-media" allowfullscreen></iframe>';
      }
    }
    lb.classList.add("is-open"); lb.setAttribute("aria-hidden","false"); document.body.style.overflow = "hidden";
    var c = lb.querySelector(".lb__close"); if (c) c.focus();
  }
  function closeLB() {
    if (!lb) return; lb.classList.remove("is-open"); lb.setAttribute("aria-hidden","true"); document.body.style.overflow = "";
    var ph = lb.getAttribute("data-ph"); if (ph) lbFrame.innerHTML = ph; if (last) last.focus();
  }
  if (lb) {
    lb.setAttribute("data-ph", lbFrame.innerHTML);
    document.querySelectorAll("[data-video]").forEach(function (b) { b.addEventListener("click", function () { openLB(b.getAttribute("data-video")); }); });
    lb.addEventListener("click", function (e) { if (e.target === lb) closeLB(); });
    var cb = lb.querySelector(".lb__close"); if (cb) cb.addEventListener("click", closeLB);
    addEventListener("keydown", function (e) { if (e.key === "Escape") closeLB(); });
  }

  /* ---- Approach: scroll-scrub walk toward the stage ---- */
  var scrub = document.querySelector(".approach__track[data-scrub]");
  if (scrub) {
    var canvas = scrub.querySelector(".approach__canvas");
    var ctx = canvas.getContext("2d", { alpha: false });
    var TOTAL = 120, frames = new Array(TOTAL), loaded = 0;
    var pad = function (n) { return ("00" + n).slice(-3); };
    function sizeCanvas() {
      var dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      canvas.width = Math.round(canvas.clientWidth * dpr);
      canvas.height = Math.round(canvas.clientHeight * dpr);
    }
    function drawCover(im) {
      if (!im || !im.complete || !im.naturalWidth) return;
      var cw = canvas.width, ch = canvas.height, iw = im.naturalWidth, ih = im.naturalHeight;
      var s = Math.max(cw / iw, ch / ih), w = iw * s, h = ih * s;
      ctx.drawImage(im, (cw - w) / 2, (ch - h) / 2, w, h);
    }
    var current = -1;
    function render(idx) {
      idx = Math.max(0, Math.min(TOTAL - 1, idx));
      var im = frames[idx];
      if (im && im.complete && im.naturalWidth) { drawCover(im); current = idx; }
      else if (current >= 0) { drawCover(frames[current]); }
    }
    var ticking = false;
    function onScrub() {
      if (ticking) return; ticking = true;
      requestAnimationFrame(function () {
        var r = scrub.getBoundingClientRect(), span = r.height - window.innerHeight;
        var p = span > 0 ? Math.min(Math.max(-r.top / span, 0), 1) : 0;
        render(Math.round(p * (TOTAL - 1)));
        ticking = false;
      });
    }
    function loadFrame(i, cb) {
      var im = new Image();
      im.onload = function () { loaded++; if (cb) cb(im); };
      im.src = "assets/scrub/f" + pad(i + 1) + ".webp";
      frames[i] = im;
    }
    sizeCanvas();
    window.addEventListener("resize", function () { sizeCanvas(); if (current >= 0) drawCover(frames[current]); else onScrub(); });
    if (reduce || !("IntersectionObserver" in window)) {
      // Reduced motion: no pin/scrub - show the arrival frame as a still.
      loadFrame(TOTAL - 1, function (im) { current = TOTAL - 1; drawCover(im); });
    } else {
      var started = false;
      var io = new IntersectionObserver(function (e) {
        if (!e[0].isIntersecting || started) return; started = true; io.disconnect();
        for (var i = 0; i < TOTAL; i++) {
          loadFrame(i, function () { if (loaded === 1) onScrub(); if (loaded === TOTAL) onScrub(); });
        }
        window.addEventListener("scroll", onScrub, { passive: true });
        onScrub();
      }, { rootMargin: "800px 0px" });
      io.observe(scrub);
    }
  }

  /* ---- Mobile drawer ---- */
  var drawer = document.querySelector(".drawer"), toggle = document.querySelector(".menu-toggle"),
      dClose = drawer && drawer.querySelector(".drawer__close");
  function setDrawer(open) {
    if (!drawer) return; drawer.classList.toggle("is-open", open);
    drawer.setAttribute("aria-hidden", open ? "false" : "true");
    if (toggle) toggle.setAttribute("aria-expanded", open ? "true" : "false");
    document.body.style.overflow = open ? "hidden" : "";
  }
  if (toggle) toggle.addEventListener("click", function () { setDrawer(!drawer.classList.contains("is-open")); });
  if (dClose) dClose.addEventListener("click", function () { setDrawer(false); });
  if (drawer) drawer.querySelectorAll("a").forEach(function (a) { a.addEventListener("click", function () { setDrawer(false); }); });

  var y = document.querySelector("[data-year]"); if (y) y.textContent = new Date().getFullYear();
})();

/* ===== The through-line: one dot, carried by the scroll ===== */
(function () {
  "use strict";

  var sec = document.getElementById("thread");
  if (!sec) return;

  var settle = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  var inner    = sec.querySelector(".thread__inner");
  var svg      = document.getElementById("threadSvg");
  var guide    = document.getElementById("guidePath");
  var drawn    = document.getElementById("drawnPath");
  var pulse    = document.getElementById("pulse");
  var rail     = document.getElementById("rail");
  var railFill = document.getElementById("railFill");
  var stations = [].slice.call(sec.querySelectorAll(".station"));
  var dots     = stations.map(function (s) { return s.querySelector(".dot"); });
  var stills   = stations.map(function (s) { return s.querySelector(".still"); });
  var bgs      = [].slice.call(sec.querySelectorAll(".thread__bg img"));
  if (!svg || !guide || !drawn) return;

  var mq = window.matchMedia("(max-width: 720px)");
  var CURSOR = 0.62;            /* the dot rides this fraction of the viewport */
  var len = 0, ticking = false, active = -1;

  /* ---- build the path through the measured dot centres ---------- */
  function build() {
    var r = sec.getBoundingClientRect();
    var w = Math.round(r.width), h = Math.round(r.height);
    if (!w || !h) return;
    svg.setAttribute("viewBox", "0 0 " + w + " " + h);

    /* the line enters at the top of the wrap and leaves at the bottom of the
       section, so it reads as continuing from the hero card and into what follows */
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

  /* ---- the path's control points are vertical, so its y only ever
          increases: a binary search finds the length that sits at y ---- */
  function lengthAtY(yT) {
    var lo = 0, hi = len, mid;
    for (var i = 0; i < 22; i++) {
      mid = (lo + hi) / 2;
      if (drawn.getPointAtLength(mid).y < yT) lo = mid; else hi = mid;
    }
    return (lo + hi) / 2;
  }

  /* ---- one station carries the ground, the passed ones stay lit -- */
  function setActive(i) {
    if (i === active) return;
    active = i;
    for (var k = 0; k < stations.length; k++) {
      stations[k].classList.toggle("is-active", k === i);
    }
    for (var j = 0; j < bgs.length; j++) {
      bgs[j].classList.toggle("is-on", j === i);
    }
  }

  function light(yT, top) {
    var last = -1;
    for (var i = 0; i < stations.length; i++) {
      var b = dots[i].getBoundingClientRect();
      if (b.top + b.height / 2 - top <= yT) {
        stations[i].classList.add("is-lit");
        last = i;
      }
    }
    setActive(last < 0 ? 0 : last);
  }

  function parallax() {
    if (settle) return;
    var vh = window.innerHeight;
    for (var i = 0; i < stills.length; i++) {
      var b = stills[i].getBoundingClientRect();
      var t = (b.top + b.height / 2) / vh;                 /* 0 top, 1 bottom */
      var y = Math.max(-10, Math.min(10, (0.5 - t) * 20));
      stills[i].style.transform = "translate3d(0," + y.toFixed(1) + "px,0)";
    }
  }

  /* ---- the dot sits on the cursor line, the line is drawn to it -- */
  function apply() {
    var r = sec.getBoundingClientRect();
    var h = r.height;
    if (!h) return;

    if (settle) {
      if (len) drawn.style.strokeDashoffset = "0";
      if (railFill) railFill.style.height = "100%";
      for (var i = 0; i < stations.length; i++) {
        stations[i].classList.add("is-lit");
      }
      setActive(0);
      if (pulse) pulse.style.opacity = "0";
      sec.style.setProperty("--px", "50%");
      sec.style.setProperty("--py", (h / 2).toFixed(1) + "px");
      return;
    }

    var raw = window.innerHeight * CURSOR - r.top;   /* cursor, section relative */
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
    requestAnimationFrame(function () {
      ticking = false;
      apply(); parallax();
    });
  }

  /* ---- wiring ---------------------------------------------------- */
  var rebuild = 0;
  function queueBuild() {
    clearTimeout(rebuild);
    rebuild = setTimeout(build, 60);
  }

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

  window.__thread = {
    len: function () { return len; },
    sAtY: lengthAtY,
    active: function () { return active; },
    cursor: CURSOR
  };
})();

/* ===== What happens when you book: sticky step list ===== */
(function () {
  "use strict";
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var track = document.querySelector(".steps__track[data-steps]");
  if (!track || reduce) return;

  var stills = track.querySelectorAll(".steps__still");
  var items = track.querySelectorAll(".steps__list li");
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

  function onScroll() {
    if (ticking) return; ticking = true; requestAnimationFrame(measure);
  }

  /* Warm the remaining stills before the scene arrives so a crossfade
     never lands on a blank frame. */
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
})();

/* ===== Interactive moments ===== */
(function () {
  "use strict";
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* --- Same patterns: rolling headline word, folder tabs, word cards ---
     The loop lives in the headline word and its underline. While it runs,
     neither tab is live. A tab, or the word itself, sets the room for good.
     A room change only retints the section; no card ever opens on its own. */
  (function () {
    var pat    = document.getElementById("patterns");
    var ctxBtn = document.getElementById("ctxBtn");
    var grid   = document.getElementById("pgrid");
    var panel  = document.getElementById("ppanel");
    if (!pat || !ctxBtn || !grid || !panel) return;

    var spans = ctxBtn.querySelectorAll(".ctx__swap > span");
    var tabs  = [].slice.call(pat.querySelectorAll(".ptab"));
    var cards = [].slice.call(grid.querySelectorAll(".pcard:not(.pcard--cta)"));
    var bar   = pat.querySelector(".ctx__bar");

    var PERIOD = 5000;                     /* ms between automatic room changes */
    var atWork = false;
    var stopped = false, paused = false, inView = false, auto = 0;

    /* --- render ------------------------------------------------- */
    function restartTimer() {
      if (reduce || !bar) return;
      pat.classList.remove("is-cycling");
      void bar.offsetWidth;                /* reflow so the fill restarts */
      if (auto) pat.classList.add("is-cycling");
    }

    function render() {
      pat.classList.toggle("is-work", atWork);
      pat.classList.toggle("is-home", !atWork);

      spans.forEach(function (s) {
        var isHome = s.textContent.indexOf("home") > -1;
        var show = atWork ? !isHome : isHome;
        if (show) { s.setAttribute("data-on", ""); s.removeAttribute("data-off"); s.removeAttribute("aria-hidden"); }
        else { s.setAttribute("data-off", ""); s.removeAttribute("data-on"); s.setAttribute("aria-hidden", "true"); }
      });

      /* A tab fuses to the panel only once the room is set. While the
         headline is still rolling, both tabs stay lowered and unselected. */
      tabs.forEach(function (b) {
        var isRoom = (b.getAttribute("data-room") === "work") === atWork;
        var on = stopped && isRoom;
        b.classList.toggle("is-on", on);
        b.setAttribute("aria-selected", on ? "true" : "false");
        if (isRoom) panel.setAttribute("aria-labelledby", b.id);
      });

      restartTimer();
    }

    /* --- the loop ----------------------------------------------- */
    function roll() { atWork = !atWork; render(); }

    function startAuto() {
      if (reduce || stopped || auto || !inView || paused) return;
      auto = setInterval(roll, PERIOD);
      restartTimer();
    }
    function stopAuto() {
      clearInterval(auto); auto = 0;
      pat.classList.remove("is-cycling");
    }
    /* The pointer over the grid holds the room still; the bar keeps
       its position rather than resetting. */
    function pause() {
      if (paused || stopped) return;
      paused = true; pat.classList.add("is-paused");
      clearInterval(auto); auto = 0;
    }
    function resume() {
      if (!paused) return;
      paused = false; pat.classList.remove("is-paused");
      pat.classList.remove("is-cycling");
      startAuto();
    }

    /* A room the visitor sets is the room it stays in. */
    function choose(work) {
      atWork = work;
      stopped = true;
      stopAuto();
      pat.classList.add("is-stopped");
      pat.classList.remove("is-paused");
      render();
    }

    /* --- controls ----------------------------------------------- */
    tabs.forEach(function (b) {
      b.addEventListener("click", function () { choose(b.getAttribute("data-room") === "work"); });
    });
    /* The word settles on the room it is showing, never the opposite one. */
    ctxBtn.addEventListener("click", function () { choose(atWork); });

    grid.addEventListener("pointerenter", pause);
    grid.addEventListener("pointerleave", resume);

    /* Touch: the card itself is the control. Pointer devices use hover. */
    var canHover = window.matchMedia("(hover: hover)").matches;
    cards.forEach(function (c) {
      c.addEventListener("click", function () {
        if (canHover || reduce) return;
        var on = !c.classList.contains("is-on");
        cards.forEach(function (o) { o.classList.remove("is-on"); o.setAttribute("aria-pressed", "false"); });
        c.classList.toggle("is-on", on);
        c.setAttribute("aria-pressed", on ? "true" : "false");
      });
    });
    document.addEventListener("keydown", function (e) {
      if (e.key !== "Escape") return;
      cards.forEach(function (o) { o.classList.remove("is-on"); o.setAttribute("aria-pressed", "false"); });
    });

    render();

    /* --- spotlight ----------------------------------------------
       The glow eases toward the pointer at 0.12 per frame, so it glides
       rather than snapping. With no pointer on the section it drifts on
       the keyframed path instead. */
    if (!reduce) {
      pat.classList.add("is-drifting");

      var tx = 50, ty = 40, cx = 50, cy = 40, spotRaf = 0;

      function step() {
        cx += (tx - cx) * 0.12;
        cy += (ty - cy) * 0.12;
        pat.style.setProperty("--mx", cx.toFixed(2) + "%");
        pat.style.setProperty("--my", cy.toFixed(2) + "%");
        if (Math.abs(tx - cx) > 0.05 || Math.abs(ty - cy) > 0.05) spotRaf = requestAnimationFrame(step);
        else spotRaf = 0;
      }
      function nudge() { if (!spotRaf) spotRaf = requestAnimationFrame(step); }

      pat.addEventListener("pointermove", function (e) {
        if (e.pointerType === "touch") return;
        var r = pat.getBoundingClientRect();
        if (!r.width || !r.height) return;
        tx = ((e.clientX - r.left) / r.width) * 100;
        ty = ((e.clientY - r.top) / r.height) * 100;
        pat.classList.remove("is-drifting");
        nudge();
      }, { passive: true });

      pat.addEventListener("pointerleave", function () {
        pat.classList.add("is-drifting");
        tx = 50; ty = 40;
        nudge();
      }, { passive: true });
    }

    /* --- visibility ---------------------------------------------- */
    if (!reduce && "IntersectionObserver" in window) {
      new IntersectionObserver(function (e) {
        inView = e[0].isIntersecting;
        if (inView) startAuto(); else stopAuto();
      }, { threshold: 0.25 }).observe(pat);
    } else if (!reduce) {
      inView = true; startAuto();
    }

    /* exposed for verification */
    window.__patterns = {
      room:     function () { return atWork ? "work" : "home"; },
      stopped:  function () { return stopped; },
      paused:   function () { return paused; },
      cycling:  function () { return !!auto; },
      interval: function () { return auto; },
      period:   PERIOD,
      choose:   choose,
      flip:     roll
    };
  })();

  /* --- Truth cards: tap toggle (hover handled by CSS) --- */
  document.querySelectorAll(".tcard").forEach(function (c) {
    c.addEventListener("click", function () {
      var on = c.classList.toggle("is-on");
      c.setAttribute("aria-pressed", on ? "true" : "false");
    });
  });

  /* --- Constellation --- */
  var canvas = document.getElementById("net");
  if (canvas && canvas.getContext) {
    var host = canvas.closest(".bleed");
    var ctx = canvas.getContext("2d");
    canvas.style.pointerEvents = "none";
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var W = 0, H = 0, nodes = [], raf = null, pointer = { x: -999, y: -999 }, visible = true;
    function size() {
      var r = host.getBoundingClientRect();
      W = r.width; H = r.height;
      canvas.width = W * dpr; canvas.height = H * dpr;
      canvas.style.width = W + "px"; canvas.style.height = H + "px";
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      var n = Math.max(18, Math.min(46, Math.round(W / 46)));
      nodes = [];
      for (var i = 0; i < n; i++) {
        nodes.push({ x: Math.random() * W, y: Math.random() * H,
          vx: (Math.random() - 0.5) * 0.25, vy: (Math.random() - 0.5) * 0.25 });
      }
    }
    var D = 160;
    function frame(move) {
      ctx.clearRect(0, 0, W, H);
      for (var i = 0; i < nodes.length; i++) {
        var a = nodes[i];
        if (move) {
          a.x += a.vx; a.y += a.vy;
          if (a.x < 0 || a.x > W) a.vx *= -1;
          if (a.y < 0 || a.y > H) a.vy *= -1;
          var dxp = a.x - pointer.x, dyp = a.y - pointer.y, dp = Math.hypot(dxp, dyp);
          if (dp < 200) { a.x += dxp / dp * 0.6; a.y += dyp / dp * 0.6; }
        }
        for (var j = i + 1; j < nodes.length; j++) {
          var b = nodes[j], d = Math.hypot(a.x - b.x, a.y - b.y);
          if (d < D) {
            ctx.strokeStyle = "rgba(124,77,224," + (0.5 * (1 - d / D)).toFixed(3) + ")";
            ctx.lineWidth = 1;
            ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
          }
        }
        var dpx = Math.hypot(a.x - pointer.x, a.y - pointer.y);
        if (dpx < 220) {
          ctx.strokeStyle = "rgba(169,133,230," + (0.55 * (1 - dpx / 220)).toFixed(3) + ")";
          ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(pointer.x, pointer.y); ctx.stroke();
        }
        ctx.fillStyle = "rgba(199,178,236,0.85)";
        ctx.beginPath(); ctx.arc(a.x, a.y, 2, 0, 6.2832); ctx.fill();
      }
    }
    function loop() { if (visible) frame(true); raf = requestAnimationFrame(loop); }
    size();
    if (reduce) { frame(false); }
    else {
      host.addEventListener("mousemove", function (e) {
        var r = host.getBoundingClientRect(); pointer.x = e.clientX - r.left; pointer.y = e.clientY - r.top;
      });
      host.addEventListener("mouseleave", function () { pointer.x = -999; pointer.y = -999; });
      var resT; window.addEventListener("resize", function () { clearTimeout(resT); resT = setTimeout(size, 200); });
      if ("IntersectionObserver" in window) {
        new IntersectionObserver(function (e) { visible = e[0].isIntersecting; }, { threshold: 0.05 }).observe(host);
      }
      loop();
    }
  }
})();

/* ===== Image reveals: clip-path wipe + blur-to-focus (varied entrance) ===== */
(function () {
  "use strict";
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var els = [].slice.call(document.querySelectorAll("[data-reveal-clip], [data-reveal-focus]"));
  if (!els.length || reduce) return; // default state is fully visible - nothing to hide
  // Arm (hide for the entrance) only images that start well below the fold, so nothing on-screen can vanish.
  var armed = els.filter(function (e) {
    if (e.getBoundingClientRect().top > innerHeight * 1.05) { e.classList.add("armed"); return true; }
    return false;
  });
  if (!armed.length) return;
  function check() {
    for (var i = armed.length - 1; i >= 0; i--) {
      if (armed[i].getBoundingClientRect().top < innerHeight * 0.9) { armed[i].classList.add("in"); armed.splice(i, 1); }
    }
    if (!armed.length) window.removeEventListener("scroll", check);
  }
  window.addEventListener("scroll", check, { passive: true });
  check();
})();

/* ===== Credibility ribbon: drifting logos with a traveling spotlight ===== */
(function () {
  "use strict";
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var lanes = [].slice.call(document.querySelectorAll("[data-cred-lane]"));
  if (!lanes.length) return;

  lanes.forEach(function (lane) {
    var vp = lane.querySelector(".cred__viewport");
    var track = lane.querySelector(".cred__track");
    if (!vp || !track) return;
    var speed = parseFloat(lane.getAttribute("data-speed"));
    if (isNaN(speed)) speed = 0.3;

    // Duplicate the set once so it can loop seamlessly.
    var originalCount = track.children.length;
    for (var k = 0; k < originalCount; k++) {
      var c = track.children[k].cloneNode(true);
      c.setAttribute("aria-hidden", "true");
      track.appendChild(c);
    }
    var imgs = [].slice.call(track.children);
    var setW = 0, pos = 0, lit = null, rafId = null;

    function measure() {
      setW = imgs[originalCount].offsetLeft - imgs[0].offsetLeft;
      for (var i = 0; i < imgs.length; i++) imgs[i]._cx = imgs[i].offsetLeft + imgs[i].offsetWidth / 2;
    }
    function frame() {
      pos -= speed;
      if (setW > 0) { if (pos <= -setW) pos += setW; else if (pos > 0) pos -= setW; }
      track.style.transform = "translate3d(" + pos.toFixed(2) + "px,0,0)";
      var r = vp.getBoundingClientRect();
      var focal = r.left + r.width * 0.5;
      var best = null, bestD = Infinity;
      for (var i = 0; i < imgs.length; i++) {
        var d = Math.abs(r.left + pos + imgs[i]._cx - focal);
        if (d < bestD) { bestD = d; best = imgs[i]; }
      }
      if (best !== lit) { if (lit) lit.classList.remove("lit"); if (best) best.classList.add("lit"); lit = best; }
      rafId = requestAnimationFrame(frame);
    }

    measure();
    window.addEventListener("resize", function () { measure(); });

    if (reduce) return; // static, calm grayscale (CSS handles look)

    if ("IntersectionObserver" in window) {
      new IntersectionObserver(function (e) {
        if (e[0].isIntersecting) { if (rafId == null) { measure(); rafId = requestAnimationFrame(frame); } }
        else if (rafId != null) { cancelAnimationFrame(rafId); rafId = null; }
      }, { threshold: 0 }).observe(lane);
    } else {
      rafId = requestAnimationFrame(frame);
    }
  });
})();
