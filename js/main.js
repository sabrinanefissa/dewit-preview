/* Dr. Stephen de Wit - homepage interactions. Progressive enhancement;
   all motion respects prefers-reduced-motion. */

/* Editor microcopy (content/site.json -> site.ui), rendered as a JSON
   script tag by the layout; each string here is the fallback if the tag
   is missing or a key was left out. */
var UI = (function () {
  var d = {};
  try {
    var el = document.getElementById("ui");
    if (el) d = JSON.parse(el.textContent) || {};
  } catch (e) { d = {}; }
  return d;
})();

(function () {
  "use strict";
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---- Loader ---- */
  var loader = document.getElementById("loader");
  var bar = document.getElementById("loaderBar");
  function dismissLoader() {
    if (!loader || loader.classList.contains("is-done")) return;
    if (bar) bar.style.width = "100%";
    setTimeout(function () {
      loader.classList.add("is-done");
      /* the page is uncovered: entrances that wait for it start from here */
      window.dwLoaded = true;
      document.dispatchEvent(new CustomEvent("dw:loaded"));
    }, reduce ? 0 : 260);
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

  /* ---- Stat odometer ----
     Each [data-count] keeps its plain figure in the markup (no script,
     reduced motion, and assistive tech read that). When the count-up is
     armed the figure moves into a visually hidden span and an aria-hidden
     odometer takes its place: one column of 0-9 per digit, the thousands
     separator and the suffix as plain text. When the figure enters, each
     column rolls to its digit over the section's data-duration (1500ms),
     ease-out, the rightmost first and each next column data-stagger
     (60ms) later. */
  function fmt(n) { return n >= 1000 ? n.toLocaleString("en-US") : String(n); }
  var stats = document.querySelectorAll("[data-count]");
  function hostNum(el, name, d) {
    var host = el.closest("[" + name + "]");
    var v = host ? parseFloat(host.getAttribute(name)) : NaN;
    return v >= 0 ? v : d;
  }
  function buildOdo(el) {
    var t = parseFloat(el.getAttribute("data-count")), suf = el.getAttribute("data-suffix") || "";
    var txt = fmt(t), html = "";
    for (var i = 0; i < txt.length; i++) {
      var ch = txt.charAt(i);
      if (ch >= "0" && ch <= "9") {
        var stack = "";
        for (var d = 0; d < 10; d++) stack += "<span>" + d + "</span>";
        /* the column is as wide as its own final digit (the sizer), so the
           figure keeps the plain text's spacing */
        html += '<span class="odo__col"><span class="odo__w">' + ch + '</span><span class="odo__d" data-digit="' + ch + '">' + stack + "</span></span>";
      } else {
        html += '<span class="odo__sep">' + ch + "</span>";
      }
    }
    if (suf) html += '<span class="odo__suf">' + suf.replace(/[&<>"]/g, "") + "</span>";
    var plain = document.createElement("span");
    plain.className = "odo__sr";
    plain.textContent = el.textContent;
    var odo = document.createElement("span");
    odo.className = "odo";
    odo.setAttribute("aria-hidden", "true");
    odo.innerHTML = html;
    el.textContent = "";
    el.appendChild(plain);
    el.appendChild(odo);
    el.classList.add("is-odo");
  }
  function runCount(el) {
    var dur = hostNum(el, "data-duration", 1500) || 1500;
    var stag = hostNum(el, "data-stagger", 60);
    var ds = [].slice.call(el.querySelectorAll(".odo__d"));
    void el.offsetWidth;   /* the columns start at 0 before they roll */
    ds.forEach(function (d, k) {
      var fromRight = ds.length - 1 - k;
      d.style.transition = "transform " + dur + "ms cubic-bezier(.22,1,.36,1) " + (fromRight * stag) + "ms";
      d.style.transform = "translateY(" + (-10 * parseInt(d.getAttribute("data-digit"), 10)) + "%)";
    });
  }
  /* The markup carries the final figures, so with no script (or before the
     section arrives) the numbers are true. The odometer replaces them only
     here, at 0, the moment it is armed, and only when it will actually run. */
  if (stats.length && "IntersectionObserver" in window && !reduce) {
    stats.forEach(buildOdo);
    var so = new IntersectionObserver(function (entries, obs) {
      entries.forEach(function (e) { if (e.isIntersecting) { runCount(e.target); obs.unobserve(e.target); } });
    }, { threshold: 0.6 });
    stats.forEach(function (s) { so.observe(s); });
  }   /* otherwise the markup's figures simply stand */

  /* ---- Parallax + scale on full-bleed media ----
     (a section's own data-parallax is a motion setting, read by its module) */
  var px = document.querySelectorAll("[data-parallax]:not(section)");
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
  var saveData = navigator.connection && navigator.connection.saveData;
  [].slice.call(document.querySelectorAll(".hero__video")).forEach(function (heroVideo) {
    if (reduce || saveData) return;
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
  });

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

/* ===== The through-line: "the wire" =====
   A pinned stage (.thread__track > .thread__stage, sticky). One line runs
   edge to edge (desktop: 62% down, a gentle S; phones: 84% down, straight)
   with a stop per station, evenly spaced from 12% to 88% across. The
   section registers ONE entry with the spine (window.spkSpine, module 0;
   its own rAF scroll loop when the page has no spine): p runs 0 → 1 over
   the pin, u = p * N, station i = floor(u), s = u - i, and each station's
   s is split in three:
     0   – .2  travel: the dot slides from stop i-1 to stop i and the drawn
                line follows it; the outgoing still slides 60px back along
                the wire and blurs out
     .2  – .4  arrive: the still clips in from the wire upward, the idx,
                kicker and label rise out of their masks, the gloss fades in
     .4  – 1   hold: the still pushes in (--dolly 1 → data-dolly)
   Only one station's still and words are on screen at a time. Everything
   is scrubbed as custom properties per frame (--a arrive, --d depart,
   --dolly); the one time-based touch is the gold bloom on the dot when it
   lands on a pillar (600ms). Stops and their labels are the tablist (a
   click scrolls to that station's s = .5); the dot can be dragged along
   the wire; on phones a tap on the picture moves on to the next station.
   Three modes, rebuilt when a media query flips: "pin", "phone" (< 768px)
   and "static" (reduced motion and Save-Data: the stations stack under the
   wire drawn full, no dot; html.no-js gets the same from the CSS). */
(function () {
  "use strict";
  [].slice.call(document.querySelectorAll("section.thread")).forEach(thread);

  function thread(sec) {
    var track    = sec.querySelector(".thread__track");
    var stage    = sec.querySelector(".thread__stage");
    var svg      = sec.querySelector(".thread__svg");
    var paths    = [].slice.call(sec.querySelectorAll(".thread__svg path"));
    var drawn    = sec.querySelector(".thread__svg .drawn");
    var glow     = sec.querySelector(".thread__svg .glow");
    var pulse    = sec.querySelector(".pulse");
    var grip     = sec.querySelector(".thread__grip");
    var tablist  = sec.querySelector(".thread__tabs");
    var tabs     = [].slice.call(sec.querySelectorAll(".thread__tab"));
    var stations = [].slice.call(sec.querySelectorAll(".station"));
    if (!track || !stage || !svg || !drawn || !tablist || !tabs.length || tabs.length !== stations.length) return;

    var N = stations.length;
    var DOLLY = parseFloat(sec.getAttribute("data-dolly")) || 1.04;
    var rmq = window.matchMedia("(prefers-reduced-motion: reduce)");
    var phone = window.matchMedia("(max-width: 767px)");
    var saveData = !!(navigator.connection && navigator.connection.saveData);
    var pillar = stations.map(function (s) { return s.classList.contains("is-pillar"); });
    var stills = stations.map(function (s) { return s.querySelector(".still"); });
    var bodies = stations.map(function (s) { return s.querySelector(".body"); });
    var labels = stations.map(function (s) { return s.querySelector(".label"); });

    function clamp(x) { return x < 0 ? 0 : (x > 1 ? 1 : x); }
    function smooth(x) { return x <= 0 ? 0 : (x >= 1 ? 1 : x * x * (3 - 2 * x)); }

    /* the authored wire (a straight line in a 1000 x 40 box): the static
       mode and no script draw it full */
    var AUTH_VB = svg.getAttribute("viewBox");
    var AUTH_D  = drawn.getAttribute("d");

    /* the tablist as authored, so the static mode can strip it and put it back */
    var TAB_ATTRS = ["role", "aria-selected", "aria-controls", "tabindex", "aria-label"];
    var PANEL_ATTRS = ["role", "aria-labelledby"];
    function snap(el, names) { var o = {}; names.forEach(function (n) { o[n] = el.getAttribute(n); }); return o; }
    function put(el, saved) { for (var n in saved) { if (saved[n] === null) el.removeAttribute(n); else el.setAttribute(n, saved[n]); } }
    var authored = {
      list: snap(tablist, TAB_ATTRS),
      tabs: tabs.map(function (t) { return snap(t, TAB_ATTRS); }),
      panels: stations.map(function (s) { return snap(s, PANEL_ATTRS); })
    };
    function stripAria() {
      TAB_ATTRS.forEach(function (n) { tablist.removeAttribute(n); });
      tabs.forEach(function (t) { TAB_ATTRS.forEach(function (n) { t.removeAttribute(n); }); });
      stations.forEach(function (s) { PANEL_ATTRS.forEach(function (n) { s.removeAttribute(n); }); });
    }
    function restoreAria() {
      put(tablist, authored.list);
      tabs.forEach(function (t, i) { put(t, authored.tabs[i]); });
      stations.forEach(function (s, i) { put(s, authored.panels[i]); });
    }

    /* ---- geometry: the wire, its stops, each still and its words ---- */
    var mode = null, W = 0, H = 0, len = 0, wireY = 0;
    var stopL = [], stopX = [], stopY = [];

    function lengthAtX(x) {
      var lo = 0, hi = len, mid;
      for (var i = 0; i < 24; i++) {
        mid = (lo + hi) / 2;
        if (drawn.getPointAtLength(mid).x < x) lo = mid; else hi = mid;
      }
      return (lo + hi) / 2;
    }

    var PROPS = ["--sx", "--sw", "--sh", "--bx", "--bw", "--fs", "--a", "--d", "--dolly"];
    function clearStation(k) {
      PROPS.forEach(function (n) { stations[k].style.removeProperty(n); });
      stations[k].classList.remove("is-on", "is-left");
      cache[k] = {};
    }

    function layout() {
      if (mode !== "pin" && mode !== "phone") return;
      W = stage.clientWidth; H = stage.clientHeight;
      if (!W || !H) return;
      var ph = mode === "phone";
      wireY = H * (ph ? 0.84 : 0.62);
      var A = ph ? 0 : Math.min(26, H * 0.028);          /* the S: gentle, flat at both edges */
      var d = "M 0 " + (wireY - A).toFixed(1) +
              " C " + (W * 0.5).toFixed(1) + " " + (wireY - A).toFixed(1) +
              " " + (W * 0.5).toFixed(1) + " " + (wireY + A).toFixed(1) +
              " " + W + " " + (wireY + A).toFixed(1);
      svg.setAttribute("viewBox", "0 0 " + W + " " + H);
      paths.forEach(function (p) { p.setAttribute("d", d); });
      len = drawn.getTotalLength();
      [drawn, glow].forEach(function (p) { if (p) p.style.strokeDasharray = len.toFixed(1) + " " + (len + 20).toFixed(1); });

      for (var k = 0; k < N; k++) {
        var x = W * (0.12 + (N > 1 ? 0.76 * k / (N - 1) : 0.38));
        var L = lengthAtX(x), pt = drawn.getPointAtLength(L);
        stopL[k] = L; stopX[k] = pt.x; stopY[k] = pt.y;
        tabs[k].style.setProperty("--x", pt.x.toFixed(1) + "px");
        tabs[k].style.setProperty("--y", pt.y.toFixed(1) + "px");
      }
      for (var j = 0; j < N; j++) { placeStation(j, ph); }
      for (var f = 0; f < N; f++) { fitLabel(f, ph); }
    }

    /* desktop: the still hangs from the wire (bottom at 58%), its left edge
       40px before its stop, kept 4vw inside the screen; its top clears the
       nav and the eyebrow (7.5rem), so on a short screen the card flattens
       from 5:4 rather than narrowing. The words sit right of it, or left
       when there is no room. */
    function placeStation(k, ph) {
      var st = stations[k];
      if (ph) {
        ["--sx", "--sw", "--sh", "--bx", "--bw"].forEach(function (n) { st.style.removeProperty(n); });
        st.classList.remove("is-left");
        return;
      }
      var m = W * 0.04, gap = Math.max(32, W * 0.03);
      var w = Math.min(W * (pillar[k] ? 0.44 : 0.34), pillar[k] ? 640 : 520);
      var h = Math.max(120, Math.min(w * 0.8, H * 0.58 - 120));
      var left = Math.max(m, Math.min(stopX[k] - 40, W - m - w));
      var rightRoom = W - m - (left + w + gap), leftRoom = left - gap - m;
      var onLeft = rightRoom < 340 && leftRoom > rightRoom;
      var bw = Math.min(onLeft ? leftRoom : rightRoom, 620);
      var bx = onLeft ? left - gap - bw : left + w + gap;
      st.style.setProperty("--sx", left.toFixed(1) + "px");
      st.style.setProperty("--sw", w.toFixed(1) + "px");
      st.style.setProperty("--sh", h.toFixed(1) + "px");
      st.style.setProperty("--bx", bx.toFixed(1) + "px");
      st.style.setProperty("--bw", bw.toFixed(1) + "px");
      st.classList.toggle("is-left", onLeft);
    }

    /* the label keeps its step (step-4, pillars step-5) unless its longest
       word would overflow its column, or (phones) it would run past two
       lines or into the wire; then it shrinks just enough */
    function fitLabel(k, ph) {
      var lab = labels[k], body = bodies[k];
      if (!lab) return;
      stations[k].style.removeProperty("--fs");
      var f = parseFloat(window.getComputedStyle(lab).fontSize) || 48, n = 0;
      function over() {
        if (lab.scrollWidth > lab.clientWidth + 1) return true;
        if (ph) {
          var r = lab.getBoundingClientRect(), sr = stage.getBoundingClientRect();
          return lab.offsetHeight > f * 2.4 || (r.bottom - sr.top) > wireY - 26;
        }
        return body.offsetHeight > H * 0.58 - 120;
      }
      while (over() && f > 18 && n++ < 30) {
        f = Math.floor(f * 0.94);
        stations[k].style.setProperty("--fs", f + "px");
      }
    }

    /* ---- the frame: p → one station on screen ---- */
    var cache = stations.map(function () { return {}; });
    function setP(k, name, v) {
      var s = v.toFixed(4);
      if (cache[k][name] === s) return;
      cache[k][name] = s;
      stations[k].style.setProperty(name, s);
    }
    var lastP = 0, cur = -1, lastLand = -1, bloomT = 0, lastDot = "";

    function update(p) {
      lastP = p;
      if ((mode !== "pin" && mode !== "phone") || !len) return;
      var u = clamp(p) * N;
      var i = Math.min(N - 1, Math.floor(u));
      var s = Math.min(1, u - i);
      var t = smooth(clamp(s / 0.2));                 /* travel */
      var a = smooth(clamp((s - 0.2) / 0.2));         /* arrive */
      var h = clamp((s - 0.4) / 0.6);                 /* hold */

      /* the dot, and the line drawn up to it */
      var from = i === 0 ? 0 : stopL[i - 1];
      var L = from + (stopL[i] - from) * t;
      var pt = drawn.getPointAtLength(L);
      var tf = "translate3d(" + pt.x.toFixed(1) + "px," + pt.y.toFixed(1) + "px,0)";
      if (tf !== lastDot) {
        lastDot = tf;
        if (pulse) pulse.style.transform = tf;
        if (grip) grip.style.transform = tf;
        var off = (len - L).toFixed(1);
        drawn.style.strokeDashoffset = off;
        if (glow) glow.style.strokeDashoffset = off;
      }

      /* the stations: i arriving or holding, i-1 leaving while the dot travels */
      for (var k = 0; k < N; k++) {
        var on = false;
        if (k === i) {
          on = true;
          setP(k, "--a", a); setP(k, "--d", 0); setP(k, "--dolly", 1 + (DOLLY - 1) * h);
        } else if (k === i - 1 && t < 1) {
          on = true;
          setP(k, "--a", 1); setP(k, "--d", t); setP(k, "--dolly", DOLLY);
        }
        if (stations[k].classList.contains("is-on") !== on) stations[k].classList.toggle("is-on", on);
      }

      if (i !== cur) {
        cur = i;
        tabs.forEach(function (tb, k) {
          tb.classList.toggle("is-on", k === i);
          tb.setAttribute("aria-selected", k === i ? "true" : "false");
          tb.setAttribute("tabindex", k === i ? "0" : "-1");
        });
      }
      for (var q = 0; q < N; q++) {
        var lit = q < i || (q === i && t >= 1);
        if (tabs[q].classList.contains("is-lit") !== lit) tabs[q].classList.toggle("is-lit", lit);
      }

      /* a pillar's landing: the dot blooms gold for 600ms */
      var land = t >= 1 ? i : -1;
      if (land !== lastLand) {
        lastLand = land;
        if (land >= 0 && pillar[land] && pulse) {
          clearTimeout(bloomT);
          pulse.classList.add("is-bloom");
          bloomT = setTimeout(function () { pulse.classList.remove("is-bloom"); }, 600);
        }
      }
    }

    /* ---- scroll positions ---- */
    function startY() { return track.getBoundingClientRect().top + window.scrollY; }
    function endY() { return startY() + track.offsetHeight - window.innerHeight; }
    function yAtU(u) { var s0 = startY(), e0 = endY(); return s0 + (e0 - s0) * clamp(u / N); }
    function yAt(k, s) { return yAtU(k + s); }
    function go(y, immediate) {
      y = Math.max(0, Math.round(y));
      if (window.spkLenis && window.spkLenis.scrollTo) window.spkLenis.scrollTo(y, { immediate: !!immediate });
      else window.scrollTo({ top: y, behavior: immediate ? "instant" : "smooth" });
    }

    /* x along the wire → u: through (0, 0), each stop at its station's
       s = .5, and (W, N) */
    function uAtX(x) {
      var xs = [0].concat(stopX, [W]), us = [0];
      for (var k = 0; k < N; k++) us.push(k + 0.5);
      us.push(N);
      if (x <= 0) return 0;
      for (var j = 1; j < xs.length; j++) {
        if (x <= xs[j]) return us[j - 1] + (us[j] - us[j - 1]) * (x - xs[j - 1]) / Math.max(1, xs[j] - xs[j - 1]);
      }
      return N;
    }

    /* ---- interaction ---- */
    tabs.forEach(function (tb, k) {
      tb.addEventListener("click", function () {
        if (mode === "static") {
          stations[k].scrollIntoView({ behavior: "auto", block: "start" });
          return;
        }
        go(yAt(k, 0.5), false);
      });
    });
    tablist.addEventListener("keydown", function (e) {
      if (mode === "static") return;
      var k = tabs.indexOf(document.activeElement);
      if (k < 0) return;
      var n = e.key === "ArrowRight" || e.key === "ArrowDown" ? k + 1 :
              e.key === "ArrowLeft" || e.key === "ArrowUp" ? k - 1 :
              e.key === "Home" ? 0 : e.key === "End" ? N - 1 : -2;
      if (n === -2) return;
      e.preventDefault();
      n = Math.max(0, Math.min(N - 1, n));
      tabs[n].focus();
      go(yAt(n, 0.5), false);
    });

    /* the dot can be dragged along the wire; on release it settles on the
       nearest station */
    var drag = null;
    if (grip) {
      grip.addEventListener("pointerdown", function (e) {
        if (mode === "static") return;
        e.preventDefault();
        drag = { id: e.pointerId, u: lastP * N };
        try { grip.setPointerCapture(e.pointerId); } catch (err) { /* old engines */ }
        sec.classList.add("is-dragging");
      });
      grip.addEventListener("pointermove", function (e) {
        if (!drag || e.pointerId !== drag.id) return;
        var x = e.clientX - stage.getBoundingClientRect().left;
        drag.u = uAtX(x);
        go(yAtU(drag.u), true);
      });
      var end = function (e) {
        if (!drag || e.pointerId !== drag.id) return;
        var k = Math.max(0, Math.min(N - 1, Math.round(drag.u - 0.5)));
        drag = null;
        sec.classList.remove("is-dragging");
        go(yAt(k, 0.5), false);
      };
      grip.addEventListener("pointerup", end);
      grip.addEventListener("pointercancel", end);
    }

    /* phones: a tap on the picture moves on to the next station */
    stage.addEventListener("click", function (e) {
      if (mode !== "phone" || cur < 0) return;
      var st = e.target.closest && e.target.closest(".still");
      if (!st || !stations[cur].contains(st)) return;
      if (cur < N - 1) go(yAt(cur + 1, 0.5), false);
      else go(endY() + 2, false);
    });

    /* ---- modes ---- */
    function reset() {
      for (var k = 0; k < N; k++) clearStation(k);
      tabs.forEach(function (tb) {
        tb.classList.remove("is-on", "is-lit");
        tb.style.removeProperty("--x"); tb.style.removeProperty("--y");
      });
      svg.setAttribute("viewBox", AUTH_VB);
      paths.forEach(function (p) {
        p.setAttribute("d", AUTH_D);
        p.style.removeProperty("stroke-dasharray"); p.style.removeProperty("stroke-dashoffset");
      });
      if (pulse) { pulse.style.transform = ""; pulse.classList.remove("is-bloom"); }
      if (grip) grip.style.transform = "";
      len = 0; cur = -1; lastLand = -1; lastDot = "";
    }

    function setMode() {
      var want = (rmq.matches || saveData) ? "static" : (phone.matches ? "phone" : "pin");
      if (want === mode) return false;
      if (mode === "static") restoreAria();
      reset();
      mode = want;
      sec.classList.toggle("is-static", want === "static");
      sec.classList.toggle("is-phone", want === "phone");
      sec.classList.toggle("is-pin", want === "pin");
      if (want === "static") stripAria();
      else { layout(); update(lastP); }
      if (window.spkSpine) window.spkSpine.measure();
      return true;
    }

    /* ---- the scroll: the spine (module 0) when the page has one ---- */
    var entry = { start: startY, end: endY, update: function (p) { update(p); } };
    function register() {
      if (window.spkSpine) { window.spkSpine.add(entry); return; }
      var raf = 0;
      var read = function () {
        raf = 0;
        var s0 = startY(), e0 = endY();
        update(e0 > s0 ? clamp((window.scrollY - s0) / (e0 - s0)) : 0);
      };
      window.addEventListener("scroll", function () { if (!raf) raf = requestAnimationFrame(read); }, { passive: true });
      read();
    }

    setMode();
    /* the spine is set up further down this file: register once it exists */
    setTimeout(register, 0);

    var rsT = 0;
    window.addEventListener("resize", function () {
      clearTimeout(rsT);
      rsT = setTimeout(function () {
        if (setMode()) return;
        layout(); update(lastP);
        if (window.spkSpine) window.spkSpine.measure();
      }, 60);
    }, { passive: true });
    [phone, rmq].forEach(function (q) {
      if (q.addEventListener) q.addEventListener("change", setMode);
      else if (q.addListener) q.addListener(setMode);
    });
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { layout(); update(lastP); });
    window.addEventListener("load", function () { layout(); update(lastP); });

    /* exposed for verification: the first instance */
    if (!window.__thread) window.__thread = {
      mode: function () { return mode; },
      current: function () { return cur; },
      yAt: yAt,
      stops: function () { return stopX.map(function (x, k) { return { x: x, y: stopY[k] }; }); },
      N: N
    };
  }
})();

/* ===== What happens when you book: sticky step list =====
   N steps (TOTAL, from the list), then a last stage in which the scene
   becomes the final call to action (.steps__final, whose id is its anchor:
   #contact today). Links to that anchor land on that stage; keyboard
   focus that enters it brings it on screen. One instance per track. */
(function () {
  "use strict";
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduce) return;
  [].slice.call(document.querySelectorAll(".steps__track[data-steps]")).forEach(steps);

  function steps(track) {
    var stills = track.querySelectorAll(".steps__still");
    var items = track.querySelectorAll(".steps__list li");
    var TOTAL = Math.min(stills.length, items.length);
    if (!TOTAL) return;

    var scene = track.closest(".steps");
    var fin = track.querySelector(".steps__final");
    var copy = track.querySelector(".steps__copy");
    var STAGES = TOTAL + (fin ? 1 : 0);
    var hash = fin && fin.id ? "#" + fin.id : "";

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
      /* every link to the final stage's anchor lands on it, fully shown */
      if (hash) document.addEventListener("click", function (e) {
        var a = e.target.closest && e.target.closest('a[href="' + hash + '"]');
        if (!a) return;
        e.preventDefault();
        goTo(1, false);
        if (history.pushState) history.pushState(null, "", hash);
      });
      /* keyboard: tabbing into the call to action brings stage 6 up; tabbing
         back into the step copy while stage 6 shows returns to step 05 */
      fin.addEventListener("focusin", function () { if (current !== TOTAL) goTo(1, true); });
      if (copy) copy.addEventListener("focusin", function () {
        if (current === TOTAL) goTo((TOTAL - 0.5) / STAGES, true);
      });
      if (hash && location.hash === hash) {
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
  }
})();

/* ===== Interactive moments ===== */
(function () {
  "use strict";
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* --- Same patterns: one rolling word, two cards that hide a photo ---
     The words roll on a 5s period (the section's data-period); the gold
     underline is the timer.
     An arrow steps to the previous or next word and pins it (the
     underline freezes full); a click on the word pins the word showing.
     A pin holds until the visitor selects the word again; nothing
     releases it on a timer. The
     roll holds while the pointer is
     on the stage (cards included), while keyboard focus is in the
     section, while the section is off screen and while the tab is hidden.
     Each card hides a still of Stephen: the pointer lights it through a
     soft mask; on touch a tap reveals it whole. Every word change makes
     both card borders bloom once. One instance per section.patterns. */
  [].slice.call(document.querySelectorAll("section.patterns")).forEach(function (pat) {
    var btn   = pat.querySelector(".patterns__word");
    var title = pat.querySelector(".patterns__title");
    var stage = pat.querySelector(".patterns__stage");
    var prev  = pat.querySelector(".patterns__arrow--prev");
    var nxt   = pat.querySelector(".patterns__arrow--next");
    var count = pat.querySelector(".patterns__count");
    var hint  = pat.querySelector("span.patterns__sr");
    var live  = pat.querySelector("[aria-live]");
    if (!btn || !stage || !prev || !nxt || !count) return;

    var spot   = pat.querySelector(".patterns__spot");
    var bar    = pat.querySelector(".ctx__bar");
    var slot   = btn.parentNode;           /* .ctx: the word's slot in the line */
    var glyphs = [].slice.call(btn.querySelectorAll(".patterns__glyphs"));
    var homeL  = [].slice.call(pat.querySelectorAll(".patterns__room--home .patterns__lines > span"));
    var workL  = [].slice.call(pat.querySelectorAll(".patterns__room--work .patterns__lines > span"));
    var cards  = [].slice.call(pat.querySelectorAll(".patterns__card"));
    var N = glyphs.length;
    if (!N) return;
    /* The stills: one per word and room, named on the word itself
       (data-home-img / data-work-img: a path without the width suffix; the
       page loads <base>-560.webp and <base>-1120.webp). */
    var PHOTOS = glyphs.map(function (g) {
      return { home: g.getAttribute("data-home-img"), work: g.getAttribute("data-work-img") };
    });

    /* ms between automatic word changes */
    var PERIOD = parseFloat(pat.getAttribute("data-period")) || 5000;
    var cur = 0, pinned = false, hover = false, focus = false;
    var inView = false, onScreen = false, auto = 0, outT = 0;

    /* the heading's two fixed halves, from the markup */
    var howEl = pat.querySelector(".patterns__how"), tailEl = pat.querySelector(".patterns__tail");
    var howT = howEl ? howEl.textContent.trim() : "", tailT = tailEl ? tailEl.textContent.trim() : "";
    function pad(n) { return (n < 10 ? "0" : "") + n; }
    function name(i) { return glyphs[i].textContent.replace(/\u00ad/g, ""); }
    function wrap(i) { return ((i % N) + N) % N; }

    /* --- card stills ----------------------------------------------
       One <img> per card and word, cross-faded. The current and
       next pattern load when the section is close; the rest decode once
       the section has been seen. */
    var near = false;
    /* Each card has two photo layers (dark, and the bright one the light
       reveals); both carry the same stills, so the files load once. */
    var stills = [];
    cards.forEach(function (card) {
      var room = card.classList.contains("patterns__room--work") ? "work" : "home";
      Array.prototype.forEach.call(card.querySelectorAll(".patterns__photo"), function (box) {
        stills.push(PHOTOS.map(function (p, k) {
          var img = document.createElement("img");
          img.alt = ""; img.decoding = "async";
          if (p[room]) img.setAttribute("data-base", p[room]);
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
        if (!b) return;
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
      if (title) title.setAttribute("aria-label", howT + " " + name(i) + " " + tailT);
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
        var msg = (hover || focus) ? "Rolling will resume." : (UI.rollingResumed || "Rolling resumed.");
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

    /* exposed for verification: the first instance */
    if (!window.__patterns) window.__patterns = {
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
  });

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
     behaviour is shown before anyone touches it. One per .bleed__canvas.
     Touch: a tap (or a finger held and dragged) pulls the nodes within reach
     into a cluster around the finger (they gather to about 34px from it and
     no closer) and the cluster follows the finger; after a tap it holds for
     2.5s, then the ghost takes over again and the nodes drift apart. */
  [].slice.call(document.querySelectorAll(".bleed__canvas")).forEach(function (canvas) {
    if (!canvas.getContext) return;
    var host = canvas.closest(".bleed");
    if (!host) return;
    var ctx = canvas.getContext("2d");
    canvas.style.pointerEvents = "none";
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var W = 0, H = 0, nodes = [], visible = true;
    var LINK = 160, LINK2 = LINK * LINK, REACH = 240, REACH2 = REACH * REACH, PUSH = 120, PUSH2 = PUSH * PUSH;
    /* real pointer target, drawn (trailing) position, and intensity 0.6 ghost .. 1 real */
    var real = { on: false, x: 0, y: 0 }, cur = { x: 0, y: 0 }, amp = 0.6;
    var clus = false, holdTo = 0, CL_REACH = 300, CL_REACH2 = CL_REACH * CL_REACH, CL_R = 34;
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
      var n = Math.max(26, Math.min(46, Math.round(W / 46)));
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
          if (clus) {
            /* touch: gather toward the finger, stopping at a ring of CL_R */
            if (e2 < CL_REACH2 && e2 > 1) {
              var ec = Math.sqrt(e2), f = ec > CL_R ? -Math.min(3, 0.06 * (ec - CL_R)) : 0.6;
              p.x += ex / ec * f; p.y += ey / ec * f;
            }
          } else if (e2 < PUSH2 && e2 > 1) { var e = Math.sqrt(e2); p.x += ex / e * 0.4; p.y += ey / e * 0.4; }
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
    var realSince = 0, letGo = null;
    function loop(t) {
      if (visible && !document.hidden) {
        /* a tap's cluster holds, then lets go */
        if (holdTo && t > holdTo) { holdTo = 0; if (letGo) letGo(); }
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
        /* a cluster lets go: its nodes drift back out, each on its own heading */
        if (clus) nodes.forEach(function (p) {
          var ex = p.x - real.x, ey = p.y - real.y, e = Math.sqrt(ex * ex + ey * ey);
          if (e < CL_R * 3 && e > 0.5) { var v = 0.18 + Math.random() * 0.22; p.vx = ex / e * v; p.vy = ey / e * v; }
        });
        clus = false; holdTo = 0;
        if (!real.on) return;
        real.on = false; leftAt = performance.now();
        /* the ghost resumes from where the pointer left */
        ghostT0 = leftAt + 1500;
        ghostPhase = 0;
        cur.x = real.x; cur.y = real.y;
      }
      letGo = release;
      host.addEventListener("pointerdown", function (e) { if (e.pointerType !== "mouse") { touch = true; holdTo = 0; clus = true; setReal(e); } }, { passive: true });
      host.addEventListener("pointermove", function (e) {
        if (e.pointerType === "mouse") setReal(e);
        else if (touch) setReal(e);
      }, { passive: true });
      /* the finger lifts: the cluster stays where it was for 2.5s */
      host.addEventListener("pointerup", function (e) { if (e.pointerType !== "mouse") { touch = false; holdTo = performance.now() + 2500; } }, { passive: true });
      host.addEventListener("pointercancel", function () { touch = false; release(); }, { passive: true });
      host.addEventListener("pointerleave", function (e) { if (e.pointerType === "mouse") release(); }, { passive: true });
      var resT; window.addEventListener("resize", function () { clearTimeout(resT); resT = setTimeout(size, 200); });
      if ("IntersectionObserver" in window) {
        new IntersectionObserver(function (e) { visible = e[0].isIntersecting; }, { threshold: 0.05 }).observe(host);
      }
      requestAnimationFrame(loop);
    }
  });
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
  /* ms between ignitions on a lane, and ms a logo stays lit (in 900, hold,
     out 1100): the band's data-tick / data-tick-sm and data-spell */
  function num(el, name, d) { var v = el ? parseFloat(el.getAttribute(name)) : NaN; return v > 0 ? v : d; }
  /* Small screens hold two or three logos in view at once, so the neighbour
     rule starves a narrow window: the candidate band opens to the inner 92%
     and the tick runs a little quicker. Desktop is unchanged. */
  var INNER = small ? 0.92 : 0.76;   /* candidates must sit inside this much of the viewport */
  var HISTORY = 3;                   /* never re-light one of the last 3 */
  var FADE  = 1100;                  /* ms a logo takes to fall back to rest */

  lanes.forEach(function (lane) {
    var band  = lane.closest("section");
    /* the lane's place inside its own band: odd lanes run half a tick late */
    var laneIndex = band ? [].indexOf.call(band.querySelectorAll("[data-cred-lane]"), lane) : 0;
    var TICK  = small ? num(band, "data-tick-sm", 2400) : num(band, "data-tick", 2600);
    var SPELL = num(band, "data-spell", 4200);
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
    var setW = 0, pos = 0, rafId = null, vpW = 0;
    /* the glow: --near 0..1 per logo, 1 at the lane's centre and 0 at
       data-reach (35%) of the lane's width either side; written only when
       it moves by more than 0.02. Reduced motion: every logo at 1 (the
       CSS fallback), since the strip is static. */
    var REACH = num(band, "data-reach", 0.35);

    function measure() {
      setW = imgs[originalCount].offsetLeft - imgs[0].offsetLeft;
      vpW = vp.clientWidth;
      for (var i = 0; i < imgs.length; i++) imgs[i]._cx = imgs[i].offsetLeft + imgs[i].offsetWidth / 2;
    }
    function glow() {
      var c = vpW / 2, reach = REACH * vpW;
      if (!(reach > 0)) return;
      for (var i = 0; i < imgs.length; i++) {
        var el = imgs[i];
        var n = 1 - Math.abs(pos + el._cx - c) / reach;
        n = n < 0 ? 0 : (n > 1 ? 1 : n);
        var last = el._near;
        if (last === undefined || Math.abs(n - last) > 0.02 || (n !== last && (n === 0 || n === 1))) {
          el._near = n;
          el.style.setProperty("--near", n.toFixed(3));
        }
      }
    }
    function frame() {
      pos -= speed;
      if (setW > 0) { if (pos <= -setW) pos += setW; else if (pos > 0) pos -= setW; }
      track.style.transform = "translate3d(" + pos.toFixed(2) + "px,0,0)";
      glow();
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
   no Lenis, and the ground holds the plum veil. The spine is page-level:
   one per page, whenever the page carries any section that uses it. */
(function () {
  "use strict";
  /* the home hero's push-in (module 10.A) rides the spine too */
  var page = document.querySelector(".spk-hero, .spk-said, .spk-keys, .spk-bio, .spk-formats, .hero[data-zoom]");
  if (!page) return;

  var root = document.documentElement;
  var still = window.matchMedia("(prefers-reduced-motion: reduce)").matches ||
              !!(navigator.connection && navigator.connection.saveData);

  var lenis = null;
  if (window.Lenis && !still) {
    /* touch too (syncTouch): the finger's scroll eases like the wheel's
       and keeps its inertia after the lift (Lenis 1.3.26: syncTouchLerp;
       the inertia's shape is touchInertiaExponent, left at its 1.7) */
    lenis = new Lenis({ lerp: 0.1, wheelMultiplier: 1, smoothWheel: true,
                               syncTouch: true, syncTouchLerp: 0.085,
                               autoRaf: false, anchors: true });
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
  /* only a page that has a ground paints one (a root custom property
     written per frame restyles the whole page, so a page without the
     ground element does not pay for it) */
  if (document.querySelector(".spk-ground")) add(ground);

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
   Spec: 05_Website/Design/SPEAKING-HERO-AUDIO-SPEC.md
   One instance per .spk-hero; the controls are found by data-ctrl. */
(function () {
  "use strict";
  [].slice.call(document.querySelectorAll(".spk-hero")).forEach(reel);

  function reel(hero) {
    function part(sel) { return hero.querySelector(sel); }
    function label(b, sel) { return b ? b.querySelector(sel) : null; }
    var video  = part(".spk-hero__video");
    var bPlay  = part('[data-ctrl="play"]');
    var bSound = part('[data-ctrl="sound"]');
    var bCC    = part('[data-ctrl="cc"]');
    var bBig   = part(".spk-hero__cta");
    var lPlay  = label(bPlay, ".spk-ctrl__label");
    var lSound = label(bSound, ".spk-ctrl__label");
    var lCC    = label(bCC, ".spk-ctrl__label");
    var lBig   = label(bBig, ".spk-hero__cta-label");
    var live   = part("[aria-live]");
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
      if (lPlay) lPlay.textContent = state === "replay" ? "Replay" : (state === "play" ? (UI.play || "Play") : (UI.pause || "Pause"));
    }
    function syncSound() {
      bSound.setAttribute("data-state", soundOn ? "mute" : "on");
      bSound.setAttribute("aria-pressed", soundOn ? "true" : "false");
      if (lSound) lSound.textContent = soundOn ? (UI.mute || "Mute") : (UI.soundOn || "Sound on");
    }
    function syncCC() {
      bCC.setAttribute("data-state", ccOn ? "cc" : "off");
      bCC.setAttribute("aria-pressed", ccOn ? "true" : "false");
      if (lCC) lCC.textContent = ccOn ? (UI.captionsOff || "Captions off") : (UI.captionsOn || "Captions on");
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
       clip, and a keynote clip claiming it stops the reel. The claim carries
       the claiming section (el), so a second instance of either stops too. */
    function claim() {
      document.dispatchEvent(new CustomEvent("spk:audio", { detail: { owner: "hero", el: hero } }));
    }
    document.addEventListener("spk:audio", function (e) {
      if (!e.detail || e.detail.el === hero) return;
      if (soundOn) { soundOn = false; video.muted = true; syncSound(); }
      if (!video.paused) video.pause();
      awayPaused = false;
      syncPlay();
    });

    /* The click is the gesture, so it is also the only moment an AudioContext
       may be opened. The voice line listens for this and opens its analyser
       synchronously, inside the same task. */
    function soundGesture() {
      document.dispatchEvent(new CustomEvent("spk:sound-on", { detail: { el: hero } }));
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
      if (ended) { ended = false; video.currentTime = 0; tryPlay(); say(UI.playing || "Playing"); }
      else if (video.paused) { tryPlay(); say(UI.playing || "Playing"); }
      else { video.pause(); say(UI.paused || "Paused"); }
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
  }
})();

/* ===== 2. Keynotes: N talks on a pinned stage, the scroll wipes between them ===
   One instance per .spk-keys. N = the panels in the markup (2-5); the
   phase lengths come from the section's data-head (90) and data-panel (80),
   so U = head + N * panel + 50 (380 for three talks) and the CSS track is
   U + 100svh (--panels, --head-svh, --panel-svh on the section).
   The section is a pinned stage (the track is 480svh, the stage sticky
   inside it for 380svh of scroll). It rises over the last 60svh of the
   candle wheel's held stage, so there is no grow any more: the ground is
   full-bleed from the start (--rise and --g are written once, at 1) and
   always up (--reveal 1); it rises UNDER the wheel's stage (z 3), whose
   velvet fades out over its first 60svh (--spk-keys-reveal on the wheel's
   section), so the talks show in the gap between the candles, which stay
   in front and scroll away. This module registers ONE entry
   with the spine and has no scroll listener of its own; update(p) turns p
   into svh of scroll (u = p * 380) and writes the phases as custom
   properties:
     0-60     the wheel's velvet fades out over the ground
              (--spk-keys-reveal on the wheel's section; --reveal stays 1)
     40-70    the wheel's candles fade out as they slide (--spk-keys-gone
              on the wheel's section)
     0-90     the heading alone (--head: in over 63-81, 70%-90% of the
              head, once the candles have faded; held to 90; out over
              the first 40svh of talk 01)
     90-170   talk 01
     170-250  talk 02 wipes in from the right (--wi over the first 40%)
     250-330  talk 03 wipes in from the right
     330-380  hold, while the room section rises over the stage
   (in general: talk k occupies head + k * panel ... head + (k + 1) * panel)
   A talk becomes the live one when its wipe is half done; only the live
   panel's ring is interactive. "Watch Stephen speak" plays that talk's
   segment of the reel WITH SOUND on the one shared <video>, full-bleed
   above the pictures; the video is seen only while a clip plays.
   Only one audio source is ever running: pressing a talk claims the audio
   through the document-level "spk:audio" event, which stops the hero reel,
   and the hero's own controls claim it back.
   Four modes, written to data-spk-keys-mode: "pin"; "reel" (phones: no
   pin, N + 1 full-screen cards snapping in the page's flow, dots for the
   index, the spine entry disabled; see the reel section below); "strip"
   (phones with reduced motion: the talks as a horizontal snap strip);
   "stacked" (reduced motion wider than a phone, or no spine: the talks one
   under another). No script: stacked. */
(function () {
  "use strict";
  [].slice.call(document.querySelectorAll(".spk-keys")).forEach(keys);

  function keys(sec) {
    var track    = sec.querySelector(".spk-keys__track");
    var stage    = sec.querySelector(".spk-keys__stage");
    var ground   = sec.querySelector(".spk-keys__ground");
    var box      = sec.querySelector(".spk-keys__panels");
    var head     = sec.querySelector(".spk-keys__head");
    var index    = sec.querySelector(".spk-keys__index");
    var vid      = sec.querySelector(".spk-keys__video");
    var tabs     = [].slice.call(sec.querySelectorAll(".spk-keys__tab"));
    var panels   = [].slice.call(sec.querySelectorAll(".spk-keys__panel"));
    var hears    = [].slice.call(sec.querySelectorAll(".spk-keys__hear"));
    var cap      = sec.querySelector(".spk-keys__cap");
    var playWrap = sec.querySelector(".spk-keys__play");
    var pauseBtn = sec.querySelector(".spk-keys__pause");
    var live     = sec.querySelector("[aria-live]");
    if (!track || !stage || !ground || !box || !head || !index ||
        !tabs.length || tabs.length !== panels.length) return;
    var N = panels.length;

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
      /* the block's own label (hearLabel), kept from the markup */
      if (l && !l.hasAttribute("data-label")) l.setAttribute("data-label", l.textContent);
      if (l) l.textContent = on ? "Pause" : l.getAttribute("data-label");
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
      sec.classList.remove("is-playing", "is-muted");
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
    function playClip(i, auto) {
      if (!vid || !segs[i]) return;
      sec.classList.remove("is-muted");
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
      if (p && p.catch) p.catch(function () {
        /* an automatic start the browser will not allow with sound (no
           click on the page yet): play muted, and the talk's own button
           becomes "Tap for sound" */
        if (!auto || playing !== i) { stopClip(false); return; }
        vid.muted = true;
        sec.classList.add("is-muted");
        var l = hears[i] && hears[i].querySelector(".spk-keys__hearlabel");
        if (l) l.textContent = UI.tapSound || "Tap for sound";
        var p2 = vid.play();
        if (p2 && p2.catch) p2.catch(function () { stopClip(false); });
      });
      if (!watchRaf) watchRaf = requestAnimationFrame(watch);
      var name = tabs[i] ? (tabs[i].querySelector(".spk-keys__name") || {}).textContent : "";
      say("Playing " + (name || "clip") + " with sound");
    }

    function claim() {
      document.dispatchEvent(new CustomEvent("spk:audio", { detail: { owner: "keys", el: sec } }));
    }
    document.addEventListener("spk:audio", function (e) {
      if (!e.detail || e.detail.el === sec) return;
      if (playing >= 0) stopClip(false);
    });

    hears.forEach(function (b, i) {
      b.addEventListener("click", function () {
        autoDone[i] = true;
        /* playing muted after an automatic start: this tap turns the sound on */
        if (playing === i && vid && vid.muted) {
          vid.muted = false; sec.classList.remove("is-muted"); syncHear(i);
          var pp = vid.play(); if (pp && pp.catch) pp.catch(function () {});
          return;
        }
        if (playing === i) { stopClip(false); say(UI.paused || "Paused"); return; }
        if (playing >= 0) stopClip(false);
        playClip(i);
      });
    });

    /* The pause ring stops the clip and hands focus back to the talk's own
       button, so a keyboard user is not left on a control that is going away. */
    if (pauseBtn) {
      pauseBtn.addEventListener("click", function () {
        var i = playing;
        stopClip(false); say(UI.paused || "Paused");
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
        /* the reel's stage is N + 1 screens tall: its cards watch instead */
        if (mode !== "reel" && e[0].intersectionRatio < 0.25 && playing >= 0) stopClip(false);
      }, { threshold: [0, 0.25, 1] }).observe(stage);
    }
    document.addEventListener("visibilitychange", function () {
      if (document.hidden && playing >= 0) stopClip(false);
    });
    if (vid) {
      vid.addEventListener("ended", function () { if (playing >= 0) stopClip(true); });
      vid.addEventListener("pause", function () { if (playing >= 0) syncHear(playing); });
    }

    /* ---- the automatic start ----
       When a talk has settled on screen (its caption fully in, --cap >= .95,
       and it is the live one), a thin lilac ring draws around its play
       button over AUTO ms (4s); when it closes, the talk plays. Leaving the
       talk, or playing anything, resets the ring. A talk that was played,
       paused or finished does not start again until the visitor has left
       it and come back. Never under reduced motion. The ring is added by
       the script (an SVG in each play ring), so no-script pages have none. */
    var AUTO = 4000, autoK = -1, autoT0 = 0, autoRaf = 0, autoOn = false;
    var autoDone = panels.map(function () { return false; });
    var loads = hears.map(function (b) {
      var ring = b.querySelector(".play__ring");
      if (!ring) return null;
      var sv = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      sv.setAttribute("class", "spk-keys__load"); sv.setAttribute("viewBox", "0 0 64 64"); sv.setAttribute("aria-hidden", "true");
      var c = document.createElementNS("http://www.w3.org/2000/svg", "circle");
      c.setAttribute("cx", "32"); c.setAttribute("cy", "32"); c.setAttribute("r", "31"); c.setAttribute("pathLength", "1");
      sv.appendChild(c); ring.appendChild(sv);
      return b;
    });
    function setLoad(k, v) { if (loads[k]) loads[k].style.setProperty("--load", v.toFixed(4)); }
    function candidate() {
      if (playing >= 0 || document.hidden || !onStageAuto) return -1;
      var k = cur, pnl = panels[k];
      if (!pnl || autoDone[k]) return -1;
      return parseFloat(pnl.style.getPropertyValue("--cap")) >= 0.95 ? k : -1;
    }
    function autoTick(now) {
      autoRaf = 0;
      if (!autoOn) return;
      var k = candidate();
      if (k !== autoK) {
        if (autoK >= 0) setLoad(autoK, 0);
        /* a talk left: it may start again when the visitor comes back */
        panels.forEach(function (p, i) { if (i !== k && i !== playing) autoDone[i] = false; });
        autoK = k; autoT0 = now;
      }
      if (k >= 0) {
        var v = Math.min(1, (now - autoT0) / AUTO);
        setLoad(k, v);
        if (v >= 1) { setLoad(k, 0); autoDone[k] = true; autoK = -1; playClip(k, true); }
      }
      autoRaf = requestAnimationFrame(autoTick);
    }
    var onStageAuto = false;
    if (!reduce && "IntersectionObserver" in window) {
      autoOn = true;
      new IntersectionObserver(function (e) {
        onStageAuto = e[0].isIntersecting;
        if (onStageAuto && !autoRaf) autoRaf = requestAnimationFrame(autoTick);
        if (!onStageAuto && autoRaf) { cancelAnimationFrame(autoRaf); autoRaf = 0; if (autoK >= 0) setLoad(autoK, 0); autoK = -1; }
      }, { threshold: 0 }).observe(stage);
    }

    /* Reduced motion: no pin, no grow, no wipe. All the talks are present
       one under another, and the index stops being a tablist. The one thing
       that still works on a click is "Watch Stephen speak". Without the
       spine there is nothing to drive the stage, so it stacks too. */
    var mode = "";
    function goStacked() {
      mode = "stacked";
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
    }
    /* reduced motion on a phone keeps the strip (no pin, the swipe is the
       visitor's own); wider, or with no spine, the talks stack */
    if (!window.spkSpine || (reduce && !strip.matches)) { goStacked(); return; }

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
    function num(name, d) { var v = parseFloat(sec.getAttribute(name)); return v > 0 ? v : d; }
    var HEAD  = num("data-head", 240);            /* svh: the stage picture and the heading alone */
    var PANEL = num("data-panel", 80);            /* svh: one talk */
    var U = HEAD + N * PANEL + 50;                /* svh of scroll across the pin (380 for three) */
    /* the candle wheel this stage rises over: the section right before it */
    var said = sec.previousElementSibling;
    if (said && !said.classList.contains("spk-said")) said = null;
    function span() { return Math.max(0, track.offsetHeight - window.innerHeight); }
    var last = {};
    function put(el, key, name, v) {
      var s = v.toFixed(4);
      if (last[key] === s) return;
      last[key] = s;
      el.style.setProperty(name, s);
    }
    var wi = new Array(N + 1);
    function update(p) {
      if (entry.disabled) return;
      var u = p * U, k;
      /* the heading waits until the wheel's candles have faded (u 40-70),
         then rises over 70%-90% of the head (63-81 for a 90svh head) and
         holds to its end; it leaves over the first half of talk 01 */
      /* for a 240svh head: the wheel's velvet fades up into the stage
         picture over 0-173, slowly at first (eased, then squared: the
         picture shows through from about 60), the candles over 19-79; the
         heading rises over 149-178, holds, and is gone over 216-240, before talk 01's
         picture comes in at HEAD: the heading is only ever on this picture */
      var hd = smooth(clamp((u - 0.62 * HEAD) / (0.12 * HEAD))) * (1 - smooth(clamp((u - 0.9 * HEAD) / (0.1 * HEAD))));
      var on = u >= HEAD;
      /* talk k (k >= 1) wipes in over the first 40% of its own phase */
      wi[0] = 1; wi[N] = 0;
      for (k = 1; k < N; k++) wi[k] = clamp(clamp((u - HEAD - k * PANEL) / PANEL) / 0.4);
      var wheel = !!said && said.classList.contains("is-wheel");
      var rv = wheel ? Math.pow(smooth(clamp(u / (0.72 * HEAD))), 1.8) : 1;
      /* the ground is always up: the wheel stays in front (z 3) and its
         velvet fades out over it instead */
      put(ground, "reveal", "--reveal", 1);
      /* the wheel's velvet, veil and window lines leave with the hand-off
         (module 7's CSS reads it, on the wheel's own section) */
      /* ...and then its candles fade out as they slide (u 40-70) */
      if (wheel) {
        put(said, "rootReveal", "--spk-keys-reveal", rv);
        put(said, "rootGone", "--spk-keys-gone", smooth(clamp((u - 0.08 * HEAD) / (0.25 * HEAD))));
      } else if (last.rootReveal) {
        if (said) { said.style.removeProperty("--spk-keys-reveal"); said.style.removeProperty("--spk-keys-gone"); }
        last.rootReveal = ""; last.rootGone = "";
      }
      put(head, "head", "--head", hd);
      box.classList.toggle("is-on", on);
      index.classList.toggle("is-on", on);
      /* the previous talk's caption fades as the next one wipes in */
      put(panels[0], "c0", "--cap", Math.min(on ? 1 - hd : 0, 1 - clamp(wi[1] / 0.3)));
      for (k = 1; k < N; k++) {
        put(panels[k], "w" + k, "--wi", wi[k]);
        put(panels[k], "c" + k, "--cap", Math.min(clamp((wi[k] - 0.7) / 0.3), 1 - clamp(wi[k + 1] / 0.3)));
      }
      /* a talk becomes the live one 20% into its phase (its wipe half done) */
      var c = 0;
      for (k = 1; k < N; k++) if (u >= HEAD + k * PANEL + 0.2 * PANEL) c = k;
      setCur(c);
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
      if (mode === "reel") { reelTo(i + 1); return; }
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
      var y = sec.offsetTop + ((HEAD + PANEL * i + 0.5 * PANEL) / U) * span();
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

    /* ---- the reel (phones): N + 1 full-height cards in the page's flow ----
       Card 0 is the rest picture with the heading (the scroll-fill, module
       12); cards 1..N are the talks, each caption centred as on the pin.
       A card is "arrived" when 60% of it is on screen (an
       IntersectionObserver): its caption rises in (--cap 0 → 1 over
       --cap-ms, 360) and the one before fades. The document snaps to the
       cards only while the viewport's top is between the first card's top
       and the last card's (html.spk-snap, from an IntersectionObserver),
       so the rest of the page scrolls freely. The index row is hidden; a column of dots (1 + N)
       at the bottom right takes its place, the N talk dots being the
       tablist (the index's ids and ARIA move onto them, and back). */
    var railTabs = tabs, dotWrap = null, dotHead = null, dotTabs = [];
    var cardIO = null, coverIO = null, cards = [], active = -1, covering = false;
    var CAP_MS = num("data-cap-ms", 360);
    var capV = panels.map(function () { return 0; }), capTo = capV.slice(), capRaf = 0, capT0 = 0, capFrom = capV.slice();
    var TAB_A = ["role", "aria-selected", "aria-controls", "tabindex"];
    var tabSaved = railTabs.map(function (t) {
      var o = {}; TAB_A.forEach(function (n) { o[n] = t.getAttribute(n); }); return o;
    });
    var indexRole = index.getAttribute("role");

    function capTick(now) {
      var k = Math.min(1, (now - capT0) / CAP_MS), e = 1 - Math.pow(1 - k, 3), more = false;
      panels.forEach(function (p, i) {
        var v = capFrom[i] + (capTo[i] - capFrom[i]) * e;
        capV[i] = v;
        p.style.setProperty("--cap", v.toFixed(3));
      });
      if (k < 1) more = true;
      capRaf = more ? requestAnimationFrame(capTick) : 0;
    }
    function capsTo(i) {
      panels.forEach(function (p, k) { capFrom[k] = capV[k]; capTo[k] = (k === i ? 1 : 0); });
      capT0 = performance.now();
      if (!capRaf) capRaf = requestAnimationFrame(capTick);
    }
    function arrive(c) {
      if (c === active) return;
      active = c;
      capsTo(c - 1);
      if (c >= 1) setCur(c - 1);
      if (dotHead) dotHead.classList.toggle("is-cur", c === 0);
      dotTabs.forEach(function (d, k) { d.classList.toggle("is-cur", k === c - 1); });
    }
    function reelTo(c) {
      var el = cards[c];
      if (!el) return;
      var y = el.getBoundingClientRect().top + window.pageYOffset;
      /* native smooth scroll: it lands on a snap point (Lenis's own tween
         would fight the snap) */
      window.scrollTo({ top: y, behavior: "smooth" });
    }
    /* the dots show while the section fills the screen */
    function setCover(on) {
      if (on === covering) return;
      covering = on;
      if (dotWrap) dotWrap.classList.toggle("is-in", on);
    }
    /* The snap: on only while the viewport's top edge lies between the top
       of card 0 and the top of the last card (an IntersectionObserver whose
       root is a 1px line at that edge, over cards 0..N-1), so a thumb that pulls past the
       last card, or stops short of the first, is never pulled back. */
    var zoneIO = null, inZone = [];
    function setSnap(on) { document.documentElement.classList.toggle("spk-snap", on); }
    /* a link that jumps (an in-page anchor, Lenis's anchors) must not be
       pulled back to a card: the snap lets go first, and comes back only
       if the jump lands inside the reel */
    function onLinkDown(e) {
      var a = e.target && e.target.closest ? e.target.closest("a[href*='#']") : null;
      if (a) setSnap(false);
    }
    function watchZone() {
      if (zoneIO) zoneIO.disconnect();
      inZone = [];
      zoneIO = new IntersectionObserver(function (es) {
        es.forEach(function (e) {
          var k = inZone.indexOf(e.target);
          /* an edge touch does not count: resting on the last card, the
             one before it only touches the line, and the snap is off */
          var on = e.isIntersecting && e.boundingClientRect.bottom > 1;
          if (on && k < 0) inZone.push(e.target);
          else if (!on && k > -1) inZone.splice(k, 1);
        });
        setSnap(inZone.length > 0);
      }, { rootMargin: "0px 0px -" + Math.max(0, window.innerHeight - 1) + "px 0px",     /* a 1px line */
           threshold: [0, 0.5 / Math.max(1, window.innerHeight)] });     /* ...and a call as a card leaves it */
      cards.slice(0, -1).forEach(function (c) { if (c) zoneIO.observe(c); });
    }
    function watchCover() {
      if (coverIO) coverIO.disconnect();
      /* covering = the section's visible part is the whole viewport: its
         ratio reaches innerHeight / its height */
      var t = Math.min(1, Math.max(0, (window.innerHeight - 2) / Math.max(1, sec.offsetHeight)));
      coverIO = new IntersectionObserver(function (es) {
        var e = es[es.length - 1];
        var rb = e.rootBounds ? e.rootBounds.height : window.innerHeight;
        setCover(e.isIntersecting && e.intersectionRect.height >= rb - 2);
      }, { threshold: [0, t * 0.98, t] });
      coverIO.observe(sec);
    }
    var coverRT = 0;
    function onReelResize() { clearTimeout(coverRT); coverRT = setTimeout(function () { if (mode === "reel") { watchCover(); watchZone(); } }, 120); }

    function startReel() {
      sec.classList.add("is-reel");
      sec.style.setProperty("--cap-ms", CAP_MS + "ms");
      index.hidden = true;
      index.removeAttribute("role");
      dotWrap = document.createElement("div");
      dotWrap.className = "spk-keys__dots";
      dotHead = document.createElement("button");
      dotHead.type = "button";
      dotHead.className = "spk-keys__dot spk-keys__dot--head";
      var hh = head.querySelector("h2");
      dotHead.setAttribute("aria-label", hh ? (hh.getAttribute("aria-label") || hh.textContent.trim()) : "1");
      dotHead.addEventListener("click", function () { reelTo(0); });
      dotWrap.appendChild(dotHead);
      var tl = document.createElement("div");
      tl.className = "spk-keys__dotlist";
      tl.setAttribute("role", "tablist");
      if (index.getAttribute("aria-label")) tl.setAttribute("aria-label", index.getAttribute("aria-label"));
      dotTabs = railTabs.map(function (t, i) {
        var b = document.createElement("button");
        b.type = "button";
        b.className = "spk-keys__dot";
        if (t.getAttribute("data-accent")) b.setAttribute("data-accent", t.getAttribute("data-accent"));
        if (t.id) { b.id = t.id; t.removeAttribute("id"); }
        TAB_A.forEach(function (n) { if (tabSaved[i][n] !== null) b.setAttribute(n, t.getAttribute(n) || tabSaved[i][n]); t.removeAttribute(n); });
        var nm = t.querySelector(".spk-keys__name");
        b.setAttribute("aria-label", (nm ? nm.textContent : t.textContent).replace(/\s+/g, " ").trim());
        b.addEventListener("click", function () { go(i); });
        b.addEventListener("focus", function () { dotTabs.forEach(function (o) { o.tabIndex = (o === b ? 0 : -1); }); });
        b.addEventListener("keydown", function (e) {
          var k = e.key, n = -1, L = dotTabs.length;
          if (k === "ArrowDown" || k === "ArrowRight") n = (i + 1) % L;
          else if (k === "ArrowUp" || k === "ArrowLeft") n = (i - 1 + L) % L;
          else if (k === "Home") n = 0;
          else if (k === "End") n = L - 1;
          else return;
          e.preventDefault();
          dotTabs[n].focus();
        });
        tl.appendChild(b);
        return b;
      });
      dotWrap.appendChild(tl);
      stage.appendChild(dotWrap);
      tabs = dotTabs;

      var rest = ground.querySelector(".spk-keys__rest");
      cards = [rest].concat(panels);
      active = -1;
      panels.forEach(function (p, k) { capV[k] = 0; p.style.setProperty("--cap", "0"); });
      cardIO = new IntersectionObserver(function (es) {
        es.forEach(function (e) {
          var c = cards.indexOf(e.target);
          if (c < 0) return;
          if (e.intersectionRatio >= 0.6) arrive(c);
          /* a playing talk stops once its card is mostly gone */
          if (c >= 1 && playing === c - 1 && e.intersectionRatio < 0.25) stopClip(false);
        });
      }, { threshold: [0, 0.25, 0.6, 1] });
      cards.forEach(function (c) { if (c) cardIO.observe(c); });
      watchCover();
      watchZone();
      document.addEventListener("click", onLinkDown, true);
      window.addEventListener("resize", onReelResize, { passive: true });
    }
    function stopReel() {
      if (cardIO) { cardIO.disconnect(); cardIO = null; }
      if (coverIO) { coverIO.disconnect(); coverIO = null; }
      if (zoneIO) { zoneIO.disconnect(); zoneIO = null; }
      document.removeEventListener("click", onLinkDown, true);
      setSnap(false);
      window.removeEventListener("resize", onReelResize);
      if (capRaf) { cancelAnimationFrame(capRaf); capRaf = 0; }
      setCover(false);
      dotTabs.forEach(function (b, i) {
        var t = railTabs[i];
        if (b.id) { t.id = b.id; }
        TAB_A.forEach(function (n) { var v = b.getAttribute(n); if (v !== null) t.setAttribute(n, v); });
      });
      if (dotWrap && dotWrap.parentNode) dotWrap.parentNode.removeChild(dotWrap);
      dotWrap = dotHead = null; dotTabs = [];
      tabs = railTabs;
      if (indexRole) index.setAttribute("role", indexRole);
      index.hidden = false;
      sec.classList.remove("is-reel");
      sec.style.removeProperty("--cap-ms");
      panels.forEach(function (p) { p.style.removeProperty("--cap"); });
      active = -1;
    }

    /* ---- modes: the spine has no remove, so leaving the pin disables
       the entry through its flag ---- */
    var added = false;
    function setMode() {
      if (mode === "stacked") return;
      if (reduce && !strip.matches) { if (mode === "reel") stopReel(); goStacked(); return; }
      var m = strip.matches ? (reduce ? "strip" : "reel") : "pin";
      if (m === mode) return;
      if (mode === "reel") stopReel();
      mode = m;
      sec.setAttribute("data-spk-keys-mode", m);
      if (playing >= 0) stopClip(false);
      entry.disabled = (m !== "pin");
      if (m !== "pin") {
        ground.style.removeProperty("--reveal");
        if (said) { said.style.removeProperty("--spk-keys-reveal"); said.style.removeProperty("--spk-keys-gone"); }
      }
      if (m === "pin") {
        last = {};
        /* no grow: the ground is full-bleed from the start (written once) */
        put(ground, "rise", "--rise", 1);
        put(ground, "g", "--g", 1);
        if (!added) { window.spkSpine.add(entry); added = true; }
        else window.spkSpine.measure();          /* re-reads start/end and repaints */
      }
      if (m === "reel") startReel();
      syncPanels();
    }
    setMode();
    if (strip.addEventListener) strip.addEventListener("change", setMode);
    else if (strip.addListener) strip.addListener(setMode);
  }
})();

/* ===== 3. What the room walks out with: five words, five lights, once =====
   No pin. When 40% of the section is in view the five words arrive 380ms
   apart, each rising out of blur with a pool of light behind it; when the
   fifth has landed (380ms × 4 + the 600ms rise) the house lights come up
   on the still. Fires once and never replays. Reduced motion, or no
   IntersectionObserver: everything shown at once, lit. One instance per
   .spk-out; the words come from the markup, STEP and RISE from the
   section's data-step / data-rise (ms). */
(function () {
  "use strict";
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  [].slice.call(document.querySelectorAll(".spk-out")).forEach(out);

  function out(sec) {
    var words = [].slice.call(sec.querySelectorAll(".spk-out__word"));
    var still = sec.querySelector(".spk-out__media .spk-lights");
    if (!words.length) return;

    var STEP = parseFloat(sec.getAttribute("data-step")) || 380;
    var RISE = parseFloat(sec.getAttribute("data-rise")) || 600;

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
  }
})();

/* ===== 4. The voice line: the reel's own audio, drawn as one open line =====
   A compact canvas sitting directly on top of the control row. It is only
   ever visible while sound is actually playing: muted, paused or finished, it
   is at opacity 0, so there is no idle line in the middle of the hero. The
   click that turns sound on is the gesture that opens an AudioContext and an
   AnalyserNode on the video element, and the line breathes with the real
   audio. If the browser will not give us an analyser, a synth fallback
   tracks playback loosely. Reduced motion and Save-Data get one static
   render and no loop at all — still only while sound is on. One instance
   per .spk-voice, listening to its own hero's reel. */
(function () {
  "use strict";
  [].slice.call(document.querySelectorAll(".spk-voice")).forEach(voice);

  function voice(cv) {
    var hero  = cv.closest(".spk-hero");
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
    document.addEventListener("spk:sound-on", function (e) {
      if (!video) return;
      if (e.detail && e.detail.el && e.detail.el !== hero) return;   /* another hero's reel */
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
    if (location.search.indexOf("spkdebug") > -1 && !window.__spkVoice) {
      window.__spkVoice = { get ready() { return ready; }, get energy() { return base; },
        get peak() { var m = 0, i; if (!vals) return 0; for (i = 0; i < N; i++) m = Math.max(m, vals[i]); return m; } };
    }
  }
})();

/* ===== 5. The room: rows of seats as dots, behind the formats sentence =====
   Nine rows seen from the stage, compressing and dimming toward the back,
   each row bowed away at its centre. A pointer leans the nearest seats
   toward it; with no pointer a slow wave travels front to back every 7–11 s
   and the loop sleeps between waves. After the rows are drawn, a feathered
   destination-out ellipse clears the dot layer around the measured sentence,
   so the type keeps clean ground with no scrim and no text-shadow.
   One instance per canvas.spk-room inside a .spk-formats section (the
   current markup carries none, so this stays inert). */
(function () {
  "use strict";
  [].slice.call(document.querySelectorAll(".spk-formats canvas.spk-room")).forEach(room);

  function room(cv) {
    var sec = cv.parentNode;
    var formats = cv.closest(".spk-formats");
    var line = sec && sec.querySelector(".spk-formats__line");
    var ctx = cv.getContext && cv.getContext("2d");
    if (!ctx || !sec) return;

    /* The six rooms. Each label is pinned to ONE seat in the dot array by row
       and seat fraction, so it can never drift off the array, and it lights
       when the pointer leans that part of the room toward it — the same lerp
       the dots themselves use, read at the label's own seat. Where there are
       not enough rows to place six labels without collisions (under 768) they
       fall back to a centred list and the wave lights them in turn instead. */
    var rooms  = formats.querySelector(".spk-formats__strip");
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
  }
})();

/* ===== 6. Bio: the portrait's lights (one instance per .spk-bio) ===== */
(function () {
  "use strict";
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  [].slice.call(document.querySelectorAll(".spk-bio")).forEach(bioInstance);

  function bioInstance(bio) {

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

    /* --- the drift: the portrait eases 4% upward (the section's data-drift)
       as the right column scrolls past it, scrubbed by the spine; sticky
       positioning does the rest. Desktop only, and never under reduced
       motion. --- */
    var driftEl = bio.querySelector(".spk-bio__portrait");
    var DRIFT = parseFloat(bio.getAttribute("data-drift"));
    if (isNaN(DRIFT)) DRIFT = 0.04;
    if (driftEl && window.spkSpine && !reduce &&
        window.matchMedia("(min-width: 901px)").matches) {
      window.spkSpine.add({
        start: function () { return bio.offsetTop - window.innerHeight; },
        end: function () { return bio.offsetTop + bio.offsetHeight; },
        update: function (p) {
          driftEl.style.setProperty("--spk-bio-drift",
            (-DRIFT * driftEl.offsetHeight * p).toFixed(1) + "px");
        }
      });
    }
  }
})();

/* ===== 7. A. What he talks about: the candle wheel =====
   A pinned stage (the track is 780svh, the stage sticky inside it) over
   the velvet. A giant wheel stands on its edge facing the viewer, its
   centre below the screen (radius 0.40 W, centred on W/2, its top point
   at 96% of the height: the top candle stands on the bottom edge). The
   rim is a full ring of nine places 40 degrees apart: place q < N holds
   line q's candle, the rest are fillers (the unlit frame, never a line),
   so there is always a candle each side of the top one, lit, its line
   above its flame. ONE spine entry (the section's top to the bottom of
   its track, u = p * 780 svh of scroll), no scroll listener of its own:
     0-60     the intro (t 0-1): candle 0 rises unlit from below the screen
              into the tall row pose (0-0.5), then lights and settles into
              its rim spot while its two neighbours come up (0.5-1)
     60-540   six beats of 80svh. Beat k: the line arrives over the first
              20%, the wheel turns 40 degrees (eased) over the last 45%
              while the line leaves; the bridge (06) arrives on beat 5
     (desktop, data-grow 160, below as uT)
     500-660  the ending (g 0-1), half a beat after the bridge: "Three
              talks." up high, above the resting candle (0-0.1); the top
              candle and its two neighbours rise out of the ring into a
              row of three upright lit candles (0.1-0.4), the rest fade
              (0-0.3); the row lifts 0.26 H (0.35-0.62) so the wax covers
              A (behind the canvas), which fades under it (0.55-0.68); B
              rolls up into its own window in front (0.6-0.78)
     628-720  the push: a camera scale x2.4 about the point between the
              left and the middle candle (the velvet follows, x1.12)
     720-820  held while the talks' stage picture fades up slowly through
              the velvet (module 2, the talks' first 173svh)
     720-820  the stage is held (on every screen); where the talks section
              is pinned it rises under it: the velvet fades, the talks show in the
              gap, the candles stay in front (z 3, no pointer events) and
              scroll away, fading out over the talks' u 40-70
              (--spk-keys-gone, from module 2); on phones (no pinned talks)
              the stage's bottom dissolves over the track's last 120svh
              (erased in the canvas, the velvet and B faded) and is
              invisible by the end of the track
   Every candle draws one still, candle-turn-03 lit or candle-unlit dark,
   crossfaded as it lights (600ms; dark at once, 80ms). Only the current
   candle is lit in the beats, the three from the rise on; a lit flame
   under the pointer glows up (250ms in, 400ms out). An own rAF loop
   draws, only on screen with the tab visible. Lines are real text.
   Reduced motion, Save-Data, no canvas or no spine: no pin, the lines
   stacked on the velvet, each under one lit candle (<img>).
   Counts: N = the lines (3-9, the last is the bridge); the numbers above
   are for N = 6, data-intro="60", data-beat="80" and data-grow="100".
   After the intro (I), the ending starts at B = (N + 1) * beat, and
   U = I + B + grow + 60 svh (--intro, --beats, --beat, --grow: the
   section's inline style, read by the CSS). */
(function () {
  "use strict";
  [].slice.call(document.querySelectorAll(".spk-said")).forEach(said);

  function said(sec) {
    var track   = sec.querySelector(".spk-said__track");
    var stage   = sec.querySelector(".spk-said__stage");
    var cv      = sec.querySelector(".spk-said__wheel");
    var nextA   = sec.querySelector(".spk-said__nextA");
    var nextB   = sec.querySelector(".spk-said__nextB");
    var linesEl = sec.querySelector(".spk-said__lines");
    var head    = sec.querySelector(".spk-said__h");
    var live    = sec.querySelector("[aria-live]");
    var lines   = [].slice.call(sec.querySelectorAll(".spk-said__line"));
    var limgs   = [].slice.call(sec.querySelectorAll(".spk-said__lineimg"));   /* one lit picture per line (phones) */
    var N = lines.length;
    if (!track || !stage || !linesEl || !head || N < 1) return;
    if (live) live.textContent = "";

    function num(name, d) { var v = parseFloat(sec.getAttribute(name)); return v > 0 ? v : d; }
    var INTRO = num("data-intro", 60);          /* svh of scroll across the intro */
    var BEAT = num("data-beat", 80);            /* svh of scroll per beat */
    var GROW_D = num("data-grow", 160);         /* svh of scroll across the ending (desktop) */
    var FADE_D = 100;                           /* desktop: svh the stage holds after the push while the talks' picture fades up through the velvet */
    var GROW_P = num("data-grow-phone", 480);   /* the same on phones: the long grow */
    /* set by build() for the screen: desktop B0 = (N + 1) beat (560) and
       U = 780; phones B0 = (N - 0.6) beat (432: no hold beat, the ending
       starts 16svh after the bridge is fully in); the grow is over at
       E = U - 250 (822) and the candle is still from there while the
       reel's first card scrolls up over it; the stage is held for the
       track's last 100svh: U = 1072 */
    var GROW = GROW_D, B0 = (N + 1) * BEAT, U = INTRO + B0 + GROW + 60;
    var LAST = N - 1;                           /* the bridge's beat, and the top candle from it on */

    var base = (cv && cv.getAttribute("data-frames")) || "../assets/img/";
    var still = window.matchMedia("(prefers-reduced-motion: reduce)").matches ||
                !!(navigator.connection && navigator.connection.saveData);
    var ctx = cv && cv.getContext && cv.getContext("2d");

    function clamp(x) { return x < 0 ? 0 : (x > 1 ? 1 : x); }
    function smooth(x) { return x <= 0 ? 0 : (x >= 1 ? 1 : x * x * (3 - 2 * x)); }

    /* the phone grow's curve: p runs from g 0.06 (u = B0 + 0.06 GROW) to
       the END of the track (uT = U, through the dissolve: no plateau);
       linear, with a quadratic ease-in over the first 8% of p (same slope
       at the join, so no kink), 0 -> 1 */
    var S_END = 3.0;                            /* phones: the grow's end scale (at E = U - 250) */
    var PIV = 0.40;                             /* phones: the grow's fixed point, of hC up the axis (in the holder) */
    var PIV_Y = 0.62;                           /* phones: where that point ends on screen (of H, at E): it rises from its rest spot (0.76 H) */
    function growP() {
      var u0 = B0 + 0.06 * GROW, uE = U - 250 - INTRO;
      var q = clamp((u - u0) / (uE - u0)), a = 0.08;  /* 1 at E = U - 250: still from there */
      return (q < a ? q * q / (2 * a) : q - a / 2) / (1 - a / 2);
    }

    /* ---- the stacked path: one lit candle over each line (also for a count
       the wheel cannot carry: under 3 or over 9 lines) ---- */
    if (still || !ctx || !window.spkSpine || !nextA || !nextB || N < 3 || N > 9) {
      sec.classList.add("is-stacked");
      lines.forEach(function (l) {
        var im = document.createElement("img");
        im.className = "spk-said__candle";
        im.src = base + "candle-turn-01-450.webp";
        im.alt = "";
        im.width = 52; im.height = 140;
        im.loading = "lazy"; im.decoding = "async";
        l.insertBefore(im, l.firstChild);
      });
      return;
    }

    sec.classList.add("is-wheel");
    var phoneMq = window.matchMedia("(max-width: 768px)");

    /* ---- the frames ----
       Two: candle-turn-03 (FACE, lit, the opening facing the camera) and
       candle-unlit. FACE is drawn at height hC, anchored on its brass foot
       (the centre and the bottom of the foot sit on the rim); the unlit
       frame keeps its own anchors, measured on the 900 file, scaled so its
       foot is FACE's width. The 450 set loads as the section nears; the 900
       set when the last beat nears (u > LAST * beat), or at once on a
       screen that draws it on the rim. */
    var FACE = 0, UNLIT = 1, NF = 2;
    var NAMES = ["candle-turn-03", "candle-unlit"];
    var T_ASP = 336 / 900, T_AX = 0.502, T_AY = 0.997;          /* FACE: width / height, foot centre, foot bottom */
    var U_ASP = 711 / 900, U_AX = 370 / 711, U_AY = 897 / 900;  /* unlit */
    var U_H = 328 / 338;                                        /* unlit height, of hC */
    var FL = 0.94;                                              /* the flame, up the axis, of hC */
    /* phones draw the taller candle (candle-tall-lit / -unlit: one cutout,
       so both frames share the anchors and the height) */
    var tall = false;
    function pickSet(t) {
      tall = t;
      if (t) { NAMES = ["candle-tall-lit", "candle-tall-unlit"]; T_ASP = U_ASP = 507 / 1584; T_AX = U_AX = 0.495; T_AY = U_AY = 0.999; U_H = 1; FL = 0.94; }
      else   { NAMES = ["candle-turn-03", "candle-unlit"]; T_ASP = 336 / 900; T_AX = 0.502; T_AY = 0.997; U_ASP = 711 / 900; U_AX = 370 / 711; U_AY = 897 / 900; U_H = 328 / 338; FL = 0.94; }
    }
    var imgs = [[], []];                                        /* [450 set, 900 set] */
    var loaded450 = false, loaded900 = false;
    function loadSet(s) {
      for (var f = 0; f < NF; f++) {
        var im = new Image();
        im.decoding = "async";
        im.src = base + NAMES[f] + (s ? "-900" : "-450") + ".webp";
        if (im.decode) im.decode().then(null, function () {});
        imgs[s][f] = im;
      }
    }
    function loadAll() {
      if (loaded450) return;
      loaded450 = true;
      loadSet(0);
    }
    function loadBig() {
      if (loaded900) return;
      loaded900 = true;
      loadSet(1);
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

    /* ---- geometry (CSS px), rebuilt on resize ----
       The three's row: foot centres at W/2 + j * D (j = -1, 0, 1), feet
       on 99% of H, scaled sR about the foot (never wider than 0.3 W).
       Phones: D = 0.40 W, sR 1.2 (never wider than 0.32 W), so the outer
       two are cut a little by the screen's edges and the middle one has
       room to grow.
       The push scales about P, between the left and the middle candle:
       x2.4 at the end (phones x3.2, KP). */
    var W = 1, H = 1, dpr = 1, hC = 300, Rw = 1, cyW = 1, svh = 1, phone = false;
    var D = 1, sR = 1, Px = 0, Py = 0, KP = 1.4;
    var fw = new Float32Array(NF), fh = new Float32Array(NF), fx = new Float32Array(NF), fy = new Float32Array(NF);
    function build() {
      W = Math.max(1, stage.clientWidth); H = Math.max(1, stage.clientHeight);
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
      phone = phoneMq.matches;
      if (phone !== tall) {
        pickSet(phone);
        /* the other set was already loading: fetch this one instead */
        if (loaded450) { imgs = [[], []]; loadSet(0); if (loaded900) loadSet(1); }
      }
      GROW = phone ? GROW_P : GROW_D;
      /* desktop: the ending starts half a beat after the bridge's (no hold
         beat): "Three talks." comes up 24svh after line 06 is in */
      B0 = phone ? (N - 0.6) * BEAT : (N - 0.5) * BEAT;
      U = INTRO + B0 + GROW + (phone ? 100 : 60 + FADE_D);
      hC = phone ? Math.max(300, Math.min(620, H * 0.50)) : Math.max(300, Math.min(520, H * 0.44));
      Rw = W * (phone ? 0.44 : 0.40);
      cyW = H * 0.96 + Rw;                       /* the rim's top point at 96% of H */
      svh = track.offsetHeight / U;
      for (var f = 0; f < NF; f++) {
        var un = f === UNLIT;
        fh[f] = un ? hC * U_H : hC;
        fw[f] = fh[f] * (un ? U_ASP : T_ASP);
        fx[f] = -(un ? U_AX : T_AX) * fw[f];
        fy[f] = -(un ? U_AY : T_AY) * fh[f];
      }
      D = (phone ? 0.40 : 0.34) * W;
      /* phones: no row, so sR is the intro's rise only */
      sR = phone ? 1.15 : Math.min(1.7, 0.3 * W / fw[FACE]);
      KP = phone ? 0 : 1.4;
      Px = W / 2 - D / 2; Py = 0.55 * H;
      sec.style.setProperty("--push-ox", (100 * Px / W).toFixed(2) + "%");
      sec.style.setProperty("--push-oy", "55%");
      if (hC * dpr > 470) loadBig();             /* a big screen draws the 900 set on the rim */
    }

    /* ---- the state the scroll sets (per rim place: NP entries) ---- */
    var STEP = 40;                                           /* degrees between places, and per beat */
    var NP = 360 / STEP;                                     /* nine places on the ring */
    var uT = 0, tI = 0, u = 0, beat = 0, theta = 0, cxF = 0.5, g = 0, push = 0, first = true;   /* the wheel's centre stays at W/2 */
    var litTo = new Int8Array(NP), litFrom = new Float32Array(NP), litT0 = new Float64Array(NP);
    var L = new Float32Array(NP);
    /* the three: the top candle and its neighbours, j = -1, 0, 1 */
    var THREE = [LAST - 1, LAST, (LAST + 1) % NP];
    /* phones: no row of three; the top candle alone (j 0) grows */
    function role(q) {
      if (phone) return q === LAST ? 0 : 9;
      return q === THREE[0] ? -1 : (q === THREE[1] ? 0 : (q === THREE[2] ? 1 : 9));
    }

    var last = {};
    function put(el, key, name, v) {
      var s = v.toFixed(4);
      if (last[key] === s) return;
      last[key] = s;
      el.style.setProperty(name, s);
    }
    var lastBridge = null, lastHold = "", gone = false;
    var keysEl = document.querySelector(".spk-keys");            /* phones: the reel's first card follows the track */
    var card0 = keysEl && keysEl.querySelector(".spk-keys__head");
    function covered() {
      return phone && !!card0 && keysEl.classList.contains("is-reel") && card0.getBoundingClientRect().top <= -0.18 * H;
    }

    function update(p) {
      if (entry.disabled) return;
      /* uT: svh into the track; u: svh after the intro, which every beat
         and the ending count from; tI: the intro's progress */
      uT = p * U;
      u = Math.max(0, uT - INTRO);
      tI = clamp(uT / INTRO);
      var s = 1, turn = 0;
      if (u < B0) { beat = Math.min(N, Math.floor(u / BEAT)); s = clamp(u / BEAT - beat); }
      else beat = N;
      /* the wheel turns on beats 0..N-2 only: from beat N-1 the last candle
         (the bridge's) stays at the top through the ending */
      var tTurn = beat < LAST ? clamp((s - 0.65) / 0.35) : 0;    /* the turn's own progress */
      turn = smooth(tTurn);
      theta = -(Math.min(beat, LAST) * STEP + turn * STEP);
      g = clamp((u - B0) / GROW);
      /* the push: from g = 0.8 (the row of three at rest) to the end of the track */
      push = phone ? 0 : smooth(clamp((u - (B0 + 0.8 * GROW)) / (0.2 * GROW + 60)));
      if (u > LAST * BEAT) loadBig();

      /* the lines: in over the first 20% of their beat, out over the first
         30% of the turn;
         the bridge holds from beat 5 and is gone by g = 0.2 */
      var arrive = smooth(clamp(s / 0.2));
      for (var j = 0; j < N; j++) {
        var on = 0;
        /* gone within the first 30% of the turn, before the leaving candle
           can cross it */
        if (j < LAST) { if (beat === j) on = Math.min(arrive, 1 - smooth(clamp(tTurn / 0.3))); }
        else if (beat === LAST) on = arrive;
        else if (beat === N) on = 1 - smooth(clamp(g / (phone ? 0.06 : 0.1)));
        put(lines[j], "l" + j, "--on", on);
        if (limgs[j]) put(limgs[j], "li" + j, "--on", on);
      }
      put(head, "h", "--on", beat === 0 ? 1 - smooth(clamp(s / 0.2)) : 0);
      var bridge = beat >= LAST;
      if (bridge !== lastBridge) { linesEl.classList.toggle("is-bridge", bridge); lastBridge = bridge; }

      /* lit: the current candle only during the beats (candle 0 from the
         intro's settle, t > 0.5; on phones it rises already lit, so the
         first candle seen is the same as every other); the three from the
         rise on (g > 0.2), through the end. A filler is lit only as one of
         the three. */
      var now = performance.now();
      var rise = g > (phone ? 0.2 : 0.12);
      for (var i = 0; i < NP; i++) {
        var to = (rise ? role(i) !== 9 : i === Math.min(beat, LAST) && (phone || tI > 0.5)) ? 1 : 0;
        if (first) { litTo[i] = to; L[i] = to; litFrom[i] = to; litT0[i] = -1e9; }
        else if (to !== litTo[i]) { litFrom[i] = L[i]; litTo[i] = to; litT0[i] = now; }
      }
      first = false;

      /* the ending's DOM half, in order: line A up behind the resting
         candle (g 0-0.2); the roll as the three start to rise (0.2-0.5) */
      /* phones: A up over g 0-0.06 (behind the canvas, as on desktop),
         held to g 0.38 (about 150svh) while the candle rises behind it; no
         shared window there (A mid, B low), so a crossfade instead of the
         roll: A out rising over g 0.38-0.48, B in rising over 0.44-0.56 */
      /* desktop: A comes up high, above the resting candle (g 0-0.1), and
         stays while the three rise into their row (0.1-0.4) and then lift
         (0.35-0.62) until their wax covers it (A is behind the canvas); it
         fades out under them (0.55-0.68); then B rolls up into its own
         window in front of the wax (0.6-0.78) */
      put(nextA, "na", "--na", phone ? smooth(clamp(g / 0.06))
                                      : smooth(clamp(g / 0.1)) * (1 - smooth(clamp((g - 0.55) / 0.13))));
      put(nextA, "rollA", "--roll", 0);
      put(nextB, "rollB", "--roll", phone ? 0 : smooth(clamp((g - 0.6) / 0.18)));
      if (phone) {
        var nao = smooth(clamp((g - 0.38) / 0.10));
        put(nextA, "nao", "--nao", nao);
        put(nextB, "nb", "--nb", smooth(clamp((g - 0.44) / 0.12)));
        /* the lit picture between A and the flame follows A (the CSS reads
           these on the section) */
        put(sec, "gna", "--glow-na", smooth(clamp(g / 0.06)));
        put(sec, "gnao", "--glow-nao", nao);
      }
      /* the velvet follows the camera (the CSS scales it by 1 + 0.12 --push) */
      put(sec, "push", "--push", push);

      /* held in place to the end of the track: the stage's sticky run ends
         100svh before the track does (680 of 780), and the ending (the
         row, the push) plays in those last 100svh. On desktop the pinned
         talks section rises under it there; on phones (the talks a reel,
         not pinned) it is held as well while the reel's first card (plain
         plum and its heading, stacked above the stage) slides up over the
         candle's faded bottom (U - 100 -> U); then it scrolls away under
         the reel */
      var HOLD = U - 100;
      var hold = uT > HOLD
        ? "translate3d(0," + ((uT - HOLD) * svh).toFixed(1) + "px,0)" : "";
      if (hold !== lastHold) { stage.style.transform = hold; lastHold = hold; }
      /* phones: no pinned talks to hand to (--spk-keys-gone is never
         written there): the candle's bottom always fades into the velvet
         (draw()), B stays, and the reel covers the stage by U */
      /* phones: the grow is over at E = U - 250 and the candle is still
         from there; the reel's first card (stacked above the stage, the
         reel pulled up 150svh by the CSS) enters at E and scrolls up over
         it at the scroll's own speed. B leaves (linear) over E -> E + 35,
         before the card's heading reaches B's box */
      put(sec, "bout", "--spk-said-bout", phone ? clamp((uT - (U - 250)) / 35) : 0);
      /* once the card's opaque part (below its top 18%) covers the
         screen, nothing to draw */
      gone = covered();
      wake();
    }

    /* ---- the hover: fine pointers only. The pointer is kept in stage
       coordinates; each drawn candle leaves its flame point and radius,
       and a lit candle under the pointer eases hov[] to 1 (250ms in,
       400ms out, time-based like the lighting). ---- */
    var mx = -1e9, my = -1e9;
    var hov = new Float32Array(NP), hovTo = new Int8Array(NP), hovFrom = new Float32Array(NP), hovT0 = new Float64Array(NP);
    var flX = new Float32Array(NP), flY = new Float32Array(NP), flR = new Float32Array(NP);
    /* the stage takes no pointer events (the talks' buttons under it stay
       live), so the pointer is read on the document; outside the stage's
       rect it is cleared */
    if (!window.matchMedia("(pointer: coarse)").matches) {
      document.addEventListener("mousemove", function (e) {
        if (!onScreen) { mx = my = -1e9; return; }
        var b = stage.getBoundingClientRect();
        mx = e.clientX - b.left; my = e.clientY - b.top;
        if (mx < 0 || my < 0 || mx > b.width || my > b.height) mx = my = -1e9;
        wake();
      }, { passive: true });
      document.documentElement.addEventListener("mouseleave", function () { mx = my = -1e9; wake(); }, { passive: true });
    }
    /* ---- the tap: coarse pointers. A pointerdown (read on the document,
       as the hover is; never prevented, so the page still scrolls) that
       ends in a pointerup within 8px, over a lit candle's flame, glows that
       candle: hov[] eases to 1 over 250ms, holds 900ms, eases out over
       600ms, on its own clock (tapT0; a second tap restarts it from where
       the glow is). A pointer that travels (a scroll) or is cancelled
       lights nothing. ---- */
    var coarse = window.matchMedia("(pointer: coarse)").matches;
    var tapT0 = new Float64Array(NP), tapFrom = new Float32Array(NP);
    if (coarse) {
      var tp = null;
      document.addEventListener("pointerdown", function (e) {
        tp = null;
        if (!onScreen || e.isPrimary === false) return;
        var b = stage.getBoundingClientRect();
        var x = e.clientX - b.left, y = e.clientY - b.top;
        if (x < 0 || y < 0 || x > b.width || y > b.height) return;
        tp = { id: e.pointerId, cx: e.clientX, cy: e.clientY, x: x, y: y };
      }, { passive: true });
      document.addEventListener("pointermove", function (e) {
        if (tp && e.pointerId === tp.id && (Math.abs(e.clientX - tp.cx) > 8 || Math.abs(e.clientY - tp.cy) > 8)) tp = null;
      }, { passive: true });
      document.addEventListener("pointercancel", function () { tp = null; }, { passive: true });
      document.addEventListener("pointerup", function (e) {
        var t = tp; tp = null;
        if (!t || e.pointerId !== t.id || !onScreen) return;
        if (Math.abs(e.clientX - t.cx) > 8 || Math.abs(e.clientY - t.cy) > 8) return;
        var now = performance.now();
        for (var i = 0; i < NP; i++) {
          if (litTo[i] !== 1 || !(flR[i] > 0)) continue;
          var dx = t.x - flX[i], dy = t.y - flY[i];
          if (dx * dx + dy * dy < flR[i] * flR[i]) { tapFrom[i] = hov[i]; tapT0[i] = now; }
        }
        wake();
      }, { passive: true });
    }
    function tapGlow(i, now) {
      if (!tapT0[i]) return 0;
      var t = now - tapT0[i];
      if (t < 0) t = 0;
      if (t < 250) return tapFrom[i] + (1 - tapFrom[i]) * smooth(t / 250);
      if (t < 1150) return 1;
      if (t < 1750) return 1 - smooth((t - 1150) / 600);
      tapT0[i] = 0; return 0;
    }
    function hover(i, now, on) {
      if (coarse) { hov[i] = tapGlow(i, now); return; }
      var to = on ? 1 : 0;
      if (to !== hovTo[i]) { hovFrom[i] = hov[i]; hovTo[i] = to; hovT0[i] = now; }
      var t = (now - hovT0[i]) / (hovTo[i] ? 250 : 400);
      hov[i] = t >= 1 ? hovTo[i] : hovFrom[i] + (hovTo[i] - hovFrom[i]) * smooth(t);
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
    /* the lighting (600ms in; out at once, 80ms) */
    function step(now) {
      for (var i = 0; i < NP; i++) {
        var t = (now - litT0[i]) / (litTo[i] ? 600 : 80);
        L[i] = t >= 1 ? litTo[i] : litFrom[i] + (litTo[i] - litFrom[i]) * smooth(t);
      }
    }
    var poses = [], c0 = null;                               /* the three's poses and candle 0's, for the profile */
    /* rim pose -> row pose: from a rim pose (x, y, rot, scale 1) to the
       row's upright pose j (foot at W/2 + j D, 99% of H, scale sR), linear
       in r (r is eased by the caller); the rotation goes the shortest way.
       Used by the ending (r up) and by the intro's settle (r down). */
    var PZ = { x: 0, y: 0, rot: 0, s: 1 };
    function toRow(x, y, rot, j, r) {
      rot = Math.atan2(Math.sin(rot), Math.cos(rot));
      PZ.x = x + (W / 2 + j * D - x) * r;
      PZ.y = y + (0.99 * H - y) * r;
      PZ.rot = rot - rot * r;
      PZ.s = 1 + (sR - 1) * r;
      return PZ;
    }
    function draw(now) {
      step(now);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, W, H);
      var cxW = W * cxF;
      /* phones: over the first 30svh of the grow (g 0-0.0625 of 480) */
      var others = 1 - clamp(g / (phone ? 30 / GROW : 0.3));
      /* the three rise from their rim poses to the row over g 0.1-0.4,
         then the row lifts 0.26 H over g 0.35-0.62, over "Three talks." */
      var r = smooth(clamp((g - 0.1) / 0.3));
      var lift = phone ? 0 : 0.26 * H * smooth(clamp((g - 0.35) / 0.27));
      /* phones: the top candle grows instead (from g 0.06 to U), x1 ->
         x2, linear with an ease-in over the first 8% of its p only, about
         the point PIV hC up its axis, which itself travels up to PIV_Y H on
         the same curve: less zoom, more travel. The candle rises through
         the frame without stopping, the flame passes behind the pinned
         line and reaches the top at the end, the holder rises to the
         middle of the screen */
      var dg = phone ? growP() : 0, S = 1 + (S_END - 1) * dg;
      /* the camera: k about P, multiplied into every candle's transform */
      var k = 1 + KP * push;
      var gr = 0.55 * hC, fyL = -FL * hC;
      poses.length = 0; c0 = null;
      for (var i = 0; i < NP; i++) {
        var phi = -90 + theta + i * STEP;
        var rel = ((phi + 90) % 360 + 540) % 360 - 180;
        flR[i] = 0;
        if (rel > 100 || rel < -100) { hover(i, now, false); continue; }
        var rad = phi * RAD;
        var x = cxW + Rw * Math.cos(rad), y = cyW + Rw * Math.sin(rad);
        var jR = g > 0 ? role(i) : 9;                        /* -1, 0, 1: one of the three */
        if (jR === 9 && y > H + hC) { hover(i, now, false); continue; }
        var a = 0.35 + 0.65 * clamp(1 - Math.abs(rel) / 80);
        var rot = rad + Math.PI / 2, sc = 1;
        if (tI < 1) {
          /* the intro: candle 0 rises from below the screen into the
             middle row pose (t 0-0.5), then settles back into its rim spot
             (0.5-1) while places 1 and NP-1 come up from 0.5 H below at
             alpha e; nothing else until t = 1, where the rim takes over
             in place */
          var eI = smooth((tI - 0.5) / 0.5);
          if (i === 0) {
            toRow(x, y, rot, 0, tI < 0.5 ? 1 : 1 - eI);
            x = PZ.x; y = PZ.y; rot = PZ.rot; sc = PZ.s; a = 1;
            if (tI < 0.5) y += (1 - smooth(tI / 0.5)) * (1.02 * sR * hC + 0.02 * H);
          } else if (i === 1 || i === NP - 1) { y += (1 - eI) * 0.5 * H; a *= eI; }
          else { hover(i, now, false); continue; }
        }
        var Fx = 0, Fy = 0, grow = false;
        if (jR === 9) a *= others;
        else if (phone) {
          grow = true;
          Fx = x + PIV * hC * Math.sin(rot); Fy = y - PIV * hC * Math.cos(rot);
          sc = S;
          poses.push({ q: i, j: jR, x: +x.toFixed(1), y: +y.toFixed(1), rot: +(rot / RAD).toFixed(2), s: +sc.toFixed(3) });
        } else {
          toRow(x, y, rot, jR, r);
          x = PZ.x; y = PZ.y - lift; rot = PZ.rot; sc = PZ.s;
          a += (1 - a) * r;
          poses.push({ q: i, j: jR, x: +x.toFixed(1), y: +y.toFixed(1), rot: +(rot / RAD).toFixed(2), s: +sc.toFixed(3) });
        }
        if (i === 0) c0 = { x: +x.toFixed(1), y: +y.toFixed(1), rot: +(rot / RAD).toFixed(2), s: +sc.toFixed(3), a: +a.toFixed(3) };
        if (a <= 0.003) { flR[i] = 0; hover(i, now, false); continue; }  /* not drawn: no flame to hit */
        var c = Math.cos(rot), sn = Math.sin(rot), m = k * sc;
        var ex = Px + k * (x - Px), ey = Py + k * (y - Py);
        if (grow) { ex = Fx + (W / 2 - Fx) * dg + S * (x - Fx); ey = Fy + (PIV_Y * H - Fy) * dg + S * (y - Fy); }
        ctx.setTransform(dpr * m * c, dpr * m * sn, -dpr * m * sn, dpr * m * c, dpr * ex, dpr * ey);
        var big = hC * dpr * m > 470 ? 1 : 0;
        var Li = L[i];
        /* the flame: 0.94 hC up the axis, through the full transform */
        flX[i] = ex + m * sn * FL * hC; flY[i] = ey - m * c * FL * hC; flR[i] = 0.22 * hC * m;
        var dx = mx - flX[i], dy = my - flY[i];
        hover(i, now, litTo[i] === 1 && dx * dx + dy * dy < flR[i] * flR[i]);
        var hv = hov[i], gR = gr * (1 + 0.3 * hv);
        /* the growing candle's glow grows with it, but never past 1.25x
           its resting size on screen (it would wash the text) */
        if (grow && m > 1.25) gR *= 1.25 / m;
        /* the ending: no glow pass once the whole glow is above the screen */
        if (Li > 0.001 && !(grow && g > 0.06 && flY[i] + gR * m < 0)) {
          ctx.globalCompositeOperation = "lighter";
          ctx.globalAlpha = Math.min(1, (0.24 + 0.05 * Math.sin(now / 900 + i) + 0.03 * Math.sin(now / 310 + 2 * i)) * Li * a * (1 + 0.9 * hv));
          ctx.drawImage(glow, -gR, fyL - gR, 2 * gR, 2 * gR);
          ctx.globalCompositeOperation = "source-over";
        }
        if (Li < 0.999) frame(UNLIT, big, a * (1 - Li));
        if (Li > 0.001) frame(FACE, big, a * Li);
      }
      ctx.globalAlpha = 1;
      /* phones, the whole ending (g > 0.06): the candle's bottom fades
         into the velvet, every frame: erased (destination-out, no CSS
         mask) from clear at 0.72 H to fully at H, only over that band.
         Its strength eases in over g 0.06-0.14 so the foot does not pop */
      if (phone && g > 0.06) {
        var fk = smooth(clamp((g - 0.06) / 0.08));
        var eg = ctx.createLinearGradient(0, 0.72 * H, 0, H);
        eg.addColorStop(0, "rgba(0,0,0,0)");
        eg.addColorStop(1, "rgba(0,0,0," + fk.toFixed(3) + ")");
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.globalCompositeOperation = "destination-out";
        ctx.fillStyle = eg;
        ctx.fillRect(0, 0.72 * H, W, 0.28 * H);
        ctx.globalCompositeOperation = "source-over";
      }
    }

    /* ---- the loop: only while the stage is on screen and the tab shows ----
       window.__spkProfile = true times each draw into window.__spkWheelCost
       (the last 240 frames, in ms) and writes window.__spkWheelState (each
       place's lit L and hover hov, each flame [x, y, radius], the three's
       poses, the rise r, the push and the camera scale k). */
    var raf = 0, onScreen = false;
    function tick(now) {
      raf = 0;
      if (entry.disabled || !onScreen || document.hidden || gone) return;
      var prof = window.__spkProfile === true, t0 = prof ? performance.now() : 0;
      draw(now);
      if (prof) {
        var cost = window.__spkWheelCost || (window.__spkWheelCost = []);
        cost.push(performance.now() - t0);
        if (cost.length > 240) cost.shift();
        var fl = [];
        for (var i = 0; i < NP; i++) fl.push([+flX[i].toFixed(1), +flY[i].toFixed(1), +flR[i].toFixed(1)]);
        window.__spkWheelState = { u: +uT.toFixed(1), tI: +tI.toFixed(3), c0: c0, g: +g.toFixed(3), push: +push.toFixed(3), k: +(1 + KP * push).toFixed(3),
          S: phone ? +(1 + (S_END - 1) * growP()).toFixed(3) : 1, hC: +hC.toFixed(1), U: U, B0: B0, GROW: GROW,
          three: THREE.slice(), L: [].slice.call(L), hov: [].slice.call(hov), flame: fl, poses: poses.slice() };
      }
      /* phones: the reel's first card (its top 18% see-through) has
         covered the stage: nothing more to draw until the scroll comes
         back (update() clears the flag) */
      if (covered()) { gone = true; return; }
      raf = requestAnimationFrame(tick);
    }
    function wake() { if (!raf && !entry.disabled && onScreen && !document.hidden && !gone) raf = requestAnimationFrame(tick); }
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
        if (onScreen) { gone = false; wake(); }
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
  }
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
   (<= 768px: a pinned full-screen stage of N * data-beat-phone svh, one
   beat per chapter, scroll-scrubbed, the dots at the bottom as the
   tablist; see the phone section below) and "static" (reduced motion and
   Save-Data: the Think still holds, every chapter open, no handlers).
   One instance per .spk-chap; N = the chapters in the markup (BEATS =
   1 + 2N, the CSS track (1 + 2 * --chapters) * --beat vh + 60vh). The
   timings come from the section: data-arrive (440), data-leave (320),
   data-cross (900) in ms, data-dolly (1.06). */
(function () {
  "use strict";
  [].slice.call(document.querySelectorAll(".spk-chap")).forEach(chap);

  function chap(sec) {
    var track    = sec.querySelector(".spk-chap__track");
    var stage    = sec.querySelector(".spk-chap__stage");
    var heading  = sec.querySelector(".spk-chap__h");
    var rail     = sec.querySelector(".spk-chap__rail");
    var dot      = sec.querySelector(".spk-chap__dot");
    var tabs     = [].slice.call(sec.querySelectorAll(".spk-chap__tab"));
    var chapters = [].slice.call(sec.querySelectorAll(".spk-chap__chapter"));
    var stills   = [].slice.call(sec.querySelectorAll(".spk-chap__still"));
    var live     = sec.querySelector("[aria-live]");
    if (!track || !stage || !heading || !tabs.length || tabs.length !== chapters.length) return;

    var N = chapters.length;
    var BEATS = 1 + 2 * N;
    function num(name, d) { var v = parseFloat(sec.getAttribute(name)); return v > 0 ? v : d; }
    var ARRIVE = num("data-arrive", 440);      /* ms from a beat change to the arrival */
    var LEAVE  = num("data-leave", 320);       /* ms the leaving element keeps .is-leaving */
    var CROSS  = num("data-cross", 900);       /* ms the outgoing still stays lit under the incoming */
    var DOLLY  = num("data-dolly", 1.06);      /* the push-in across a chapter's two beats */
    /* strike mode (said-vs-meant): a chapter's word stays when its line
       arrives, struck through; both leave together */
    var STRIKE = sec.classList.contains("spk-chap--strike");
    var STRIKE_MS = num("data-strike-ms", 420);
    if (STRIKE) sec.style.setProperty("--strike-ms", STRIKE_MS + "ms");
    var rmq      = window.matchMedia("(prefers-reduced-motion: reduce)");
    var phone    = window.matchMedia("(max-width: 768px)");
    var saveData = !!(navigator.connection && navigator.connection.saveData);
    var hasIO    = "IntersectionObserver" in window;

    var wordsEl = chapters.map(function (c) { return c.querySelector(".spk-chap__word"); });
    var linesEl = chapters.map(function (c) { return c.querySelector(".spk-chap__text"); });
    /* turn mode (a chapter with a second line and picture, .spk-chap__text--turn
       and a still with data-turn): the chapter's word is its title and stays
       on top across both its beats; beat 1 + 2i is its first line over its
       first still, beat 2 + 2i the turn line over the turn still (the
       stills crossfade as the lines change) */
    var turnsEl = chapters.map(function (c) { return c.querySelector(".spk-chap__text--turn"); });
    var TURN = turnsEl.some(function (t) { return !!t; });
    if (TURN) sec.classList.add("spk-chap--turn");
    /* the beat elements, in beat order after the heading */
    var beatEls = [];
    chapters.forEach(function (c, i) {
      if (TURN) beatEls.push(linesEl[i], turnsEl[i]);
      else beatEls.push(wordsEl[i], linesEl[i]);
    });
    function elOf(b) { return b === 0 ? heading : beatEls[b - 1]; }
    /* chapter i's still; t: its turn still (falls back to the first) */
    function stillOf(i, t) {
      var first = null;
      for (var k = 0; k < stills.length; k++) {
        if (+stills[k].getAttribute("data-chapter") !== i) continue;
        var isT = stills[k].hasAttribute("data-turn");
        if (!!t === isT) return stills[k];
        if (!isT && !first) first = stills[k];
      }
      return first;
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
      var t = turnsEl[i];
      return (w ? w.textContent.trim() : "") + ". " +
             (l ? l.textContent.replace(/\s+/g, " ").trim() : "") +
             (t ? " " + t.textContent.replace(/\s+/g, " ").trim() : "");
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
      beatEls.concat(wordsEl, turnsEl).forEach(function (e) { if (e) e.classList.remove("is-in", "is-leaving", "is-struck"); });
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
    var curBeat = -1, curIdx = -1, shown = null, curStill = null, curWord = null, wordT = 0;
    var arriveT = 0, leaveTs = [], offTs = [];

    /* the beat on screen leaves, then the target arrives; a call mid-fade
       retargets without cutting short what is already leaving */
    function leave(el) {
      if (el === heading) { heading.classList.add("is-gone"); return; }
      el.classList.remove("is-in");
      el.classList.add("is-leaving");
      var t = setTimeout(function () {
        el.classList.remove("is-leaving", "is-struck");
        var k = leaveTs.indexOf(t);
        if (k > -1) leaveTs.splice(k, 1);
      }, LEAVE);
      leaveTs.push(t);
    }
    /* strike mode: the word that stays on screen for beat b (its own word
       on a line beat), and the word currently struck through */
    var struck = null;
    function keptWord(b) {
      return STRIKE && b > 0 && (b - 1) % 2 === 1 ? wordsEl[(b - 2) / 2] : null;
    }
    function goTo(b) {
      clearTimeout(arriveT); arriveT = 0;
      var keep = keptWord(b);
      /* back from a line to its own word: the word stays and un-strikes */
      var back = STRIKE && struck && struck === elOf(b) ? struck : null;
      if (shown && shown !== keep && shown !== back) leave(shown);
      shown = null;
      if (struck && struck !== keep && struck !== back) leave(struck);
      if (back) { back.classList.remove("is-struck"); struck = null; shown = back; }
      /* forward from a word to its own line: the word rises and is struck
         at once; its line arrives on the usual clock */
      if (keep && keep.classList.contains("is-in")) { keep.classList.add("is-struck"); struck = keep; }
      curBeat = b;
      if (back) return;
      arriveT = setTimeout(function () {
        arriveT = 0;
        var target = elOf(b);
        beatEls.forEach(function (e) { if (e && e !== keep) e.classList.remove("is-in"); });
        if (target === heading) {
          heading.classList.remove("is-gone");
        } else if (target) {
          heading.classList.add("is-gone");
          target.classList.remove("is-leaving");
          target.classList.add("is-in");
          if (keep && struck !== keep) {
            keep.classList.remove("is-leaving");
            keep.classList.add("is-in", "is-struck");
            struck = keep;
          }
        }
        shown = target;
      }, ARRIVE);
    }

    /* the incoming still goes on top and fades in over the outgoing one,
       which keeps its light for the length of the crossfade */
    function fadeTo(inc, first) {
      curStill = inc;
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
        offTs[k] = setTimeout(function () { offTs[k] = 0; st.classList.remove("is-on"); }, CROSS);
      });
    }
    function setChapter(idx, first) {
      if (!TURN) fadeTo(stillOf(idx), first);
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

      var firstCh = curIdx === -1;
      if (idx !== curIdx) setChapter(idx, firstCh);
      if (TURN) {
        /* the still follows the line: the first, then the turn */
        var want = stillOf(idx, isLine);
        if (want !== curStill) fadeTo(want, firstCh);
        /* the title: the chapter's word, on top across both its beats */
        var w = beat === 0 ? null : wordsEl[idx];
        if (w !== curWord) {
          clearTimeout(wordT); wordT = 0;
          if (curWord) leave(curWord);
          curWord = w;
          if (w) wordT = setTimeout(function () { wordT = 0; w.classList.remove("is-leaving"); w.classList.add("is-in"); }, ARRIVE);
        }
      }
      if (beat !== curBeat) goTo(beat);

      /* the push-in runs across the chapter's two beats (turn mode: each
         still across its own beat) */
      var c = beat === 0 ? 0 : (TURN ? s : ((beat - 1) % 2 + s) / 2);
      var st = TURN ? curStill : stillOf(idx);
      if (st) st.style.setProperty("--dolly", (1 + (DOLLY - 1) * c).toFixed(4));

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
      curIdx = -1; curStill = null; curWord = null;
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
      clearTimeout(arriveT); clearTimeout(sayT); clearTimeout(wordT);
      arriveT = sayT = wordT = 0;
      curStill = null; curWord = null;
      leaveTs.forEach(function (t) { clearTimeout(t); });
      offTs.forEach(function (t) { clearTimeout(t); });
      leaveTs = []; offTs = [];
      curBeat = -1; curIdx = -1; shown = null; struck = null;
      restoreAria();
      clearState();
    }

    /* ---- phone: a pinned full-screen stage, one beat per chapter ----
       The track is N * data-beat-phone svh (100) plus the stage's own
       screen; P is the svh scrolled into it and s (0 → 1) runs across a
       chapter's beat. The scroll is the clock here: every phase is written
       as a custom property (--o on a still, --in / --out on a word and its
       line, --hout on the heading), so nothing waits on a timer.
         heading   alone over the first still, leaves over P 28-40
         0-25%     the chapter's still crossfades in over the previous one
         25-45%    the word arrives, large and centred
         45-65%    its line arrives under it (strike: 65-80%, after the
                   strike draws through the quote at 55%, time-based)
         90-100%   both leave together
       The rail is hidden; a row of dots at the bottom is the tablist
       (the rail's ids and ARIA move onto the dots, and back). Strike mode:
       a tap on the stage while the quote shows jumps to the strike point
       (the flip done); a second tap goes on to the next chapter. */
    var BEATP = num("data-beat-phone", 100);
    var railTabs = tabs, dotsEl = null, dots = [], dotFns = [];
    var ph = {}, phIdx = -1;
    function phPut(el, key, name, v) {
      var s = v.toFixed(3);
      if (ph[key] === s) return;
      ph[key] = s;
      el.style.setProperty(name, s);
    }
    function svhPx() { return (stage.offsetHeight || window.innerHeight) / 100; }
    function trackTop() { return track.getBoundingClientRect().top + window.pageYOffset; }
    /* the page y at which chapter i reaches local s */
    function yAt(i, s) { return trackTop() + (i + s) * BEATP * svhPx(); }
    function jump(y) {
      if (window.spkLenis) window.spkLenis.scrollTo(y);
      else window.scrollTo({ top: y, behavior: "smooth" });
    }
    /* a dot lands on its chapter arrived: the quote held (strike) or the
       word and its line held */
    function dotGo(i) { jump(yAt(i, STRIKE ? 0.5 : (TURN ? 0.4 : 0.7))); }

    function buildDots() {
      dotsEl = document.createElement("div");
      dotsEl.className = "spk-chap__dots";
      dotsEl.setAttribute("role", "tablist");
      if (rail && rail.getAttribute("aria-label")) dotsEl.setAttribute("aria-label", rail.getAttribute("aria-label"));
      dots = railTabs.map(function (t, i) {
        var b = document.createElement("button");
        b.type = "button";
        b.className = "spk-chap__pdot";
        var id = t.id;
        if (id) { t.removeAttribute("id"); b.id = id; }
        b.setAttribute("role", "tab");
        if (authored.tabs[i]["aria-controls"]) b.setAttribute("aria-controls", authored.tabs[i]["aria-controls"]);
        b.setAttribute("aria-selected", i === 0 ? "true" : "false");
        b.tabIndex = i === 0 ? 0 : -1;
        b.setAttribute("aria-label", wordsEl[i] ? wordsEl[i].textContent.trim() : String(i + 1));
        dotsEl.appendChild(b);
        return b;
      });
      dotFns = dots.map(function (b, i) {
        return {
          click: function (e) { e.stopPropagation(); dotGo(i); },
          focus: function () { dots.forEach(function (o) { o.tabIndex = (o === b ? 0 : -1); }); },
          key: function (e) {
            var k = e.key, n = -1, L = dots.length;
            if (k === "ArrowDown" || k === "ArrowRight") n = (i + 1) % L;
            else if (k === "ArrowUp" || k === "ArrowLeft") n = (i - 1 + L) % L;
            else if (k === "Home") n = 0;
            else if (k === "End") n = L - 1;
            else return;
            e.preventDefault();
            dots[n].focus();
          }
        };
      });
      dots.forEach(function (b, i) {
        b.addEventListener("click", dotFns[i].click);
        b.addEventListener("focus", dotFns[i].focus);
        b.addEventListener("keydown", dotFns[i].key);
      });
      stage.appendChild(dotsEl);
    }
    function dropDots() {
      if (!dotsEl) return;
      dots.forEach(function (b, i) {
        if (b.id && railTabs[i]) { railTabs[i].id = b.id; b.removeAttribute("id"); }
      });
      if (dotsEl.parentNode) dotsEl.parentNode.removeChild(dotsEl);
      dotsEl = null; dots = []; dotFns = [];
    }

    /* the chapter on screen: the dots, the panels, the live region */
    function phoneChapter(idx) {
      if (idx === phIdx) return;
      var first = phIdx === -1;
      phIdx = idx;
      chapters.forEach(function (c, n) { c.classList.toggle("is-live", n === idx); });
      tabs.forEach(function (t, n) {
        t.setAttribute("aria-selected", n === idx ? "true" : "false");
        /* roving tabindex follows the scroll unless focus is in the dots */
        if (!dotsEl || !dotsEl.contains(document.activeElement)) t.tabIndex = n === idx ? 0 : -1;
        t.classList.toggle("is-on", n === idx);
      });
      if (!first) say(words(idx));
    }

    function phoneMeasure() {
      var u = svhPx();
      var P = -track.getBoundingClientRect().top / u;       /* svh into the track */
      var total = N * BEATP;
      var Pc = Math.max(0, Math.min(total, P));
      var idx = Math.min(N - 1, Math.floor(Pc / BEATP));
      phoneChapter(idx);
      phPut(heading, "h", "--hout", smooth(clamp((P - 28) / 12)));
      for (var k = 0; k < N; k++) {
        var s = (P - k * BEATP) / BEATP;
        var st = stillOf(k);
        if (st) {
          phPut(st, "o" + k, "--o", k === 0 ? 1 : smooth(clamp(s / 0.25)));
          phPut(st, "d" + k, "--dolly", 1 + (DOLLY - 1) * clamp(s));
        }
        var out = smooth(clamp((s - 0.9) / 0.1));
        /* turn mode: the title in over 12-25%, the first line 25-38% and
           out over 47-55%, the turn still crossfades in over 50-65% and its
           line comes in over 57-70%; all leave together at 90-100% */
        if (TURN) {
          var ts = stillOf(k, true);
          if (ts && ts !== st) {
            phPut(ts, "to" + k, "--o", smooth(clamp((s - 0.5) / 0.15)));
            phPut(ts, "td" + k, "--dolly", 1 + (DOLLY - 1) * clamp((s - 0.5) / 0.5));
          }
          if (wordsEl[k]) {
            phPut(wordsEl[k], "wi" + k, "--in", smooth(clamp((s - 0.12) / 0.13)));
            phPut(wordsEl[k], "wo" + k, "--out", out);
          }
          if (linesEl[k]) {
            phPut(linesEl[k], "li" + k, "--in", smooth(clamp((s - 0.25) / 0.13)));
            phPut(linesEl[k], "lo" + k, "--out", turnsEl[k] ? smooth(clamp((s - 0.47) / 0.08)) : out);
          }
          if (turnsEl[k]) {
            phPut(turnsEl[k], "ti" + k, "--in", smooth(clamp((s - 0.57) / 0.13)));
            phPut(turnsEl[k], "tl" + k, "--out", out);
          }
          continue;
        }
        if (wordsEl[k]) {
          phPut(wordsEl[k], "wi" + k, "--in", smooth(clamp((s - 0.25) / 0.2)));
          phPut(wordsEl[k], "wo" + k, "--out", out);
        }
        if (linesEl[k]) {
          phPut(linesEl[k], "li" + k, "--in", STRIKE ? smooth(clamp((s - 0.65) / 0.15)) : smooth(clamp((s - 0.45) / 0.2)));
          phPut(linesEl[k], "lo" + k, "--out", out);
        }
        /* strike: the line draws through the quote at 55% (420ms, the
           CSS is the clock) as it dims and rises; undone on the way back */
        if (STRIKE && wordsEl[k]) wordsEl[k].classList.toggle("is-struck", s >= 0.55 && s < 1);
      }
      phState = { P: P, idx: idx, s: (Pc - idx * BEATP) / BEATP };
    }
    var phState = { P: 0, idx: 0, s: 0 };

    /* strike mode: a tap flips the quote, a second tap moves on */
    function onStageTap(e) {
      if (mode !== "phone" || !STRIKE) return;
      if (dotsEl && dotsEl.contains(e.target)) return;
      if (e.target.closest && e.target.closest("a, button")) return;
      phoneMeasure();
      var i = phState.idx, s = phState.s;
      if (phState.P < 0) return;
      if (s < 0.55) jump(yAt(i, 0.8));
      else if (i < N - 1) jump(yAt(i + 1, 0.5));
      else jump(yAt(N, 0));
    }

    function startPhone() {
      sec.classList.add("is-phone");
      sec.style.setProperty("--beat-phone", BEATP);
      clearState();
      /* the rail's tablist goes (hidden); the panels stay, labelled by the dots */
      if (rail) TAB_ATTRS.forEach(function (n) { rail.removeAttribute(n); });
      railTabs.forEach(function (t) { TAB_ATTRS.forEach(function (n) { t.removeAttribute(n); }); });
      if (rail) rail.hidden = true;
      buildDots();
      tabs = dots;
      phIdx = -1; ph = {};
      stills.forEach(function (st) { st.classList.remove("is-on"); });
      stage.addEventListener("click", onStageTap);
      phoneMeasure();
      watchScreen();
    }
    function stopPhone() {
      unwatchScreen();
      stage.removeEventListener("click", onStageTap);
      clearTimeout(sayT); sayT = 0;
      tabs = railTabs;
      dropDots();
      if (rail) rail.hidden = false;
      sec.classList.remove("is-phone");
      sec.style.removeProperty("--beat-phone");
      heading.style.removeProperty("--hout");
      stills.forEach(function (st) { st.style.removeProperty("--o"); });
      beatEls.concat(wordsEl, turnsEl).forEach(function (e) {
        if (!e) return;
        e.style.removeProperty("--in"); e.style.removeProperty("--out");
      });
      ph = {}; phIdx = -1;
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
        onScroll();
      }, 60);
    }, { passive: true });
    if (phone.addEventListener) phone.addEventListener("change", setMode);
    else if (phone.addListener) phone.addListener(setMode);
    if (rmq.addEventListener) rmq.addEventListener("change", setMode);
    else if (rmq.addListener) rmq.addListener(setMode);
  }
})();

/* ===== 9. Hand-offs: the hero leaves at half speed, the rooms strip, the close =====
   Three spine entries' worth of work and no scroll listener of its own.
   A. The hero's picture moves down at half the scroll speed while the
      section leaves (--spk-hero-par on .spk-hero .media).
   B. The rooms strip (and the home talks strip, .tstrip): the section's
      track is one screen plus the strip's travel (--spk-strip); while the
      stage is pinned the strip slides by --spk-x. On every screen width;
      reduced motion: a native snap strip, --spk-strip 0px.
   C. The close: main carries a bottom margin the height of the fixed
      footer (--spk-foot-h), so the page lifts off it.
   Reduced motion: no parallax, no scrub, a normal footer.
   A runs per .spk-hero (the factor is its data-parallax, 0.5), B per
   .spk-formats; C is the page's footer. */
(function () {
  "use strict";
  if (!window.spkSpine) return;
  var spine = window.spkSpine;
  var root = document.documentElement;
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var desk = window.matchMedia("(min-width: 769px)");

  function pageY(el) { var y = 0; for (var n = el; n; n = n.offsetParent) y += n.offsetTop; return y; }

  /* ---- A. hero parallax: the picture moves at (1 - factor) of the scroll ---- */
  [].slice.call(document.querySelectorAll(".spk-hero")).forEach(function (hero) {
    var media = hero.querySelector(".media");
    if (!media || reduce) return;
    var PAR = parseFloat(hero.getAttribute("data-parallax"));
    if (isNaN(PAR)) PAR = 0.5;
    /* phones: the hero holds still while the next section slides over it
       (module 13), so no parallax; its picture dims instead (data-dim) */
    var DIM = parseFloat(hero.getAttribute("data-dim"));
    if (isNaN(DIM) || DIM < 0) DIM = 0.55;
    var heroH = 0;
    /* the page-y the hero starts at: 0 for the page's first section */
    spine.add({
      start: function () { return pageY(hero); },
      end: function () { heroH = hero.offsetHeight; return pageY(hero) + heroH; },
      update: function (p) {
        var ph = !desk.matches;
        media.style.setProperty("--spk-hero-par", (ph ? 0 : p * heroH * PAR).toFixed(1) + "px");
        if (ph) media.style.setProperty("--hero-dim", (DIM * p).toFixed(3));
        else media.style.removeProperty("--hero-dim");
      }
    });
  });

  /* ---- B. the rooms strip, one per .spk-formats (and per .tstrip) ---- */
  var strips = [].slice.call(document.querySelectorAll(".spk-formats, .tstrip")).map(function (sec) {
    return { sec: sec, strip: sec.querySelector(".spk-formats__strip, .tstrip__strip"), scroll: -1, entry: null };
  });
  function stripMeasure() {
    var changed = false;
    strips.forEach(function (st) {
      var sec = st.sec, strip = st.strip;
      if (!strip) return;
      var want = !reduce ? Math.max(0, strip.scrollWidth - window.innerWidth) : 0;
      if (want === st.scroll) return;
      st.scroll = want;
      changed = true;
      sec.style.setProperty("--spk-strip", want + "px");
      if (want > 0 && !st.entry) {
        st.entry = spine.add({
          start: function () { return pageY(sec); },
          end: function () { return pageY(sec) + st.scroll; },
          update: function (p) {
            sec.style.setProperty("--spk-x", (p * st.scroll).toFixed(1) + "px");
          }
        });
      }
      if (want === 0) sec.style.setProperty("--spk-x", "0px");
    });
    return changed;
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

/* =====================================================================
   HOME PAGE MOMENTS (brief 22). Each IIFE is guarded on its own element.
   ===================================================================== */

/* ===== 10.A Home hero: the entrance, and the push-in on scroll =====
   Once, when the loader has gone (the "dw:loaded" event; at once when the
   page has no loader): the headline's words (.hero__w, split at build
   time, aria-hidden; the h1 carries the plain text as its aria-label)
   arrive one after another, data-stagger ms apart, starting data-delay ms
   after the loader; each rises 0.4em out of a 6px blur over 640ms. When
   the last word has landed the play ring's circle draws itself (700ms),
   then the label fades in, then the meta lines. On scroll, one spine
   entry over the first screen (or the hero's height, if shorter): the
   poster and the loop scale 1 → 1 + data-zoom (data-zoom-sm on phones)
   and a veil darkens 0 → data-dim. Reduced motion and Save-Data: no
   entrance, no push-in; no script: everything at rest. */
(function () {
  "use strict";
  var hero = document.querySelector(".hero[data-zoom]");
  if (!hero) return;
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var saveData = !!(navigator.connection && navigator.connection.saveData);
  if (reduce) return;

  function num(name, d) { var v = parseFloat(hero.getAttribute(name)); return isNaN(v) || v < 0 ? d : v; }
  var STAGGER = num("data-stagger", 110);
  var DELAY   = num("data-delay", 250);
  var WORD = 640, RING = 700, LABEL = 380;

  /* ---- the entrance ---- */
  var words = hero.querySelectorAll(".hero__w");
  var ring = hero.querySelector(".play__circle");
  hero.style.setProperty("--stagger", STAGGER + "ms");
  hero.classList.add("is-enter");
  var started = false;
  function go() {
    if (started) return;
    started = true;
    setTimeout(function () {
      hero.classList.add("is-go");
      var lastIn = (Math.max(0, words.length - 1)) * STAGGER + WORD;
      setTimeout(function () {
        if (ring) hero.classList.add("is-ring");
        setTimeout(function () {
          hero.classList.add("is-label");
          setTimeout(function () { hero.classList.add("is-meta"); }, LABEL);
        }, ring ? RING : 0);
      }, lastIn);
    }, DELAY);
  }
  if (window.dwLoaded || !document.getElementById("loader")) go();
  else {
    document.addEventListener("dw:loaded", go);
    setTimeout(go, 4000);   /* safety: the loader's own safety is 2.6s */
  }

  /* ---- the push-in: one spine entry over the first screen ---- */
  var media = hero.querySelector(".media");
  if (!media || saveData || !window.spkSpine) return;
  var small = window.matchMedia("(max-width: 640px)");
  var DIM = num("data-dim", 0.55);
  function zoom() { return small.matches ? num("data-zoom-sm", 0.08) : num("data-zoom", 0.12); }
  function pageY(el) { var y = 0; for (var n = el; n; n = n.offsetParent) y += n.offsetTop; return y; }
  var lastZ = "", lastD = "";
  window.spkSpine.add({
    start: function () { return pageY(hero); },
    end: function () { return pageY(hero) + Math.min(hero.offsetHeight, window.innerHeight); },
    update: function (p) {
      var z = (1 + zoom() * p).toFixed(4), d = (DIM * p).toFixed(3);
      if (z !== lastZ) { media.style.setProperty("--hero-zoom", z); lastZ = z; }
      if (d !== lastD) { media.style.setProperty("--hero-dim", d); lastD = d; }
    }
  });
})();

/* ===== 10.B Talks: the hover picture =====
   Desktop with a fine pointer only: hovering a talk row shows that row's
   picture (its card image) as one 320×200 still per section that floats
   24px right of and 40px above the cursor, clamped inside the section,
   fading and scaling in (data-fade ms) and easing after the cursor
   (data-follow of the remaining distance per frame; rAF only while a row
   is hovered and the picture has not caught up). Keyboard focus on a
   row's link shows the picture anchored at the row's right end. Touch:
   nothing. Reduced motion: it shows and hides, and sits where it should,
   with no easing. */
(function () {
  "use strict";
  var fine = window.matchMedia("(hover: hover) and (pointer: fine)");
  if (!fine.matches) return;
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  [].slice.call(document.querySelectorAll(".keynotes-sec")).forEach(function (sec) {
    var img = sec.querySelector(".keynotes__float");
    var rows = [].slice.call(sec.querySelectorAll(".keynote"));
    if (!img || !rows.length) return;
    var FOLLOW = parseFloat(sec.getAttribute("data-follow"));
    if (!(FOLLOW > 0 && FOLLOW <= 1)) FOLLOW = 0.18;
    var FADE = parseFloat(sec.getAttribute("data-fade"));
    if (!(FADE >= 0)) FADE = 220;
    var DX = 24, DY = -40;
    img.hidden = false;
    sec.classList.add("has-float");
    if (reduce) sec.classList.add("is-still");
    sec.style.setProperty("--float-fade", FADE + "ms");

    var x = 0, y = 0, tx = 0, ty = 0, raf = 0, on = false, cur = null;
    function srcOf(row) { var i = row.querySelector(".keynote__img img"); return i ? (i.currentSrc || i.src) : ""; }
    function place() { img.style.translate = x.toFixed(1) + "px " + y.toFixed(1) + "px"; }
    function clampTo(px, py) {
      var w = img.offsetWidth, h = img.offsetHeight;
      tx = Math.max(0, Math.min(sec.clientWidth - w, px));
      ty = Math.max(0, Math.min(sec.clientHeight - h, py));
    }
    function frame() {
      raf = 0;
      x += (tx - x) * FOLLOW; y += (ty - y) * FOLLOW;
      if (Math.abs(tx - x) < 0.2 && Math.abs(ty - y) < 0.2) { x = tx; y = ty; }
      place();
      if (on && (x !== tx || y !== ty)) raf = requestAnimationFrame(frame);
    }
    function kick() {
      if (reduce) { x = tx; y = ty; place(); return; }
      if (!raf) raf = requestAnimationFrame(frame);
    }
    function show(row, jump) {
      if (cur !== row) { var s = srcOf(row); if (s && img.getAttribute("src") !== s) img.src = s; cur = row; }
      if (!on || jump) { x = tx; y = ty; place(); }
      on = true;
      sec.classList.add("is-floating");
      kick();
    }
    function hide() {
      on = false; cur = null;
      sec.classList.remove("is-floating");
      if (raf) { cancelAnimationFrame(raf); raf = 0; }
    }
    function fromPointer(e) {
      var r = sec.getBoundingClientRect();
      clampTo(e.clientX - r.left + DX, e.clientY - r.top + DY);
    }
    rows.forEach(function (row) {
      row.addEventListener("pointerenter", function (e) {
        if (e.pointerType === "touch") return;
        fromPointer(e); show(row, false);
      });
      row.addEventListener("pointermove", function (e) {
        if (e.pointerType === "touch" || !on) return;
        fromPointer(e); kick();
      });
      row.addEventListener("pointerleave", function (e) {
        if (e.pointerType === "touch") return;
        var to = e.relatedTarget && e.relatedTarget.closest ? e.relatedTarget.closest(".keynote") : null;
        if (!to && !row.contains(document.activeElement)) hide();
      });
      /* keyboard (the row's link, its CTA, takes the focus): anchored at
         the row's right end, vertically centred */
      row.addEventListener("focusin", function (e) {
        if (!e.target.matches(":focus-visible")) return;
        var r = sec.getBoundingClientRect(), rr = row.getBoundingClientRect();
        clampTo(rr.right - r.left - img.offsetWidth, rr.top - r.top + rr.height / 2 - img.offsetHeight / 2);
        show(row, true);
      });
      row.addEventListener("focusout", function (e) {
        if (cur === row && !(e.relatedTarget && row.contains(e.relatedTarget))) hide();
      });
    });
  });
})();

/* ===== 10.C Talks on coarse pointers: tap to expand =====
   Each row's title is a button (rendered for every pointer; on fine
   pointers and with no script it stays out of the tab order, covered by
   the row's stretched CTA link, and everything is shown). On a coarse
   pointer the section takes .is-disc: the row's sub moves into its panel
   (picture, sub, CTA), every panel starts closed, and tapping a title (or
   anywhere on its row outside the open panel) opens that panel from a
   measured max-height (360ms, the CSS transition) while any other open row
   closes at the same time; tapping the open row closes it. The pictures
   switch to eager loading once the section nears the screen. Reduced
   motion: the panels open and close at once. */
(function () {
  "use strict";
  if (!window.matchMedia("(pointer: coarse)").matches) return;
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  [].slice.call(document.querySelectorAll(".keynotes-sec")).forEach(function (sec) {
    var rows = [].slice.call(sec.querySelectorAll(".keynote")).map(function (row) {
      var btn = row.querySelector(".keynote__title"), panel = row.querySelector(".keynote__panel");
      if (!btn || !panel) return null;
      var sub = row.querySelector(".keynote__main .keynote__sub"), cta = panel.querySelector(".keynote__cta");
      if (sub && cta) panel.insertBefore(sub, cta);
      return { row: row, btn: btn, panel: panel, open: false };
    }).filter(Boolean);
    if (!rows.length) return;
    sec.classList.add("is-disc");
    rows.forEach(function (r) {
      r.btn.removeAttribute("tabindex");
      r.btn.setAttribute("aria-expanded", "false");
      r.panel.style.maxHeight = "0px";
      r.panel.addEventListener("transitionend", function (e) {
        if (e.target === r.panel && e.propertyName === "max-height" && r.open) r.panel.style.maxHeight = "none";
      });
      r.btn.addEventListener("click", function () { toggle(r); });
    });
    function set(r, open) {
      if (r.open === open) return;
      r.open = open;
      r.btn.setAttribute("aria-expanded", open ? "true" : "false");
      r.row.classList.toggle("is-open", open);
      if (open) {
        r.panel.style.maxHeight = reduce ? "none" : r.panel.scrollHeight + "px";
      } else {
        if (reduce) { r.panel.style.maxHeight = "0px"; return; }
        r.panel.style.maxHeight = r.panel.scrollHeight + "px";
        void r.panel.offsetHeight;                          /* from its measured height, not "none" */
        r.panel.style.maxHeight = "0px";
      }
    }
    function toggle(r) {
      var to = !r.open;
      rows.forEach(function (o) { if (o !== r) set(o, false); });
      set(r, to);
    }
    function eager() {
      [].slice.call(sec.querySelectorAll(".keynote__pic img")).forEach(function (im) { im.loading = "eager"; });
    }
    if ("IntersectionObserver" in window) {
      var io = new IntersectionObserver(function (es) {
        if (es[0].isIntersecting) { eager(); io.disconnect(); }
      }, { rootMargin: "100% 0px" });
      io.observe(sec);
    } else eager();
  });
})();

/* ===== 12. Scroll-fill headings =====
   Every .fill heading (block h2s, the hero's meta lines) carries its words
   as .fill__w spans (--i, and --n on the heading), split at build time.
   One shared module: an IntersectionObserver keeps the set of .fill
   headings on screen, and a scroll listener runs only while that set is
   not empty. Per frame it writes --fp (0..1) on each visible heading from
   its top edge: 0 when the top is at data-fill-start of the viewport
   (0.85), 1 at data-fill-end (0.45). The CSS derives each word's fill from
   --fp, --i and --n; no per-word writes. Where it applies: <body
   data-fill> "phone" (<= 768px, the default), "all" or "off"; never under
   reduced motion; and not on a heading whose own module animates it (the
   said heading on the wheel, the keys heading on the pin, the chapters
   heading in the pin); those take the fill once their module is in its
   stacked / strip / phone mode. No script: plain colour. */
(function () {
  "use strict";
  var body = document.body;
  var mode = body.getAttribute("data-fill") || "phone";
  var heads = [].slice.call(document.querySelectorAll(".fill"));
  if (!heads.length || mode === "off") return;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  if (!("IntersectionObserver" in window)) return;
  function num(name, d) { var v = parseFloat(body.getAttribute(name)); return isNaN(v) ? d : v; }
  var START = num("data-fill-start", 0.85), END = num("data-fill-end", 0.45);
  if (START <= END) { START = 0.85; END = 0.45; }
  var phone = window.matchMedia("(max-width: 768px)");

  function owned(h) {
    var s = h.closest(".spk-said");
    if (s && s.classList.contains("is-wheel")) return true;
    s = h.closest(".spk-keys");
    if (s && s.getAttribute("data-spk-keys-mode") === "pin") return true;
    s = h.closest(".spk-chap");
    if (s && h.classList.contains("spk-chap__h") && !s.classList.contains("is-phone")) return true;
    return false;
  }
  var live = [];                 /* headings on screen that take the fill */
  var seen = [];                 /* headings on screen */
  var listening = false, ticking = false;

  function frame() {
    ticking = false;
    var vh = window.innerHeight, a = START * vh, span = (START - END) * vh;
    for (var k = 0; k < live.length; k++) {
      var h = live[k], t = h.getBoundingClientRect().top;
      /* inside a hero held still (phones, module 13) a line does not move:
         it fills as if it scrolled with the page */
      var hs = h.__hero;
      if (hs === undefined) hs = h.__hero = h.closest(".hero");
      if (hs && getComputedStyle(hs).position === "sticky") {
        /* where the hero sits in the flow: the next block's top less its height */
        var nx = hs.nextElementSibling, y0 = nx ? nx.getBoundingClientRect().top + (window.pageYOffset || 0) - hs.offsetHeight : 0;
        t -= Math.max(0, (window.pageYOffset || 0) - y0);
      }
      var p = Math.max(0, Math.min(1, (a - t) / span)).toFixed(3);
      if (h.__fp !== p) { h.style.setProperty("--fp", p); h.__fp = p; }
    }
  }
  function onScroll() { if (!ticking) { ticking = true; requestAnimationFrame(frame); } }
  function sync() {
    var on = mode === "all" || phone.matches;
    live = seen.filter(function (h) { return h.classList.contains("is-filling"); });
    heads.forEach(function (h) {
      var want = on && !owned(h);
      if (want !== h.classList.contains("is-filling")) {
        h.classList.toggle("is-filling", want);
        if (!want) { h.style.removeProperty("--fp"); h.__fp = null; }
      }
    });
    live = seen.filter(function (h) { return h.classList.contains("is-filling"); });
    if (live.length && !listening) { window.addEventListener("scroll", onScroll, { passive: true }); listening = true; }
    else if (!live.length && listening) { window.removeEventListener("scroll", onScroll); listening = false; }
    if (live.length) frame();
  }
  var io = new IntersectionObserver(function (es) {
    es.forEach(function (e) {
      var i = seen.indexOf(e.target);
      if (e.isIntersecting && i < 0) seen.push(e.target);
      else if (!e.isIntersecting && i >= 0) seen.splice(i, 1);
    });
    sync();
  });
  /* the fill needs a start value before a heading is seen */
  heads.forEach(function (h) { h.style.setProperty("--fp", "0"); h.__fp = "0.000"; io.observe(h); });
  sync();
  /* the owning modules settle their modes at load and on resize */
  window.addEventListener("load", sync);
  window.addEventListener("resize", function () { setTimeout(sync, 60); });
  if (phone.addEventListener) phone.addEventListener("change", sync);
  else if (phone.addListener) phone.addListener(sync);
})();

/* ===== 13. Phones: the hero card-slide, and the name into the header =====
   A. The card-slide (CSS: the hero is sticky for its own height, the next
      section slides over it as a card; the hero's picture dims through
      --hero-dim, written by 9.A / 10.A). Here only: once the hero is fully
      covered it takes .is-covered (hidden), so a transparent section
      further down never shows it through.
   B. The name: .hero__name (the brand, large, under the nav at the hero's
      top-left) moves and scales into the nav's .brand over the first
      data-name-morph (0.4) of the hero's height: translate(dx, dy)
      scale(s) from its top-left, the brand's rect measured once on load
      and on resize (with the nav in its solid state, which it is by then).
      The real .brand is hidden until the morph completes, then swapped.
      Reduced motion: no morph, the nav brand as always. */
(function () {
  "use strict";
  var hero = document.querySelector("main .hero");
  if (!hero) return;
  var phone = window.matchMedia("(max-width: 768px)");
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var nav = document.querySelector(".nav");
  var brand = nav ? nav.querySelector(".brand") : null;
  var name = document.querySelector(".hero__name");
  var M = parseFloat(hero.getAttribute("data-name-morph"));
  if (isNaN(M) || M <= 0) M = 0.4;
  var morph = !!(name && brand && !reduce);
  var heroTop = 0, heroH = 1, from = null, to = null, ticking = false, last = "";

  /* the hero's place in the flow (it may be stuck, so read it off the
     next block, which is not) */
  function flowTop() {
    var nx = hero.nextElementSibling;
    return nx ? nx.getBoundingClientRect().top + (window.pageYOffset || 0) - hero.offsetHeight : 0;
  }
  function measure() {
    heroTop = flowTop(); heroH = hero.offsetHeight || 1;
    if (!morph || !phone.matches) return;
    name.style.transform = "none";
    var a = name.getBoundingClientRect();
    /* the brand's slot with the nav solid (padding settles there on scroll) */
    var had = nav.classList.contains("is-solid"), tr = nav.style.transition;
    nav.style.transition = "none";
    nav.classList.add("is-solid");
    var b = brand.getBoundingClientRect();
    if (!had) nav.classList.remove("is-solid");
    void nav.offsetHeight;
    nav.style.transition = tr;
    from = { x: a.left, y: a.top, w: a.width };
    to = { x: b.left, y: b.top, w: b.width };
    last = "";
  }
  function frame() {
    ticking = false;
    var y = window.scrollY || window.pageYOffset || 0;
    var ph = phone.matches;
    hero.classList.toggle("is-covered", ph && y >= heroTop + heroH);
    if (!morph) return;
    if (!ph || !from) {
      if (last !== "off") { name.classList.remove("is-armed", "is-done"); nav.classList.remove("is-name-morph"); name.style.transform = ""; last = "off"; }
      return;
    }
    var p = Math.max(0, Math.min(1, (y - heroTop) / (M * heroH)));
    var key = p.toFixed(4);
    if (key === last) return;
    last = key;
    var s = 1 + (to.w / from.w - 1) * p;
    name.style.transform = "translate(" + ((to.x - from.x) * p).toFixed(2) + "px," + ((to.y - from.y) * p).toFixed(2) + "px) scale(" + s.toFixed(4) + ")";
    var done = p >= 1;
    name.classList.toggle("is-done", done);
    nav.classList.toggle("is-name-morph", !done);
  }
  function onScroll() { if (!ticking) { ticking = true; requestAnimationFrame(frame); } }
  function reset() { if (morph && phone.matches) name.classList.add("is-armed"); measure(); frame(); }

  reset();
  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", function () { setTimeout(reset, 60); });
  window.addEventListener("load", reset);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(reset);
  if (phone.addEventListener) phone.addEventListener("change", reset);
  else if (phone.addListener) phone.addListener(reset);
})();
