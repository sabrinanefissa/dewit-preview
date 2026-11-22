/* Speaking page (/speaking/). ES5, no dependencies. Loaded on this page
   only (speaking.json "scripts"). Every module leaves the markup's final
   state alone when it cannot run (no IntersectionObserver, reduced
   motion, or the section already passed).
   1. The planner tools: the bio in three lengths (a button group shows
      one length at a time, aria-pressed) and the copy buttons (Clipboard
      API with a selection fallback; "Copied" for 2s, said in the live
      region).
   2. The planner's room: the places are tabs for the panels beside the
      room (one open at a time, the bio first; arrow keys move between
      places, Enter or Space opens). When the room arrives a light walks
      to each place in the order a planner needs them and each lights
      with its label, once.
   3. The reel comes into focus.
   4. Rooms he speaks to: the events light in story order.
   5. What the room is carrying: the frames develop row by row.
   6. The logo wall: the marks land in turn.
   7. The testimonial: the words come up in reading order.
   8. The close: the room in the photo comes up as the page lifts off it. */
/* 1. The planner tools. */
(function () {
  "use strict";

  [].slice.call(document.querySelectorAll(".spk-planners")).forEach(planners);

  function planners(sec) {
    var live = sec.querySelector('[aria-live]');
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
      if (!ps.length) return (el.textContent || "").trim();
      return [].slice.call(ps).map(function (p) {
        return (p.textContent || "").replace(/\s+/g, " ").trim();
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

/* 2. The planner's room. */
(function () {
  "use strict";
  var sec = document.querySelector(".spk-planners");
  var room = sec && sec.querySelector(".pl-room");
  var wrap = sec && sec.querySelector(".pl-panels");
  if (!room || !wrap) return;
  var list = room.querySelector(".pl-room__tabs");
  var tabs = [].slice.call(room.querySelectorAll(".pl-tab"));
  var lits = {};
  [].slice.call(room.querySelectorAll(".pl-room__lit")).forEach(function (im) {
    var m = /pl-room__lit--(\w+)/.exec(im.className);
    if (m) lits[m[1]] = im;
  });
  var panels = {};
  tabs.forEach(function (t) {
    var p = document.getElementById(t.getAttribute("aria-controls"));
    if (p) panels[t.getAttribute("data-area")] = p;
  });
  if (!tabs.length) return;
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---- the tabs ---- */
  list.setAttribute("role", "tablist");
  tabs.forEach(function (t) {
    var p = panels[t.getAttribute("data-area")];
    t.setAttribute("role", "tab");
    if (p) { p.setAttribute("role", "tabpanel"); p.setAttribute("aria-labelledby", t.id); p.setAttribute("tabindex", "-1"); }
  });
  wrap.classList.add("is-tabbed");
  var current = null;
  function select(t, animate) {
    if (t === current) return;
    current = t;
    tabs.forEach(function (o) {
      var on = o === t, key = o.getAttribute("data-area"), p = panels[key];
      o.setAttribute("aria-selected", on ? "true" : "false");
      o.setAttribute("tabindex", on ? "0" : "-1");
      if (lits[key]) lits[key].classList.toggle("is-open", on);
      if (!p) return;
      p.hidden = !on;
      p.classList.remove("is-entering");
      if (on && animate && !reduce) { void p.offsetWidth; p.classList.add("is-entering"); }
    });
  }
  var start = tabs[0];
  var hash = (location.hash || "").slice(1);
  tabs.forEach(function (t) { if (hash && t.getAttribute("aria-controls") === hash) start = t; });
  select(start, false);
  tabs.forEach(function (t, k) {
    t.addEventListener("click", function () { select(t, true); });
    t.addEventListener("keydown", function (e) {
      var n = -1;
      if (e.key === "ArrowRight" || e.key === "ArrowDown") n = (k + 1) % tabs.length;
      else if (e.key === "ArrowLeft" || e.key === "ArrowUp") n = (k - 1 + tabs.length) % tabs.length;
      else if (e.key === "Home") n = 0;
      else if (e.key === "End") n = tabs.length - 1;
      if (n < 0) return;
      e.preventDefault();
      tabs[n].focus();
    });
  });

  /* ---- the light walks the room, once ---- */
  if (reduce || !("IntersectionObserver" in window) || !Element.prototype.animate) return;
  if (room.getBoundingClientRect().bottom < 0) return;
  var art = room.querySelector(".pl-room__art");
  var dot = room.querySelector(".pl-room__dot");
  if (!art || !dot) return;
  /* where the light lands at each place, in % of the picture, in tab order */
  var AT = { bio: [27, 43], stage: [55.5, 50], headshots: [72, 30], downloads: [29, 74], av: [76, 66] };
  var FROM = [44, 47];   /* the planner's clipboard */
  var MOVE = 700, HOLD = 280;
  room.classList.add("is-armed");
  function pos(p, o) { return { left: p[0] + "%", top: p[1] + "%", opacity: o }; }
  function run() {
    var t = 280, from = FROM;
    dot.animate([pos(FROM, 0), pos(FROM, 1)], { duration: 280, easing: "ease-out", fill: "forwards" });
    tabs.forEach(function (tab) {
      var key = tab.getAttribute("data-area"), to = AT[key] || FROM, a = from;
      setTimeout(function () {
        dot.animate([pos(a, 1), pos(to, 1)], { duration: MOVE, easing: "cubic-bezier(.45,0,.3,1)", fill: "forwards" });
      }, t);
      setTimeout(function () {
        if (lits[key]) lits[key].classList.add("is-lit");
        tab.classList.add("is-lit");
      }, t + MOVE - 80);
      t += MOVE + HOLD;
      from = to;
    });
    setTimeout(function () {
      dot.animate([pos(from, 1), pos(from, 0)], { duration: 360, easing: "ease-out", fill: "forwards" });
      room.classList.add("is-done");
    }, t);
  }
  var io = new IntersectionObserver(function (es) {
    if (!es[0].isIntersecting) return;
    io.disconnect();
    run();
  }, { threshold: 0.5 });
  io.observe(art);
})();


/* 3. The reel comes into focus. The page opens on the reel's poster soft
   and dim (css/speaking.css sets that from the first paint); once the
   poster has decoded, or after 1.5s, whichever is first, the light comes
   up and the picture sharpens over 1.4s, like a stage before a talk.
   Then the headline under the reel settles into place. Only the picture
   is blurred; no text ever is. Reduced motion: the picture and the
   headline are shown as they are, at once. */
(function () {
  "use strict";
  var hero = document.querySelector(".spk-hero");
  if (!hero) return;
  var img = hero.querySelector(".hero__poster");
  var head = document.querySelector(".spk-intro__h");
  function settle() { if (head) head.classList.add("is-settled"); }
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    hero.classList.add("is-focused"); settle(); return;
  }
  var decoded = img && img.decode ? img.decode().catch(function () {}) : Promise.resolve();
  var cap = new Promise(function (r) { setTimeout(r, 1500); });
  Promise.race([decoded, cap]).then(function () {
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        hero.classList.add("is-focused");
        setTimeout(settle, 1000);
      });
    });
  });
})();

/* 4. Rooms he speaks to: the events light in story order. When the list is
   well into view, each row comes up from quiet to full strength in
   turn; as it lands, the line from the event runs across to its talk,
   so each room visibly leads to the talk booked for it. Runs once.
   Reduced motion or no IntersectionObserver: nothing is set quiet. */
(function () {
  "use strict";
  var sec = document.querySelector(".spk-events");
  if (!sec || !("IntersectionObserver" in window)) return;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  var rows = [].slice.call(sec.querySelectorAll("tbody tr"));
  if (!rows.length) return;
  if (sec.getBoundingClientRect().bottom < 0) return;
  var table = sec.querySelector("table") || sec;
  /* the rows go quiet only once the observer has reported in */
  var io = new IntersectionObserver(function (es) {
    sec.classList.add("is-armed");
    if (!es[0].isIntersecting || es[0].intersectionRatio < 0.29) return;
    io.disconnect();
    rows.forEach(function (tr, i) {
      setTimeout(function () {
        tr.classList.add("is-lit");
      }, 200 + i * 420);
    });
  }, { threshold: 0.3 });
  io.observe(table);
})();

/* 5. What the room is carrying: each row of frames develops as it
   arrives, left to right, from dark and soft to sharp, and its lines come
   up with it. */
(function () {
  "use strict";
  var sec = document.querySelector(".spk-unsaid");
  if (!sec || !("IntersectionObserver" in window)) return;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  if (sec.getBoundingClientRect().bottom < 0) return;
  var items = [].slice.call(sec.querySelectorAll(".spk-unsaid__lines > li"));
  if (!items.length) return;
  function stagger() {
    var top = null, col = 0;
    items.forEach(function (li) {
      var y = li.offsetTop;
      col = (top === null || Math.abs(y - top) > 4) ? 0 : col + 1;
      top = y;
      li.style.setProperty("--d", (col * 180) + "ms");
    });
  }
  stagger();
  sec.classList.add("is-armed");
  var io = new IntersectionObserver(function (es) {
    es.forEach(function (e) {
      if (!e.isIntersecting) return;
      var li = e.target;
      io.unobserve(li);
      li.classList.add("is-lit");
      setTimeout(function () { li.classList.add("is-settled"); }, 1800);
    });
  }, { threshold: 0.35 });
  items.forEach(function (li) { io.observe(li); });
})();

/* 6. The logo wall: when the wall arrives the marks land one after
   another, in reading order. 3s after it is armed the wall stands in full
   whether or not the observer has reported. */
(function () {
  "use strict";
  var sec = document.querySelector(".spk-logos");
  if (!sec || !("IntersectionObserver" in window)) return;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  if (sec.getBoundingClientRect().bottom < 0) return;
  var wall = sec.querySelector(".spk-logos__wall");
  var marks = wall ? [].slice.call(wall.children) : [];
  if (!marks.length) return;
  marks.forEach(function (li, i) { li.style.setProperty("--d", (i * 110) + "ms"); });
  sec.classList.add("is-armed");
  function land() { io.disconnect(); marks.forEach(function (li) { li.classList.add("is-in"); }); }
  var io = new IntersectionObserver(function (es) {
    if (es[0].isIntersecting) land();
  }, { threshold: 0.3 });
  io.observe(wall);
  setTimeout(land, 3000);
})();

/* 7. The testimonial: each word is wrapped in its own span; when the
   quote arrives the words come up from quiet in reading order, then the
   name. */
(function () {
  "use strict";
  var sec = document.querySelector("main .quote");
  if (!sec || !("IntersectionObserver" in window)) return;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  if (sec.getBoundingClientRect().bottom < 0) return;
  var p = sec.querySelector(".quote__q p");
  if (!p) return;
  var texts = [], walker = document.createTreeWalker(p, NodeFilter.SHOW_TEXT, null, false), n;
  while ((n = walker.nextNode())) texts.push(n);
  var words = [];
  texts.forEach(function (node) {
    var parts = node.nodeValue.split(/(\s+)/), frag = document.createDocumentFragment();
    parts.forEach(function (part) {
      if (!part) return;
      if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(part)); return; }
      var s = document.createElement("span");
      s.className = "q-w";
      s.textContent = part;
      frag.appendChild(s);
      words.push(s);
    });
    node.parentNode.replaceChild(frag, node);
  });
  if (!words.length) return;
  var step = Math.min(70, 2200 / words.length);
  words.forEach(function (w, i) { w.style.setProperty("--d", Math.round(i * step) + "ms"); });
  sec.style.setProperty("--by", Math.round(words.length * step + 200) + "ms");
  sec.classList.add("is-armed");
  var io = new IntersectionObserver(function (es) {
    if (!es[0].isIntersecting) return;
    io.disconnect();
    sec.classList.add("is-read");
  }, { threshold: 0.45 });
  io.observe(p);
})();

/* 8. The close: the footer waits under the page, so the room in its photo
   comes up (from dim and close in to full) as the page first lifts off
   it, once. */
(function () {
  "use strict";
  var close = document.querySelector(".spk-close");
  var main = document.querySelector("main");
  if (!close || !main) return;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  var img = close.querySelector(".spk-close__img");
  if (!img) return;
  /* the photo counts as seen once half the close is out from under the page */
  function seen() {
    var r = close.getBoundingClientRect();
    return r.top < innerHeight * 0.85 && main.getBoundingClientRect().bottom < r.top + r.height * 0.5;
  }
  if (seen()) return;
  close.classList.add("is-armed");
  function up() {
    window.removeEventListener("scroll", check);
    if (io) io.disconnect();
    close.classList.add("is-up");
  }
  function check() { if (seen()) up(); }
  window.addEventListener("scroll", check, { passive: true });
  /* without scroll events: up 2.5s after the close is on screen */
  var io = "IntersectionObserver" in window ? new IntersectionObserver(function (es) {
    if (es[0].isIntersecting) setTimeout(up, 2500);
  }) : null;
  if (io) io.observe(close); else setTimeout(up, 2500);
})();
