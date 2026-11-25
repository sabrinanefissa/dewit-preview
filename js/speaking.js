/* Speaking page (/speaking/). ES5, no dependencies. Loaded on this page
   only (speaking.json "scripts"), after js/main.js, which runs the reel's
   controls and the figures' count-up. Every module leaves the markup's
   final state alone when it cannot run (no IntersectionObserver, reduced
   motion, or the section already passed).
   1. The planner tools: the bio in three lengths (a button group shows
      one length at a time, aria-pressed) and the copy buttons (Clipboard
      API with a selection fallback; "Copied" for 2s, said in the live
      region).
   2. Sheets: the reel's chapters (a panel on wide screens, a bottom sheet
      on phones), and on phones the bio, the introduction and AV. Native
      dialog; Escape, the backdrop, the close button, a swipe down and the
      phone's Back close it; focus returns to the button that opened it.
   3. The reel in place: it never plays until it is opened ("Play with
      sound" or a chapter button); Close, Escape or its end bring the
      photo back.
   4. The hero heading comes into focus left to right, once.
   5. The close heading is written in, top to bottom, once.
   6. Text: the last two words of each paragraph and line stay together. */

/* 1. The planner tools. */
(function () {
  "use strict";

  [].slice.call(document.querySelectorAll(".spk-planners")).forEach(planners);

  function planners(sec) {
    var live = sec.querySelector("[aria-live]");
    function say(msg) {
      if (!live) return;
      live.textContent = "";
      setTimeout(function () { live.textContent = msg; }, 60);
    }

    /* ---- A. the bio toggle ---- */
    var bio = sec.querySelector("[data-bios]");
    var seg = bio && bio.querySelector(".spk-seg");
    var texts = bio && bio.querySelector(".spk-pl__texts");
    var btns = seg ? [].slice.call(seg.querySelectorAll(".spk-seg__btn")) : [];
    function show(btn) {
      btns.forEach(function (b) {
        var on = b === btn;
        b.setAttribute("aria-pressed", on ? "true" : "false");
        var panel = document.getElementById(b.getAttribute("aria-controls"));
        if (panel) panel.classList.toggle("is-on", on);
      });
    }
    if (seg && texts && btns.length) {
      seg.hidden = false;
      texts.setAttribute("data-bio-ready", "");
      var start = null;
      btns.forEach(function (b) { if (b.getAttribute("aria-pressed") === "true") start = b; });
      show(start || btns[0]);
      btns.forEach(function (b) {
        b.addEventListener("click", function () { show(b); });
      });
    }

    /* ---- B. copy ---- */
    function textOf(el) {
      var ps = el.querySelectorAll("p");
      if (!ps.length) return (el.textContent || "").replace(/ /g, " ").trim();
      return [].slice.call(ps).map(function (p) {
        return (p.textContent || "").replace(/ /g, " ").replace(/\s+/g, " ").trim();
      }).filter(Boolean).join("\n\n");
    }
    function fallback(txt) {
      var ta = document.createElement("textarea");
      ta.value = txt;
      ta.setAttribute("readonly", "");
      ta.style.position = "fixed"; ta.style.top = "0"; ta.style.left = "-9999px";
      document.body.appendChild(ta);
      ta.select();
      var ok = false;
      try { ok = document.execCommand("copy"); } catch (e) { ok = false; }
      document.body.removeChild(ta);
      return ok;
    }
    [].slice.call(sec.querySelectorAll(".spk-copy")).forEach(function (btn) {
      var label = btn.querySelector(".spk-copy__label");
      var idle = label ? label.textContent : "";
      var done = btn.getAttribute("data-copied") || "Copied";
      var t = 0;
      btn.hidden = false;
      function target() {
        if (btn.hasAttribute("data-copy-bio")) {
          var on = bio && bio.querySelector(".spk-pl__text.is-on .spk-pl__copytext");
          return on || (bio && bio.querySelector(".spk-pl__copytext"));
        }
        return document.getElementById(btn.getAttribute("data-copy"));
      }
      function mark(ok) {
        clearTimeout(t);
        if (!ok) { say("Copy did not work. Select the text and copy it instead."); return; }
        btn.classList.add("is-done");
        if (label) label.textContent = done;
        say(done);
        t = setTimeout(function () {
          btn.classList.remove("is-done");
          if (label) label.textContent = idle;
        }, 2000);
      }
      btn.addEventListener("click", function () {
        var el = target();
        if (!el) return;
        var txt = textOf(el);
        if (navigator.clipboard && window.isSecureContext) {
          navigator.clipboard.writeText(txt).then(function () { mark(true); },
            function () { mark(fallback(txt)); });
        } else {
          mark(fallback(txt));
        }
      });
    });
  }
})();

/* 2. Sheets. */
(function () {
  "use strict";
  if (typeof HTMLDialogElement !== "function") return;
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var phone = window.matchMedia("(max-width: 767px)");
  var open = null;

  function sheet(dlg, onClose) {
    var api = { dlg: dlg, opener: null, onClose: onClose, viaHistory: false };
    function finish() {
      if (dlg.open) dlg.close();
      if (api.onClose) api.onClose();
      if (window.spkLenis) window.spkLenis.start();
      if (api.opener && api.opener.focus) api.opener.focus();
    }
    api.show = function (opener) {
      if (open) return;
      open = api;
      api.opener = opener || null;
      dlg.showModal();
      if (window.spkLenis) window.spkLenis.stop();
      if (phone.matches) {
        try { history.pushState({ spkSheet: dlg.id }, ""); api.viaHistory = true; } catch (e) { api.viaHistory = false; }
      }
      if (reduce) dlg.classList.add("is-open");
      else requestAnimationFrame(function () { requestAnimationFrame(function () { dlg.classList.add("is-open"); }); });
    };
    api.hide = function (fromHistory) {
      if (open !== api) return;
      open = null;
      if (api.viaHistory && !fromHistory) history.back();
      api.viaHistory = false;
      dlg.classList.remove("is-open");
      if (reduce) { finish(); return; }
      setTimeout(finish, phone.matches ? 280 : 250);
    };
    dlg.addEventListener("cancel", function (e) { e.preventDefault(); api.hide(); });
    dlg.addEventListener("click", function (e) {
      if (e.target.closest("[data-sheet-close]")) { api.hide(); return; }
      if (e.target !== dlg) return;
      var r = dlg.getBoundingClientRect();
      if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) api.hide();
    });
    /* a swipe down on the handle or the title closes it */
    var y0 = null;
    [dlg.querySelector(".spk-sheet__grab"), dlg.querySelector(".spk-sheet__head")].forEach(function (h) {
      if (!h) return;
      h.addEventListener("touchstart", function (e) { y0 = e.touches[0].clientY; }, { passive: true });
      h.addEventListener("touchmove", function (e) {
        if (y0 !== null && e.touches[0].clientY - y0 > 60) { y0 = null; api.hide(); }
      }, { passive: true });
      h.addEventListener("touchend", function () { y0 = null; }, { passive: true });
    });
    return api;
  }
  /* the phone's Back closes an open sheet instead of leaving the page */
  window.addEventListener("popstate", function () {
    if (open && open.viaHistory) { open.viaHistory = false; open.hide(true); }
  });

  /* ---- the reel's chapters ---- */
  var chBtn = document.querySelector(".spk-bar__chap");
  var chDlg = chBtn && document.getElementById(chBtn.getAttribute("aria-controls"));
  if (chBtn && chDlg) {
    var ch = sheet(chDlg);
    chBtn.addEventListener("click", function () { ch.show(chBtn); });
    /* a chapter plays the reel (js/main.js); the sheet gets out of the way */
    [].slice.call(chDlg.querySelectorAll("[data-seek]")).forEach(function (b) {
      b.addEventListener("click", function () { ch.opener = null; ch.hide(); });
    });
  }

  /* ---- the planners' drop-downs: bottom sheets on phones ---- */
  var pl = document.querySelector(".spk-planners");
  var plDlg = pl && pl.querySelector("dialog.spk-pl-sheet");
  if (pl && plDlg) {
    var body = plDlg.querySelector(".spk-sheet__body");
    var title = plDlg.querySelector(".spk-sheet__h");
    var home = null, kids = [];
    var pls = sheet(plDlg, function () {
      kids.forEach(function (k) { home.appendChild(k); });
      kids = []; home = null;
    });
    [].slice.call(pl.querySelectorAll("details.dd")).forEach(function (d) {
      var sum = d.querySelector(".dd__sum");
      var inner = d.querySelector(".dd__in");
      if (!sum || !inner) return;
      /* runs before the drop-down's own handler (capture on the details) */
      d.addEventListener("click", function (e) {
        if (!phone.matches || !sum.contains(e.target)) return;
        e.preventDefault();
        e.stopPropagation();
        home = inner;
        kids = [].slice.call(inner.childNodes);
        kids.forEach(function (k) { body.appendChild(k); });
        var lab = sum.querySelector(".dd__label");
        title.textContent = lab ? lab.textContent : sum.textContent;
        pls.show(sum);
      }, true);
    });
  }
})();

/* 3. The reel in place. js/main.js runs the controls; here the reel
   only opens on a click and gives the photo back when it is closed. */
(function () {
  "use strict";
  var hero = document.querySelector(".spk-hero");
  var video = hero && hero.querySelector(".spk-hero__video");
  if (!video) return;
  var big = hero.querySelector(".spk-hero__cta");
  var bigLabel = big && big.querySelector(".spk-hero__cta-label");
  var idle = bigLabel ? bigLabel.textContent : "";
  var closeBtn = hero.querySelector("[data-reel-close]");
  function isOpen() { return hero.classList.contains("is-reel"); }
  function openReel() { hero.classList.add("is-reel"); }
  function closeReel(focus) {
    if (!video.paused) video.pause();
    video.muted = true;
    hero.classList.remove("is-reel");
    if (big) {
      big.classList.remove("is-gone");
      big.setAttribute("data-state", "start");
      if (bigLabel) bigLabel.textContent = idle;
      if (focus) big.focus();
    }
  }
  /* nothing plays at rest: a start the page made by itself is stopped */
  video.addEventListener("play", function () { if (!isOpen()) video.pause(); });
  if (big) big.addEventListener("click", openReel);
  [].slice.call(document.querySelectorAll("[data-seek]")).forEach(function (b) {
    b.addEventListener("click", openReel);
  });
  if (closeBtn) closeBtn.addEventListener("click", function () { closeReel(true); });
  video.addEventListener("ended", function () { closeReel(false); });
  document.addEventListener("keydown", function (e) {
    if ((e.key === "Escape" || e.key === "Esc") && isOpen() && !document.querySelector("dialog[open]")) closeReel(true);
  });
})();

/* 6 first, so the joined words are in place before the heading is split.
   The last two words of each paragraph and line are joined by a no-break
   space, so no line of copy ends on one word; in the close heading the
   last three are. */
(function () {
  "use strict";
  var els = [].slice.call(document.querySelectorAll(".spk-hero__h, .spk-hero__line, .spk-h2, #main p, .spk-row__t, .spk-ev__name, .spk-av li, .spk-cl__h, .spk-spoken__l, .spk-logo__name"));
  els = els.concat([].slice.call(document.querySelectorAll(".spk-cl__h")));
  els.forEach(function (el) {
    var tw = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, null, false), n, last = null;
    while ((n = tw.nextNode())) { if (/\S/.test(n.nodeValue)) last = n; }
    if (!last) return;
    var v = last.nodeValue, m = /(\S)[ \t\n]+([^ \t\n]+[ \t\n]*)$/.exec(v);
    if (m) last.nodeValue = v.slice(0, m.index + 1) + " " + m[2];
  });
})();

/* 4. The hero heading comes into focus left to right, once: each letter
   from blur(8px) to sharp over 0.9s, starting in turn by its place along
   the line, about 1.8s in all. The heading is read by its own label while
   it is split, and the plain markup returns when it has landed. */
(function () {
  "use strict";
  var h = document.querySelector(".spk-hero__h");
  if (!h) return;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  var html = h.innerHTML, SPREAD = 0.9;
  function split(node) {
    [].slice.call(node.childNodes).forEach(function (c) {
      if (c.nodeType === 1) { split(c); return; }
      if (c.nodeType !== 3) return;
      var frag = document.createDocumentFragment();
      c.nodeValue.split(/( +)/).forEach(function (part) {
        if (!part) return;
        if (/^ +$/.test(part)) { frag.appendChild(document.createTextNode(part)); return; }
        var w = document.createElement("span");
        w.className = "spk-sweep__w";
        for (var i = 0; i < part.length; i++) {
          var ch = document.createElement("span");
          ch.className = "spk-sweep__c";
          ch.textContent = part.charAt(i);
          w.appendChild(ch);
        }
        frag.appendChild(w);
      });
      node.replaceChild(frag, c);
    });
  }
  function run() {
    h.setAttribute("aria-label", h.textContent.replace(/ /g, " "));
    split(h);
    h.classList.add("is-split", "is-sweep");
    var box = h.getBoundingClientRect();
    var cs = [].slice.call(h.querySelectorAll(".spk-sweep__c"));
    cs.forEach(function (c) {
      var r = c.getBoundingClientRect();
      var x = box.width ? (r.left - box.left) / box.width : 0;
      c.style.setProperty("--d", (x * SPREAD).toFixed(3) + "s");
    });
    void h.offsetWidth;
    requestAnimationFrame(function () {
      h.classList.add("is-swept");
      setTimeout(function () {
        h.innerHTML = html;
        h.removeAttribute("aria-label");
        h.classList.remove("is-split", "is-swept");
      }, (SPREAD + 1.25) * 1000);
    });
  }
  var cap = new Promise(function (r) { setTimeout(r, 800); });
  var fonts = document.fonts && document.fonts.ready ? document.fonts.ready : cap;
  Promise.race([fonts, cap]).then(function () { requestAnimationFrame(run); });
})();

/* 5. The close heading is written in once as it arrives: a soft edge
   wipes down through it while it clears from blur(8px), 2.5s. Only a
   heading still below the screen when the page opens waits for this. */
(function () {
  "use strict";
  var h = document.querySelector(".spk-cl__h");
  if (!h || !("IntersectionObserver" in window)) return;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  if (h.getBoundingClientRect().top < window.innerHeight) return;
  var DUR = 2500;
  h.style.setProperty("--p", "0");
  h.style.setProperty("--b", "8");
  h.classList.add("is-ink");
  function ease(t) { return 1 - Math.pow(1 - t, 3); }
  var io = new IntersectionObserver(function (es, o) {
    if (!es[0].isIntersecting) return;
    o.disconnect();
    var t0 = null;
    function step(now) {
      if (t0 === null) t0 = now;
      var k = Math.min(1, (now - t0) / DUR), e = ease(k);
      h.style.setProperty("--p", (e * 140).toFixed(1));
      h.style.setProperty("--b", (8 * (1 - e)).toFixed(2));
      if (k < 1) requestAnimationFrame(step);
      else { h.classList.remove("is-ink"); h.style.removeProperty("--p"); h.style.removeProperty("--b"); }
    }
    requestAnimationFrame(step);
  }, { rootMargin: "0px 0px -25% 0px" });
  io.observe(h);
})();
