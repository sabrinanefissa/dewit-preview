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
    ended = true; syncPlay(); bigReplay(); say("Replay available");
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

/* ===== 2. Keynotes: three talks, one shared stage, the reel as the ground ===
   It is a speaking page, so the section is video-led. The ground is the reel
   itself, held — muted and paused — on a frame from the active talk's own
   segment, and "Hear Stephen on this" plays that segment WITH SOUND in the
   ground behind the type. The segment stops at its own end and puts the
   ground back on its held frame.
   Only one audio source is ever running: pressing a talk claims the audio
   through the document-level "spk:audio" event, which stops the hero reel,
   and the hero's own controls claim it back.
   The ground is still a lights sequence, not a crossfade: the lights go DOWN
   on what is leaving, the seek happens in the dark, and the lights come UP on
   the frame that arrives. Reduced motion and Save-Data keep the three stills
   as the ground and load the clip only if a button is pressed. */
(function () {
  "use strict";
  var sec = document.querySelector(".spk-keys");
  if (!sec) return;
  var index   = sec.querySelector(".spk-keys__index");
  var stage   = sec.querySelector(".spk-keys__stage");
  var media   = sec.querySelector(".spk-keys__media");
  var vid     = sec.querySelector(".spk-keys__video");
  var tabs    = [].slice.call(sec.querySelectorAll(".spk-keys__tab"));
  var panels  = [].slice.call(sec.querySelectorAll(".spk-keys__panel"));
  var grounds = [].slice.call(sec.querySelectorAll(".spk-keys__media img"));
  var mores   = [].slice.call(sec.querySelectorAll(".spk-keys__more"));
  var outs    = [].slice.call(sec.querySelectorAll(".spk-keys__outs"));
  var hears   = [].slice.call(sec.querySelectorAll(".spk-keys__hear"));
  var cap      = document.getElementById("spkKeysCap");
  var playWrap = sec.querySelector(".spk-keys__play");
  var pauseBtn = document.getElementById("spkKeysPause");
  var live    = document.getElementById("spkKeysLive");
  if (!index || !tabs.length || tabs.length !== panels.length) return;

  var reduce   = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var saveData = !!(navigator.connection && navigator.connection.saveData);
  var small    = window.matchMedia("(max-width: 820px)");
  var cur = 0;
  var videoGround = !!vid && !reduce && !saveData;

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
     p: the frame the ground is HELD on at rest. The in point is chosen by the
     sentence, and the reel's own title card and testimonial supers sit on some
     of them, so the held frame is named separately — always inside the same
     segment, always a frame of Stephen actually speaking. */
  var segs = hears.map(function (b) {
    var a = parseFloat(b.getAttribute("data-seg-start"));
    var p = parseFloat(b.getAttribute("data-seg-poster"));
    return { a: a, b: parseFloat(b.getAttribute("data-seg-end")),
             p: isNaN(p) ? a : p };
  });
  var playing = -1, watchRaf = 0, srcSet = false, track = null;
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
    if (t && !track) {
      track = t;
      track.mode = "hidden";          /* the cues, without the native box */
      track.addEventListener("cuechange", onCue);
    }
  }
  /* One line at the bottom of the frame, from the reel's own VTT, and only
     when the visitor has captions on in the hero (the CSS hides it too). */
  function onCue() {
    if (playing < 0 || !track || !cap) return;
    var ccOn = document.documentElement.getAttribute("data-spk-cc") === "on";
    var c = track.activeCues && track.activeCues.length ? track.activeCues[0] : null;
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
  /* noPark: the caller is about to seek somewhere else itself (a tab change),
     so this must not queue a seek back to the current talk first. */
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
      /* back to the held frame for whichever talk is on screen */
      if (!noPark && segs[cur]) { try { vid.currentTime = segs[cur].p; } catch (err) {} }
      if (!videoGround) vid.classList.remove("is-on", "is-lit");
    }
    if (i >= 0) { clearCap(); syncHear(i); if (atEnd) say("Clip finished"); }
  }
  function playClip(i) {
    if (!vid || !segs[i]) return;
    claim();                        /* stops the hero reel */
    ensureSrc();
    var s = segs[i];
    /* with the stills as the ground, the clip only appears while it plays */
    if (!videoGround) vid.classList.add("is-on", "is-lit");
    /* always from the in point. The ground is parked on the held frame, which
       sits inside the segment, so carrying on from wherever the playhead
       happens to be would start the sentence halfway through. */
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

  /* Nothing keeps talking off screen or in a hidden tab. */
  if ("IntersectionObserver" in window) {
    new IntersectionObserver(function (e) {
      if (e[0].intersectionRatio < 0.25 && playing >= 0) stopClip(false);
    }, { threshold: [0, 0.25, 1] }).observe(sec);
  }
  document.addEventListener("visibilitychange", function () {
    if (document.hidden && playing >= 0) stopClip(false);
  });
  if (vid) {
    vid.addEventListener("ended", function () { if (playing >= 0) stopClip(true); });
    vid.addEventListener("pause", function () { if (playing >= 0) syncHear(playing); });
  }

  /* Reduced motion: no lights sequence and no video ground. All three talks
     are present under their own headings, every outcome list is open, and the
     index stops being a tablist. The one thing that still works on a click is
     "Hear Stephen on this" — it is the point of the page. */
  if (reduce) {
    sec.classList.add("is-stacked");
    index.removeAttribute("role");
    tabs.forEach(function (t) {
      t.removeAttribute("role"); t.removeAttribute("aria-selected");
      t.removeAttribute("aria-controls"); t.removeAttribute("tabindex");
    });
    panels.forEach(function (p) {
      p.removeAttribute("inert"); p.classList.add("is-on");
      p.removeAttribute("role"); p.removeAttribute("aria-labelledby"); p.removeAttribute("tabindex");
    });
    outs.forEach(function (u) { u.hidden = false; u.classList.add("is-open"); });
    grounds.forEach(function (g) { g.classList.add("is-lit"); });
    return;
  }

  /* The panels ship visible so the page works without this script. With the
     script running, the inactive ones are inert: CSS hides them with
     visibility (which also takes them out of the accessibility tree) and
     inert keeps them out of reach of the keyboard. Nothing uses [hidden] on
     a panel, so the stage never changes height on a swap. */
  panels.forEach(function (p, i) { if (i !== 0) p.setAttribute("inert", ""); });

  var hideT = 0, lightT = 0;
  var strip = window.matchMedia("(max-width: 768px)");
  var autoScroll = false, autoT = 0, swipeT = 0;

  /* On a phone the index is a snap strip: the selected title is kept centred. */
  function centreTab(i) {
    if (!strip.matches || !tabs[i]) return;
    autoScroll = true;
    clearTimeout(autoT);
    autoT = setTimeout(function () { autoScroll = false; }, 500);
    try {
      tabs[i].scrollIntoView({ inline: "center", block: "nearest", behavior: reduce ? "instant" : "smooth" });
    } catch (err) {}
  }

  /* The reel becomes the ground: the stills go dark, the video takes the
     frame, and it is parked on the first talk's in point. */
  if (videoGround) {
    ensureSrc();
    grounds.forEach(function (g) { g.classList.remove("is-on", "is-lit"); });
    vid.classList.add("is-on");
    var park = function () { if (playing < 0 && segs[cur]) { try { vid.currentTime = segs[cur].p; } catch (err) {} } };
    if (vid.readyState >= 1) park();
    else vid.addEventListener("loadedmetadata", park, { once: true });
  }

  /* ---- the disclosure ---- */
  function closeAll() {
    mores.forEach(function (b, k) {
      b.setAttribute("aria-expanded", "false");
      if (outs[k]) { outs[k].classList.remove("is-open"); outs[k].hidden = true; }
    });
  }
  mores.forEach(function (b, k) {
    var list = outs[k];
    if (!list) return;
    b.addEventListener("click", function () {
      var open = b.getAttribute("aria-expanded") === "true";
      if (open) {
        b.setAttribute("aria-expanded", "false");
        list.classList.remove("is-open"); list.hidden = true;
      } else {
        b.setAttribute("aria-expanded", "true");
        list.hidden = false;
        /* two frames, so the three lines stagger in from their start state */
        requestAnimationFrame(function () {
          requestAnimationFrame(function () { list.classList.add("is-open"); });
        });
      }
    });
  });

  /* ---- layout guard: the stage is always as tall as the tallest EXPANDED
     panel, measured for real, so opening a disclosure cannot shift the page
     and a tab swap cannot either. ---- */
  var lockT = 0;
  function lockHeight() {
    if (!stage) return;
    stage.style.minHeight = "";
    var was = outs.map(function (u) { return u.hidden; });
    outs.forEach(function (u) { u.hidden = false; });
    var h = 0;
    panels.forEach(function (p) { h = Math.max(h, p.offsetHeight); });
    outs.forEach(function (u, k) { u.hidden = was[k]; });
    if (h > 0) stage.style.minHeight = Math.ceil(h) + "px";
  }
  lockHeight();
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(lockHeight);
  window.addEventListener("load", lockHeight);
  window.addEventListener("resize", function () {
    clearTimeout(lockT); lockT = setTimeout(lockHeight, 200);
  }, { passive: true });

  /* ---- the ground: lights down, seek or swap in the dark, lights up ---- */
  function lights(i) {
    if (!media) return;
    clearTimeout(lightT);
    media.classList.add("is-dimming");
    grounds.forEach(function (g) { g.classList.remove("is-lit"); });
    if (vid) vid.classList.remove("is-lit");
    lightT = setTimeout(function () {
      if (videoGround) {
        /* one element, a new in point: seek in the dark, and come up on the
           frame once it has actually arrived */
        var done = false;
        var up = function () {
          if (done) return;
          done = true;
          vid.removeEventListener("seeked", up);
          requestAnimationFrame(function () {
            media.classList.remove("is-dimming");
            vid.classList.add("is-lit");
          });
        };
        vid.addEventListener("seeked", up);
        setTimeout(up, 700);           /* never hold the house dark on a slow seek */
        if (segs[i]) { try { vid.currentTime = segs[i].p; } catch (err) { up(); } }
        else up();
        return;
      }
      if (!grounds[i]) { media.classList.remove("is-dimming"); return; }
      grounds.forEach(function (g, k) { g.classList.toggle("is-on", k === i); });
      requestAnimationFrame(function () {
        media.classList.remove("is-dimming");
        grounds[i].classList.add("is-lit");
      });
    }, 240);
  }

  function select(i) {
    if (i === cur || !panels[i]) return;
    var out = panels[cur], inn = panels[i];
    /* a talk's clip belongs to that talk: changing tabs stops it */
    if (playing >= 0) stopClip(false, true);

    tabs[cur].setAttribute("aria-selected", "false"); tabs[cur].tabIndex = -1; tabs[cur].classList.remove("is-on");
    tabs[i].setAttribute("aria-selected", "true");    tabs[i].tabIndex = 0;    tabs[i].classList.add("is-on");
    centreTab(i);
    lights(i);
    closeAll();

    out.classList.remove("is-on"); out.classList.add("is-out");
    inn.removeAttribute("inert"); inn.classList.remove("is-out");
    /* two frames, so the incoming panel transitions from its start state */
    requestAnimationFrame(function () {
      requestAnimationFrame(function () { inn.classList.add("is-on"); });
    });

    cur = i;
    clearTimeout(hideT);
    /* the outgoing panel goes inert once its fade has finished */
    hideT = setTimeout(function () {
      panels.forEach(function (p, k) {
        if (k !== cur) { p.setAttribute("inert", ""); p.classList.remove("is-out", "is-on"); }
      });
    }, 260);
  }

  tabs.forEach(function (t, i) {
    t.addEventListener("click", function () { select(i); });
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

  /* A swipe selects: once the strip settles, the title nearest its centre
     becomes the selected talk. */
  index.addEventListener("scroll", function () {
    if (!strip.matches || autoScroll) return;
    clearTimeout(swipeT);
    swipeT = setTimeout(function () {
      if (!strip.matches || autoScroll) return;
      var r = index.getBoundingClientRect();
      var mid = r.left + r.width / 2, best = -1, bestD = Infinity;
      tabs.forEach(function (t, k) {
        var b = t.getBoundingClientRect();
        var d = Math.abs(b.left + b.width / 2 - mid);
        if (d < bestD) { bestD = d; best = k; }
      });
      if (best >= 0 && best !== cur) select(best);
    }, 140);
  }, { passive: true });

  /* the house lights come up on the first ground as the section arrives */
  function firstLight() {
    var el = videoGround ? vid : grounds[cur];
    if (el) el.classList.add("is-lit");
  }
  if ("IntersectionObserver" in window) {
    new IntersectionObserver(function (e, obs) {
      if (!e[0].isIntersecting) return;
      firstLight();
      obs.disconnect();
    }, { threshold: 0.15 }).observe(sec);
  } else {
    firstLight();
  }
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

})();

/* ===== 7. A. What he talks about: one line at a time =====
   The five lines and the bridge all ship in the markup, stacked, so the
   section reads with no script and under reduced motion. With the script
   running the stack becomes one cell on an 8 s dwell; from that moment the
   visible stage is decorative (aria-hidden) and .spk-said__srlist is what a
   screen reader reads. Hover and keyboard focus hold the sequence. An arrow
   PINS it for good — nothing puts it back on a timer (WCAG 2.2.2).

   The five lines are things people in a room do not say out loud, so the
   room says them. The seat array from the formats section lies over the
   still and five of its seats are occupied, one per line. When a line's
   turn comes its seat lights gold a beat before the line surfaces, and a
   hairline draws from the seat toward the line and fades as the line lands.
   On the bridge all five hold gold and every other seat lifts one step
   toward violet-100: the organization sees it. Gold is a person, violet the
   organization, and gold never touches the type. No lean and no wave here:
   the room is still between seat events and the loop sleeps. */
(function () {
  "use strict";
  var sec = document.querySelector(".spk-said");
  if (!sec) return;
  var stage = document.getElementById("spkSaidStage");
  var inner = sec.querySelector(".spk-said__inner");
  var prev  = document.getElementById("spkSaidPrev");
  var nxt   = document.getElementById("spkSaidNext");
  var count = document.getElementById("spkSaidCount");
  var live  = document.getElementById("spkSaidLive");
  var img   = sec.querySelector(".media .spk-lights");
  if (!stage || !inner || !prev || !nxt || !count) return;

  var slides = [].slice.call(stage.children);
  var N = slides.length;
  if (!N) return;

  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var rmq = window.matchMedia("(prefers-reduced-motion: reduce)");
  var saveData = !!(navigator.connection && navigator.connection.saveData);

  /* the lights come up once as the section arrives, and hold */
  function lightUp() { if (img) img.classList.add("is-lit"); }
  if (reduce || !("IntersectionObserver" in window)) lightUp();
  else {
    new IntersectionObserver(function (e, obs) {
      if (!e[0].isIntersecting) return;
      lightUp(); obs.disconnect();
    }, { threshold: 0.2 }).observe(sec);
  }

  /* --- the room ---------------------------------------------------------
     Geometry, palette and hole are the formats room's, duplicated rather
     than shared so that module stays exactly as it is. */
  var cv = document.getElementById("spkSaidRoom");
  var seatsEl = document.getElementById("spkSaidSeats");
  var ctx = cv && cv.getContext && cv.getContext("2d");
  var srItems = [].slice.call(sec.querySelectorAll(".spk-said__srlist li"));

  /* One occupied seat per line, as [row, seat fraction] in the widest
     tier's nine rows. Rows 0–1 are front rows, below the text band; row 8
     is the back row, above it (row 7 put lines 3 and 4 inside the hole at
     1024, under the type's own box). */
  var OCC = [[1, 0.24], [1, 0.76], [8, 0.14], [8, 0.86], [0, 0.50]];
  var M = OCC.length;

  var W = 1, H = 1, R = 9, S = 26, n = 0, T = null;
  var bx = null, by = null, br = null, ba = null, occ = null;
  var sk = new Int32Array(M);          /* seat index per line */
  var hl = new Float32Array(M * 4);    /* hairline start x,y and end x,y per line */
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
  /* a seat's own base violet to gold #E8BB68, in 33 steps, by alpha — built
     once so draw() never makes a string */
  var GP = new Array(33 * 33);
  (function () {
    for (var c = 0; c <= 32; c++) {
      var f = c / 32;
      var r = Math.round(169 + (232 - 169) * f);
      var g = Math.round(133 + (187 - 133) * f);
      var b = Math.round(230 + (104 - 230) * f);
      for (var a = 0; a <= 32; a++) GP[c * 33 + a] = "rgba(" + r + "," + g + "," + b + "," + (a / 32).toFixed(3) + ")";
    }
  })();
  var HAIR = "rgba(169,133,230,.5)";

  function tier() {
    var w = window.innerWidth;
    if (w >= 1200) return { R: 9, S: 26, r0: 2.6, r1: 1.2, a0: .42, a1: .14, reach: 260, lean: 3.0, sag0: 10, sag1: 5 };
    if (w >= 768)  return { R: 7, S: 20, r0: 2.2, r1: 1.1, a0: .39, a1: .14, reach: 220, lean: 2.5, sag0: 10, sag1: 5 };
    return { R: 5, S: 13, r0: 1.9, r1: 1.0, a0: .36, a1: .14, reach: 0, lean: 0, sag0: 7, sag1: 3.5 };
  }

  var hole = null;
  function measureHole() {
    hole = null;
    var lr = stage.getBoundingClientRect(), sr = sec.getBoundingClientRect();
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

  /* each hairline runs from its seat toward the line box — front rows to
     the bottom-centre, back rows to the top-centre — and stops 16px short */
  function aim() {
    var lr = stage.getBoundingClientRect(), sr = sec.getBoundingClientRect();
    var cx = lr.left - sr.left + lr.width / 2;
    var top = lr.top - sr.top, bot = top + lr.height;
    for (var i = 0; i < M; i++) {
      var k = sk[i], x0 = bx[k], y0 = by[k];
      var tx = cx, ty = OCC[i][0] <= 1 ? bot : top;
      var dx = tx - x0, dy = ty - y0, d = Math.sqrt(dx * dx + dy * dy);
      var len = Math.max(0, d - 16), m = d > 0.001 ? len / d : 0;
      hl[i * 4] = x0; hl[i * 4 + 1] = y0;
      hl[i * 4 + 2] = x0 + dx * m; hl[i * 4 + 3] = y0 + dy * m;
    }
  }

  var btns = [];
  function placeSeats() {
    var want = mode === "live" && !!seatsEl && window.innerWidth >= 768;
    if (!want) {
      btns.forEach(function (b) { if (b.parentNode) b.parentNode.removeChild(b); });
      btns = [];
      return;
    }
    if (!btns.length) {
      for (var i = 0; i < M; i++) btns.push(seatButton(i));
    }
    for (var j = 0; j < M; j++) {
      btns[j].style.left = Math.round(bx[sk[j]]) + "px";
      btns[j].style.top  = Math.round(by[sk[j]]) + "px";
    }
  }
  /* the buttons are the keyboard path to one particular line; the arrows
     stay the path through the sequence */
  function seatButton(i) {
    var b = document.createElement("button");
    b.type = "button";
    b.className = "spk-said__seat";
    var li = srItems[i];
    if (li) b.setAttribute("aria-label", li.textContent.replace(/\s+/g, " ").trim());
    b.addEventListener("pointerenter", function (e) {
      if (e.pointerType === "touch") return;
      pin(i);
    });
    b.addEventListener("focus", function () { pin(i); });
    b.addEventListener("click", function () { pin(i); });
    seatsEl.appendChild(b);
    return b;
  }

  function build() {
    var r = sec.getBoundingClientRect();
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = Math.max(1, Math.round(r.width)); H = Math.max(1, Math.round(r.height));
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    T = tier(); R = T.R; S = T.S; n = R * S;
    bx = new Float32Array(n); by = new Float32Array(n);
    br = new Float32Array(n); ba = new Float32Array(n);
    occ = new Int8Array(n);
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
        occ[k] = -1;
        k++;
      }
    }
    /* the rows are authored against nine, so each is read as a fraction and
       mapped onto the rows and seats this tier actually has */
    for (var q = 0; q < M; q++) {
      var rr = Math.max(0, Math.min(R - 1, Math.round(OCC[q][0] / 8 * (R - 1))));
      var jj = Math.max(0, Math.min(S - 1, Math.round(OCC[q][1] * (S - 1))));
      sk[q] = rr * S + jj;
      occ[sk[q]] = q;
    }
    measureHole();
    aim();
    placeSeats();
  }

  /* seat, lift and hairline state; every easing runs off its own start time,
     so a change made off screen has simply finished by the time it is seen */
  var lit = new Float32Array(M), lFrom = new Float32Array(M), lTo = new Float32Array(M);
  var lT0 = new Float64Array(M);
  var lift = 0, fFrom = 0, fTo = 0, fT0 = -1e9;
  var hlI = -1, hlT0 = 0, hlP = 0, hlA = 0;
  var roomCur = -1;

  function ease(x) { return 1 - (1 - x) * (1 - x) * (1 - x); }

  function step(now) {
    var busy = false, t;
    for (var i = 0; i < M; i++) {
      t = (now - lT0[i]) / 600;
      if (t >= 1) { lit[i] = lTo[i]; continue; }
      if (t < 0) t = 0;
      lit[i] = lFrom[i] + (lTo[i] - lFrom[i]) * ease(t);
      busy = true;
    }
    t = (now - fT0) / 900;
    if (t >= 1) lift = fTo;
    else { if (t < 0) t = 0; lift = fFrom + (fTo - fFrom) * ease(t); busy = true; }
    if (hlI >= 0) {
      var e = now - hlT0;
      if (e < 0) e = 0;
      if (e >= 1450) { hlI = -1; hlA = 0; }
      else {
        hlP = e >= 500 ? 1 : e / 500;
        hlA = e <= 850 ? 1 : 1 - (e - 850) / 600;
        busy = true;
      }
    }
    return busy;
  }

  function draw() {
    ctx.clearRect(0, 0, W, H);
    var lt = ((lift * 2 + 0.5) | 0) * 33, la = 0.14 * lift;
    for (var k = 0; k < n; k++) {
      var o = occ[k], a, rr = br[k];
      if (o < 0) {
        a = ba[k] + la;
        if (a <= 0.005) continue;
        if (a > 1) a = 1;
        ctx.fillStyle = PAL[lt + ((a * 32) | 0)];
      } else {
        var l = lit[o];
        a = 0.95 * l + ba[k] * (1 - l);
        if (a > 1) a = 1;
        rr += 0.9 * l;
        ctx.fillStyle = GP[((l * 32 + 0.5) | 0) * 33 + ((a * 32) | 0)];
      }
      ctx.beginPath();
      ctx.arc(bx[k], by[k], rr, 0, 6.28318530718);
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
    /* the hairline goes on after the hole, so it can reach into the air
       around the line that the dots are kept out of */
    if (hlI >= 0 && hlA > 0.001) {
      var q = hlI * 4;
      ctx.globalAlpha = hlA;
      ctx.strokeStyle = HAIR;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(hl[q], hl[q + 1]);
      ctx.lineTo(hl[q] + (hl[q + 2] - hl[q]) * hlP, hl[q + 1] + (hl[q + 3] - hl[q + 1]) * hlP);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
  }

  var mode = null, raf = 0, rT = 0, onScreen = false;
  function frame(now) {
    raf = 0;
    if (mode !== "live") return;
    var busy = step(now);
    draw();
    if (busy && onScreen && !document.hidden) raf = requestAnimationFrame(frame);
  }
  function wake() { if (mode === "live" && onScreen && !document.hidden && !raf) raf = requestAnimationFrame(frame); }
  function sleep() { if (raf) { cancelAnimationFrame(raf); raf = 0; } }

  /* A slide change: on 1–5 only that line's seat is lit and its hairline
     draws; on the bridge all five hold and the room lifts. The first event
     waits for the room to be seen. */
  function roomGo(i) {
    if (mode !== "live" || i === roomCur) return;
    if (roomCur < 0 && !onScreen) return;
    roomCur = i;
    var now = performance.now();
    step(now);
    var all = i >= M;
    for (var s = 0; s < M; s++) {
      var to = (all || s === i) ? 1 : 0;
      if (to !== lTo[s]) { lFrom[s] = lit[s]; lTo[s] = to; lT0[s] = now; }
    }
    var ft = all ? 1 : 0;
    if (ft !== fTo) { fFrom = lift; fTo = ft; fT0 = now; }
    hlI = all ? -1 : i; hlT0 = now; hlP = 0; hlA = 0;
    wake();
  }
  function roomSeen(v) {
    onScreen = v;
    if (!v) { sleep(); return; }
    if (roomCur < 0) roomGo(cur);
    wake();
  }

  /* Reduced motion and Save-Data: the room drawn once, all five seats held
     gold, no hairline, no lift, no buttons and no loop. */
  function setRoomMode() {
    var want = (rmq.matches || saveData) ? "static" : "live";
    if (want === mode) return;
    sleep();
    mode = want;
    var v = want === "static" ? 1 : 0;
    for (var i = 0; i < M; i++) { lit[i] = v; lFrom[i] = v; lTo[i] = v; lT0[i] = -1e9; }
    lift = 0; fFrom = 0; fTo = 0; fT0 = -1e9;
    hlI = -1; hlA = 0; roomCur = -1;
    build();
    draw();
    if (want === "live" && onScreen) roomGo(cur);
  }
  function relayout() { build(); draw(); wake(); }
  function roomInit(watch) {
    if (!ctx) return;
    setRoomMode();
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(relayout);
    window.addEventListener("load", relayout);
    window.addEventListener("resize", function () {
      clearTimeout(rT);
      rT = setTimeout(relayout, 200);
    }, { passive: true });
    if (!watch) return;
    document.addEventListener("visibilitychange", function () {
      if (document.hidden) sleep(); else wake();
    });
    if (rmq.addEventListener) rmq.addEventListener("change", setRoomMode);
    else if (rmq.addListener) rmq.addListener(setRoomMode);
  }

  /* Reduced motion keeps the stacked state exactly as it ships: five lines
     and the bridge, lit, no cycle and no arrows. */
  if (reduce) { roomInit(false); return; }

  sec.classList.add("is-live");
  stage.setAttribute("aria-hidden", "true");

  var DWELL = 8000;
  var cur = 0, pinned = false, hover = false, focus = false, inView = false;
  var auto = 0, outT = 0, swapT = 0;

  function pad(i) { return (i < 10 ? "0" : "") + i; }
  function wrapi(i) { return ((i % N) + N) % N; }

  function show(k, byUser) {
    slides.forEach(function (s, j) {
      var was = s.classList.contains("is-on");
      s.classList.toggle("is-on", j === k);
      s.classList.toggle("is-out", was && j !== k);
    });
    clearTimeout(outT);
    outT = setTimeout(function () {
      slides.forEach(function (s) { s.classList.remove("is-out"); });
    }, 560);
    if (live) {
      if (byUser) {
        live.setAttribute("aria-live", "polite");
        var t = slides[k].textContent.replace(/\s+/g, " ").trim();
        setTimeout(function () { live.textContent = t; }, 60);
      } else {
        live.setAttribute("aria-live", "off");
        live.textContent = "";
      }
    }
  }

  /* the count and the seat move at once; the line follows 350ms later, so
     the seat lights a beat before its line surfaces */
  function render(i, byUser) {
    var k = cur = wrapi(i);
    count.textContent = pad(cur + 1) + " / " + pad(N);
    roomGo(cur);
    clearTimeout(swapT);
    swapT = setTimeout(function () { show(k, byUser); }, 350);
  }

  function sync() {
    var run = !pinned && inView && !document.hidden && !hover && !focus;
    if (run) { if (!auto) auto = setInterval(function () { render(cur + 1, false); }, DWELL); return; }
    if (auto) { clearInterval(auto); auto = 0; }
  }

  /* an arrow pins the sequence for good — nothing releases it on a timer */
  function pin(i) { pinned = true; render(i, true); sync(); }
  prev.addEventListener("click", function () { pin(cur - 1); });
  nxt.addEventListener("click", function () { pin(cur + 1); });

  inner.addEventListener("pointerenter", function (e) {
    if (e.pointerType === "touch") return;
    hover = true; sync();
  });
  inner.addEventListener("pointerleave", function (e) {
    if (e.pointerType === "touch") return;
    hover = false; sync();
  });
  inner.addEventListener("focusin", function () { focus = true; sync(); });
  inner.addEventListener("focusout", function (e) {
    if (!inner.contains(e.relatedTarget)) { focus = false; sync(); }
  });
  document.addEventListener("visibilitychange", sync);

  /* the first line is simply there when the section is; its seat lights
     when the room is first seen */
  count.textContent = pad(1) + " / " + pad(N);
  show(0, false);
  roomInit(true);
  if ("IntersectionObserver" in window) {
    new IntersectionObserver(function (e) {
      var r = e[0].intersectionRatio;
      inView = r >= 0.25; sync();
      roomSeen(e[0].isIntersecting && r >= 0.05);
    }, { threshold: [0, 0.05, 0.25] }).observe(sec);
  } else { inView = true; sync(); roomSeen(true); }
})();

/* ===== 8. What it's like in the room: three chapters, one pin =====
   The page's one pinned section. The track is three viewports plus a tail;
   p runs 0 → 1 across it, idx is the live chapter and s runs 0 → 1 across
   that chapter's own viewport of scroll:
     0   – .15  the word arrives (--w)
     .15 – .30  its line arrives (--l)
     .30 – .85  held; the picture keeps pushing in (--dolly 1 → 1.06)
     .85 – 1    the chapter lifts away (--out), the house goes dark and the
                dot travels down the rail to the next stop
   The change of chapter happens in the dark: seek to the new cue, then the
   lights come up on it. The clip here is ALWAYS MUTED: the hero and the
   keynotes own the audio on this page and this section never claims it.
   Each chapter's cue loops between its in and out points while it is lit.
   Three modes, rebuilt whenever either media query flips: "pin", "phone"
   (no pin, three stacked blocks, a rail whose fill rises with the scroll
   and one lazy clip per block, played once) and "static" (reduced motion
   and Save-Data: the poster holds, every chapter open, no handlers). */
(function () {
  "use strict";
  var sec = document.querySelector(".spk-chap");
  if (!sec) return;
  var track    = document.getElementById("spkChapTrack");
  var stage    = document.getElementById("spkChapStage");
  var media    = sec.querySelector(".spk-chap__media");
  var vid      = sec.querySelector(".spk-chap__video");
  var poster   = sec.querySelector(".spk-chap__media img");
  var rail     = document.getElementById("spkChapRail");
  var dot      = document.getElementById("spkChapDot");
  var fill     = document.getElementById("spkChapFill");
  var tabs     = [].slice.call(sec.querySelectorAll(".spk-chap__tab"));
  var chapters = [].slice.call(sec.querySelectorAll(".spk-chap__chapter"));
  var frames   = [].slice.call(sec.querySelectorAll(".spk-chap__frame"));
  var live     = document.getElementById("spkChapLive");
  if (!track || !stage || !tabs.length || tabs.length !== chapters.length) return;

  var N = chapters.length;
  var rmq      = window.matchMedia("(prefers-reduced-motion: reduce)");
  var phone    = window.matchMedia("(max-width: 640px)");
  var small    = window.matchMedia("(max-width: 820px)");
  var saveData = !!(navigator.connection && navigator.connection.saveData);
  var hasIO    = "IntersectionObserver" in window;

  /* in and out points live on the buttons, so a re-cut is an edit in the
     markup and nowhere else */
  var cues = tabs.map(function (t) {
    return { a: parseFloat(t.getAttribute("data-cue-start")),
             b: parseFloat(t.getAttribute("data-cue-end")) };
  });

  function clamp(x) { return x < 0 ? 0 : (x > 1 ? 1 : x); }
  function smooth(x) { return x <= 0 ? 0 : (x >= 1 ? 1 : x * x * (3 - 2 * x)); }

  function say(msg) {
    if (!live) return;
    clearTimeout(sayT);
    live.textContent = "";
    sayT = setTimeout(function () { live.textContent = msg; }, 60);
  }
  function words(i) {
    var w = chapters[i].querySelector(".spk-chap__word");
    var l = chapters[i].querySelector(".spk-chap__text");
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

  /* every mode starts from, and leaves, a clean section */
  function clearState() {
    tabs.forEach(function (t) { t.classList.remove("is-on", "is-lit"); });
    chapters.forEach(function (c) {
      c.classList.remove("is-live", "is-lit");
      c.style.removeProperty("--w"); c.style.removeProperty("--l"); c.style.removeProperty("--out");
    });
    if (rail) rail.style.removeProperty("--dot");
    if (media) { media.classList.remove("is-dimming"); media.style.removeProperty("--dolly"); }
    stage.style.removeProperty("--px"); stage.style.removeProperty("--py");
    sec.style.removeProperty("--rail-top"); sec.style.removeProperty("--rail-h");
  }

  /* ---- the stage clip: src, cue, park ---- */
  var srcSet = false, watchRaf = 0, playing = -1;

  function ensureSrc() {
    if (!vid || srcSet) return;
    var s = small.matches
      ? (vid.getAttribute("data-src-mobile") || vid.getAttribute("data-src-1080"))
      : vid.getAttribute("data-src-1080");
    if (!s) return;
    vid.setAttribute("src", s);
    vid.load();
    srcSet = true;
  }

  /* the out point is watched on a frame callback, not on timeupdate, which
     fires about four times a second and would overshoot the cue; at the
     out point the cue loops back to its in point and keeps playing */
  function watch() {
    watchRaf = 0;
    if (playing < 0 || !vid) return;
    var c = cues[playing];
    if (c && vid.currentTime >= c.b) { try { vid.currentTime = c.a; } catch (err) {} }
    watchRaf = requestAnimationFrame(watch);
  }
  function park(i) {
    hold();
    if (vid && cues[i]) { try { vid.currentTime = cues[i].a; } catch (err) {} }
  }
  /* pause where it is: the dark tail resumes the same cue from here */
  function hold() {
    if (watchRaf) { cancelAnimationFrame(watchRaf); watchRaf = 0; }
    playing = -1;
    if (vid && !vid.paused) vid.pause();
  }
  function playCue(i) {
    if (!vid || !cues[i]) return;
    vid.muted = true;                    /* this section never has audio */
    playing = i;
    var p = vid.play();
    if (p && p.catch) p.catch(function () { park(i); });
    if (!watchRaf) watchRaf = requestAnimationFrame(watch);
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
    if (mode === "pin" && lit && !busy && videoGround && playing < 0) playCue(cur);
  }
  function sleep() {
    if (raf) { cancelAnimationFrame(raf); raf = 0; }
    hold();
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

  /* ---- static: the poster holds, every chapter open, no handlers ---- */
  function startStatic() {
    sec.classList.add("is-static");
    stripAria();
    if (poster) poster.classList.add("is-lit");
    chapters.forEach(function (c) { c.classList.add("is-live", "is-lit"); });
  }
  function stopStatic() {
    sec.classList.remove("is-static");
    restoreAria();
    if (poster) poster.classList.remove("is-lit");
    clearState();
  }

  /* ---- pinned ---- */
  var lastIdx = -1, cur = 0, lastS = 0;
  var lit = false, busy = false, videoGround = false, firstLit = false;
  var nearIO = null, firstIO = null, lightT = 0, seekT = 0, seekFn = null, sayT = 0;

  function groundDown() {
    lit = false;
    if (media) media.classList.add("is-dimming");
    if (poster) poster.classList.remove("is-lit");
    if (vid) vid.classList.remove("is-lit");
    hold();
  }
  function groundUp() {
    lit = true;
    if (media) media.classList.remove("is-dimming");
    if (media) media.style.setProperty("--dolly", (1 + 0.06 * lastS).toFixed(4));
    var el = videoGround ? vid : poster;
    if (el) el.classList.add("is-lit");
    if (videoGround && onScreen && !document.hidden) playCue(cur);
  }
  /* one wantLit per frame against the state it is in, so the class writes
     are idempotent: lit once the section has first arrived, dark in each
     chapter's tail, never touched while a change of chapter is under way */
  function syncLights() {
    if (busy || mode !== "pin") return;
    var want = firstLit && lastS < 0.85;
    if (want && !lit) groundUp();
    else if (!want && lit) groundDown();
  }

  /* lights down, seek in the dark, lights up */
  function lights(i) {
    if (!media) return;
    clearTimeout(lightT); clearTimeout(seekT);
    if (seekFn && vid) { vid.removeEventListener("seeked", seekFn); seekFn = null; }
    busy = true;
    groundDown();
    lightT = setTimeout(function () {
      lightT = 0;
      if (!videoGround) { busy = false; syncLights(); return; }
      var done = false;
      var up = function () {
        if (done) return;
        done = true;
        clearTimeout(seekT);
        vid.removeEventListener("seeked", up);
        seekFn = null;
        requestAnimationFrame(function () {
          if (mode !== "pin") return;
          busy = false;
          syncLights();
        });
      };
      seekFn = up;
      vid.addEventListener("seeked", up);
      seekT = setTimeout(up, 700);       /* never hold the house dark on a slow seek */
      try { vid.currentTime = cues[i].a; } catch (err) { up(); }
    }, 240);
  }

  function measure() {
    var r = track.getBoundingClientRect();
    var span = track.offsetHeight - window.innerHeight;
    var p = span > 0 ? clamp(-r.top / span) : 0;
    var idx = Math.min(N - 1, Math.floor(p * N));
    var s = clamp(p * N - idx);

    if (idx !== lastIdx) {
      var first = lastIdx === -1;
      chapters.forEach(function (c, n) {
        if (n === idx) { c.classList.add("is-live"); return; }
        c.classList.remove("is-live");
        c.style.removeProperty("--w"); c.style.removeProperty("--l"); c.style.removeProperty("--out");
      });
      tabs.forEach(function (t, n) {
        t.setAttribute("aria-selected", n === idx ? "true" : "false");
        t.tabIndex = n === idx ? 0 : -1;
        t.classList.toggle("is-on", n === idx);
      });
      lastIdx = idx; cur = idx;
      if (media) media.style.setProperty("--dolly", "1");   /* snaps back in the dark */
      if (!first) { say(words(idx)); lights(idx); }
    }
    lastS = s;

    var ch = chapters[idx];
    ch.style.setProperty("--w", clamp(s / 0.15).toFixed(3));
    ch.style.setProperty("--l", clamp((s - 0.15) / 0.15).toFixed(3));
    ch.style.setProperty("--out", (s < 0.85 ? 0 : (s - 0.85) / 0.15).toFixed(3));

    syncLights();
    if (lit && !busy && media) media.style.setProperty("--dolly", (1 + 0.06 * s).toFixed(4));

    /* the dot rests on its chapter's stop and travels in the tail */
    var d = idx < N - 1 ? idx + smooth((s - 0.85) / 0.15) : N - 1;
    if (rail) rail.style.setProperty("--dot", (N > 1 ? d / (N - 1) : 0).toFixed(4));
    tabs.forEach(function (t, n) { t.classList.toggle("is-lit", d >= n - 0.001); });

    /* the light belongs to the dot */
    if (dot) {
      var dr = dot.getBoundingClientRect(), sr = stage.getBoundingClientRect();
      stage.style.setProperty("--px", (dr.left + dr.width / 2 - sr.left).toFixed(1) + "px");
      stage.style.setProperty("--py", (dr.top + dr.height / 2 - sr.top).toFixed(1) + "px");
    }
  }

  /* The reel becomes the ground and parks on the live chapter's in point;
     until it has metadata the poster is the ground. */
  function onMeta() {
    if (mode !== "pin" || !vid) return;
    videoGround = true;
    if (poster) poster.classList.remove("is-on", "is-lit");
    vid.classList.add("is-on");
    if (busy) return;                    /* the change under way seeks and lights it */
    try { vid.currentTime = cues[cur].a; } catch (err) {}
    if (lit) {
      vid.classList.add("is-lit");
      if (onScreen && !document.hidden) playCue(cur);
    }
  }

  /* chapter words: a press scrolls to that chapter; arrows move focus */
  var clickFns = tabs.map(function (t, i) {
    return function () {
      var span = track.offsetHeight - window.innerHeight;
      var trackTop = track.getBoundingClientRect().top + window.pageYOffset;
      window.scrollTo({ top: trackTop + ((i + 0.4) / N) * span, behavior: "smooth" });
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
    lastIdx = -1; cur = 0; lastS = 0;
    lit = false; busy = false; videoGround = false; firstLit = false;
    tabs.forEach(function (t, i) {
      t.addEventListener("click", clickFns[i]);
      t.addEventListener("focus", focusFns[i]);
      t.addEventListener("keydown", keyFns[i]);
    });
    if (vid) {
      vid.addEventListener("loadedmetadata", onMeta);
      vid.addEventListener("ended", onEnded);
      if (srcSet) { if (vid.readyState >= 1) onMeta(); }
      else if (hasIO) {
        nearIO = new IntersectionObserver(function (e, obs) {
          if (!e[0].isIntersecting) return;
          obs.disconnect(); nearIO = null;
          ensureSrc();
        }, { rootMargin: "100% 0px" });
        nearIO.observe(sec);
      } else { ensureSrc(); }
    }
    if (hasIO) {
      firstIO = new IntersectionObserver(function (e, obs) {
        if (!e[0].isIntersecting) return;
        obs.disconnect(); firstIO = null;
        firstLit = true;
        syncLights();
      }, { threshold: 0.15 });
      firstIO.observe(sec);
    } else { firstLit = true; }
    measure();
    watchScreen();
  }
  function onEnded() { if (playing >= 0) park(playing); }
  function stopPin() {
    unwatchScreen();
    tabs.forEach(function (t, i) {
      t.removeEventListener("click", clickFns[i]);
      t.removeEventListener("focus", focusFns[i]);
      t.removeEventListener("keydown", keyFns[i]);
    });
    if (nearIO) { nearIO.disconnect(); nearIO = null; }
    if (firstIO) { firstIO.disconnect(); firstIO = null; }
    clearTimeout(lightT); clearTimeout(seekT); clearTimeout(sayT);
    lightT = seekT = sayT = 0;
    if (vid) {
      if (seekFn) { vid.removeEventListener("seeked", seekFn); seekFn = null; }
      vid.removeEventListener("loadedmetadata", onMeta);
      vid.removeEventListener("ended", onEnded);
      if (!vid.paused) vid.pause();
      vid.classList.remove("is-on", "is-lit");
    }
    if (poster) { poster.classList.add("is-on"); poster.classList.remove("is-lit"); }
    lit = false; busy = false; videoGround = false;
    restoreAria();
    clearState();
  }

  /* ---- phone: no pin, a rail whose fill rises with the 62% cursor ---- */
  var railTop = 0, railH = 0, phoneNear = null, phonePlay = null;
  var phoneVids = [], phoneWatch = [];
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

  function frameVideo(i) {
    if (phoneVids[i] || !frames[i]) return phoneVids[i];
    var src = vid ? (vid.getAttribute("data-src-mobile") || vid.getAttribute("data-src-1080")) : null;
    if (!src) return null;
    var v = document.createElement("video");
    v.setAttribute("playsinline", "");
    v.setAttribute("muted", "");
    v.muted = true;
    v.setAttribute("preload", "none");
    v.setAttribute("poster", "../assets/img/keynote-860.webp");
    v.setAttribute("src", src);
    frames[i].appendChild(v);
    phoneVids[i] = v;
    return v;
  }
  /* each block's cue plays once, muted, and parks back on its in point */
  function playOnce(i) {
    var v = frameVideo(i), c = cues[i];
    if (!v || !c) return;
    function parkIt() {
      if (phoneWatch[i]) { cancelAnimationFrame(phoneWatch[i]); phoneWatch[i] = 0; }
      if (!v.paused) v.pause();
      try { v.currentTime = c.a; } catch (err) {}
    }
    function tick() {
      phoneWatch[i] = 0;
      if (v.currentTime >= c.b) { parkIt(); return; }
      phoneWatch[i] = requestAnimationFrame(tick);
    }
    v.muted = true;                      /* this section never has audio */
    try { v.currentTime = c.a; } catch (err) {}
    var p = v.play();
    if (p && p.catch) p.catch(parkIt);
    phoneWatch[i] = requestAnimationFrame(tick);
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
          frameVideo(chapters.indexOf(e.target));
        });
      }, { rootMargin: "100% 0px" });
      phonePlay = new IntersectionObserver(function (es, obs) {
        es.forEach(function (e) {
          if (!e.isIntersecting) return;
          obs.unobserve(e.target);
          playOnce(chapters.indexOf(e.target));
        });
      }, { threshold: 0.55 });
      chapters.forEach(function (c) { phoneNear.observe(c); phonePlay.observe(c); });
    }
    phoneMeasure();
    watchScreen();
  }
  function stopPhone() {
    unwatchScreen();
    if (phoneNear) { phoneNear.disconnect(); phoneNear = null; }
    if (phonePlay) { phonePlay.disconnect(); phonePlay = null; }
    phoneWatch.forEach(function (h) { if (h) cancelAnimationFrame(h); });
    phoneWatch = [];
    phoneVids.forEach(function (v) {
      if (!v) return;
      v.pause();
      v.removeAttribute("src");
      v.load();
      if (v.parentNode) v.parentNode.removeChild(v);
    });
    phoneVids = [];
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
