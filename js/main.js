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
