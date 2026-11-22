/* Same patterns (section.patterns): the word in the headline, the rail of
   seven words, and the word's two rooms. Choosing a word (its button, or
   previous / next) shows it; the home room lights first, a small light
   crosses to the work room, and the work room lights. The first word plays
   once when the rooms scroll into view. Nothing advances on its own.
   Reduced motion, no IntersectionObserver or no Web Animations: the words
   still change, and both rooms show in full colour throughout. */
(function () {
  "use strict";
  [].slice.call(document.querySelectorAll("section.patterns")).forEach(function (sec) {
    var slot  = sec.querySelector(".patterns__slot");
    var words = [].slice.call(sec.querySelectorAll(".patterns__word"));
    var picks = [].slice.call(sec.querySelectorAll(".patterns__pick"));
    var rail  = sec.querySelector(".patterns__rail");
    var prev  = sec.querySelector(".patterns__arrow--prev");
    var next  = sec.querySelector(".patterns__arrow--next");
    var box   = sec.querySelector(".patterns__rooms");
    var rooms = [].slice.call(sec.querySelectorAll(".patterns__room"));
    var dot   = sec.querySelector(".patterns__dot");
    var live  = sec.querySelector("[aria-live]");
    var N = words.length;
    if (!N || !slot || !box || rooms.length !== 2) return;

    var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    var motion = !reduce && "IntersectionObserver" in window && !!Element.prototype.animate && !!dot;
    var cur = 0, run = 0, seen = false;
    /* where the light lands in each room: the middle of its floor */
    var LAND = { x: 50, y: 64 };

    function each(list, i, fn) { list.forEach(function (el) { fn(el, +el.getAttribute("data-i") === i); }); }
    function wrap(i) { return ((i % N) + N) % N; }
    function textOf(el) { return el ? el.textContent.replace(/\s+/g, " ").trim() : ""; }

    /* the light's position in the rooms box, at a point of one room's art */
    function at(room, p) {
      var a = room.querySelector(".patterns__art").getBoundingClientRect();
      var b = box.getBoundingClientRect();
      return { left: (a.left - b.left + a.width * p.x / 100) + "px", top: (a.top - b.top + a.height * p.y / 100) + "px" };
    }
    function lightRoom(room, i) {
      room.classList.add("is-lit");
      var pic = room.querySelector('.patterns__pic[data-i="' + i + '"]');
      if (pic) pic.classList.add("is-lit");
    }
    function sleep(k) { rooms.forEach(function (r) { r.classList.remove("is-lit"); }); }

    function play(i) {
      var token = ++run;
      var home = rooms[0], work = rooms[1];
      sleep();
      rooms.forEach(function (r) {
        r.style.setProperty("--lx", LAND.x + "%"); r.style.setProperty("--ly", LAND.y + "%");
        [].slice.call(r.querySelectorAll(".patterns__pic")).forEach(function (p) {
          if (+p.getAttribute("data-i") === i) p.classList.remove("is-lit");
        });
      });
      var h = at(home, LAND), w = at(work, LAND);
      var start = { left: h.left, top: (parseFloat(h.top) - 60) + "px" };
      function later(ms, fn) { setTimeout(function () { if (token === run) fn(); }, ms); }
      dot.getAnimations().forEach(function (an) { an.cancel(); });
      dot.animate([{ left: start.left, top: start.top, opacity: 0 }, { left: h.left, top: h.top, opacity: 1 }],
        { duration: 520, easing: "cubic-bezier(.3,0,.2,1)", fill: "forwards" });
      later(460, function () { lightRoom(home, i); });
      later(1150, function () {
        dot.animate([{ left: h.left, top: h.top, opacity: 1 }, { left: w.left, top: w.top, opacity: 1 }],
          { duration: 760, easing: "cubic-bezier(.45,0,.3,1)", fill: "forwards" });
      });
      later(1840, function () { lightRoom(work, i); });
      later(2250, function () {
        dot.animate([{ left: w.left, top: w.top, opacity: 1 }, { left: w.left, top: w.top, opacity: 0 }],
          { duration: 420, easing: "ease-out", fill: "forwards" });
      });
    }

    /* the slot eases from the old word's width to the new one's */
    function sizeSlot(oldW) {
      if (reduce || window.matchMedia("(max-width: 760px)").matches) { slot.style.width = ""; return; }
      slot.style.width = "";
      var nw = slot.getBoundingClientRect().width;
      slot.style.width = oldW + "px";
      void slot.offsetWidth;
      slot.style.width = nw + "px";
    }

    function show(i, user) {
      i = wrap(i);
      var oldW = slot.getBoundingClientRect().width;
      var changed = i !== cur;
      cur = i;
      each(words, i, function (el, on) {
        el.hidden = !on; el.classList.toggle("is-on", on);
        el.classList.toggle("is-in", on && changed && !reduce);
      });
      each(picks, i, function (el, on) { el.classList.toggle("is-on", on); el.setAttribute("aria-pressed", on ? "true" : "false"); });
      rooms.forEach(function (r) {
        each([].slice.call(r.querySelectorAll(".patterns__pic")), i, function (el, on) { el.classList.toggle("is-on", on); });
        each([].slice.call(r.querySelectorAll(".patterns__line")), i, function (el, on) {
          el.hidden = !on; el.classList.toggle("is-on", on);
          el.classList.toggle("is-in", on && changed && !reduce);
        });
      });
      if (changed) sizeSlot(oldW);
      if (user && live) {
        live.textContent = textOf(sec.querySelector(".patterns__h")) + " " + rooms.map(function (r) {
          return textOf(r.querySelector(".patterns__label")) + ": " + textOf(r.querySelector(".patterns__line.is-on"));
        }).join(" ");
      }
      /* keep the chosen word in view in the phone rail */
      var pk = picks[i];
      if (rail && pk && rail.scrollWidth > rail.clientWidth + 1) {
        var left = pk.offsetLeft - (rail.clientWidth - pk.offsetWidth) / 2;
        if (rail.scrollTo) rail.scrollTo({ left: left, behavior: reduce ? "auto" : "smooth" }); else rail.scrollLeft = left;
      }
      if (motion && (seen || user)) { seen = true; loadAll(); play(i); }
    }

    var loaded = false;
    function loadAll() {
      if (loaded) return; loaded = true;
      [].slice.call(sec.querySelectorAll('img[loading="lazy"]')).forEach(function (im) { im.setAttribute("loading", "eager"); });
    }

    picks.forEach(function (b) {
      b.addEventListener("click", function () { show(+b.getAttribute("data-i"), true); });
    });
    if (prev) prev.addEventListener("click", function () { show(cur - 1, true); });
    if (next) next.addEventListener("click", function () { show(cur + 1, true); });
    window.addEventListener("resize", function () { slot.style.width = ""; }, { passive: true });

    if (!motion) return;
    /* armed: the rooms rest dim until the light reaches them */
    sec.classList.add("is-armed");
    var io = new IntersectionObserver(function (es) {
      if (!es[0].isIntersecting) return;
      io.disconnect();
      if (seen) return;
      seen = true; loadAll(); play(cur);
    }, { threshold: 0.45 });
    io.observe(box);
  });
})();

/* Credibility (section.orgband): the marks rise in once, in order, when
   the band comes into view. Hidden states are armed only here; reduced
   motion or no IntersectionObserver leaves every mark showing, and a timed
   fallback shows them if the observer never fires. */
(function () {
  "use strict";
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches || !("IntersectionObserver" in window)) return;
  [].slice.call(document.querySelectorAll("section.orgband")).forEach(function (sec) {
    var r = sec.getBoundingClientRect();
    if (r.top < window.innerHeight * 0.9) return;   /* already on screen: leave it as it is */
    sec.classList.add("is-armed");
    function show() { sec.classList.add("is-in"); }
    var fired = false;
    var io = new IntersectionObserver(function (es) {
      fired = true;
      if (!es[0].isIntersecting) return;
      io.disconnect(); show();
    }, { threshold: 0.25 });
    io.observe(sec);
    /* the observer never reported: show the marks; and 3s after arming
       they stand in full whatever the observer does */
    setTimeout(function () { if (!fired) { io.disconnect(); show(); } }, 1500);
    setTimeout(function () { io.disconnect(); show(); }, 3000);
  });
})();
