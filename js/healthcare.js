/* Healthcare page (/healthcare/). Six small, self-contained parts, each
   guarded on its own element:
   1. the lifting stack: carried lines lift, outcomes come up (hc-talk)
   2. the rooms this is for: the light, then rooms that open (hc-who)
   3. what the room walks out with: the small rooms light in turn (hc-out)
   4. the quote laid down as it arrives
   5. the logos landing one after another
   6. the close photo coming up as the page lifts off it
   Motion is CSS transitions on opacity, transform, filter and clip-path
   (css/healthcare.css); the script only adds classes. Every part plays
   once. A hidden starting state is only ever set from inside an
   IntersectionObserver callback, so if the observer never reports,
   nothing is hidden. Reduced motion, Save-Data or no
   IntersectionObserver: nothing is armed and everything stands in its
   final state; the rooms still open on hover and tap.
   Self-contained ES5, loaded with defer. */
(function () {
  "use strict";
  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var save = !!(navigator.connection && navigator.connection.saveData);
  var still = reduce || save || !("IntersectionObserver" in window);

  function num(el, name, d) {
    var v = parseFloat(el.getAttribute(name));
    return isNaN(v) || v < 0 ? d : v;
  }
  function above(el) { return el.getBoundingClientRect().bottom < 0; }

  /* Arm on the observer's first report, play once the element is well in
     view. Already scrolled past: play at once in its final state, unarmed.
     A late safety check plays it if it sits in view and never played. */
  function once(el, arm, play, threshold) {
    if (above(el)) { play(true); return; }
    var armed = false, played = false;
    function go() {
      if (played) return;
      played = true;
      play(false);
    }
    var io = new IntersectionObserver(function (es) {
      var e = es[0];
      if (!armed) { armed = true; arm(); }
      if (e.isIntersecting && e.intersectionRatio >= (threshold || 0.3) - 0.01) { io.disconnect(); go(); }
    }, { threshold: threshold || 0.3, rootMargin: "0px 0px -6% 0px" });
    io.observe(el);
    /* the timed fallback: if the observer armed it but never reported it
       in view, a plain scroll check plays it when it is on the screen */
    setTimeout(function () {
      if (!armed || played) return;
      function check() {
        var r = el.getBoundingClientRect();
        if (r.top < window.innerHeight && r.bottom > 0) {
          window.removeEventListener("scroll", check);
          io.disconnect(); go();
        }
      }
      window.addEventListener("scroll", check, { passive: true });
      check();
    }, 2500);
  }

  /* run fn on scroll, one frame at a time, while el is on the screen,
     and once more as it leaves, so a fast scroll past still lands */
  function scrollWhileNear(el, fn) {
    var ticking = false, listening = false, done = false;
    function frame() { ticking = false; if (!done) fn(); }
    function onScroll() { if (!ticking) { ticking = true; requestAnimationFrame(frame); } }
    var io = new IntersectionObserver(function (es) {
      if (done) return;
      if (es[0].isIntersecting && !listening) { listening = true; window.addEventListener("scroll", onScroll, { passive: true }); frame(); }
      else if (!es[0].isIntersecting && listening) { listening = false; window.removeEventListener("scroll", onScroll); fn(); }
    }, { threshold: 0 });
    io.observe(el);
    return function stop() {
      done = true;
      io.disconnect();
      if (listening) window.removeEventListener("scroll", onScroll);
    };
  }

  /* light items one by one, in order, never faster than gap ms apart */
  function pump(items, onEach, gap, onDone) {
    var lit = 0, queued = 0, busy = false;
    function step() {
      busy = false;
      if (lit >= queued) return;
      onEach(items[lit], lit);
      lit++;
      if (lit >= items.length) { if (onDone) onDone(); return; }
      if (lit < queued) { busy = true; setTimeout(step, gap); }
    }
    return function upTo(n) {
      n = Math.min(items.length, n);
      if (n <= queued) return;
      queued = n;
      if (!busy) step();
    };
  }

  /* ---- 1. the lifting stack ----
     As the reader scrolls through the stack (about half a screen and a
     bit: data-span) the carried lines lift one at a time, top first, and
     each brings up the outcome across from it; the last outcome comes
     with the last line. Never reverses. */
  function lift(root) {
    var lines = [].slice.call(root.querySelectorAll(".hc-lift__line"));
    var outs = [].slice.call(root.querySelectorAll(".hc-lift__outs li"));
    if (!lines.length || !outs.length) return;
    var phone = window.innerWidth <= 900;
    var SPAN = phone ? 0.35 : num(root, "data-span", 0.6);
    var LIFT = num(root, "data-lift", 640);
    var SETTLE = num(root, "data-settle", 520);
    var START = phone ? 0.85 : 0.6;
    var n = lines.length;
    root.style.setProperty("--hc-lift", LIFT + "ms");
    root.style.setProperty("--hc-settle", SETTLE + "ms");

    function showOut(k) { if (outs[k]) outs[k].classList.add("is-on"); }
    function finish() {
      for (var k = 0; k < outs.length; k++) showOut(k);
      root.classList.add("is-done");
    }
    var stop = function () {};
    var up = pump(lines, function (line, k) {
      line.classList.add("is-lifted");
      setTimeout(function () { showOut(k); }, 140);
    }, 110, function () { setTimeout(finish, 260); stop(); });

    once(root, function () { root.classList.add("is-armed"); }, function (past) {
      if (past) return;
      /* without scroll events the stack still completes, 6s after it shows */
      setTimeout(function () { up(n); }, 6000);
      stop = scrollWhileNear(root, function () {
        var vh = window.innerHeight;
        var p = (START * vh - root.getBoundingClientRect().top) / (SPAN * vh);
        if (p > 0) up(Math.floor(p * (n + 1) + 1e-6));
      });
    }, 0.01);
  }

  /* ---- 2. the rooms this is for ----
     Each title becomes a button for its room. A room opens while the
     pointer is over it or its title, and stays open after a click, tap,
     Enter or Space until it is clicked again, another room is chosen or
     Escape is pressed. Focus alone opens nothing.
     On arrival the rooms start pale; a small light leaves the middle and
     moves room to room in the order of the list, each room coming up as
     it lands, then goes out. Runs once, about 4s. */
  function hub(el) {
    var art = el.querySelector(".hc-who__art");
    var dot = el.querySelector(".hc-who__dot");
    var rooms = [].slice.call(el.querySelectorAll(".hc-who__room"));
    var items = [].slice.call(el.querySelectorAll(".hc-who__item"));
    if (!art || !rooms.length || rooms.length !== items.length) return;

    var hovered = null, pinned = null, btns = [];
    function show() {
      var k = hovered !== null ? hovered : pinned;
      el.classList.toggle("has-open", k !== null);
      for (var i = 0; i < rooms.length; i++) {
        var on = i === k;
        rooms[i].classList.toggle("is-open", on);
        items[i].classList.toggle("is-open", on);
        if (btns[i]) btns[i].setAttribute("aria-expanded", on ? "true" : "false");
      }
    }
    function pin(k) {
      if (pinned === k) { pinned = null; hovered = null; } else pinned = k;
      show();
    }
    function bindHover(node, k) {
      node.addEventListener("pointerenter", function (e) { if (e.pointerType === "mouse") { hovered = k; show(); } });
      node.addEventListener("pointerleave", function (e) { if (e.pointerType === "mouse" && hovered === k) { hovered = null; show(); } });
    }
    items.forEach(function (li, k) {
      var h = li.querySelector(".hc-who__name");
      var t = li.querySelector(".hc-who__nt");
      var p = li.querySelector(".hc-who__text");
      if (!h || !t) return;
      var b = document.createElement("button");
      b.type = "button";
      b.className = "hc-who__btn";
      b.setAttribute("aria-expanded", "false");
      if (p && p.id) b.setAttribute("aria-controls", p.id);
      h.replaceChild(b, t);
      b.appendChild(t);
      b.addEventListener("click", function () { pin(k); });
      btns[k] = b;
      bindHover(li, k);
    });
    rooms.forEach(function (r, k) {
      r.addEventListener("click", function () { pin(k); });
      bindHover(r, k);
    });
    el.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && (pinned !== null || hovered !== null)) { pinned = hovered = null; show(); }
    });
    el.classList.add("is-live");

    if (still || !dot || !Element.prototype.animate) return;
    var MOVE = 720, HOLD = 260;
    function centre(node) {
      var a = art.getBoundingClientRect(), r = node.getBoundingClientRect();
      return [((r.left + r.width / 2) - a.left) / a.width * 100, ((r.top + r.height * 0.55) - a.top) / a.height * 100];
    }
    function pos(p, o) { return { left: p[0] + "%", top: p[1] + "%", opacity: o }; }
    function light(k) {
      rooms[k].classList.add("is-lit");
      items[k].classList.add("is-lit");
    }
    function run() {
      var from = [50, 50], t = 280;
      dot.animate([pos(from, 0), pos(from, 1)], { duration: 280, easing: "ease-out", fill: "forwards" });
      rooms.forEach(function (r, k) {
        var a = from, to = centre(r);
        setTimeout(function () {
          dot.animate([pos(a, 1), pos(to, 1)], { duration: MOVE, easing: "cubic-bezier(.45,0,.3,1)", fill: "forwards" });
        }, t);
        setTimeout(function () { light(k); }, t + MOVE - 80);
        t += MOVE + HOLD;
        from = to;
      });
      setTimeout(function () {
        dot.animate([pos(from, 1), pos(from, 0)], { duration: 360, easing: "ease-out", fill: "forwards" });
        el.classList.add("is-done");
      }, t);
    }
    once(art, function () { el.classList.add("is-armed"); }, function (past) {
      if (past) return;
      run();
    }, 0.5);
  }

  /* ---- 3. what the room walks out with ----
     The rooms light left to right as the row comes up the screen (on
     phones, each as it reaches the lower part of the screen), at least a
     beat apart, each word with its room. Never reverses. */
  function outs(list) {
    var rooms = [].slice.call(list.querySelectorAll(".hc-out__room"));
    if (!rooms.length) return;
    var stop = function () {};
    var up = pump(rooms, function (r) { r.classList.add("is-lit"); }, 170, function () { stop(); });
    var narrow = window.matchMedia("(max-width: 900px)");
    once(list, function () { list.classList.add("is-armed"); }, function (past) {
      if (past) return;
      /* without scroll events every room still lights, 6s after the row shows */
      setTimeout(function () { up(rooms.length); }, 6000);
      stop = scrollWhileNear(list, function () {
        var vh = window.innerHeight, n = 0;
        if (narrow.matches) {
          for (var i = 0; i < rooms.length; i++) if (rooms[i].getBoundingClientRect().top < vh * 0.8) n = i + 1;
        } else {
          var p = (vh * 0.92 - list.getBoundingClientRect().top) / (vh * 0.42);
          n = Math.floor(p * rooms.length + 1e-6);
        }
        if (n > 0) up(n);
      });
    }, 0.01);
  }

  /* ---- 4. the quote: laid down top to bottom ---- */
  function quote(q) {
    once(q, function () { q.classList.add("is-armed"); }, function (past) {
      if (!past) q.classList.add("is-in");
    }, 0.35);
  }

  /* ---- 5. the logos: land one after another; all in place 3s after
     the row is armed, whatever the observer does ---- */
  function logos(row) {
    var lis = [].slice.call(row.children);
    if (!lis.length) return;
    once(row, function () {
      row.classList.add("is-armed");
      setTimeout(function () { lis.forEach(function (li) { li.classList.add("is-in"); }); }, 3000);
    }, function (past) {
      if (past) return;
      lis.forEach(function (li, k) {
        setTimeout(function () { li.classList.add("is-in"); }, k * 120);
      });
    }, 0.4);
  }

  /* ---- 6. the close: the photo comes up as the page lifts off it ----
     The close sits in the footer, which may be fixed under the page, so
     what counts is the higher of its own top and the bottom of main.
     Armed from the observer's first report, like the rest. */
  function close(c) {
    var main = document.querySelector("main");
    var done = false, ticking = false;
    function check() {
      ticking = false;
      if (done) return;
      var top = c.getBoundingClientRect().top;
      if (main) top = Math.max(top, main.getBoundingClientRect().bottom);
      if (top < window.innerHeight * 0.8) {
        done = true;
        c.classList.add("is-in");
        window.removeEventListener("scroll", onScroll);
      }
    }
    function onScroll() { if (!ticking) { ticking = true; requestAnimationFrame(check); } }
    var armed = false;
    var io = new IntersectionObserver(function (es) {
      if (!armed) {
        armed = true;
        c.classList.add("is-armed");
        window.addEventListener("scroll", onScroll, { passive: true });
        requestAnimationFrame(check);
      }
      /* without scroll events: in 2.5s after it is on screen */
      if (es[0].isIntersecting) {
        io.disconnect();
        setTimeout(function () { if (!done) { done = true; c.classList.add("is-in"); window.removeEventListener("scroll", onScroll); } }, 2500);
      }
    });
    io.observe(c);
  }

  function init() {
    var h = document.querySelector("[data-hc-hub]");
    if (h) hub(h);
    if (still) return;
    [].slice.call(document.querySelectorAll("[data-hc-lift]")).forEach(lift);
    var o = document.querySelector("[data-hc-out]");
    if (o) outs(o);
    var q = document.querySelector("main .quote");
    if (q) quote(q);
    var l = document.querySelector(".hc-logos__row");
    if (l) logos(l);
    var c = document.querySelector(".foot .spk-close, .spk-close");
    if (c) close(c);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
