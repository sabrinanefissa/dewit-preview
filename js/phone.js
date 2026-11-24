/* Phone layer, under 768px only: the bottom bar hides on the way down the
   page and returns on the way up, and the footer ends with Back to top.
   On wider screens it does nothing, and it follows the width as it changes. */
(function () {
  "use strict";
  var mq = window.matchMedia("(max-width: 767px)");
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var bar = document.querySelector(".tabbar");
  var foot = document.querySelector("footer.foot");
  var topBtn = null, on = false, lastY = 0, down = 0, ticking = false;

  function show(v) { if (bar && bar.classList.contains("is-hidden") === v) bar.classList.toggle("is-hidden", !v); }
  function typing() {
    var a = document.activeElement;
    return !!(a && a.matches && a.matches("input, textarea, select, [contenteditable]"));
  }

  /* past the top 80px, 4px of downward scroll hides the bar and any upward
     scroll brings it back; it stays hidden while a field has the keyboard */
  function frame() {
    ticking = false;
    if (!on) return;
    var y = window.scrollY || 0, dy = y - lastY;
    lastY = y;
    if (typing()) { show(false); return; }
    if (y <= 80 || (bar && bar.contains(document.activeElement))) { down = 0; show(true); return; }
    if (dy > 0) { down += dy; if (down > 4) show(false); }
    else if (dy < 0) { down = 0; show(true); }
  }
  function onScroll() { if (!ticking) { ticking = true; requestAnimationFrame(frame); } }

  function toTop() {
    if (window.spkLenis && window.spkLenis.scrollTo) window.spkLenis.scrollTo(0, reduce ? { immediate: true } : { duration: 0.9 });
    else window.scrollTo({ top: 0, behavior: reduce ? "auto" : "smooth" });
    var brand = document.querySelector(".nav .brand");
    if (brand) brand.focus({ preventScroll: true });
  }
  function makeTop() {
    var b = document.createElement("button");
    b.type = "button";
    b.className = "foot__top";
    b.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">' +
      '<path d="M12 19.4c-.1-4.8-.1-9.7 0-14.6M6.6 10.2c1.9-1.8 3.7-3.7 5.4-5.6 1.8 1.9 3.6 3.8 5.4 5.6"/></svg>' +
      "<span>Back to top</span>";
    b.addEventListener("click", toTop);
    return b;
  }

  function sync() {
    var want = mq.matches;
    if (want === on) return;
    on = want;
    if (on) {
      lastY = window.scrollY || 0; down = 0;
      if (foot) { topBtn = topBtn || makeTop(); foot.appendChild(topBtn); }
      frame();
    } else {
      show(true);
      if (topBtn && topBtn.parentNode) topBtn.parentNode.removeChild(topBtn);
    }
  }

  window.addEventListener("scroll", onScroll, { passive: true });
  var kb = false;
  document.addEventListener("focusin", function () { if (on && typing()) { kb = true; show(false); } });
  if (bar) bar.addEventListener("focusin", function () { down = 0; show(true); });
  document.addEventListener("focusout", function () {
    if (on && kb) setTimeout(function () { if (!typing()) { kb = false; show(true); } }, 0);
  });
  if (mq.addEventListener) mq.addEventListener("change", sync);
  else if (mq.addListener) mq.addListener(sync);
  sync();
})();
