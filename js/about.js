/* About page (/about/): the name is written once, with a pen.
   ES5, no dependencies. Loaded on this page only (about.json "scripts").
   The heading keeps its place and its text (made transparent while the
   pen works, so screen readers and layout never change). Over it, an SVG
   copy of the name in the heading's own font, one glyph per letter at
   the letter's measured position, whatever the line wrap: each letter's
   outline is drawn in reading order behind a small bright pen tip, then
   the letters fill to the heading's colour and the copy is removed,
   leaving the real heading exactly as it was. About 2.2s.
   Reduced motion, no script or no fonts API: the name is simply there. */
(function () {
  "use strict";
  var h = document.querySelector(".ab-portrait__h");
  if (!h) return;
  function done() { h.classList.add("is-written"); }
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches || !document.createRange) { done(); return; }

  var NS = "http://www.w3.org/2000/svg";
  var DRAW = 0.72, SPREAD = 1.2, FILL = 0.5;   /* seconds: one letter, all starts, the fill */

  function letters() {
    var out = [], walk = document.createTreeWalker(h, NodeFilter.SHOW_TEXT, null, false), node;
    var range = document.createRange();
    while ((node = walk.nextNode())) {
      for (var i = 0; i < node.nodeValue.length; i++) {
        var c = node.nodeValue.charAt(i);
        if (/\s/.test(c)) continue;
        range.setStart(node, i);
        range.setEnd(node, i + 1);
        var rs = range.getClientRects();
        if (rs.length) out.push({ c: c, r: rs[0] });
      }
    }
    return out;
  }

  /* the distance from a text box's top to its baseline */
  function ascent(first) {
    var m = document.createElement("span");
    m.style.cssText = "display:inline-block;width:0;height:0;vertical-align:baseline";
    h.insertBefore(m, h.firstChild);
    var a = m.getBoundingClientRect().top - first.top;
    h.removeChild(m);
    return a;
  }

  function write() {
    var cs = getComputedStyle(h);
    var ink = cs.color, fs = parseFloat(cs.fontSize);
    var ls = letters();
    if (!ls.length) { done(); return; }
    var box = h.getBoundingClientRect(), base = ascent(ls[0].r);
    var g = Math.round(fs * 7) + "px";
    var sw = Math.max(1, fs / 80).toFixed(2) + "px";

    var svg = document.createElementNS(NS, "svg");
    svg.setAttribute("class", "ab-pen");
    svg.setAttribute("aria-hidden", "true");
    svg.setAttribute("focusable", "false");
    svg.setAttribute("width", box.width);
    svg.setAttribute("height", box.height);
    svg.style.setProperty("--g", g);
    svg.style.setProperty("--sw", sw);
    svg.style.setProperty("--fill-at", (SPREAD + DRAW - 0.25).toFixed(2) + "s");
    svg.style.setProperty("--fill", FILL + "s");
    svg.style.setProperty("--draw", DRAW + "s");

    var step = SPREAD / ls.length;
    ["ab-pen__p", "ab-pen__h"].forEach(function (cls) {
      var t = document.createElementNS(NS, "text");
      t.setAttribute("class", cls);
      if (cls === "ab-pen__p") t.setAttribute("fill", ink);
      ls.forEach(function (l, k) {
        var sp = document.createElementNS(NS, "tspan");
        sp.setAttribute("x", (l.r.left - box.left).toFixed(2));
        sp.setAttribute("y", (l.r.top - box.top + base).toFixed(2));
        sp.style.setProperty("--d", (k * step).toFixed(3) + "s");
        sp.textContent = l.c;
        t.appendChild(sp);
      });
      svg.appendChild(t);
    });

    var finished = false;
    function finish() {
      if (finished) return;
      finished = true;
      window.removeEventListener("resize", finish);
      if (svg.parentNode) svg.parentNode.removeChild(svg);
      h.classList.remove("is-writing");
      done();
    }
    h.classList.add("is-writing");
    h.appendChild(svg);
    window.addEventListener("resize", finish);
    setTimeout(finish, (SPREAD + DRAW - 0.25 + FILL) * 1000 + 80);
  }

  if (document.fonts && document.fonts.ready) {
    var started = false;
    var go = function () { if (!started) { started = true; requestAnimationFrame(write); } };
    document.fonts.ready.then(go);
    setTimeout(go, 1200);
  } else {
    done();
  }
})();

/* About page: the credentials, the logos and the ways cards arrive once,
   in turn, as each section comes into view. The hidden start is set only
   once the observer has answered for the section; without the observer,
   or if it never answers, everything simply shows. */
(function () {
  "use strict";
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches || !("IntersectionObserver" in window)) return;
  var secs = [].slice.call(document.querySelectorAll(".ab-creds, .ab-media, .ab-ways"));
  if (!secs.length) return;
  var answered = false;
  var io = new IntersectionObserver(function (entries) {
    answered = true;
    entries.forEach(function (e) {
      var s = e.target;
      if (e.isIntersecting) {
        io.unobserve(s);
        if (s.classList.contains("is-armed")) {
          s.getBoundingClientRect();
          requestAnimationFrame(function () { s.classList.add("is-in"); });
        }
      } else if (!s.classList.contains("is-in") && e.boundingClientRect.top > 0) {
        s.classList.add("is-armed");
        /* the logo row stands in full 3s after it is armed */
        if (s.classList.contains("ab-media")) setTimeout(function () { io.unobserve(s); s.classList.add("is-in"); }, 3000);
      }
    });
  }, { threshold: 0.18 });
  secs.forEach(function (s) { io.observe(s); });
  setTimeout(function () {
    if (!answered) { io.disconnect(); secs.forEach(function (s) { s.classList.remove("is-armed"); }); }
  }, 1500);
})();
