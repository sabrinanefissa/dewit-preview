/* Drop-downs (details.dd) on the inner pages. ES5, no dependencies.
   - Open and close animate the body's height and opacity, 360ms, the
     site's ease-out. A second press mid-way turns back from where it is.
     Reduced motion: the native instant toggle.
   - A link to an id inside a closed drop-down (on arrival, on a hash
     change or on an in-page click) opens it first.
   - Printing opens every drop-down and restores them afterwards. */
(function () {
  "use strict";
  var all = [].slice.call(document.querySelectorAll("details.dd"));
  if (!all.length) return;
  var DUR = 360, EASE = "cubic-bezier(0.22, 1, 0.36, 1)";
  var rmq = window.matchMedia("(prefers-reduced-motion: reduce)");

  all.forEach(function (d) {
    var sum = d.querySelector(".dd__sum"), body = d.querySelector(".dd__body");
    if (!sum || !body) return;
    var anim = null;

    function run(from, to, opening) {
      if (anim) anim.cancel();
      d.classList.add("is-moving");
      d.classList.toggle("is-closing", !opening);
      anim = body.animate([
        { height: from + "px", opacity: opening ? (from ? 1 : 0) : 1 },
        { height: to + "px", opacity: opening ? 1 : 0 }
      ], { duration: DUR, easing: EASE });
      anim.onfinish = function () {
        anim = null;
        d.classList.remove("is-moving", "is-closing");
        if (!opening) d.open = false;
      };
    }

    sum.addEventListener("click", function (e) {
      if (rmq.matches || !body.animate) return;
      e.preventDefault();
      var now = body.getBoundingClientRect().height;
      var closing = d.classList.contains("is-closing");
      if (!d.open || closing) {
        d.open = true;
        run(closing ? now : 0, body.scrollHeight, true);
      } else {
        run(now, 0, false);
      }
    });
  });

  /* open every closed drop-down that holds the element with this id */
  function reveal(hash, scroll) {
    if (!hash || hash.length < 2) return;
    var el = null;
    try { el = document.getElementById(decodeURIComponent(hash.slice(1))); } catch (e) { return; }
    var opened = false;
    for (var n = el; n; n = n.parentElement) {
      if (n.tagName === "DETAILS" && n.classList.contains("dd") && !n.open) { n.open = true; opened = true; }
    }
    if (opened && scroll) el.scrollIntoView();
  }
  reveal(location.hash, true);
  window.addEventListener("hashchange", function () { reveal(location.hash, true); });
  document.addEventListener("click", function (e) {
    var a = e.target.closest && e.target.closest('a[href*="#"]');
    if (!a || a.pathname !== location.pathname) return;
    reveal(a.hash, false);
  });

  var closed = [];
  window.addEventListener("beforeprint", function () {
    closed = all.filter(function (d) { return !d.open; });
    closed.forEach(function (d) { d.open = true; });
  });
  window.addEventListener("afterprint", function () {
    closed.forEach(function (d) { d.open = false; });
    closed = [];
  });
})();
