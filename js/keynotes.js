/* Keynotes page (/keynotes/): the three talks as rooms, and the
   testimonial read word by word. Self-contained, loaded with defer. */

/* The rooms (kn-intro.njk). Each room is the button for its talk: a
   click, tap, Enter or Space opens that talk under the row and closes
   the one that was open; focus alone never opens one. Left and Right
   (and Up, Down, Home, End) move focus between the rooms. The lit
   stretch of the hairline under the row slides under the open room.
   On arrival the rooms are grey and dim; a small light travels the row
   left to right at floor height, the colour following it through each
   room, and each room's number and title light as it is reached. Runs
   once, about 3s. Phones: no light, the rooms come up in turn.
   A link to a talk (#lead-human, #invisible-friction,
   #hidden-multiplier) opens it and scrolls to it, with the rooms lit at
   once. Reduced motion, or no IntersectionObserver or Web Animations:
   the rooms show in full colour at once. */
(function () {
  "use strict";
  var root = document.querySelector("[data-kn-rooms]");
  if (!root) return;
  var row = root.querySelector(".kn-rooms__row");
  var rooms = [].slice.call(root.querySelectorAll(".kn-room"));
  var btns = rooms.map(function (li) { return li.querySelector(".kn-room__btn"); });
  var talks = btns.map(function (b) { return document.getElementById(b.getAttribute("aria-controls")); });
  var mark = root.querySelector(".kn-rooms__mark");
  var dot = root.querySelector(".kn-rooms__dot");
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var phone = window.matchMedia("(max-width: 767px)");
  var open = 0;

  function place() {
    if (!mark) return;
    var r = root.getBoundingClientRect(), b = btns[open].getBoundingClientRect();
    mark.style.setProperty("--mx", (b.left - r.left) + "px");
    mark.style.setProperty("--mw", b.width + "px");
  }

  function show(i, how) {
    if (i < 0 || i >= btns.length || !talks[i]) return;
    var was = open;
    open = i;
    btns.forEach(function (b, k) { b.setAttribute("aria-expanded", k === i ? "true" : "false"); });
    talks.forEach(function (t, k) { if (t) t.classList.toggle("is-open", k === i); });
    place();
    if (how === "instant" || reduce || i === was) return;
    var t = talks[i];
    t.classList.remove("is-entering");
    void t.offsetWidth;
    t.classList.add("is-entering");
    setTimeout(function () { t.classList.remove("is-entering"); }, 700);
    /* a talk that opens out of sight is brought just into view */
    var top = t.getBoundingClientRect().top, vh = window.innerHeight;
    if (top > vh - 140) window.scrollBy({ top: top - vh * 0.45, behavior: "smooth" });
    /* on phones the tapped room slides fully into the row */
    if (phone.matches) rooms[i].scrollIntoView({ behavior: "smooth", block: "nearest", inline: "start" });
  }

  btns.forEach(function (b, i) {
    b.addEventListener("click", function () {
      show(i);
      if (history.replaceState) history.replaceState(null, "", "#" + talks[i].id);
    });
    b.addEventListener("keydown", function (e) {
      var k = e.key, n = btns.length, j = -1;
      if (k === "ArrowRight" || k === "ArrowDown") j = (i + 1) % n;
      else if (k === "ArrowLeft" || k === "ArrowUp") j = (i - 1 + n) % n;
      else if (k === "Home") j = 0;
      else if (k === "End") j = n - 1;
      if (j < 0) return;
      e.preventDefault();
      btns[j].focus();
    });
  });

  function fromHash() {
    var id = decodeURIComponent((location.hash || "").slice(1));
    if (!id) return -1;
    for (var k = 0; k < talks.length; k++) if (talks[k] && talks[k].id === id) return k;
    return -1;
  }
  function go(k) {
    show(k, "instant");
    if (phone.matches) row.scrollLeft = rooms[k].offsetLeft - rooms[0].offsetLeft;
    talks[k].scrollIntoView({ block: "start" });
  }
  window.addEventListener("hashchange", function () { var k = fromHash(); if (k >= 0) go(k); });
  window.addEventListener("resize", place);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(place);

  var start = fromHash();
  show(start >= 0 ? start : 0, "instant");
  if (start >= 0) {
    if (document.readyState === "complete") go(start);
    else window.addEventListener("load", function () { go(start); });
  }

  /* the arrival */
  if (start >= 0 || reduce || !("IntersectionObserver" in window) || !Element.prototype.animate) return;
  if (root.getBoundingClientRect().bottom < 0) return;
  root.classList.add("is-armed");

  function lightAll() {
    rooms.forEach(function (r) { r.classList.add("is-lit"); });
    root.classList.add("is-done");
    place();
  }
  var guard = 0;

  function ready(img) {
    if (!img || img.complete) return Promise.resolve();
    return new Promise(function (res) { img.addEventListener("load", res); img.addEventListener("error", res); });
  }

  function wipe(li, ms, delay) {
    var lit = li.querySelector(".kn-room__lit");
    var a = lit.animate([{ clipPath: "inset(0 100% 0 0)" }, { clipPath: "inset(0 0% 0 0)" }],
      { duration: ms, delay: delay || 0, easing: "linear", fill: "forwards" });
    a.onfinish = function () { li.classList.add("is-lit"); a.cancel(); };
  }

  function runPhone() {
    rooms.forEach(function (li, k) { wipe(li, 700, 200 + k * 380); });
    setTimeout(function () { clearTimeout(guard); lightAll(); }, 200 + rooms.length * 380 + 760);
  }

  function runRow() {
    var base = root.getBoundingClientRect();
    var MOVE = 780, HOP = 170, t = 0, steps = [];
    rooms.forEach(function (li) {
      var art = li.querySelector(".kn-room__art").getBoundingClientRect();
      var y = art.top - base.top + art.height * 0.62;
      steps.push({ li: li, x0: art.left - base.left + art.width * 0.04, x1: art.right - base.left - art.width * 0.04, y: y });
    });
    var kf = [], first = steps[0];
    function at(x, y, o) { return { transform: "translate(" + x.toFixed(1) + "px," + y.toFixed(1) + "px)", opacity: o }; }
    /* one continuous path: fade in at the first room's edge, cross each
       room at a steady pace, hop the gaps quickly, fade out at the end */
    var total = 300 + steps.length * MOVE + (steps.length - 1) * HOP + 360;
    function off(ms) { return ms / total; }
    kf.push(Object.assign(at(first.x0, first.y, 0), { offset: 0 }));
    t = 300;
    kf.push(Object.assign(at(first.x0, first.y, 1), { offset: off(t) }));
    steps.forEach(function (s, k) {
      if (k > 0) { t += HOP; kf.push(Object.assign(at(s.x0, s.y, 1), { offset: off(t) })); }
      wipe(s.li, MOVE, t);
      t += MOVE;
      kf.push(Object.assign(at(s.x1, s.y, 1), { offset: off(t) }));
    });
    kf.push(Object.assign(at(steps[steps.length - 1].x1, steps[steps.length - 1].y, 0), { offset: 1 }));
    var a = dot.animate(kf, { duration: total, easing: "linear", fill: "forwards" });
    a.onfinish = function () { clearTimeout(guard); lightAll(); };
  }

  var io = new IntersectionObserver(function (es) {
    if (!es[0].isIntersecting) return;
    io.disconnect();
    var imgs = rooms.map(function (li) { return li.querySelector(".kn-room__lit"); });
    /* never leave the rooms asleep: a slow picture or a hidden tab lights them */
    guard = setTimeout(lightAll, 7000);
    Promise.all(imgs.map(ready)).then(function () {
      setTimeout(function () {
        if (root.classList.contains("is-done")) return;
        if (phone.matches || !dot) runPhone(); else runRow();
      }, 250);
    });
  }, { threshold: 0.35 });
  io.observe(row);
})();

/* The testimonial: its words start faint and come to full strength in
   reading order as the quote moves up the screen, as if it were being
   said. The scroll sets how far the reading has got (the quote's top
   from 92% to 30% of the screen); the words catch up at a speaking
   pace, never faster than one every 45ms, so a fast scroll still reads
   as a sentence. It only goes forward and runs once.
   Reduced motion, or no IntersectionObserver: the words are never set
   faint. Arriving below it, or scrolling past it before it is read:
   every word is at full strength. */
(function () {
  "use strict";
  var p = document.querySelector(".kn-intro ~ .quote .quote__q p");
  if (!p || !("IntersectionObserver" in window)) return;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  var walker = document.createTreeWalker(p, NodeFilter.SHOW_TEXT, null, false);
  var nodes = [], node;
  while ((node = walker.nextNode())) nodes.push(node);
  nodes.forEach(function (tn) {
    var parts = tn.nodeValue.split(/(\s+)/);
    if (parts.length < 2 && !parts[0]) return;
    var frag = document.createDocumentFragment();
    parts.forEach(function (part) {
      if (!part) return;
      if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(part)); return; }
      var w = document.createElement("span");
      w.className = "kn-w";
      w.textContent = part;
      frag.appendChild(w);
    });
    tn.parentNode.replaceChild(frag, tn);
  });
  var words = [].slice.call(p.querySelectorAll(".kn-w"));
  if (!words.length) return;

  var shown = 0, want = 0, timer = 0, done = false, io;
  function light(n) { for (var i = shown; i < n; i++) words[i].classList.add("is-on"); shown = n; }
  function finish() {
    done = true;
    clearTimeout(timer);
    light(words.length);
    window.removeEventListener("scroll", read);
    window.removeEventListener("resize", read);
    if (io) io.disconnect();
  }
  function tick() {
    timer = 0;
    if (shown < want) light(shown + 1);
    if (shown >= words.length) { finish(); return; }
    if (shown < want) timer = setTimeout(tick, 45);
  }
  function read() {
    if (done) return;
    var r = p.getBoundingClientRect(), vh = window.innerHeight;
    var a = vh * 0.92, b = vh * 0.30;
    var k = Math.max(0, Math.min(1, (a - r.top) / (a - b)));
    var n = Math.ceil(k * words.length);
    if (n > want) want = n;
    if (shown < want && !timer) tick();
  }

  /* the words go faint only once the observer has reported in, and are
     all at full strength 6s after the quote first comes on screen */
  var armed = false, safety = 0;
  io = new IntersectionObserver(function (es) {
    if (done) return;
    if (!armed) {
      armed = true;
      if (es[0].boundingClientRect.bottom < 0) { finish(); return; }
      p.classList.add("is-reading");
    }
    if (es[0].isIntersecting) {
      if (!safety) safety = setTimeout(finish, 6000);
      window.addEventListener("scroll", read, { passive: true }); window.addEventListener("resize", read, { passive: true }); read();
    }
    else if (es[0].boundingClientRect.bottom < 0) finish();
    else window.removeEventListener("scroll", read);
  });
  io.observe(p);
})();
