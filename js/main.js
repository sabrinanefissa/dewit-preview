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
     Two inputs, one writer: the hero observer and the scroll position both
     feed syncNav() so they never fight over the .is-solid class. The hero is
     a static scene now, so the second input is simply scrollY. */
  var nav = document.querySelector(".nav");
  var hero = document.querySelector(".hero");
  var heroRatio = 1; // last intersectionRatio reported for the hero
  function syncNav() {
    if (!nav) return;
    nav.classList.toggle("is-solid", heroRatio < 0.12 || window.scrollY > 40);
  }
  if (nav && hero && "IntersectionObserver" in window) {
    new IntersectionObserver(function (e) {
      heroRatio = e[0].intersectionRatio; syncNav();
    }, { threshold: [0, 0.12, 1], rootMargin: "-72px 0px 0px 0px" }).observe(hero);
  } else if (nav) { nav.classList.add("is-solid"); }
  if (nav) {
    var navTick = false;
    addEventListener("scroll", function () {
      if (navTick) return; navTick = true;
      requestAnimationFrame(function () { navTick = false; syncNav(); });
    }, { passive: true });
    syncNav();
  }

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
  /* The markup carries the final figures, so with no script (or before the
     section arrives) the numbers are true. They drop to 0 only here, the
     moment the count-up is armed, and only when it will actually run. */
  if (stats.length && "IntersectionObserver" in window && !reduce) {
    stats.forEach(function (s) { s.textContent = "0"; });
    var so = new IntersectionObserver(function (entries, obs) {
      entries.forEach(function (e) { if (e.isIntersecting) { runCount(e.target); obs.unobserve(e.target); } });
    }, { threshold: 0.6 });
    stats.forEach(function (s) { so.observe(s); });
  }   /* otherwise the markup's figures simply stand */

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

/* ===== What happens when you book: sticky step list =====
   Five steps, then a sixth stage in which the scene becomes the final call
   to action (#contact). Links to #contact land on that stage; keyboard
   focus that enters it brings it on screen. */
(function () {
  "use strict";
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var track = document.querySelector(".steps__track[data-steps]");
  if (!track || reduce) return;

  var stills = track.querySelectorAll(".steps__still");
  var items = track.querySelectorAll(".steps__list li");
  var TOTAL = Math.min(stills.length, items.length);
  if (!TOTAL) return;

  var scene = track.closest(".steps");
  var fin = document.getElementById("contact");
  var copy = track.querySelector(".steps__copy");
  var STAGES = TOTAL + (fin && track.contains(fin) ? 1 : 0);

  var current = -1, ticking = false;

  function setActive(idx) {
    if (idx === current) return;
    var step = Math.min(idx, TOTAL - 1);   /* the last still holds under stage 6 */
    for (var i = 0; i < TOTAL; i++) {
      stills[i].classList.toggle("is-on", i === step);
      items[i].classList.toggle("is-on", i === step);
    }
    if (scene) scene.classList.toggle("is-final", idx === TOTAL);
    current = idx;
  }

  function measure() {
    ticking = false;
    var r = track.getBoundingClientRect(), span = track.offsetHeight - window.innerHeight;
    var p = span > 0 ? Math.min(Math.max(-r.top / span, 0), 1) : 0;
    setActive(Math.min(STAGES - 1, Math.floor(p * STAGES)));
  }

  /* page y at which the scene sits at progress p (0..1) */
  function yAt(p) {
    var top = track.getBoundingClientRect().top + window.pageYOffset;
    return top + p * Math.max(track.offsetHeight - window.innerHeight, 0);
  }
  function goTo(p, instant) {
    window.scrollTo({ top: yAt(p), behavior: instant ? "instant" : "smooth" });
    requestAnimationFrame(measure);
  }

  if (STAGES > TOTAL) {
    /* every link to #contact lands on stage 6, fully shown */
    document.addEventListener("click", function (e) {
      var a = e.target.closest && e.target.closest('a[href="#contact"]');
      if (!a) return;
      e.preventDefault();
      goTo(1, false);
      if (history.pushState) history.pushState(null, "", "#contact");
    });
    /* keyboard: tabbing into the call to action brings stage 6 up; tabbing
       back into the step copy while stage 6 shows returns to step 05 */
    fin.addEventListener("focusin", function () { if (current !== TOTAL) goTo(1, true); });
    if (copy) copy.addEventListener("focusin", function () {
      if (current === TOTAL) goTo((TOTAL - 0.5) / STAGES, true);
    });
    if (location.hash === "#contact") {
      addEventListener("load", function () { setTimeout(function () { goTo(1, true); }, 50); });
    }
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

  /* --- Same patterns: one rolling word, two cards that hide a photo ---
     Seven words roll on a 5s period; the gold underline is the timer.
     An arrow steps to the previous or next word and pins it (the
     underline freezes full); a click on the word pins the word showing.
     A pin holds until the visitor selects the word again; nothing
     releases it on a timer. The
     roll holds while the pointer is
     on the stage (cards included), while keyboard focus is in the
     section, while the section is off screen and while the tab is hidden.
     Each card hides a still of Stephen: the pointer lights it through a
     soft mask; on touch a tap reveals it whole. Every word change makes
     both card borders bloom once. */
  (function () {
    /* Replace photos here. One still per pattern and room, in the order of
       the seven words. Each entry is a base name in assets/img/: the page
       loads <base>-560.webp and <base>-1120.webp. Placeholders for now. */
    var PHOTOS = [
      { home: "card-trust-home",          work: "card-trust-work" },
      { home: "card-avoidance-home",      work: "card-avoidance-work" },
      { home: "card-fear-home",           work: "card-fear-work" },
      { home: "card-vulnerability-home",  work: "card-vulnerability-work" },
      { home: "card-resentment-home",     work: "card-resentment-work" },
      { home: "card-responsibility-home", work: "card-responsibility-work" },
      { home: "card-repair-home",         work: "card-repair-work" }
    ];
    var IMG_DIR = "assets/img/";

    var pat   = document.getElementById("patterns");
    var btn   = document.getElementById("patWord");
    var title = document.getElementById("patTitle");
    var stage = document.getElementById("patStage");
    var prev  = document.getElementById("patPrev");
    var nxt   = document.getElementById("patNext");
    var count = document.getElementById("patCount");
    var hint  = document.getElementById("patHint");
    var live  = document.getElementById("patLive");
    if (!pat || !btn || !stage || !prev || !nxt || !count) return;

    var spot   = pat.querySelector(".patterns__spot");
    var bar    = pat.querySelector(".ctx__bar");
    var slot   = btn.parentNode;           /* .ctx: the word's slot in the line */
    var glyphs = [].slice.call(btn.querySelectorAll(".patterns__glyphs"));
    var homeL  = [].slice.call(pat.querySelectorAll(".patterns__room--home .patterns__lines > span"));
    var workL  = [].slice.call(pat.querySelectorAll(".patterns__room--work .patterns__lines > span"));
    var cards  = [].slice.call(pat.querySelectorAll(".patterns__card"));
    var N = glyphs.length;
    if (!N) return;

    var PERIOD = 5000;                     /* ms between automatic word changes */
    var cur = 0, pinned = false, hover = false, focus = false;
    var inView = false, onScreen = false, auto = 0, outT = 0;

    function pad(n) { return (n < 10 ? "0" : "") + n; }
    function name(i) { return glyphs[i].textContent.replace(/\u00ad/g, ""); }
    function wrap(i) { return ((i % N) + N) % N; }

    /* --- card stills ----------------------------------------------
       Seven <img> per card, one per word, cross-faded. The current and
       next pattern load when the section is close; the rest decode once
       the section has been seen. */
    var near = false;
    /* Each card has two photo layers (dark, and the bright one the light
       reveals); both carry the same seven stills, so the files load once. */
    var stills = [];
    cards.forEach(function (card) {
      var room = card.classList.contains("patterns__room--work") ? "work" : "home";
      Array.prototype.forEach.call(card.querySelectorAll(".patterns__photo"), function (box) {
        stills.push(PHOTOS.slice(0, N).map(function (p, k) {
          var img = document.createElement("img");
          img.alt = ""; img.decoding = "async";
          img.setAttribute("data-base", IMG_DIR + p[room]);
          if (k === 0) img.className = "is-on";
          box.appendChild(img);
          return img;
        }));
      });
    });
    function loadStill(i) {
      stills.forEach(function (set) {
        var img = set[wrap(i)];
        if (!img || img.getAttribute("src")) return;
        var b = img.getAttribute("data-base");
        img.sizes = "(max-width: 767px) 94vw, 560px";
        img.srcset = b + "-560.webp 560w, " + b + "-1120.webp 1120w";
        img.src = b + "-560.webp";
      });
    }
    function loadNear() { if (!near) return; loadStill(cur); loadStill(cur + 1); }
    function loadAll() { for (var k = 0; k < N; k++) loadStill(k); }

    function say(i) {
      if (!live) return;
      live.setAttribute("aria-live", "polite");
      var text = name(i) + ". At home: " + homeL[i].textContent + " At work: " + workL[i].textContent;
      setTimeout(function () { live.textContent = text; }, 60);
    }

    /* Lines: the outgoing one lifts away, the incoming one rises in. */
    function swapLines(list, i) {
      list.forEach(function (s, k) {
        var was = s.classList.contains("is-on");
        s.classList.toggle("is-on", k === i);
        s.classList.toggle("is-out", was && k !== i);
      });
    }

    /* Both borders bloom once per word change. */
    function pulse() {
      if (reduce) return;
      cards.forEach(function (c) {
        c.classList.remove("is-pulse");
        void c.offsetWidth;
        c.classList.add("is-pulse");
      });
    }
    cards.forEach(function (c) {
      c.addEventListener("animationend", function () { c.classList.remove("is-pulse"); });
    });

    /* --- render ------------------------------------------------- */
    /* The slot takes the new word's width, in em so it holds on resize;
       CSS eases it, so "How" and "shows up." glide. */
    function fitSlot(instant) {
      var g = glyphs[cur]; if (!g || !slot) return;
      var fs = parseFloat(getComputedStyle(slot).fontSize) || 16;
      var w = g.getBoundingClientRect().width / fs;
      if (instant) slot.style.transition = "none";
      slot.style.width = w.toFixed(4) + "em";
      if (instant) { void slot.offsetWidth; slot.style.transition = ""; }
    }

    function render(i, byUser) {
      var changed = cur !== -1 && i !== cur;   /* the first paint does not pulse */
      cur = i;
      glyphs.forEach(function (g, k) {
        var on = k === i;
        g.classList.toggle("is-on", on);
        if (on) g.removeAttribute("aria-hidden"); else g.setAttribute("aria-hidden", "true");
      });
      swapLines(homeL, i); swapLines(workL, i);
      clearTimeout(outT);
      outT = setTimeout(function () {
        homeL.concat(workL).forEach(function (s) { s.classList.remove("is-out"); });
      }, 400);
      loadNear();
      stills.forEach(function (set) {
        set.forEach(function (img, k) { img.classList.toggle("is-on", k === i); });
      });
      if (changed) pulse();

      count.textContent = pad(i + 1) + " / " + pad(N);
      btn.setAttribute("aria-pressed", pinned ? "true" : "false");
      pat.classList.toggle("is-pinned", pinned);
      fitSlot(!changed);
      /* the heading's name follows the word on a visitor's change only,
         in step with the live region */
      if (title) title.setAttribute("aria-label", "How " + name(i) + " shows up.");
      if (byUser) say(i);
      else if (live) live.setAttribute("aria-live", "off");
    }

    /* --- the loop ------------------------------------------------ */
    function restartTimer() {
      if (reduce || !bar) return;
      pat.classList.remove("is-cycling");
      void bar.offsetWidth;                /* reflow so the fill restarts */
      if (auto) pat.classList.add("is-cycling");
    }
    function next() { render((cur + 1) % N, false); restartTimer(); }

    /* One place decides whether the loop runs. Held (pointer or keyboard
       focus) freezes the underline where it is; off screen, hidden tab or
       pinned clears it. */
    function sync() {
      var run  = !reduce && !pinned && inView && !document.hidden;
      var held = hover || focus;
      if (run && !held) {
        if (!auto) {
          pat.classList.remove("is-paused");
          auto = setInterval(next, PERIOD);
          restartTimer();
        }
        return;
      }
      if (auto) { clearInterval(auto); auto = 0; }
      if (run && held) pat.classList.add("is-paused");
      else pat.classList.remove("is-cycling", "is-paused");
    }

    /* A pin is the visitor's; only the visitor lets it go. */
    function pin(i) { pinned = true; render(wrap(i), true); sync(); }
    function unpin() {
      pinned = false; render(cur, false); sync();
      if (live) {                          /* one polite line on resume */
        /* while pointer or keyboard focus still holds the roll, it has not
           started yet, so the message says so */
        var msg = (hover || focus) ? "Rolling will resume." : "Rolling resumed.";
        live.setAttribute("aria-live", "polite");
        setTimeout(function () { live.textContent = msg; }, 60);
      }
    }

    prev.addEventListener("click", function () { pin(cur - 1); });
    nxt.addEventListener("click", function () { pin(cur + 1); });
    btn.addEventListener("click", function () { if (pinned) unpin(); else pin(cur); });
    /* Nothing rolls under reduced motion: the hint keeps only its first
       sentence. */
    if (reduce && hint) hint.textContent = "Holds this pattern.";

    stage.addEventListener("pointerenter", function (e) {
      if (e.pointerType === "touch") return;
      hover = true; sync();
    });
    stage.addEventListener("pointerleave", function (e) {
      if (e.pointerType === "touch") return;
      hover = false; sync();
    });
    /* Keyboard focus holds the loop; a mouse click on a button does not. */
    pat.addEventListener("focusin", function (e) {
      var fv = false;
      try { fv = e.target.matches(":focus-visible"); } catch (err) { fv = true; }
      focus = fv; sync();
    });
    pat.addEventListener("focusout", function (e) {
      if (!pat.contains(e.relatedTarget)) { focus = false; sync(); }
    });
    document.addEventListener("visibilitychange", function () { sync(); drift(); });

    cur = -1; render(0, false);
    /* the web font changes the word's width once it arrives */
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { fitSlot(true); });

    /* --- the pointer light in the cards ---------------------------
       Mouse and pen: the light follows the pointer inside the card it is
       on, easing 0.14 per frame, fading in on enter and out on leave (the
       CSS transitions carry the fade; the light parks where it was). One
       shared loop runs only while a card is hovered or still settling.
       Touch: a tap reveals the whole still; a second tap, or a tap on the
       other card, puts it back. */
    var lights = cards.map(function (c) { return { el: c, tx: 50, ty: 50, x: 50, y: 50, on: false }; });
    var lraf = 0;
    function lstep() {
      lraf = 0;
      var busy = false;
      lights.forEach(function (l) {
        l.x += (l.tx - l.x) * 0.14; l.y += (l.ty - l.y) * 0.14;
        var settling = Math.abs(l.tx - l.x) > 0.05 || Math.abs(l.ty - l.y) > 0.05;
        l.el.style.setProperty("--x", l.x.toFixed(2) + "%");
        l.el.style.setProperty("--y", l.y.toFixed(2) + "%");
        if (l.on || settling) busy = true;
      });
      if (busy) lraf = requestAnimationFrame(lstep);
    }
    function lwake() { if (!lraf) lraf = requestAnimationFrame(lstep); }

    var touchOnly = window.matchMedia("(hover: none)").matches;
    lights.forEach(function (l) {
      var c = l.el;
      function aim(e) {
        var r = c.getBoundingClientRect();
        if (!r.width || !r.height) return;
        l.tx = ((e.clientX - r.left) / r.width) * 100;
        l.ty = ((e.clientY - r.top) / r.height) * 100;
      }
      if (!reduce) {
        c.addEventListener("pointerenter", function (e) {
          if (e.pointerType === "touch") return;
          aim(e); l.x = l.tx; l.y = l.ty;          /* the light starts under the pointer */
          l.on = true; c.classList.add("is-lit"); lwake();
        });
        c.addEventListener("pointermove", function (e) {
          if (e.pointerType === "touch") return;
          aim(e); lwake();
        }, { passive: true });
        c.addEventListener("pointerleave", function (e) {
          if (e.pointerType === "touch") return;
          l.on = false; c.classList.remove("is-lit"); lwake();
        });
      }
      c.addEventListener("click", function (e) {
        if (!(touchOnly || e.pointerType === "touch")) return;
        var full = !c.classList.contains("is-full");
        cards.forEach(function (o) { o.classList.remove("is-full"); });
        c.classList.toggle("is-full", full);
      });
    });

    /* --- the section glow: a slow idle drift, nothing else ---------- */
    var raf = 0, sw = 1, sh = 1;
    function measure() { var r = pat.getBoundingClientRect(); sw = r.width || 1; sh = r.height || 1; }
    function place(cx, cy) {
      if (spot) spot.style.transform = "translate3d(" + (cx / 100 * sw).toFixed(1) + "px," +
                                       (cy / 100 * sh).toFixed(1) + "px,0)";
    }
    function frame(now) {
      raf = 0;
      var a = (now % 18000) / 18000 * Math.PI * 2;
      place(50 - 25 * Math.cos(a), 45 - 15 * Math.cos(a));
      if (onScreen && !document.hidden) raf = requestAnimationFrame(frame);
    }
    function drift() {
      if (reduce) return;
      if (onScreen && !document.hidden && !raf) raf = requestAnimationFrame(frame);
    }

    measure();
    if (reduce) place(50, 40);             /* static: the glow parked */
    addEventListener("resize", function () { measure(); if (reduce) place(50, 40); }, { passive: true });

    /* --- visibility ---------------------------------------------- */
    if ("IntersectionObserver" in window) {
      new IntersectionObserver(function (e) {
        if (!e[0].isIntersecting) return;
        near = true; loadNear();
      }, { rootMargin: "800px 0px" }).observe(pat);
      var seen = false;
      new IntersectionObserver(function (e) {
        onScreen = e[0].isIntersecting;
        inView = e[0].intersectionRatio >= 0.25;
        if (inView && !seen) { seen = true; setTimeout(loadAll, 1200); }
        measure(); sync(); drift();
      }, { threshold: [0, 0.25] }).observe(pat);
    } else {
      near = true; loadNear(); loadAll();
      onScreen = inView = true; sync(); drift();
    }

    /* exposed for verification */
    window.__patterns = {
      current: function () { return cur; },
      pinned:  function () { return pinned; },
      cycling: function () { return !!auto; },
      held:    function () { return hover || focus; },
      lightLoop: function () { return !!lraf; },
      period:  PERIOD,
      pin:     pin,
      unpin:   unpin,
      next:    next
    };
  })();

  /* --- Truth rows: the strike draws, the line underneath rises ---
     One IntersectionObserver trigger per row, one way. Hover, focus and
     press replay the same reveal from zero. */
  (function () {
    var rows = [].slice.call(document.querySelectorAll(".trow"));
    if (!rows.length) return;

    function show(r) { r.classList.add("is-revealed"); }
    function replay(r) {
      if (reduce) { show(r); return; }
      r.classList.remove("is-revealed");
      void r.offsetWidth;                       /* restart the transitions */
      show(r);
    }

    if (reduce || !("IntersectionObserver" in window)) {
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

  /* --- Constellation ---
     The pointer is a gold node that joins the network. At rest (and on touch,
     unless a finger is down) a ghost pointer wanders and links nodes, so the
     behaviour is shown before anyone touches it. */
  var canvas = document.getElementById("net");
  if (canvas && canvas.getContext) {
    var host = canvas.closest(".bleed");
    var ctx = canvas.getContext("2d");
    canvas.style.pointerEvents = "none";
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var W = 0, H = 0, nodes = [], visible = true;
    var LINK = 160, LINK2 = LINK * LINK, REACH = 240, REACH2 = REACH * REACH, PUSH = 120, PUSH2 = PUSH * PUSH;
    /* real pointer target, drawn (trailing) position, and intensity 0.6 ghost .. 1 real */
    var real = { on: false, x: 0, y: 0 }, cur = { x: 0, y: 0 }, amp = 0.6;
    var ghostT0 = performance.now(), ghostPhase = 0, ghostBlend = 1, leftAt = 0;
    var halo = document.createElement("canvas");
    (function () {
      var R = 28; halo.width = halo.height = R * 2 * dpr;
      var h = halo.getContext("2d"); h.scale(dpr, dpr);
      var g = h.createRadialGradient(R, R, 0, R, R, R);
      g.addColorStop(0, "rgba(232,187,104,.18)"); g.addColorStop(1, "rgba(232,187,104,0)");
      h.fillStyle = g; h.fillRect(0, 0, R * 2, R * 2);
    })();
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
      cur.x = W * 0.35; cur.y = H * 0.55;
    }
    function ghostAt(t) {
      var k = (t - ghostT0) + ghostPhase;
      return { x: W * (0.5 + 0.32 * Math.sin(k * 0.00021)), y: H * (0.5 + 0.28 * Math.sin(k * 0.00033 + 1.3)) };
    }
    function ease(x) { return 1 - Math.pow(1 - Math.min(1, Math.max(0, x)), 3); }
    function draw(move, px, py, a) {
      ctx.clearRect(0, 0, W, H);
      var i, j, n = nodes.length;
      for (i = 0; i < n; i++) {
        var p = nodes[i];
        if (move) {
          p.x += p.vx; p.y += p.vy;
          if (p.x < 0 || p.x > W) p.vx *= -1;
          if (p.y < 0 || p.y > H) p.vy *= -1;
          var ex = p.x - px, ey = p.y - py, e2 = ex * ex + ey * ey;
          if (e2 < PUSH2 && e2 > 1) { var e = Math.sqrt(e2); p.x += ex / e * 0.4; p.y += ey / e * 0.4; }
        }
      }
      ctx.lineWidth = 1;
      for (i = 0; i < n; i++) {
        var A = nodes[i];
        for (j = i + 1; j < n; j++) {
          var B = nodes[j], dx = A.x - B.x, dy = A.y - B.y, d2 = dx * dx + dy * dy;
          if (d2 < LINK2) {
            ctx.strokeStyle = "rgba(124,77,224," + (0.5 * (1 - Math.sqrt(d2) / LINK)).toFixed(3) + ")";
            ctx.beginPath(); ctx.moveTo(A.x, A.y); ctx.lineTo(B.x, B.y); ctx.stroke();
          }
        }
      }
      ctx.lineWidth = 1.25;
      for (i = 0; i < n; i++) {
        var q = nodes[i], qx = q.x - px, qy = q.y - py, q2 = qx * qx + qy * qy, k = 0;
        if (q2 < REACH2) {
          k = 1 - Math.sqrt(q2) / REACH;
          ctx.strokeStyle = "rgba(169,133,230," + (0.8 * k * a).toFixed(3) + ")";
          ctx.beginPath(); ctx.moveTo(q.x, q.y); ctx.lineTo(px, py); ctx.stroke();
        }
        var kk = k * a;
        ctx.fillStyle = "rgba(225,212,248," + (0.85 + 0.15 * kk).toFixed(3) + ")";
        ctx.beginPath(); ctx.arc(q.x, q.y, 2 + 1.5 * kk, 0, 6.2832); ctx.fill();
      }
      ctx.globalAlpha = a;
      ctx.drawImage(halo, px - 28, py - 28, 56, 56);
      ctx.fillStyle = "#E8BB68";
      ctx.beginPath(); ctx.arc(px, py, 3.5, 0, 6.2832); ctx.fill();
      ctx.globalAlpha = 1;
    }
    var realSince = 0;
    function loop(t) {
      if (visible && !document.hidden) {
        var g = ghostAt(t);
        if (real.on) {
          var h = ease((t - realSince) / 450);
          ghostBlend = 1 - h; amp = 0.6 + 0.4 * h;
        } else if (leftAt) {
          var r = ease((t - leftAt - 1500) / 800);
          ghostBlend = r; amp = 1 - 0.4 * r;
        } else { ghostBlend = 1; amp = 0.6; }
        var tx = real.on ? real.x : cur.x, ty = real.on ? real.y : cur.y;
        tx = tx + (g.x - tx) * ghostBlend; ty = ty + (g.y - ty) * ghostBlend;
        cur.x += (tx - cur.x) * 0.18; cur.y += (ty - cur.y) * 0.18;
        draw(true, cur.x, cur.y, amp);
      }
      requestAnimationFrame(loop);
    }
    size();
    if (reduce) { draw(false, W * 0.35, H * 0.55, 1); }
    else {
      var touch = false;
      function setReal(e) {
        var r = host.getBoundingClientRect();
        real.x = e.clientX - r.left; real.y = e.clientY - r.top;
        if (!real.on) { real.on = true; realSince = performance.now(); leftAt = 0; }
      }
      function release() {
        if (!real.on) return;
        real.on = false; leftAt = performance.now();
        /* the ghost resumes from where the pointer left */
        ghostT0 = leftAt + 1500;
        ghostPhase = 0;
        cur.x = real.x; cur.y = real.y;
      }
      host.addEventListener("pointerdown", function (e) { if (e.pointerType !== "mouse") { touch = true; setReal(e); } }, { passive: true });
      host.addEventListener("pointermove", function (e) {
        if (e.pointerType === "mouse") setReal(e);
        else if (touch) setReal(e);
      }, { passive: true });
      host.addEventListener("pointerup", function (e) { if (e.pointerType !== "mouse") { touch = false; release(); } }, { passive: true });
      host.addEventListener("pointercancel", function () { touch = false; release(); }, { passive: true });
      host.addEventListener("pointerleave", function (e) { if (e.pointerType === "mouse") release(); }, { passive: true });
      var resT; window.addEventListener("resize", function () { clearTimeout(resT); resT = setTimeout(size, 200); });
      if ("IntersectionObserver" in window) {
        new IntersectionObserver(function (e) { visible = e[0].isIntersecting; }, { threshold: 0.05 }).observe(host);
      }
      requestAnimationFrame(loop);
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

/* ===== Credibility ribbon: drifting lanes, timed spotlight =====
   The lane keeps drifting. The highlight is no longer "whatever is nearest
   the centre this frame" - it is a timed tick with two slots, so a logo
   ignites, holds, and fades on its own clock and two ignitions are never
   simultaneous. Lane two runs half a tick out of phase with lane one. */
(function () {
  "use strict";
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var lanes = [].slice.call(document.querySelectorAll("[data-cred-lane]"));
  if (!lanes.length) return;

  var small = window.matchMedia("(max-width: 700px)").matches;
  var TICK  = small ? 2400 : 2600;   /* ms between ignitions on a lane */
  var SPELL = 4200;                  /* ms a logo stays lit (in 900, hold, out 1100) */
  /* Small screens hold two or three logos in view at once, so the neighbour
     rule starves a narrow window: the candidate band opens to the inner 92%
     and the tick runs a little quicker. Desktop is unchanged. */
  var INNER = small ? 0.92 : 0.76;   /* candidates must sit inside this much of the viewport */
  var HISTORY = 3;                   /* never re-light one of the last 3 */
  var FADE  = 1100;                  /* ms a logo takes to fall back to rest */

  lanes.forEach(function (lane, laneIndex) {
    var vp = lane.querySelector(".cred__viewport");
    var track = lane.querySelector(".cred__track");
    if (!vp || !track) return;
    var speed = parseFloat(lane.getAttribute("data-speed"));
    if (isNaN(speed)) speed = 0.3;

    // Repeat the set until it covers the viewport twice over, so the wrap
    // never opens a gap on a short lane.
    var originalCount = track.children.length;
    var originals = [].slice.call(track.children);
    function addSet() {
      for (var k = 0; k < originalCount; k++) {
        var c = originals[k].cloneNode(true);
        c.setAttribute("aria-hidden", "true");
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

    if (reduce) return; // static, calm grayscale (CSS handles the look)

    /* ---- the spotlight -------------------------------------------- */
    var slots = [null, null];        /* A and B */
    var recent = [];                 /* the last HISTORY lit elements */
    var timers = [];
    var tickId = null, phaseId = null, tickCount = 0;
    var hoverHeld = null;

    function isLit(el) { return el && el.classList.contains("lit"); }
    /* Lit, held by the pointer, or still on its way back down. At these
       scales a neighbour that is only half-way home still collides. */
    function isBusy(el) {
      if (!el) return false;
      if (isLit(el) || el === hoverHeld) return true;
      return !!el._fadeUntil && el._fadeUntil > now();
    }
    function now() {
      return (window.performance && performance.now) ? performance.now() : Date.now();
    }

    function extinguish(slot) {
      var el = slots[slot];
      if (!el) return;
      slots[slot] = null;
      if (el === hoverHeld) return;  /* the pointer is still on it */
      el.classList.remove("lit");
      el._fadeUntil = now() + FADE;
      setTimeout(function () {
        if (!el.classList.contains("lit")) el.classList.remove("next");
      }, FADE);
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
        /* never ignite next to something that is lit or still fading */
        if (isBusy(imgs[i - 1]) || isBusy(imgs[i + 1])) continue;
        var x = pos + el._cx;                       /* centre, viewport relative */
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
      timers.push(setTimeout(function () {
        if (slots[slot] === el) extinguish(slot);
      }, SPELL));
      if (timers.length > 8) timers.splice(0, timers.length - 8);
    }

    function tick() { ignite(tickCount++ % 2); }

    function startTicks() {
      if (tickId || phaseId) return;
      /* lane two ignites half a tick after lane one */
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

    /* Hover on a pointer device takes a slot and holds it. */
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
      new IntersectionObserver(function (e) {
        inView = e[0].isIntersecting; sync();
      }, { threshold: 0 }).observe(lane);
    } else { inView = true; sync(); }
    document.addEventListener("visibilitychange", sync);
  });
})();

/* =====================================================================
   SPEAKING PAGE (/speaking/)
   Three independent IIFEs, each guarded on the presence of its own
   element, so this file stays inert on the homepage.
   ===================================================================== */

/* ===== 0. The spine: one scroll, one loop, one ground =====
   The page scrolls through Lenis (the scroll position itself eases, lerp
   0.1) and every scroll-driven move hangs on ONE rAF loop that reads
   scrollY once a frame. Lenis moves the window natively, so every other
   scroll listener on the page keeps working. Other modules register with
   window.spkSpine.add({ start, end, update }); start and end return page-y
   in px and are read only in measure(); update(p, y) runs only when its p
   changes. The first entry is the ground: the veil's tone and the room's
   push-in, scrubbed across the whole page. Reduced motion and Save-Data:
   no Lenis, and the ground holds the plum veil. */
(function () {
  "use strict";
  var page = document.querySelector(".spk-hero");
  if (!page) return;

  var root = document.documentElement;
  var still = window.matchMedia("(prefers-reduced-motion: reduce)").matches ||
              !!(navigator.connection && navigator.connection.saveData);

  var lenis = null;
  if (window.Lenis && !still) {
    lenis = new Lenis({ lerp: 0.1, wheelMultiplier: 1, smoothWheel: true,
                               syncTouch: false, autoRaf: false, anchors: true });
    window.spkLenis = lenis;
  }

  function clamp(x) { return x < 0 ? 0 : (x > 1 ? 1 : x); }

  /* ---- the registry ---- */
  var entries = [];           // { start:fn→px, end:fn→px, update:fn(p, y), s:px, e:px, last:-1 }
  function add(entry) { entries.push(entry); measure(); return entry; }
  function measure() { entries.forEach(function (en) { en.s = en.start(); en.e = en.end(); en.last = -1; }); }
  window.spkSpine = { add: add, measure: measure };

  /* ---- the loop: one rAF chain for the page, asleep while hidden ----
     window.__spkProfile = true times the spine's own work per frame into
     window.__spkCost (the last 240 frames, in ms). */
  var rafId = null;
  function frame(t) {
    rafId = requestAnimationFrame(frame);
    if (lenis) lenis.raf(t);
    var prof = window.__spkProfile === true, t0 = prof ? performance.now() : 0;
    var y = window.scrollY;
    for (var i = 0; i < entries.length; i++) {
      var en = entries[i];
      var span = en.e - en.s;
      var p = span > 0 ? clamp((y - en.s) / span) : (y >= en.e ? 1 : 0);
      if (p !== en.last) { en.last = p; en.update(p, y); }
    }
    if (prof) {
      var c = window.__spkCost || (window.__spkCost = []);
      c.push(performance.now() - t0);
      if (c.length > 240) c.shift();
    }
  }
  function wake() {
    if (document.hidden) {
      if (rafId != null) { cancelAnimationFrame(rafId); rafId = null; }
    } else if (rafId == null) {
      rafId = requestAnimationFrame(frame);
    }
  }
  document.addEventListener("visibilitychange", wake);

  /* ---- the ground: tone and push-in, one entry across the whole page ----
     Stops are page-y, measured with the entry; the veil's colour runs
     piecewise-linear through them. */
  var TONES = [[18, 10, 28], [26, 16, 38], [34, 18, 30], [26, 16, 38], [18, 10, 28]];
  function top(sel) {
    var el = document.querySelector(sel);
    if (!el) return null;
    var y = 0;
    for (var n = el; n; n = n.offsetParent) y += n.offsetTop;
    return { el: el, y: y };
  }
  var lastTone = "", lastZoom = "";
  function paint(tone, zoom) {
    if (tone !== lastTone) { root.style.setProperty("--spk-ground", tone); lastTone = tone; }
    if (zoom !== lastZoom) { root.style.setProperty("--spk-ground-zoom", zoom); lastZoom = zoom; }
  }
  var ground = {
    stops: [0, 0, 0, 0, 0],
    start: function () { return 0; },
    end: function () {
      /* the section tops are taken here, with the rest of the measuring */
      var keys = top(".spk-keys"), chap = top(".spk-chap"),
          form = top(".spk-formats"), mainEl = document.querySelector("main");
      var max = root.scrollHeight - window.innerHeight;
      var s = [0,
               keys ? keys.y : max * 0.25,
               chap ? chap.y + chap.el.offsetHeight / 2 : max * 0.5,
               form ? form.y : max * 0.75,
               /* the last stop is the end of main: the footer is fixed under
                  the page on this page, so its own offsetTop says nothing */
               mainEl ? Math.min(mainEl.offsetTop + mainEl.offsetHeight - window.innerHeight, max) : max];
      for (var i = 1; i < s.length; i++) if (s[i] < s[i - 1]) s[i] = s[i - 1];
      ground.stops = s;
      return max;
    },
    update: function (p, y) {
      if (still) { paint("26 16 38", "1"); return; }
      var s = ground.stops, k = 0;
      while (k < s.length - 2 && y >= s[k + 1]) k++;
      var a = TONES[k], b = TONES[k + 1];
      var f = s[k + 1] > s[k] ? clamp((y - s[k]) / (s[k + 1] - s[k])) : 1;
      paint(Math.round(a[0] + (b[0] - a[0]) * f) + " " +
            Math.round(a[1] + (b[1] - a[1]) * f) + " " +
            Math.round(a[2] + (b[2] - a[2]) * f),
            (1 + 0.08 * p).toFixed(4));
    }
  };
  add(ground);

  /* ---- when the page changes shape ---- */
  var rsT = null;
  window.addEventListener("resize", function () {
    clearTimeout(rsT);
    rsT = setTimeout(measure, 200);
  }, { passive: true });
  window.addEventListener("load", measure);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(measure);

  wake();
})();

/* ===== 1. Hero: the reel. Sound never starts without a click. =====
   Spec: 05_Website/Design/SPEAKING-HERO-AUDIO-SPEC.md */
(function () {
  "use strict";
  var hero = document.querySelector(".spk-hero");
  if (!hero) return;

  var video  = hero.querySelector(".spk-hero__video");
  var bPlay  = document.getElementById("spkPlay");
  var bSound = document.getElementById("spkSound");
  var bCC    = document.getElementById("spkCC");
  var bBig   = document.getElementById("spkBig");
  var lPlay  = document.getElementById("spkPlayLabel");
  var lSound = document.getElementById("spkSoundLabel");
  var lCC    = document.getElementById("spkCCLabel");
  var lBig   = document.getElementById("spkBigLabel");
  var live   = document.getElementById("spkLive");
  if (!video || !bPlay || !bSound || !bCC) return;

  var rmq      = window.matchMedia("(prefers-reduced-motion: reduce)");
  var reduce   = rmq.matches;
  var saveData = !!(navigator.connection && navigator.connection.saveData);
  var small    = window.matchMedia("(max-width: 820px)").matches;
  /* The markup states whether the mobile encode is light enough to autoplay
     (reel-mobile.mp4 is 9.4 MB, under the 10 MB ceiling). One attribute, so
     the decision travels with the file. */
  var mobileAutoplayOK = video.getAttribute("data-mobile-autoplay") === "true";

  /* The clip is swapped by editing the data-src-* attributes in
     speaking/index.html. No path is named here. */
  var src = small
    ? (video.getAttribute("data-src-mobile") || video.getAttribute("data-src-720"))
    : video.getAttribute("data-src-1080");
  if (!src) return;

  var autoOK = !reduce && !saveData && (!small || mobileAutoplayOK);
  video.setAttribute("preload", autoOK ? "metadata" : "none");
  video.setAttribute("src", src);
  video.load();

  var ended = false, soundOn = false, ccOn = false, awayPaused = false;

  function say(msg) {
    if (!live) return;
    live.textContent = "";
    setTimeout(function () { live.textContent = msg; }, 60);
  }

  /* The visible label is the accessible name, so it is the only thing that
     flips; aria-pressed carries the state. */
  function syncPlay() {
    var state = ended ? "replay" : (video.paused ? "play" : "pause");
    bPlay.setAttribute("data-state", state);
    bPlay.setAttribute("aria-pressed", state === "pause" ? "true" : "false");
    if (lPlay) lPlay.textContent = state === "replay" ? "Replay" : (state === "play" ? "Play" : "Pause");
  }
  function syncSound() {
    bSound.setAttribute("data-state", soundOn ? "mute" : "on");
    bSound.setAttribute("aria-pressed", soundOn ? "true" : "false");
    if (lSound) lSound.textContent = soundOn ? "Mute" : "Sound on";
  }
  function syncCC() {
    bCC.setAttribute("data-state", ccOn ? "cc" : "off");
    bCC.setAttribute("aria-pressed", ccOn ? "true" : "false");
    if (lCC) lCC.textContent = ccOn ? "Captions off" : "Captions on";
    document.documentElement.setAttribute("data-spk-cc", ccOn ? "on" : "off");
  }
  function applyCC() {
    var t = video.textTracks && video.textTracks.length ? video.textTracks[0] : null;
    if (t) t.mode = ccOn ? "showing" : "disabled";
  }

  function tryPlay() {
    var p = video.play();
    if (p && p.catch) p.catch(function () { syncPlay(); });   /* refused: the poster holds */
  }

  /* ---- the big primary control ----
     One ring in the middle of the frame. It is the page's answer to "I expect
     to hear SOME talking": one click unmutes, restarts at 0:00 and plays. It
     then fades out, and comes back only when the reel ends. */
  function hideBig() { if (bBig) bBig.classList.add("is-gone"); }
  function showPlay(on) { bPlay.hidden = !on; }
  function bigReplay() {
    if (!bBig) return;
    bBig.setAttribute("data-state", "replay");
    if (lBig) lBig.textContent = "Replay with sound";
    bBig.classList.remove("is-gone");
  }

  /* One audio source on the page at a time: claiming it stops the keynote
     clip, and a keynote clip claiming it stops the reel. */
  function claim() {
    document.dispatchEvent(new CustomEvent("spk:audio", { detail: { owner: "hero" } }));
  }
  document.addEventListener("spk:audio", function (e) {
    if (!e.detail || e.detail.owner === "hero") return;
    if (soundOn) { soundOn = false; video.muted = true; syncSound(); }
    if (!video.paused) video.pause();
    awayPaused = false;
    syncPlay();
  });

  /* The click is the gesture, so it is also the only moment an AudioContext
     may be opened. The voice line listens for this and opens its analyser
     synchronously, inside the same task. */
  function soundGesture() {
    document.dispatchEvent(new CustomEvent("spk:sound-on"));
  }

  if (bBig) {
    bBig.addEventListener("click", function () {
      claim();
      ended = false;
      soundOn = true;
      video.muted = false;
      try { video.currentTime = 0; } catch (err) {}
      soundGesture();
      tryPlay();
      awayPaused = false;
      hideBig();
      showPlay(true);
      syncSound(); syncPlay();
      say("Playing with sound from the beginning");
    });
  }

  video.addEventListener("playing", function () {
    video.classList.add("is-playing"); ended = false; syncPlay();
  });
  video.addEventListener("play",  function () { ended = false; syncPlay(); });
  video.addEventListener("pause", syncPlay);
  /* holds the last frame; the live region says so, because the Play control
     has silently become a Replay control */
  video.addEventListener("ended", function () {
    ended = true; syncPlay(); bigReplay(); showPlay(false); say("Replay available");
  });

  bPlay.addEventListener("click", function () {
    if (ended) { ended = false; video.currentTime = 0; tryPlay(); say("Playing"); }
    else if (video.paused) { tryPlay(); say("Playing"); }
    else { video.pause(); say("Paused"); }
    awayPaused = false;
    syncPlay();
  });

  bSound.addEventListener("click", function () {
    soundOn = !soundOn;
    video.muted = !soundOn;
    /* the click is the gesture, so sound may start here and nowhere else */
    if (soundOn) {
      claim();
      soundGesture();
      if (video.paused && !ended) { tryPlay(); awayPaused = false; }
      hideBig();
      showPlay(true);
    }
    syncSound(); syncPlay();
    say(soundOn ? "Sound on" : "Muted");
  });

  bCC.addEventListener("click", function () {
    ccOn = !ccOn; applyCC(); syncCC();
    say(ccOn ? "Captions on" : "Captions off");
  });

  /* Scrolled away or tab hidden: pause and remember. Coming back resumes
     muted, with the Sound control showing "Sound on" again. */
  function away() {
    if (!video.paused) { video.pause(); awayPaused = true; syncPlay(); }
  }
  function back() {
    if (!awayPaused) return;
    awayPaused = false;
    if (reduce) { syncPlay(); return; }   /* reduced motion: nothing restarts itself */
    if (soundOn) { soundOn = false; syncSound(); }
    video.muted = true;
    tryPlay();
  }
  if ("IntersectionObserver" in window) {
    new IntersectionObserver(function (e) {
      if (e[0].intersectionRatio < 0.35) away(); else back();
    }, { threshold: [0, 0.35, 1] }).observe(hero);
  }
  document.addEventListener("visibilitychange", function () {
    if (document.hidden) away(); else back();
  });

  /* The preference can flip mid-visit. If it turns on, the hero drops back to
     its static state: the clip stops and the poster holds. */
  function onMotionChange() {
    reduce = rmq.matches;
    if (!reduce) return;
    awayPaused = false;
    if (!video.paused) video.pause();
    syncPlay();
  }
  if (rmq.addEventListener) rmq.addEventListener("change", onMotionChange);
  else if (rmq.addListener) rmq.addListener(onMotionChange);

  syncSound(); syncCC(); applyCC(); syncPlay();
  if (autoOK) { video.muted = true; tryPlay(); }
})();

/* ===== 2. Keynotes: three talks on a pinned stage, the scroll wipes between them ===
   The section is a pinned stage (the track is 440svh, the stage sticky
   inside it for 340svh of scroll). It rises over the last 60svh of the
   candle wheel's held stage, so there is no grow any more: the ground is
   full-bleed from the start (--rise and --g are written once, at 1) and
   fades in over the wheel's wax close-up. This module registers ONE entry
   with the spine and has no scroll listener of its own; update(p) turns p
   into svh of scroll (u = p * 340) and writes the phases as custom
   properties:
     0-60     the ground fades in (--reveal; 1 whenever the wheel is not
              pinned above, so there is nothing to come out of)
     0-50     the heading alone (--head: in over the first 15svh, a
              crossfade with the candle wheel's own lines; out over the
              first 40svh of talk 01)
     50-130   talk 01
     130-210  talk 02 wipes in from the right (--wi over the first 40%)
     210-290  talk 03 wipes in from the right
     290-340  hold, while the room section rises over the stage
   A talk becomes the live one when its wipe is half done; only the live
   panel's ring is interactive. "Hear Stephen on this" plays that talk's
   segment of the reel WITH SOUND on the one shared <video>, full-bleed
   above the pictures; the video is seen only while a clip plays.
   Only one audio source is ever running: pressing a talk claims the audio
   through the document-level "spk:audio" event, which stops the hero reel,
   and the hero's own controls claim it back.
   Three modes, written to data-spk-keys-mode: "pin"; "strip" (phones: no
   pin, the talks as a horizontal snap strip, the spine entry disabled);
   "stacked" (reduced motion: the three talks one under another). */
(function () {
  "use strict";
  var sec = document.querySelector(".spk-keys");
  if (!sec) return;
  var track    = document.getElementById("spkKeysTrack");
  var stage    = document.getElementById("spkKeysStage");
  var ground   = document.getElementById("spkKeysGround");
  var box      = document.getElementById("spkKeysPanels");
  var head     = sec.querySelector(".spk-keys__head");
  var index    = sec.querySelector(".spk-keys__index");
  var vid      = sec.querySelector(".spk-keys__video");
  var tabs     = [].slice.call(sec.querySelectorAll(".spk-keys__tab"));
  var panels   = [].slice.call(sec.querySelectorAll(".spk-keys__panel"));
  var hears    = [].slice.call(sec.querySelectorAll(".spk-keys__hear"));
  var cap      = document.getElementById("spkKeysCap");
  var playWrap = sec.querySelector(".spk-keys__play");
  var pauseBtn = document.getElementById("spkKeysPause");
  var live     = document.getElementById("spkKeysLive");
  if (!track || !stage || !ground || !box || !head || !index ||
      !tabs.length || tabs.length !== panels.length) return;

  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var small  = window.matchMedia("(max-width: 820px)");
  var strip  = window.matchMedia("(max-width: 768px)");
  var cur = 0;

  function clamp(x) { return x < 0 ? 0 : (x > 1 ? 1 : x); }
  function smooth(x) { return x <= 0 ? 0 : (x >= 1 ? 1 : x * x * (3 - 2 * x)); }

  function say(msg) {
    if (!live) return;
    live.textContent = "";
    setTimeout(function () { live.textContent = msg; }, 60);
  }

  /* ------------------------------------------------------------------
     The clip. One shared <video>, three segments, whose in and out points
     live on the buttons in the markup as data-seg-start / data-seg-end.
     ------------------------------------------------------------------ */
  /* a: the in point the clip plays from, b: the out point it stops at, and
     p: a frame inside the segment the element is parked on when it stops. */
  var segs = hears.map(function (b) {
    var a = parseFloat(b.getAttribute("data-seg-start"));
    var p = parseFloat(b.getAttribute("data-seg-poster"));
    return { a: a, b: parseFloat(b.getAttribute("data-seg-end")),
             p: isNaN(p) ? a : p };
  });
  var playing = -1, watchRaf = 0, srcSet = false, ccTrack = null;
  var idleT = 0, pauseHideT = 0;

  function clipSrc() {
    if (!vid) return "";
    return small.matches
      ? (vid.getAttribute("data-src-mobile") || vid.getAttribute("data-src-1080"))
      : vid.getAttribute("data-src-1080");
  }
  function ensureSrc() {
    if (!vid || srcSet) return;
    var s = clipSrc();
    if (!s) return;
    vid.setAttribute("src", s);
    vid.load();
    srcSet = true;
    var t = vid.textTracks && vid.textTracks.length ? vid.textTracks[0] : null;
    if (t && !ccTrack) {
      ccTrack = t;
      ccTrack.mode = "hidden";          /* the cues, without the native box */
      ccTrack.addEventListener("cuechange", onCue);
    }
  }
  /* One line at the bottom of the frame, from the reel's own VTT, and only
     when the visitor has captions on in the hero (the CSS hides it too). */
  function onCue() {
    if (playing < 0 || !ccTrack || !cap) return;
    var ccOn = document.documentElement.getAttribute("data-spk-cc") === "on";
    var c = ccTrack.activeCues && ccTrack.activeCues.length ? ccTrack.activeCues[0] : null;
    var txt = (ccOn && c) ? String(c.text).replace(/\s+/g, " ").trim() : "";
    cap.textContent = txt;
    cap.classList.toggle("is-on", !!txt);
  }
  function clearCap() {
    if (!cap) return;
    cap.classList.remove("is-on");
    cap.textContent = "";
  }
  /* The pause ring fades to .35 after 2s without the pointer, and comes back
     on pointer movement or focus. */
  function wake() {
    if (!pauseBtn) return;
    pauseBtn.classList.remove("is-idle");
    clearTimeout(idleT);
    if (playing < 0) return;
    idleT = setTimeout(function () { pauseBtn.classList.add("is-idle"); }, 2000);
  }
  function syncHear(i) {
    var b = hears[i];
    if (!b) return;
    var on = (playing === i);
    b.setAttribute("data-state", on ? "pause" : "play");
    b.setAttribute("aria-pressed", on ? "true" : "false");
    var l = b.querySelector(".spk-keys__hearlabel");
    if (l) l.textContent = on ? "Pause" : "Hear Stephen on this";
  }
  /* The out point is watched on a frame callback, not on timeupdate, which
     fires about four times a second and would overshoot the line. */
  function watch() {
    watchRaf = 0;
    if (playing < 0 || !vid) return;
    var s = segs[playing];
    if (s && vid.currentTime >= s.b) { stopClip(true); return; }
    watchRaf = requestAnimationFrame(watch);
  }
  /* noPark: the caller is changing the live talk itself, so this must not
     queue a seek back to the current one first. */
  function stopClip(atEnd, noPark) {
    var i = playing;
    if (watchRaf) { cancelAnimationFrame(watchRaf); watchRaf = 0; }
    playing = -1;
    sec.classList.remove("is-playing");
    clearTimeout(idleT);
    if (playWrap) playWrap.removeAttribute("data-accent");
    if (pauseBtn) {
      clearTimeout(pauseHideT);
      /* hidden only once the 420ms fade has finished */
      pauseHideT = setTimeout(function () { if (playing < 0) pauseBtn.hidden = true; }, 420);
    }
    if (vid) {
      if (!vid.paused) vid.pause();
      vid.muted = true;
      if (!noPark && segs[cur]) { try { vid.currentTime = segs[cur].p; } catch (err) {} }
      /* the stills are the ground: the clip is only seen while it plays */
      vid.classList.remove("is-on");
    }
    if (i >= 0) { clearCap(); syncHear(i); if (atEnd) say("Clip finished"); }
  }
  function playClip(i) {
    if (!vid || !segs[i]) return;
    claim();                        /* stops the hero reel */
    ensureSrc();
    var s = segs[i];
    vid.classList.add("is-on");
    /* always from the in point */
    try { vid.currentTime = s.a; } catch (err) {}
    vid.muted = false;
    playing = i;
    sec.classList.add("is-playing");
    if (playWrap) playWrap.setAttribute("data-accent", panels[i].getAttribute("data-accent") || "");
    if (pauseBtn) {
      clearTimeout(pauseHideT);
      pauseBtn.hidden = false;
      wake();
    }
    syncHear(i);
    var p = vid.play();
    if (p && p.catch) p.catch(function () { stopClip(false); });
    if (!watchRaf) watchRaf = requestAnimationFrame(watch);
    var name = tabs[i] ? (tabs[i].querySelector(".spk-keys__name") || {}).textContent : "";
    say("Playing " + (name || "clip") + " with sound");
  }

  function claim() {
    document.dispatchEvent(new CustomEvent("spk:audio", { detail: { owner: "keys" } }));
  }
  document.addEventListener("spk:audio", function (e) {
    if (!e.detail || e.detail.owner === "keys") return;
    if (playing >= 0) stopClip(false);
  });

  hears.forEach(function (b, i) {
    b.addEventListener("click", function () {
      if (playing === i) { stopClip(false); say("Paused"); return; }
      if (playing >= 0) stopClip(false);
      playClip(i);
    });
  });

  /* The pause ring stops the clip and hands focus back to the talk's own
     button, so a keyboard user is not left on a control that is going away. */
  if (pauseBtn) {
    pauseBtn.addEventListener("click", function () {
      var i = playing;
      stopClip(false); say("Paused");
      if (i < 0) i = cur;
      if (hears[i]) hears[i].focus({ preventScroll: true });
    });
    pauseBtn.addEventListener("focus", wake);
  }
  sec.addEventListener("pointermove", function (e) {
    if (playing < 0 || e.pointerType === "touch") return;
    wake();
  }, { passive: true });
  document.addEventListener("keydown", function (e) {
    if (playing >= 0 && e.key === "Escape") stopClip(false);
  });

  /* Nothing keeps talking off screen or in a hidden tab. The stage is
     observed, not the section: the section is 540svh tall, so its own
     ratio never reaches .25. */
  if ("IntersectionObserver" in window) {
    new IntersectionObserver(function (e) {
      if (e[0].intersectionRatio < 0.25 && playing >= 0) stopClip(false);
    }, { threshold: [0, 0.25, 1] }).observe(stage);
  }
  document.addEventListener("visibilitychange", function () {
    if (document.hidden && playing >= 0) stopClip(false);
  });
  if (vid) {
    vid.addEventListener("ended", function () { if (playing >= 0) stopClip(true); });
    vid.addEventListener("pause", function () { if (playing >= 0) syncHear(playing); });
  }

  /* Reduced motion: no pin, no grow, no wipe. All three talks are present
     one under another, and the index stops being a tablist. The one thing
     that still works on a click is "Hear Stephen on this". Without the
     spine there is nothing to drive the stage, so it stacks too. */
  if (reduce || !window.spkSpine) {
    sec.classList.add("is-stacked");
    sec.setAttribute("data-spk-keys-mode", "stacked");
    index.removeAttribute("role");
    tabs.forEach(function (t) {
      t.removeAttribute("role"); t.removeAttribute("aria-selected");
      t.removeAttribute("aria-controls"); t.removeAttribute("tabindex");
    });
    panels.forEach(function (p) {
      p.removeAttribute("inert"); p.classList.add("is-on"); p.classList.remove("is-off");
      p.removeAttribute("role"); p.removeAttribute("aria-labelledby"); p.removeAttribute("tabindex");
    });
    return;
  }

  var mode = "";

  /* ---- the live talk ---- */
  /* In the pin only the live panel is reachable: the others take no
     pointer and are inert. In the strip every picture is on screen in
     turn, so every ring works. */
  function syncPanels() {
    panels.forEach(function (p, k) {
      var off = mode === "pin" && k !== cur;
      p.classList.toggle("is-on", k === cur);
      p.classList.toggle("is-off", off);
      if (off) p.setAttribute("inert", ""); else p.removeAttribute("inert");
    });
  }
  function setCur(i) {
    if (i === cur || !panels[i]) return;
    /* a talk's clip belongs to that talk: changing talks stops it */
    if (playing >= 0) stopClip(false, true);
    tabs[cur].setAttribute("aria-selected", "false"); tabs[cur].tabIndex = -1; tabs[cur].classList.remove("is-on");
    tabs[i].setAttribute("aria-selected", "true");    tabs[i].tabIndex = 0;    tabs[i].classList.add("is-on");
    cur = i;
    syncPanels();
  }

  /* ---- the stage: one spine entry ---- */
  var U = 340;                                  /* svh of scroll across the pin */
  var said = document.querySelector(".spk-said");
  function span() { return Math.max(0, track.offsetHeight - window.innerHeight); }
  var last = {};
  function put(el, key, name, v) {
    var s = v.toFixed(4);
    if (last[key] === s) return;
    last[key] = s;
    el.style.setProperty(name, s);
  }
  function update(p) {
    if (entry.disabled) return;
    var u = p * U;
    /* the heading waits until the wheel's second line has left (it fades over
       the first 24svh of the reveal), then rises over 24–40 */
    var hd = u < 50 ? smooth(clamp((u - 24) / 16)) : 1 - smooth(clamp((u - 50) / 40));
    var on = u >= 50;
    var wi2 = clamp(clamp((u - 130) / 80) / 0.4);
    var wi3 = clamp(clamp((u - 210) / 80) / 0.4);
    var wheel = !!said && said.classList.contains("is-wheel");
    var rv = wheel ? clamp(u / 60) : 1;
    put(ground, "reveal", "--reveal", rv);
    /* the wheel's bloom leaves with the hand-off (module 7's CSS reads it) */
    if (wheel) put(document.documentElement, "rootReveal", "--spk-keys-reveal", rv);
    else if (last.rootReveal) { document.documentElement.style.removeProperty("--spk-keys-reveal"); last.rootReveal = ""; }
    put(head, "head", "--head", hd);
    box.classList.toggle("is-on", on);
    index.classList.toggle("is-on", on);
    /* the previous talk's caption fades as the next one wipes in */
    put(panels[0], "c0", "--cap", Math.min(on ? 1 - hd : 0, 1 - clamp(wi2 / 0.3)));
    if (panels[1]) { put(panels[1], "w1", "--wi", wi2);
      put(panels[1], "c1", "--cap", Math.min(clamp((wi2 - 0.7) / 0.3), 1 - clamp(wi3 / 0.3))); }
    if (panels[2]) { put(panels[2], "w2", "--wi", wi3); put(panels[2], "c2", "--cap", clamp((wi3 - 0.7) / 0.3)); }
    setCur(u < 130 + 80 * 0.2 ? 0 : (u < 210 + 80 * 0.2 ? 1 : 2));
  }
  var entry = { disabled: true,
    start: function () { return sec.offsetTop; },
    end: function () { return sec.offsetTop + span(); },
    update: update };

  /* ---- the strip (phones): a swipe selects ---- */
  var autoScroll = false, autoT = 0, swipeT = 0;
  box.addEventListener("scroll", function () {
    if (mode !== "strip" || autoScroll) return;
    clearTimeout(swipeT);
    swipeT = setTimeout(function () {
      if (mode !== "strip" || autoScroll) return;
      var r = box.getBoundingClientRect();
      var mid = r.left + r.width / 2, best = -1, bestD = Infinity;
      panels.forEach(function (p, k) {
        var b = p.getBoundingClientRect();
        var d = Math.abs(b.left + b.width / 2 - mid);
        if (d < bestD) { bestD = d; best = k; }
      });
      if (best >= 0) setCur(best);
    }, 140);
  }, { passive: true });

  /* ---- the index ---- */
  function go(i) {
    if (mode === "strip") {
      setCur(i);
      autoScroll = true;
      clearTimeout(autoT);
      autoT = setTimeout(function () { autoScroll = false; }, 700);
      try { panels[i].scrollIntoView({ inline: "center", block: "nearest", behavior: "smooth" }); }
      catch (err) { panels[i].scrollIntoView(); }
      return;
    }
    /* the middle of that talk's hold */
    var y = sec.offsetTop + ((50 + 80 * i + 40) / U) * span();
    if (window.spkLenis) window.spkLenis.scrollTo(y);
    else window.scrollTo({ top: y, behavior: "smooth" });
  }
  tabs.forEach(function (t, i) {
    t.addEventListener("click", function () { go(i); });
    /* Roving tabindex, arrow keys move focus, Enter/Space activate. */
    t.addEventListener("focus", function () {
      tabs.forEach(function (o) { o.tabIndex = (o === t ? 0 : -1); });
    });
    t.addEventListener("keydown", function (e) {
      var k = e.key, n = -1, L = tabs.length;
      if (k === "ArrowDown" || k === "ArrowRight") n = (i + 1) % L;
      else if (k === "ArrowUp" || k === "ArrowLeft") n = (i - 1 + L) % L;
      else if (k === "Home") n = 0;
      else if (k === "End") n = L - 1;
      else return;
      e.preventDefault();
      tabs[n].focus();
    });
  });

  /* ---- modes: the spine has no remove, so leaving the pin disables
     the entry through its flag ---- */
  var added = false;
  function setMode() {
    var m = strip.matches ? "strip" : "pin";
    if (m === mode) return;
    mode = m;
    sec.setAttribute("data-spk-keys-mode", m);
    if (playing >= 0) stopClip(false);
    entry.disabled = (m !== "pin");
    if (m !== "pin") {
      ground.style.removeProperty("--reveal");
      document.documentElement.style.removeProperty("--spk-keys-reveal");
    }
    if (m === "pin") {
      last = {};
      /* no grow: the ground is full-bleed from the start (written once) */
      put(ground, "rise", "--rise", 1);
      put(ground, "g", "--g", 1);
      if (!added) { window.spkSpine.add(entry); added = true; }
      else window.spkSpine.measure();          /* re-reads start/end and repaints */
    }
    syncPanels();
  }
  setMode();
  if (strip.addEventListener) strip.addEventListener("change", setMode);
  else if (strip.addListener) strip.addListener(setMode);
})();

/* ===== 3. What the room walks out with: five words, five lights, once =====
   No pin. When 40% of the section is in view the five words arrive 380ms
   apart, each rising out of blur with a pool of light behind it; when the
   fifth has landed (380ms × 4 + the 600ms rise) the house lights come up
   on the still. Fires once and never replays. Reduced motion, or no
   IntersectionObserver: everything shown at once, lit. */
(function () {
  "use strict";
  var sec = document.querySelector(".spk-out");
  if (!sec) return;
  var words = [].slice.call(sec.querySelectorAll(".spk-out__word"));
  var still = sec.querySelector(".spk-out__media .spk-lights");
  if (!words.length) return;

  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var STEP = 380, RISE = 600;

  function showAll() {
    words.forEach(function (w) { w.classList.add("is-on"); });
    if (still) still.classList.add("is-lit");
  }
  if (reduce || !("IntersectionObserver" in window)) { showAll(); return; }

  var fired = false;
  function run() {
    if (fired) return;
    fired = true;
    words.forEach(function (w, i) {
      setTimeout(function () { w.classList.add("is-on"); }, i * STEP);
    });
    if (still) {
      setTimeout(function () { still.classList.add("is-lit"); }, (words.length - 1) * STEP + RISE);
    }
  }
  var io = new IntersectionObserver(function (e) {
    if (!e[0].isIntersecting) return;
    io.disconnect();
    run();
  }, { threshold: 0.4 });
  io.observe(sec);
})();

/* ===== 4. The voice line: the reel's own audio, drawn as one open line =====
   A compact canvas sitting directly on top of the control row. It is only
   ever visible while sound is actually playing: muted, paused or finished, it
   is at opacity 0, so there is no idle line in the middle of the hero. The
   click that turns sound on is the gesture that opens an AudioContext and an
   AnalyserNode on the video element, and the line breathes with the real
   audio. If the browser will not give us an analyser, a synth fallback
   tracks playback loosely. Reduced motion and Save-Data get one static
   render and no loop at all — still only while sound is on. */
(function () {
  "use strict";
  var cv = document.getElementById("spkVoice");
  if (!cv) return;
  var hero  = document.querySelector(".spk-hero");
  var video = hero && hero.querySelector(".spk-hero__video");
  var ctx = cv.getContext && cv.getContext("2d");
  if (!ctx) return;

  var rmq = window.matchMedia("(prefers-reduced-motion: reduce)");
  var saveData = !!(navigator.connection && navigator.connection.saveData);

  var W = 1, H = 1, N = 20, IDLE = 2.5, MAX = 20;
  var xs = null, ys = null, vals = null, tgt = null, sm = null, bins = null;

  /* Sound on / off is the only thing that shows or hides the line. */
  function shown(on) { cv.classList.toggle("is-on", !!on); }
  function audible() { return !!(video && !video.muted && !video.paused && !video.ended); }

  function build() {
    var r = cv.getBoundingClientRect();
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = Math.max(1, Math.round(r.width));
    H = Math.max(1, Math.round(r.height));
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    /* the canvas is 560 CSS px at most now, so fewer, wider-spaced control
       points read better, and the peak has to live inside a 64 px box */
    var w = window.innerWidth;
    if (w >= 1200)     { N = 20; IDLE = 2.5; MAX = 20; }
    else if (w >= 768) { N = 18; IDLE = 2.0; MAX = 17; }
    else               { N = 14; IDLE = 1.5; MAX = 13; }

    xs = new Float64Array(N); ys = new Float64Array(N);
    vals = new Float64Array(N); tgt = new Float64Array(N); sm = new Float64Array(N);
    for (var i = 0; i < N; i++) xs[i] = (i / (N - 1)) * W;
    /* bins 2–180 folded onto a log axis, one span per control point */
    bins = new Int32Array(N + 1);
    for (var j = 0; j <= N; j++) bins[j] = Math.round(2 * Math.pow(90, j / N));
  }

  /* one open Catmull-Rom path, never straight segments, never bars */
  function trace() {
    var cy = H / 2, i;
    ctx.beginPath();
    ctx.moveTo(xs[0], cy + ys[0]);
    for (i = 0; i < N - 1; i++) {
      var i0 = i > 0 ? i - 1 : 0, i2 = i + 1, i3 = (i + 2 < N) ? i + 2 : N - 1;
      ctx.bezierCurveTo(
        xs[i] + (xs[i2] - xs[i0]) / 6, cy + ys[i] + (ys[i2] - ys[i0]) / 6,
        xs[i2] - (xs[i3] - xs[i]) / 6, cy + ys[i2] - (ys[i3] - ys[i]) / 6,
        xs[i2], cy + ys[i2]);
    }
  }
  function paint(alpha) {
    ctx.clearRect(0, 0, W, H);
    trace();
    ctx.lineCap = "round"; ctx.lineJoin = "round";
    ctx.lineWidth = 4;    ctx.strokeStyle = "rgba(169,133,230,.09)"; ctx.stroke();
    ctx.lineWidth = 1.25; ctx.strokeStyle = "rgba(169,133,230," + alpha.toFixed(3) + ")"; ctx.stroke();
  }

  /* ---- audio ---- */
  var actx = null, analyser = null, srcNode = null, freq = null;
  var synth = false, ready = false, base = 0;
  function openAudio() {
    if (actx || synth || !video) return;
    var AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) { synth = true; return; }
    try {
      actx = new AC();
      if (actx.resume) actx.resume();
      analyser = actx.createAnalyser();
      analyser.fftSize = 1024;
      analyser.smoothingTimeConstant = 0.85;
      if (!srcNode) srcNode = actx.createMediaElementSource(video);
      srcNode.connect(analyser);
      /* connecting to the destination is mandatory or the reel goes silent */
      analyser.connect(actx.destination);
      freq = new Uint8Array(analyser.frequencyBinCount);
      ready = true;
    } catch (err) {
      actx = null; analyser = null; srcNode = null; ready = false; synth = true;
    }
  }
  /* The hero fires this synchronously from inside its own click handler — the
     big "Play with sound" ring and the small Sound control — so the context
     is opened while the user gesture is still active. */
  document.addEventListener("spk:sound-on", function () {
    if (!video) return;
    openAudio();
    if (actx && actx.resume) actx.resume();
    shown(true);
    if (mode === "live") wake();
  });

  function knee(v) {
    var k = 0.85 * MAX, m = Math.abs(v);
    if (m <= k) return v;
    var u = (m - k) / (MAX - k);
    var th = Math.tanh ? Math.tanh(u) : (Math.exp(2 * u) - 1) / (Math.exp(2 * u) + 1);
    return (v < 0 ? -1 : 1) * (k + (MAX - k) * th);
  }

  /* ---- the loop ---- */
  var raf = 0, onScreen = false, last = 0, mix = 0, lowT = 0;
  function frame(now) {
    raf = 0;
    if (mode !== "live") return;
    var dt = last ? Math.min(64, now - last) : 16; last = now;
    var t = now / 1000, i;
    var soundOn = audible();
    var energy = 0;
    shown(soundOn);

    if (soundOn && ready) {
      analyser.getByteFrequencyData(freq);
      for (i = 0; i < N; i++) {
        var a = bins[i], b = Math.max(a + 1, bins[i + 1]), sum = 0, c = 0;
        for (var k = a; k < b && k < freq.length; k++) { sum += freq[k]; c++; }
        tgt[i] = c ? (sum / c) / 255 : 0;
      }
      for (var pass = 0; pass < 2; pass++) {          /* 3-tap, two passes */
        for (i = 0; i < N; i++) {
          sm[i] = 0.25 * tgt[i > 0 ? i - 1 : 0] + 0.5 * tgt[i] + 0.25 * tgt[i < N - 1 ? i + 1 : N - 1];
        }
        for (i = 0; i < N; i++) tgt[i] = sm[i];
      }
      var mean = 0;
      for (i = 0; i < N; i++) { vals[i] += (tgt[i] - vals[i]) * 0.12; mean += tgt[i]; }
      energy = mean / N;
      base += (energy - base) * 0.05;
    }

    /* energy gate: silence for 400 ms hands back to the idle ripple */
    var wantAudio = soundOn && ready;
    if (wantAudio) {
      lowT = energy < 0.03 ? lowT + dt : 0;
      if (lowT >= 400) wantAudio = false;
    } else { lowT = 0; }
    mix += ((wantAudio ? 1 : 0) - mix) * Math.min(1, dt / 600);

    var A = IDLE, T1 = 11, T2 = 17, bump = 0;
    if (synth && soundOn) { A = 0.42 * MAX; T1 = 4.5; T2 = 7; bump = 0.25 * Math.sin(video.currentTime * 2.1); }
    var l1 = 0.9 * W, l2 = 0.55 * W;
    for (i = 0; i < N; i++) {
      var x = xs[i];
      var iy = A * (0.62 * Math.sin(2 * Math.PI * (x / l1 - t / T1)) +
                    0.38 * Math.sin(2 * Math.PI * (x / l2 - t / T2 + 1.3)) + bump);
      var ay = ready ? knee((vals[i] - base) * MAX) : 0;
      ys[i] = iy * (1 - mix) + ay * mix;
    }
    paint(0.55 + 0.25 * mix);

    if (onScreen && !document.hidden) raf = requestAnimationFrame(frame);
  }
  function wake() { if (mode === "live" && onScreen && !document.hidden && !raf) { last = 0; raf = requestAnimationFrame(frame); } }
  function sleep() { if (raf) { cancelAnimationFrame(raf); raf = 0; } }

  function paintStatic() {
    build();
    for (var i = 0; i < N; i++) {
      var d = (xs[i] - 0.42 * W) / (0.16 * W);
      ys[i] = -2 * Math.exp(-d * d);
    }
    paint(0.45);
  }

  /* ---- modes ---- */
  var mode = null, rT = 0, iobs = null;
  function setMode() {
    var want = (rmq.matches || saveData) ? "static" : "live";
    if (want === mode) return;
    sleep();
    if (iobs) { iobs.disconnect(); iobs = null; }
    mode = want;
    if (want === "static") { paintStatic(); return; }
    build(); mix = 0; lowT = 0; base = 0;
    if ("IntersectionObserver" in window) {
      iobs = new IntersectionObserver(function (e) {
        onScreen = e[0].isIntersecting;
        if (onScreen) wake(); else sleep();
      }, { threshold: 0.05 });
      iobs.observe(hero || cv);
    } else { onScreen = true; }
    wake();
  }
  setMode();
  /* the line follows the audio, not the loop: these four cover the static
     mode too, and they catch a mute or a pause that happens while the hero is
     off screen and the loop is asleep */
  if (video) {
    ["play", "playing", "pause", "ended", "volumechange"].forEach(function (ev) {
      video.addEventListener(ev, function () { shown(audible()); });
    });
  }
  document.addEventListener("visibilitychange", function () {
    if (document.hidden) sleep(); else wake();
  });
  window.addEventListener("resize", function () {
    clearTimeout(rT);
    rT = setTimeout(function () {
      if (mode === "static") { paintStatic(); return; }
      build(); wake();
    }, 200);
  }, { passive: true });
  if (rmq.addEventListener) rmq.addEventListener("change", setMode);
  else if (rmq.addListener) rmq.addListener(setMode);

  /* QA hook, off unless the page is opened with ?spkdebug: the analyser's
     mean energy cannot be read from outside, and the audio checks need it. */
  if (location.search.indexOf("spkdebug") > -1) {
    window.__spkVoice = { get ready() { return ready; }, get energy() { return base; },
      get peak() { var m = 0, i; if (!vals) return 0; for (i = 0; i < N; i++) m = Math.max(m, vals[i]); return m; } };
  }
})();

/* ===== 5. The room: rows of seats as dots, behind the formats sentence =====
   Nine rows seen from the stage, compressing and dimming toward the back,
   each row bowed away at its centre. A pointer leans the nearest seats
   toward it; with no pointer a slow wave travels front to back every 7–11 s
   and the loop sleeps between waves. After the rows are drawn, a feathered
   destination-out ellipse clears the dot layer around the measured sentence,
   so the type keeps clean ground with no scrim and no text-shadow. */
(function () {
  "use strict";
  var cv = document.getElementById("spkRoom");
  if (!cv) return;
  var sec = cv.parentNode;
  var line = sec && sec.querySelector(".spk-formats__line");
  var ctx = cv.getContext && cv.getContext("2d");
  if (!ctx || !sec) return;

  /* The six rooms. Each label is pinned to ONE seat in the dot array by row
     and seat fraction, so it can never drift off the array, and it lights
     when the pointer leans that part of the room toward it — the same lerp
     the dots themselves use, read at the label's own seat. Where there are
     not enough rows to place six labels without collisions (under 768) they
     fall back to a centred list and the wave lights them in turn instead. */
  var rooms  = document.getElementById("spkRooms");
  var labels = rooms ? [].slice.call(rooms.children) : [];
  var anchors = [], flow = false;

  var rmq = window.matchMedia("(prefers-reduced-motion: reduce)");
  var saveData = !!(navigator.connection && navigator.connection.saveData);

  var W = 1, H = 1, R = 9, S = 26, n = 0, T = null;
  var bx = null, by = null, br = null, ba = null, rf = null;
  var PAL = new Array(8 * 33);
  (function () {
    for (var l = 0; l < 8; l++) {
      var f = l / 7;
      var r = Math.round(169 + (231 - 169) * f);
      var g = Math.round(133 + (220 - 133) * f);
      var b = Math.round(230 + (246 - 230) * f);
      for (var a = 0; a <= 32; a++) PAL[l * 33 + a] = "rgba(" + r + "," + g + "," + b + "," + (a / 32).toFixed(3) + ")";
    }
  })();

  /* a0 / a1 are the front and back row alphas. Raised about 40% this round —
     the room was reading as almost nothing — and nothing else moves: the
     pointer lift (0.42) and the wave lift (0.22) are unchanged, so the seats
     still only ever step from subtle to slightly present. */
  function tier() {
    var w = window.innerWidth;
    if (w >= 1200) return { R: 9, S: 26, r0: 2.6, r1: 1.2, a0: .42, a1: .14, reach: 260, lean: 3.0, sag0: 10, sag1: 5 };
    if (w >= 768)  return { R: 7, S: 20, r0: 2.2, r1: 1.1, a0: .39, a1: .14, reach: 220, lean: 2.5, sag0: 10, sag1: 5 };
    return { R: 5, S: 13, r0: 1.9, r1: 1.0, a0: .36, a1: .14, reach: 0, lean: 0, sag0: 7, sag1: 3.5 };
  }

  var hole = null;
  function measureHole() {
    hole = null;
    if (!line) return;
    var lr = line.getBoundingClientRect(), sr = sec.getBoundingClientRect();
    if (!lr.width || !lr.height) return;
    var halfW = lr.width / 2 + 24, halfH = lr.height / 2 + 24;
    var rx = halfW + 80, ry = halfH + 80;
    var inner = Math.min(halfW / rx, halfH / ry);
    var g = ctx.createRadialGradient(0, 0, 0, 0, 0, 1);
    g.addColorStop(0, "rgba(0,0,0,1)");
    g.addColorStop(inner, "rgba(0,0,0,1)");
    g.addColorStop(1, "rgba(0,0,0,0)");
    hole = { x: lr.left - sr.left + lr.width / 2, y: lr.top - sr.top + lr.height / 2,
             rx: rx, ry: ry, g: g };
  }

  function placeRooms() {
    if (!labels.length) return;
    flow = (mode === "static") || window.innerWidth < 768;
    rooms.classList.toggle("is-flow", flow);
    rooms.classList.toggle("is-static", mode === "static");
    /* data-row is an index into the nine-row array the widest tier draws, so
       it is read as a fraction and mapped onto whatever row count this tier
       actually has */
    anchors = labels.map(function (li) {
      var rf = parseFloat(li.getAttribute("data-row")) / 8;
      var sf = parseFloat(li.getAttribute("data-seat"));
      var r = Math.max(0, Math.min(R - 1, Math.round(rf * (R - 1))));
      var j = Math.max(0, Math.min(S - 1, Math.round(sf * (S - 1))));
      return r * S + j;
    });
    if (flow) {
      labels.forEach(function (li) { li.style.left = ""; li.style.top = ""; });
      return;
    }
    /* the outermost seats of a deep row sit past the gutter, so a label that
       would run off the frame is pulled back rather than clipped */
    var pad = 24;
    function put(li, k) {
      var x = bx[k], w = li.offsetWidth;
      if (li.getAttribute("data-side") === "l") { if (x - w < pad) x = w + pad; }
      else if (x + w > W - pad) { x = W - pad - w; }
      li.style.left = Math.round(x) + "px";
      li.style.top  = Math.round(by[k]) + "px";
    }
    labels.forEach(function (li, i) { put(li, anchors[i]); });

    /* The sentence owns the middle of the room and the labels may never sit
       on it — the measure runs nearly the full width, so the only way out is
       vertical. Each label starts on the seat it was authored to and, if that
       seat puts it on the sentence or on a label already placed, it steps one
       row further AWAY from the sentence until it is clear. */
    if (!line) return;
    /* Layout boxes, not client rects: the sentence and the heading carry the
       page's reveal transform, so a client rect would measure them mid-entrance
       and pin the labels against a position the sentence is about to leave. */
    var lx0 = line.offsetLeft, ly0 = line.offsetTop;
    var lx1 = lx0 + line.offsetWidth, ly1 = ly0 + line.offsetHeight;
    var midY = (ly0 + ly1) / 2, GAP = 28;   /* the sentence keeps its own air */
    var boxes = [];
    function boxOf(li) {
      var w = li.offsetWidth, h = li.offsetHeight;
      var x = parseFloat(li.style.left) || 0, y = parseFloat(li.style.top) || 0;
      if (li.getAttribute("data-side") === "l") x -= w;
      y -= h / 2;
      return [x, y, x + w, y + h];
    }
    function hits(b, x0, y0, x1, y1, g) {
      return !(b[2] < x0 - g || b[0] > x1 + g || b[3] < y0 - g || b[1] > y1 + g);
    }
    function clear(b) {
      if (hits(b, lx0, ly0, lx1, ly1, GAP)) return false;
      for (var q = 0; q < boxes.length; q++) if (hits(b, boxes[q][0], boxes[q][1], boxes[q][2], boxes[q][3], 10)) return false;
      return true;
    }
    labels.forEach(function (li, i) {
      var home = anchors[i], j = home % S;
      /* row 0 is the front row, lowest on screen: a label below the sentence
         walks toward the front, one above it walks toward the back. A short
         room can run out of rows that way, so the far side of the sentence is
         tried before the label is left where it is. */
      var first = by[home] > midY ? -1 : 1;
      var found = home, ok = false;
      [first, -first].forEach(function (dir) {
        if (ok) return;
        var r0 = Math.floor(home / S), k = home;
        put(li, k);
        var b = boxOf(li), guard = 0;
        while (!clear(b)) {
          if (guard++ >= R) return;
          r0 += dir;
          if (r0 < 0 || r0 > R - 1) return;
          k = r0 * S + j;
          put(li, k);
          b = boxOf(li);
        }
        found = k; ok = true;
      });
      put(li, found);
      anchors[i] = found;
      boxes.push(boxOf(li));
    });
  }
  function lightRooms() {
    if (!labels.length || flow && mode === "static") return;
    for (var i = 0; i < labels.length; i++) {
      var k = anchors[i], on = false;
      if (T.reach && pOn) {
        var dx = px - bx[k], dy = py - by[k];
        var kk = 1 - Math.sqrt(dx * dx + dy * dy) / T.reach;
        if (kk > 0) on = Math.pow(kk, 1.5) > 0.35;
      }
      if (!on && waveOn) {
        var e = (rf[k] - wp) / 0.16;
        on = Math.exp(-e * e) > 0.35;
      }
      labels[i].classList.toggle("is-lit", on);
    }
  }

  function build() {
    var r = sec.getBoundingClientRect();
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = Math.max(1, Math.round(r.width)); H = Math.max(1, Math.round(r.height));
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    T = tier(); R = T.R; S = T.S; n = R * S;
    bx = new Float32Array(n); by = new Float32Array(n);
    br = new Float32Array(n); ba = new Float32Array(n); rf = new Float32Array(n);
    var k = 0;
    for (var i = 0; i < R; i++) {
      var f = R > 1 ? i / (R - 1) : 0;
      var yi = H * (0.92 - 0.72 * Math.pow(f, 0.78));
      var spread = 0.62 + 0.34 * f;
      var sag = T.sag0 + (T.sag1 - T.sag0) * f;
      for (var j = 0; j < S; j++) {
        var tt = (S > 1 ? j / (S - 1) : 0.5) - 0.5;
        bx[k] = W * (0.5 + spread * tt);
        by[k] = yi - sag * (1 - (2 * tt) * (2 * tt));
        br[k] = T.r0 + (T.r1 - T.r0) * f;
        ba[k] = T.a0 + (T.a1 - T.a0) * f;
        rf[k] = f;
        k++;
      }
    }
    measureHole();
    placeRooms();
  }

  var pOn = false, ptx = 0, pty = 0, px = 0, py = 0, pLeft = -1e9;
  var waveOn = false, wt0 = 0, wp = 0, nextWave = 0;

  function draw() {
    ctx.clearRect(0, 0, W, H);
    for (var k = 0; k < n; k++) {
      var x = bx[k], y = by[k], a = ba[k], rr = br[k];
      if (T.reach && pOn) {
        var ddx = px - x, ddy = py - y;
        var d = Math.sqrt(ddx * ddx + ddy * ddy);
        var kk = 1 - d / T.reach;
        if (kk > 0) {
          kk = Math.pow(kk, 1.5);
          a += 0.42 * kk; rr += 0.9 * kk;
          if (d > 0.001) { var m = (T.lean * kk) / d; x += ddx * m; y += ddy * m; }
        }
      }
      if (waveOn) {
        var e = (rf[k] - wp) / 0.16;
        var g = Math.exp(-e * e);
        a += 0.22 * g; rr += 0.5 * g;
      }
      if (a <= 0.005) continue;
      if (a > 1) a = 1;
      var lit = (a - ba[k]) / 0.42;
      if (lit < 0) lit = 0; else if (lit > 1) lit = 1;
      ctx.beginPath();
      ctx.arc(x, y, rr, 0, 6.28318530718);
      ctx.fillStyle = PAL[((lit * 7) | 0) * 33 + ((a * 32) | 0)];
      ctx.fill();
    }
    if (hole) {
      ctx.globalCompositeOperation = "destination-out";
      ctx.save();
      ctx.translate(hole.x, hole.y); ctx.scale(hole.rx, hole.ry);
      ctx.fillStyle = hole.g;
      ctx.beginPath(); ctx.arc(0, 0, 1, 0, 6.28318530718); ctx.fill();
      ctx.restore();
      ctx.globalCompositeOperation = "source-over";
    }
    lightRooms();
  }

  var raf = 0, sT = 0, onScreen = false;
  function frame(now) {
    raf = 0;
    if (mode !== "live") return;
    if (pOn) { px += (ptx - px) * 0.12; py += (pty - py) * 0.12; }
    if (!pOn && now - pLeft > 2000) {
      if (!waveOn && now >= nextWave) { waveOn = true; wt0 = now; }
    }
    if (waveOn) {
      wp = (now - wt0) / 2600;
      if (wp > 1.35) { waveOn = false; nextWave = now + 7000 + Math.random() * 4000; }
    }
    draw();
    var settling = Math.abs(ptx - px) > 0.3 || Math.abs(pty - py) > 0.3;
    if (!onScreen || document.hidden) return;
    if (pOn || waveOn || settling) { raf = requestAnimationFrame(frame); return; }
    clearTimeout(sT);
    sT = setTimeout(wake, Math.max(200, nextWave - performance.now()));
  }
  function wake() { if (mode === "live" && onScreen && !document.hidden && !raf) raf = requestAnimationFrame(frame); }
  function sleep() { if (raf) { cancelAnimationFrame(raf); raf = 0; } clearTimeout(sT); }

  function onMove(e) {
    if (e.pointerType === "touch") return;
    var r = sec.getBoundingClientRect();
    ptx = e.clientX - r.left; pty = e.clientY - r.top;
    if (!pOn) { pOn = true; px = ptx; py = pty; }
    waveOn = false;
    wake();
  }
  function onLeave() { pOn = false; pLeft = performance.now(); nextWave = pLeft + 2000; wake(); }

  var mode = null, rT = 0, iobs = null;
  function setMode() {
    var want = (rmq.matches || saveData) ? "static" : "live";
    if (want === mode) return;
    sleep();
    if (mode === "live") {
      sec.removeEventListener("pointermove", onMove);
      sec.removeEventListener("pointerleave", onLeave);
    }
    if (iobs) { iobs.disconnect(); iobs = null; }
    mode = want;
    build();
    if (want === "static") { pOn = false; waveOn = false; draw(); return; }
    nextWave = performance.now() + 2000;
    sec.addEventListener("pointermove", onMove, { passive: true });
    sec.addEventListener("pointerleave", onLeave);
    if ("IntersectionObserver" in window) {
      iobs = new IntersectionObserver(function (e) {
        onScreen = e[0].isIntersecting;
        if (onScreen) wake(); else sleep();
      }, { threshold: 0.05 });
      iobs.observe(sec);
    } else { onScreen = true; }
    draw();
    wake();
  }
  setMode();
  /* The labels are placed against the measured sentence, so the array has to
     be rebuilt once the real font metrics are in — otherwise a label can be
     pinned clear of a fallback-font measure and land on the real one. */
  function relayout() { build(); draw(); wake(); }
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(relayout);
  window.addEventListener("load", relayout);
  document.addEventListener("visibilitychange", function () {
    if (document.hidden) sleep(); else wake();
  });
  window.addEventListener("resize", function () {
    clearTimeout(rT);
    rT = setTimeout(relayout, 200);
  }, { passive: true });
  if (rmq.addEventListener) rmq.addEventListener("change", setMode);
  else if (rmq.addListener) rmq.addListener(setMode);
})();

/* ===== 6. Bio: the portrait's lights ===== */
(function () {
  "use strict";
  var bio = document.querySelector(".spk-bio");
  if (!bio) return;
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* --- the portrait: lights up as the section arrives --- */
  var portrait = bio.querySelector(".media .spk-lights");
  if (portrait) {
    if (reduce || !("IntersectionObserver" in window)) portrait.classList.add("is-lit");
    else {
      new IntersectionObserver(function (e, obs) {
        if (!e[0].isIntersecting) return;
        portrait.classList.add("is-lit");
        obs.disconnect();
      }, { threshold: 0.2 }).observe(bio);
    }
  }

  /* --- the drift: the portrait eases 4% upward as the right column
     scrolls past it, scrubbed by the spine; sticky positioning does the
     rest. Desktop only, and never under reduced motion. --- */
  var driftEl = bio.querySelector(".spk-bio__portrait");
  if (driftEl && window.spkSpine && !reduce &&
      window.matchMedia("(min-width: 901px)").matches) {
    window.spkSpine.add({
      start: function () { return bio.offsetTop - window.innerHeight; },
      end: function () { return bio.offsetTop + bio.offsetHeight; },
      update: function (p) {
        driftEl.style.setProperty("--spk-bio-drift",
          (-0.04 * driftEl.offsetHeight * p).toFixed(1) + "px");
      }
    });
  }

})();

/* ===== 7. A. What he talks about: the candle wheel =====
   A pinned stage (the track is 720svh, the stage sticky inside it) over
   the velvet. A giant wheel stands on its edge facing the viewer, its
   centre below the screen (radius 0.40 W, centred on W/2, its top point
   at 96% of the height: the top candle stands on the bottom edge). Six candles stand 40 degrees apart on the rim; the one at the
   top is upright and lit and its
   line stands above its flame. This module registers ONE entry with the spine
   (start: the section's top, end: the bottom of its track, so u = p * 720
   in svh of scroll) and has no scroll listener of its own:
     0-480    six beats of 80svh. Beat k: the line arrives over the first
              20%, the wheel turns 40 degrees (eased) over the last 45%
              while the line leaves. Lines 01-05 are beats 0-4; the bridge
              (06) arrives on beat 5 and holds, and the wheel stops.
     480-560  every candle lit, the bridge holds
     560-660  the grow (g 0-1): "Three talks." up behind the resting
              candle (0-0.2); the candle scales x8 about the middle of its
              wax, which drifts to the centre (0.2-0.75); as it starts,
              one roll through one window (0.2-0.5): "Three talks." up and
              out behind the candle, "for people, teams and organizations."
              up and in, in front; the wax close-up settles (0.6-0.9),
              then a warm veil (0.75-1)
     620-720  the stage is held in place (a transform, only while the
              talks section is pinned and rises over it) until the talks
              ground has come up
   update(p) writes the lines' --on, the heading's --on and the macro and
   bloom properties, and stores the wheel's state; the canvas is drawn by
   this module's own rAF loop, which runs only while the stage is on
   screen and the tab is visible (the flicker and the lighting are
   time-based, the wheel is not). A candle that has spoken stays lit, and
   a candle's lit frames fade in over 600ms.
   The six lines are real text in reading order at all times; nothing is
   announced while scrolling. Reduced motion, Save-Data, no canvas or no
   spine: no pin, the six lines stacked on the velvet, each under one lit
   candle (<img>). Phones run the same wheel with the line under the top
   candle. */
(function () {
  "use strict";
  var sec = document.querySelector(".spk-said");
  if (!sec) return;
  var track   = document.getElementById("spkSaidTrack");
  var stage   = document.getElementById("spkSaidStage");
  var cv      = document.getElementById("spkSaidWheel");
  var macroEl = document.getElementById("spkSaidMacro");
  var nextA   = sec.querySelector(".spk-said__nextA");
  var nextB   = sec.querySelector(".spk-said__nextB");
  var bloomEl = document.getElementById("spkSaidBloom");
  var linesEl = document.getElementById("spkSaidLines");
  var head    = sec.querySelector(".spk-said__h");
  var live    = document.getElementById("spkSaidLive");
  var lines   = [].slice.call(sec.querySelectorAll(".spk-said__line"));
  var N = 6;
  if (!track || !stage || !linesEl || !head || lines.length !== N) return;
  if (live) live.textContent = "";

  var base = ((macroEl && macroEl.getAttribute("src")) || "../assets/img/x").replace(/[^\/]*$/, "");
  var still = window.matchMedia("(prefers-reduced-motion: reduce)").matches ||
              !!(navigator.connection && navigator.connection.saveData);
  var ctx = cv && cv.getContext && cv.getContext("2d");

  function clamp(x) { return x < 0 ? 0 : (x > 1 ? 1 : x); }
  function smooth(x) { return x <= 0 ? 0 : (x >= 1 ? 1 : x * x * (3 - 2 * x)); }

  /* ---- the stacked path: one lit candle over each line ---- */
  if (still || !ctx || !window.spkSpine || !macroEl || !bloomEl || !nextA || !nextB) {
    sec.classList.add("is-stacked");
    lines.forEach(function (l) {
      var im = document.createElement("img");
      im.className = "spk-said__candle";
      im.src = base + "candle-lit-450.webp";
      im.alt = "";
      im.width = 107; im.height = 140;
      im.loading = "lazy"; im.decoding = "async";
      l.insertBefore(im, l.firstChild);
    });
    return;
  }

  sec.classList.add("is-wheel");
  var phoneMq = window.matchMedia("(max-width: 768px)");
  var keysSec = document.querySelector(".spk-keys");

  /* ---- the frames ----
     0 lit, 1 lit-b, 2 lit-lean, 3 unlit. The four were shot separately, so
     each is placed by its own foot (measured on the 900 files): the centre
     and the bottom of the brass foot sit on the rim, and each is scaled so
     its foot is the lit frame's width. hC is the lit frame's full height. */
  var NAMES = ["candle-lit", "candle-lit-b", "candle-lit-lean", "candle-unlit"];
  var ASP  = [689 / 900, 657 / 900, 743 / 900, 711 / 900];     /* width / height */
  var AX   = [348 / 689, 335 / 657, 362 / 743, 370 / 711];     /* foot centre, of width */
  var AY   = [890 / 900, 874 / 900, 881 / 900, 897 / 900];     /* foot bottom, of height */
  var FOOT = [328, 320, 334, 338];                             /* foot width at 900 */
  var imgs = [[], []];                                         /* [450 set, 900 set] */
  var loaded = false;
  function loadAll() {
    if (loaded) return;
    loaded = true;
    for (var s = 0; s < 2; s++) {
      for (var f = 0; f < 4; f++) {
        var im = new Image();
        im.decoding = "async";
        im.src = base + NAMES[f] + (s ? "-900" : "-450") + ".webp";
        if (im.decode) im.decode().then(null, function () {});
        imgs[s][f] = im;
      }
    }
  }
  function ready(im) { return !!im && im.complete && im.naturalWidth > 0; }

  /* the glow: one gold sprite, built once, drawn at the flame's alpha */
  var glow = document.createElement("canvas");
  glow.width = glow.height = 128;
  (function () {
    var gc = glow.getContext("2d");
    var gr = gc.createRadialGradient(64, 64, 0, 64, 64, 64);
    gr.addColorStop(0, "rgba(232,187,104,1)");
    gr.addColorStop(1, "rgba(232,187,104,0)");
    gc.fillStyle = gr;
    gc.fillRect(0, 0, 128, 128);
  })();

  /* ---- geometry (CSS px), rebuilt on resize ---- */
  var W = 1, H = 1, dpr = 1, hC = 300, Rw = 1, cyW = 1, svh = 1, phone = false;
  var fw = new Float32Array(4), fh = new Float32Array(4), fx = new Float32Array(4), fy = new Float32Array(4);
  function build() {
    W = Math.max(1, stage.clientWidth); H = Math.max(1, stage.clientHeight);
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
    phone = phoneMq.matches;
    hC = phone ? Math.max(220, Math.min(520, H * 0.34)) : Math.max(300, Math.min(520, H * 0.44));
    Rw = W * 0.40;
    cyW = H * 0.96 + Rw;                       /* the rim's top point at 96% of H */
    svh = track.offsetHeight / 720;
    for (var f = 0; f < 4; f++) {
      fh[f] = hC * FOOT[0] / FOOT[f];
      fw[f] = fh[f] * ASP[f];
      fx[f] = -AX[f] * fw[f];
      fy[f] = -AY[f] * fh[f];
    }
  }

  /* ---- the state the scroll sets ---- */
  var STEP = 40;                                           /* degrees between candles, and per beat */
  var u = 0, beat = 0, theta = 0, cxF = 0.5, g = 0, first = true;   /* the wheel's centre stays at W/2 */
  var litTo = new Int8Array(N), litFrom = new Float32Array(N), litT0 = new Float64Array(N);
  var L = new Float32Array(N);
  var fa = new Int8Array(N), fb = new Int8Array(N), fT = new Float64Array(N);
  (function () {
    var now = performance.now();
    for (var i = 0; i < N; i++) {
      fa[i] = (i * 2) % 3; fb[i] = (fa[i] + 1) % 3;
      fT[i] = now + 420 + Math.random() * 480;
    }
  })();

  var last = {};
  function put(el, key, name, v) {
    var s = v.toFixed(4);
    if (last[key] === s) return;
    last[key] = s;
    el.style.setProperty(name, s);
  }
  var lastBridge = null, lastHold = "";

  function update(p) {
    if (entry.disabled) return;
    u = p * 720;
    var s = 1, turn = 0;
    if (u < 560) { beat = Math.min(6, Math.floor(u / 80)); s = clamp(u / 80 - beat); }
    else beat = 6;
    /* the wheel turns on beats 0-4 only: from beat 5 the sixth candle
       (the bridge's) stays at the top through the grow */
    var tTurn = beat < 5 ? clamp((s - 0.65) / 0.35) : 0;    /* the turn's own progress */
    turn = smooth(tTurn);
    theta = -(Math.min(beat, 5) * STEP + turn * STEP);
    g = clamp((u - 560) / 100);

    /* the lines: in over the first 20% of their beat, out over the first
       30% of the turn;
       the bridge holds from beat 5 and is gone by g = 0.2 */
    var arrive = smooth(clamp(s / 0.2));
    for (var j = 0; j < N; j++) {
      var on = 0;
      /* gone within the first 30% of the turn, before the leaving candle
         can cross it */
      if (j < 5) { if (beat === j) on = Math.min(arrive, 1 - smooth(clamp(tTurn / 0.3))); }
      else if (beat === 5) on = arrive;
      else if (beat === 6) on = 1 - smooth(clamp(g / 0.2));
      put(lines[j], "l" + j, "--on", on);
    }
    put(head, "h", "--on", beat === 0 ? 1 - smooth(clamp(s / 0.2)) : 0);
    var bridge = beat >= 5;
    if (bridge !== lastBridge) { linesEl.classList.toggle("is-bridge", bridge); lastBridge = bridge; }

    /* lit: every candle up to the current beat (all six from beat 5) */
    var now = performance.now();
    for (var i = 0; i < N; i++) {
      var to = (beat >= 5 || i <= beat) ? 1 : 0;
      if (first) { litTo[i] = to; L[i] = to; litFrom[i] = to; litT0[i] = -1e9; }
      else if (to !== litTo[i]) { litFrom[i] = L[i]; litTo[i] = to; litT0[i] = now; }
    }
    first = false;

    /* the grow's DOM half, in order: line A up behind the resting candle
       (g 0-0.2); the roll as the candle starts to grow (0.2-0.5); the wax
       macro settling over the canvas (0.6-0.9) */
    put(nextA, "na", "--na", smooth(clamp(g / 0.2)));
    /* one roll through one window: A up and out, B up and in */
    var roll = smooth(clamp((g - 0.2) / 0.3));
    put(nextA, "rollA", "--roll", roll);
    put(nextB, "rollB", "--roll", roll);
    put(macroEl, "ms", "--ms", 1.08 - 0.08 * g);
    put(macroEl, "mo", "--mo", clamp((g - 0.6) / 0.3));
    /* the bloom leaves with the hand-off: the CSS multiplies --bo by
       (1 - --spk-keys-reveal), which module 2 writes on the root */
    put(bloomEl, "bo", "--bo", clamp((g - 0.75) / 0.25));

    /* held in place while the talks section rises over it (only when that
       section is pinned over it: on phones it is a strip) */
    var hold = (keysSec && keysSec.getAttribute("data-spk-keys-mode") === "pin" && u > 620)
      ? "translate3d(0," + ((u - 620) * svh).toFixed(1) + "px,0)" : "";
    if (hold !== lastHold) { stage.style.transform = hold; lastHold = hold; }
    wake();
  }

  /* ---- the draw ---- */
  var RAD = Math.PI / 180;
  function frame(f, big, alpha) {
    if (alpha <= 0.003) return;
    var im = imgs[big][f];
    if (!ready(im)) im = imgs[1 - big][f];
    if (!ready(im)) return;
    ctx.globalAlpha = alpha > 1 ? 1 : alpha;
    ctx.drawImage(im, fx[f], fy[f], fw[f], fh[f]);
  }
  /* the lighting (600ms) and the flicker: each lit frame held 420-900ms,
     then a 260ms crossfade to one of the other two */
  function step(now) {
    for (var i = 0; i < N; i++) {
      var t = (now - litT0[i]) / 600;
      L[i] = t >= 1 ? litTo[i] : litFrom[i] + (litTo[i] - litFrom[i]) * smooth(t);
      if (now >= fT[i] + 260) {
        fa[i] = fb[i];
        fb[i] = (fa[i] + 1 + Math.floor(Math.random() * 2)) % 3;
        fT[i] = now + 420 + Math.random() * 480;
      }
    }
  }
  function draw(now) {
    step(now);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    var cxW = W * cxF;
    var others = 1 - clamp(g / 0.3);
    /* the candle rests until line A is up, then grows over g 0.2-0.75 */
    var dg = smooth(clamp((g - 0.2) / 0.55)), S = 1 + 7 * dg;
    var top = Math.min(beat, 5);
    var gr = 0.55 * hC, fyL = -0.94 * hC;
    for (var i = 0; i < N; i++) {
      var phi = -90 + theta + i * STEP;
      var rel = ((phi + 90) % 360 + 540) % 360 - 180;
      if (rel > 100 || rel < -100) continue;
      var rad = phi * RAD;
      var x = cxW + Rw * Math.cos(rad), y = cyW + Rw * Math.sin(rad);
      if (y > H + hC) continue;
      var a = 0.35 + 0.65 * clamp(1 - Math.abs(rel) / 80);
      var grow = g > 0 && i === top;
      if (!grow) a *= others;
      if (a <= 0.003) continue;
      var rot = rad + Math.PI / 2, c = Math.cos(rot), sn = Math.sin(rot);
      var k = 1, ex = x, ey = y;
      if (grow) {
        /* scale about the middle of the wax (0.62 hC up the axis), which
           drifts to the centre as it grows: the flame leaves through the
           top and the marbled wax fills the frame */
        var Fx = x + 0.62 * hC * sn, Fy = y - 0.62 * hC * c;
        var Dx = Fx + (W / 2 - Fx) * dg, Dy = Fy + (H / 2 - Fy) * dg;
        k = S; ex = Dx + S * (x - Fx); ey = Dy + S * (y - Fy);
      }
      ctx.setTransform(dpr * k * c, dpr * k * sn, -dpr * k * sn, dpr * k * c, dpr * ex, dpr * ey);
      var big = hC * dpr * k > 470 ? 1 : 0;
      var Li = L[i];
      if (Li > 0.001) {
        ctx.globalCompositeOperation = "lighter";
        ctx.globalAlpha = (0.26 + 0.04 * Math.sin(now / 900 + i)) * Li * a;
        ctx.drawImage(glow, -gr, fyL - gr, 2 * gr, 2 * gr);
        ctx.globalCompositeOperation = "source-over";
      }
      if (Li < 0.999) frame(3, big, a * (1 - Li));
      if (Li > 0.001) {
        var t = (now - fT[i]) / 260;
        if (t <= 0) frame(fa[i], big, a * Li);
        /* the growing candle keeps the outgoing frame at full alpha under
           the incoming one, so its wax stays opaque over line A */
        else if (t < 1) { frame(fa[i], big, a * Li * (grow ? 1 : 1 - t)); frame(fb[i], big, a * Li * t); }
        else frame(fb[i], big, a * Li);
      }
    }
    ctx.globalAlpha = 1;
  }

  /* ---- the loop: only while the stage is on screen and the tab shows ----
     window.__spkProfile = true times each draw into window.__spkWheelCost
     (the last 240 frames, in ms). */
  var raf = 0, onScreen = false;
  function tick(now) {
    raf = 0;
    if (entry.disabled || !onScreen || document.hidden) return;
    var prof = window.__spkProfile === true, t0 = prof ? performance.now() : 0;
    draw(now);
    if (prof) {
      var cost = window.__spkWheelCost || (window.__spkWheelCost = []);
      cost.push(performance.now() - t0);
      if (cost.length > 240) cost.shift();
    }
    raf = requestAnimationFrame(tick);
  }
  function wake() { if (!raf && !entry.disabled && onScreen && !document.hidden) raf = requestAnimationFrame(tick); }
  document.addEventListener("visibilitychange", function () {
    if (document.hidden) { if (raf) { cancelAnimationFrame(raf); raf = 0; } } else wake();
  });

  function pageTop(el) { var y = 0; for (var n = el; n; n = n.offsetParent) y += n.offsetTop; return y; }
  var entry = { disabled: false,
    start: function () { return pageTop(sec); },
    end: function () { return pageTop(sec) + track.offsetHeight; },
    update: update };

  build();
  window.spkSpine.add(entry);

  if ("IntersectionObserver" in window) {
    new IntersectionObserver(function (e, obs) {
      if (!e[0].isIntersecting) return;
      loadAll(); obs.disconnect();
    }, { rootMargin: "100% 0px" }).observe(sec);
    new IntersectionObserver(function (e) {
      onScreen = e[0].isIntersecting && e[0].intersectionRatio >= 0.05;
      if (onScreen) wake();
    }, { threshold: [0, 0.05] }).observe(stage);
  } else { loadAll(); onScreen = true; wake(); }

  var rT = 0;
  function relayout() { build(); last = {}; lastBridge = null; window.spkSpine.measure(); wake(); }
  window.addEventListener("resize", function () {
    clearTimeout(rT);
    rT = setTimeout(relayout, 200);
  }, { passive: true });
  if (phoneMq.addEventListener) phoneMq.addEventListener("change", relayout);
  else if (phoneMq.addListener) phoneMq.addListener(relayout);
})();

/* ===== 8. What it's like in the room: seven beats, three stills, one pin =====
   The page's one pinned section. The track is seven beats plus a tail;
   p runs 0 → 1 across it, beat = floor(p * 7) and s runs 0 → 1 inside the
   beat:
     beat 0        the heading alone
     beat 1 + 2i   chapter i's word
     beat 2 + 2i   chapter i's line
   One thing is on screen at a time. Beat changes are TIME-based: when the
   scroll crosses into a new beat, the element on screen leaves (320ms)
   and, 120ms after it has gone, the new one arrives (the CSS transitions
   are the clock). A second change mid-fade retargets: what is leaving
   finishes on its own, the new target arrives 440ms from then. Each
   chapter has its own still at full brightness; a change of chapter
   crossfades them (the incoming still on top, the outgoing one kept lit
   under it for the 900ms of the fade), and the current still pushes in
   (--dolly 1 → 1.06) across its chapter's two beats. The rail's dot
   rests on the chapter's stop and travels in the last 15% of each line
   beat. This module keeps its own scroll handling (one rAF per scroll
   event, asleep off screen) and does not register with the spine.
   Three modes, rebuilt whenever either media query flips: "pin", "phone"
   (no pin, three stacked blocks, a rail whose fill rises with the scroll,
   each block's frame showing its still) and "static" (reduced motion and
   Save-Data: the Think still holds, every chapter open, no handlers). */
(function () {
  "use strict";
  var sec = document.querySelector(".spk-chap");
  if (!sec) return;
  var track    = document.getElementById("spkChapTrack");
  var stage    = document.getElementById("spkChapStage");
  var heading  = document.getElementById("spkChapH");
  var rail     = document.getElementById("spkChapRail");
  var dot      = document.getElementById("spkChapDot");
  var tabs     = [].slice.call(sec.querySelectorAll(".spk-chap__tab"));
  var chapters = [].slice.call(sec.querySelectorAll(".spk-chap__chapter"));
  var stills   = [].slice.call(sec.querySelectorAll(".spk-chap__still"));
  var live     = document.getElementById("spkChapLive");
  if (!track || !stage || !heading || !tabs.length || tabs.length !== chapters.length) return;

  var N = chapters.length;
  var BEATS = 1 + 2 * N;
  var rmq      = window.matchMedia("(prefers-reduced-motion: reduce)");
  var phone    = window.matchMedia("(max-width: 640px)");
  var saveData = !!(navigator.connection && navigator.connection.saveData);
  var hasIO    = "IntersectionObserver" in window;

  var wordsEl = chapters.map(function (c) { return c.querySelector(".spk-chap__word"); });
  var linesEl = chapters.map(function (c) { return c.querySelector(".spk-chap__text"); });
  var frames  = chapters.map(function (c) { return c.querySelector(".spk-chap__frame"); });
  /* the six beat elements, in beat order after the heading */
  var beatEls = [];
  chapters.forEach(function (c, i) { beatEls.push(wordsEl[i], linesEl[i]); });
  function elOf(b) { return b === 0 ? heading : beatEls[b - 1]; }
  function stillOf(i) {
    for (var k = 0; k < stills.length; k++) {
      if (+stills[k].getAttribute("data-chapter") === i) return stills[k];
    }
    return null;
  }

  function clamp(x) { return x < 0 ? 0 : (x > 1 ? 1 : x); }
  function smooth(x) { return x <= 0 ? 0 : (x >= 1 ? 1 : x * x * (3 - 2 * x)); }

  var sayT = 0;
  function say(msg) {
    if (!live) return;
    clearTimeout(sayT);
    live.textContent = "";
    sayT = setTimeout(function () { live.textContent = msg; }, 60);
  }
  function words(i) {
    var w = wordsEl[i], l = linesEl[i];
    return (w ? w.textContent.trim() : "") + ". " +
           (l ? l.textContent.replace(/\s+/g, " ").trim() : "");
  }

  /* The tablist as authored, kept so a mode that strips it (phone, static)
     can put it back exactly when the query flips. */
  var TAB_ATTRS   = ["role", "aria-selected", "aria-controls", "tabindex"];
  var PANEL_ATTRS = ["role", "aria-labelledby", "tabindex"];
  function snap(el, names) {
    var o = {};
    names.forEach(function (n) { o[n] = el.getAttribute(n); });
    return o;
  }
  var authored = {
    rail: rail ? snap(rail, TAB_ATTRS) : null,
    tabs: tabs.map(function (t) { return snap(t, TAB_ATTRS); }),
    chapters: chapters.map(function (c) { return snap(c, PANEL_ATTRS); })
  };
  function stripAria() {
    if (rail) TAB_ATTRS.forEach(function (n) { rail.removeAttribute(n); });
    tabs.forEach(function (t) { TAB_ATTRS.forEach(function (n) { t.removeAttribute(n); }); });
    chapters.forEach(function (c) { PANEL_ATTRS.forEach(function (n) { c.removeAttribute(n); }); });
  }
  function put(el, saved) {
    for (var n in saved) {
      if (saved[n] === null) el.removeAttribute(n); else el.setAttribute(n, saved[n]);
    }
  }
  function restoreAria() {
    if (rail) put(rail, authored.rail);
    tabs.forEach(function (t, i) { put(t, authored.tabs[i]); });
    chapters.forEach(function (c, i) { put(c, authored.chapters[i]); });
  }

  /* every mode starts from, and leaves, a clean section: the first still
     on, the heading shown, every beat element at rest */
  function clearState() {
    tabs.forEach(function (t) { t.classList.remove("is-on", "is-lit"); });
    chapters.forEach(function (c) { c.classList.remove("is-live", "is-lit"); });
    beatEls.forEach(function (e) { if (e) e.classList.remove("is-in", "is-leaving"); });
    heading.classList.remove("is-gone");
    stills.forEach(function (st, k) {
      st.classList.toggle("is-on", k === 0);
      st.style.removeProperty("--dolly");
      st.style.zIndex = "";
    });
    if (rail) rail.style.removeProperty("--dot");
    stage.style.removeProperty("--px"); stage.style.removeProperty("--py");
    sec.style.removeProperty("--rail-top"); sec.style.removeProperty("--rail-h");
  }

  /* ---- shared frame loop: rAF-throttled scroll, asleep off screen ---- */
  var mode = null, raf = 0, onScreen = false, secIO = null;

  function frame() {
    raf = 0;
    if (mode === "pin") measure();
    else if (mode === "phone") phoneMeasure();
  }
  function onScroll() {
    if (!raf && onScreen && !document.hidden) raf = requestAnimationFrame(frame);
  }
  function wake() {
    if (!onScreen || document.hidden) return;
    if (!raf) raf = requestAnimationFrame(frame);
  }
  function sleep() {
    if (raf) { cancelAnimationFrame(raf); raf = 0; }
  }
  function onVis() { if (document.hidden) sleep(); else wake(); }

  /* nothing runs while the section is off screen or the tab is hidden */
  function watchScreen() {
    window.addEventListener("scroll", onScroll, { passive: true });
    document.addEventListener("visibilitychange", onVis);
    if (hasIO) {
      secIO = new IntersectionObserver(function (e) {
        onScreen = e[0].isIntersecting;
        if (onScreen) wake(); else sleep();
      }, { threshold: 0.05 });
      secIO.observe(sec);
    } else { onScreen = true; wake(); }
  }
  function unwatchScreen() {
    sleep();
    window.removeEventListener("scroll", onScroll);
    document.removeEventListener("visibilitychange", onVis);
    if (secIO) { secIO.disconnect(); secIO = null; }
    onScreen = false;
  }

  /* ---- static: the Think still holds, every chapter open, no handlers ---- */
  function startStatic() {
    sec.classList.add("is-static");
    stripAria();
    clearState();
    chapters.forEach(function (c) { c.classList.add("is-live", "is-lit"); });
  }
  function stopStatic() {
    sec.classList.remove("is-static");
    restoreAria();
    clearState();
  }

  /* ---- pinned ---- */
  var curBeat = -1, curIdx = -1, shown = null;
  var arriveT = 0, leaveTs = [], offTs = [];

  /* the beat on screen leaves, then the target arrives; a call mid-fade
     retargets without cutting short what is already leaving */
  function goTo(b) {
    clearTimeout(arriveT); arriveT = 0;
    if (shown) {
      var el = shown;
      shown = null;
      if (el === heading) {
        heading.classList.add("is-gone");
      } else {
        el.classList.remove("is-in");
        el.classList.add("is-leaving");
        var t = setTimeout(function () {
          el.classList.remove("is-leaving");
          var k = leaveTs.indexOf(t);
          if (k > -1) leaveTs.splice(k, 1);
        }, 320);
        leaveTs.push(t);
      }
    }
    curBeat = b;
    arriveT = setTimeout(function () {
      arriveT = 0;
      var target = elOf(b);
      beatEls.forEach(function (e) { if (e) e.classList.remove("is-in"); });
      if (target === heading) {
        heading.classList.remove("is-gone");
      } else if (target) {
        heading.classList.add("is-gone");
        target.classList.remove("is-leaving");
        target.classList.add("is-in");
      }
      shown = target;
    }, 440);
  }

  /* the incoming still goes on top and fades in over the outgoing one,
     which keeps its light for the length of the crossfade */
  function setChapter(idx, first) {
    var inc = stillOf(idx);
    stills.forEach(function (st, k) {
      if (st === inc) {
        clearTimeout(offTs[k]); offTs[k] = 0;
        st.style.zIndex = "2";
        st.style.setProperty("--dolly", "1");
        st.classList.add("is-on");
        return;
      }
      st.style.zIndex = "1";
      if (first) { st.classList.remove("is-on"); return; }
      if (!st.classList.contains("is-on") || offTs[k]) return;
      offTs[k] = setTimeout(function () { offTs[k] = 0; st.classList.remove("is-on"); }, 900);
    });
    chapters.forEach(function (c, n) { c.classList.toggle("is-live", n === idx); });
    tabs.forEach(function (t, n) {
      t.setAttribute("aria-selected", n === idx ? "true" : "false");
      t.tabIndex = n === idx ? 0 : -1;
      t.classList.toggle("is-on", n === idx);
    });
    curIdx = idx;
    if (!first) say(words(idx));
  }

  function measure() {
    var r = track.getBoundingClientRect();
    var span = track.offsetHeight - window.innerHeight;
    var p = span > 0 ? clamp(-r.top / span) : 0;
    var beat = Math.min(BEATS - 1, Math.floor(p * BEATS));
    var s = clamp(p * BEATS - beat);
    var idx = beat === 0 ? 0 : Math.floor((beat - 1) / 2);
    var isLine = beat > 0 && (beat - 1) % 2 === 1;

    if (idx !== curIdx) setChapter(idx, curIdx === -1);
    if (beat !== curBeat) goTo(beat);

    /* the push-in runs across the chapter's two beats */
    var c = beat === 0 ? 0 : ((beat - 1) % 2 + s) / 2;
    var st = stillOf(idx);
    if (st) st.style.setProperty("--dolly", (1 + 0.06 * c).toFixed(4));

    /* the dot rests on its chapter's stop and travels at the end of a line */
    var d = Math.min(N - 1, idx + (isLine ? smooth((s - 0.85) / 0.15) : 0));
    if (rail) rail.style.setProperty("--dot", (N > 1 ? d / (N - 1) : 0).toFixed(4));
    tabs.forEach(function (t, n) { t.classList.toggle("is-lit", d >= n - 0.001); });

    /* the light belongs to the dot */
    if (dot) {
      var dr = dot.getBoundingClientRect(), sr = stage.getBoundingClientRect();
      stage.style.setProperty("--px", (dr.left + dr.width / 2 - sr.left).toFixed(1) + "px");
      stage.style.setProperty("--py", (dr.top + dr.height / 2 - sr.top).toFixed(1) + "px");
    }
  }

  /* chapter words: a press scrolls to that chapter's word beat; arrows
     move focus */
  var clickFns = tabs.map(function (t, i) {
    return function () {
      var span = track.offsetHeight - window.innerHeight;
      var trackTop = track.getBoundingClientRect().top + window.pageYOffset;
      window.scrollTo({ top: trackTop + ((1 + 2 * i + 0.4) / BEATS) * span, behavior: "smooth" });
    };
  });
  var focusFns = tabs.map(function (t) {
    return function () { tabs.forEach(function (o) { o.tabIndex = (o === t ? 0 : -1); }); };
  });
  var keyFns = tabs.map(function (t, i) {
    return function (e) {
      var k = e.key, n = -1, L = tabs.length;
      if (k === "ArrowDown" || k === "ArrowRight") n = (i + 1) % L;
      else if (k === "ArrowUp" || k === "ArrowLeft") n = (i - 1 + L) % L;
      else if (k === "Home") n = 0;
      else if (k === "End") n = L - 1;
      else return;
      e.preventDefault();
      tabs[n].focus();
    };
  });

  function startPin() {
    clearState();
    curIdx = -1;
    /* beat 0: the heading visible and nothing else */
    curBeat = 0; shown = heading;
    tabs.forEach(function (t, i) {
      t.addEventListener("click", clickFns[i]);
      t.addEventListener("focus", focusFns[i]);
      t.addEventListener("keydown", keyFns[i]);
    });
    measure();
    watchScreen();
  }
  function stopPin() {
    unwatchScreen();
    tabs.forEach(function (t, i) {
      t.removeEventListener("click", clickFns[i]);
      t.removeEventListener("focus", focusFns[i]);
      t.removeEventListener("keydown", keyFns[i]);
    });
    clearTimeout(arriveT); clearTimeout(sayT);
    arriveT = sayT = 0;
    leaveTs.forEach(function (t) { clearTimeout(t); });
    offTs.forEach(function (t) { clearTimeout(t); });
    leaveTs = []; offTs = [];
    curBeat = -1; curIdx = -1; shown = null;
    restoreAria();
    clearState();
  }

  /* ---- phone: no pin, a rail whose fill rises with the 62% cursor ---- */
  var railTop = 0, railH = 0, phoneNear = null;
  var CURSOR = 0.62;

  function phoneLayout() {
    railTop = chapters[0].offsetTop + 12;
    railH = Math.max(1, chapters[N - 1].offsetTop + 12 - railTop);
    sec.style.setProperty("--rail-top", railTop + "px");
    sec.style.setProperty("--rail-h", railH + "px");
  }
  function phoneMeasure() {
    var yT = window.innerHeight * CURSOR - sec.getBoundingClientRect().top;
    if (rail) rail.style.setProperty("--dot", clamp((yT - railTop) / railH).toFixed(4));
    chapters.forEach(function (c) { c.classList.toggle("is-lit", yT >= c.offsetTop + 12); });
  }
  /* each frame shows its chapter's still, set once when the block is near */
  function frameStill(i) {
    var f = frames[i], st = stillOf(i);
    if (!f || !st || f.style.backgroundImage) return;
    f.style.backgroundImage = "url(\"" + st.src + "\")";
  }

  function startPhone() {
    sec.classList.add("is-phone");
    stripAria();
    phoneLayout();
    if (hasIO) {
      phoneNear = new IntersectionObserver(function (es, obs) {
        es.forEach(function (e) {
          if (!e.isIntersecting) return;
          obs.unobserve(e.target);
          frameStill(chapters.indexOf(e.target));
        });
      }, { rootMargin: "100% 0px" });
      chapters.forEach(function (c) { phoneNear.observe(c); });
    } else {
      chapters.forEach(function (c, i) { frameStill(i); });
    }
    phoneMeasure();
    watchScreen();
  }
  function stopPhone() {
    unwatchScreen();
    if (phoneNear) { phoneNear.disconnect(); phoneNear = null; }
    sec.classList.remove("is-phone");
    restoreAria();
    clearState();
  }

  /* Either media query can flip mid-visit, so the mode is torn down and
     rebuilt rather than decided once at load. */
  function setMode() {
    var want = (rmq.matches || saveData) ? "static" : (phone.matches ? "phone" : "pin");
    if (want === mode) return false;
    if (mode === "static") stopStatic();
    else if (mode === "phone") stopPhone();
    else if (mode === "pin") stopPin();
    mode = want;
    if (want === "static") startStatic();
    else if (want === "phone") startPhone();
    else startPin();
    return true;
  }

  setMode();
  var resizeT = 0;
  window.addEventListener("resize", function () {
    clearTimeout(resizeT);
    resizeT = setTimeout(function () {
      if (setMode()) return;
      if (mode === "phone") phoneLayout();
      onScroll();
    }, 60);
  }, { passive: true });
  if (phone.addEventListener) phone.addEventListener("change", setMode);
  else if (phone.addListener) phone.addListener(setMode);
  if (rmq.addEventListener) rmq.addEventListener("change", setMode);
  else if (rmq.addListener) rmq.addListener(setMode);
})();

/* ===== 9. Hand-offs: the hero leaves at half speed, the rooms strip, the close =====
   Three spine entries' worth of work and no scroll listener of its own.
   A. The hero's picture moves down at half the scroll speed while the
      section leaves (--spk-hero-par on .spk-hero .media).
   B. Desktop: the rooms strip. The section's track is one screen plus the
      strip's travel (--spk-strip); while the stage is pinned the strip
      slides by --spk-x. Phones: a native snap strip, --spk-strip 0px.
   C. The close: main carries a bottom margin the height of the fixed
      footer (--spk-foot-h), so the page lifts off it.
   Reduced motion: no parallax, no scrub, a normal footer. */
(function () {
  "use strict";
  var hero = document.querySelector(".spk-hero");
  if (!hero || !window.spkSpine) return;
  var spine = window.spkSpine;
  var root = document.documentElement;
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var desk = window.matchMedia("(min-width: 769px)");

  function pageY(el) { var y = 0; for (var n = el; n; n = n.offsetParent) y += n.offsetTop; return y; }

  /* ---- A. hero parallax ---- */
  var media = hero.querySelector(".media");
  if (media && !reduce) {
    var heroH = 0;
    spine.add({
      start: function () { return 0; },
      end: function () { heroH = hero.offsetHeight; return heroH; },
      update: function (p) {
        media.style.setProperty("--spk-hero-par", (p * heroH * 0.5).toFixed(1) + "px");
      }
    });
  }

  /* ---- B. the rooms strip ---- */
  var sec = document.querySelector(".spk-formats");
  var strip = document.getElementById("spkRooms");
  var stripScroll = -1, stripEntry = null;
  function stripMeasure() {
    if (!sec || !strip) return false;
    var want = (!reduce && desk.matches) ? Math.max(0, strip.scrollWidth - window.innerWidth) : 0;
    if (want === stripScroll) return false;
    stripScroll = want;
    sec.style.setProperty("--spk-strip", want + "px");
    if (want > 0 && !stripEntry) {
      stripEntry = spine.add({
        start: function () { return pageY(sec); },
        end: function () { return pageY(sec) + stripScroll; },
        update: function (p) {
          sec.style.setProperty("--spk-x", (p * stripScroll).toFixed(1) + "px");
        }
      });
    }
    if (want === 0) sec.style.setProperty("--spk-x", "0px");
    return true;
  }

  /* ---- C. the close ---- */
  var hasHas = !!(window.CSS && CSS.supports && CSS.supports("selector(:has(a))"));
  var lastFoot = "";
  function footH() {
    if (reduce || !hasHas) return false;
    var f = document.getElementById("spkFoot");
    var close = f && f.querySelector(".spk-close");
    if (!f || !close) return false;
    /* The whole footer has to fit the screen for the lift to show the close
       and the footer grid together: the panel takes min(70svh, what the
       grid leaves). Where that is under 40% of the screen (phones, short
       windows) there is no lift: .is-flow, a normal footer. */
    var vh = window.innerHeight;
    var rest = f.offsetHeight - close.offsetHeight;
    var avail = vh - rest;
    var flow = avail < 0.4 * vh;
    if (flow) f.style.removeProperty("--spk-close-h");
    else f.style.setProperty("--spk-close-h", Math.floor(Math.min(0.7 * vh, avail)) + "px");
    var val = flow ? "0px" : f.offsetHeight + "px";
    f.classList.toggle("is-flow", flow);
    if (val === lastFoot) return false;
    lastFoot = val;
    root.style.setProperty("--spk-foot-h", val);
    return true;
  }

  /* ---- when the page changes shape: re-measure, and tell the spine only
     when a value that moves the page height actually changed ---- */
  function refresh() {
    var a = stripMeasure();
    var b = footH();
    if (a || b) spine.measure();
  }
  refresh();
  window.addEventListener("load", refresh);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(refresh);
  var rsT = null;
  window.addEventListener("resize", function () {
    clearTimeout(rsT);
    rsT = setTimeout(refresh, 200);
  }, { passive: true });
})();
