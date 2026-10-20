/* Speaking page (/speaking/): the planner tools. ES5, no dependencies.
   Loaded on this page only (speaking.json "scripts").
   A. The bio in three lengths: every length is in the markup and shows
      with no script. Here the button group appears, one length shows at
      a time, and each button carries aria-pressed.
   B. Copy buttons (the bio and the stage introduction): hidden in the
      markup, shown here. A press copies the text (Clipboard API, with a
      selection fallback), the button reads "Copied" for 2s, and the
      section's live region says so.
   No motion: the only feedback is the button's own state change. */
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
