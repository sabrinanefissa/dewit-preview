/* Book page (/book/): the enquiry form, in two steps. The steps switch
   instantly; the wall and the five steps below have their own parts.
   Without script the form is one long form whose own action (mailto:,
   text/plain) and the browser's required checks still work.
   With script:
   - Step 1 shows alone. "Continue" (or Enter in a step 1 field) checks
     the required fields (name, email), marks each failing field
     (aria-invalid, an inline message linked by aria-describedby) and
     moves focus to the first one; when they pass, step 2 shows and focus
     moves to its heading. "Back" returns to step 1 and its heading.
   - Fields marked data-show-if="field=value" (the health care
     questions) show only while that radio value is chosen; hidden ones
     are left out of the email.
   - ?talk=<id> pre-selects the talk select (data-prefill="talk"); a
     missing or unknown id leaves its default ("Not sure yet").
   - Submit opens a prefilled email (mailto:) with a subject and a body
     built from every field, then hides the form and shows the
     confirmation: what was sent, field by field, with "Open the email
     again" and "Edit the enquiry" (the typed values are kept).
   Every message comes from the markup (book.json). Self-contained ES5;
   loaded before js/main.js with defer. */
(function () {
  "use strict";

  var EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  function init() {
    var forms = document.querySelectorAll("[data-bk-form]");
    for (var i = 0; i < forms.length; i++) wire(forms[i]);
  }

  function trim(s) { return String(s == null ? "" : s).replace(/^\s+|\s+$/g, ""); }
  function each(list, fn) { for (var i = 0; i < list.length; i++) fn(list[i], i); }

  /* one query parameter, decoded; "" when absent */
  function param(name) {
    var q = window.location.search.replace(/^\?/, "").split("&");
    for (var i = 0; i < q.length; i++) {
      var kv = q[i].split("=");
      if (decodeURIComponent(kv[0] || "") === name) {
        try { return decodeURIComponent((kv[1] || "").replace(/\+/g, " ")); } catch (e) { return ""; }
      }
    }
    return "";
  }

  function wire(form) {
    /* script validates instead of the browser, so the messages are ours */
    form.setAttribute("novalidate", "");
    var status = form.querySelector("[data-bk-status]");
    var steps = [].slice.call(form.querySelectorAll("[data-bk-step]"));
    var host = form.parentNode;
    var done = host.querySelector("[data-bk-done]");
    var current = 0;

    each(form.querySelectorAll("[data-bk-js]"), function (el) { el.hidden = false; });
    form.classList.add("is-stepped");

    function errorFor(name) { return form.querySelector('[data-error-for="' + name + '"]'); }
    function hintId(el) {
      var d = el.getAttribute("data-hint-id");
      if (d === null) {
        d = "";
        var ids = (el.getAttribute("aria-describedby") || "").split(/\s+/);
        for (var i = 0; i < ids.length; i++) if (/-hint$/.test(ids[i])) d = ids[i];
        el.setAttribute("data-hint-id", d);
      }
      return d;
    }
    function setError(el, msg) {
      var err = errorFor(el.name), hint = hintId(el);
      if (!err) return;
      if (msg) {
        err.textContent = msg;
        err.hidden = false;
        el.setAttribute("aria-invalid", "true");
        el.setAttribute("aria-describedby", trim(err.id + " " + hint));
      } else {
        err.textContent = "";
        err.hidden = true;
        el.removeAttribute("aria-invalid");
        if (hint) el.setAttribute("aria-describedby", hint); else el.removeAttribute("aria-describedby");
      }
    }
    function check(el) {
      var v = trim(el.value);
      if (el.required && !v) return el.getAttribute("data-error") || "This field is required.";
      if (el.type === "email" && v && !EMAIL.test(v)) return el.getAttribute("data-invalid") || el.getAttribute("data-error");
      return "";
    }
    function requiredIn(scope) {
      return [].slice.call(scope.querySelectorAll("input[required], textarea[required], select[required]"))
        .filter(function (el) { return el.type !== "radio"; });
    }
    /* checks the required fields in scope; returns the first failing one */
    function validate(scope) {
      var first = null;
      requiredIn(scope).forEach(function (el) {
        var msg = check(el);
        setError(el, msg);
        if (msg && !first) first = el;
      });
      return first;
    }

    /* once a field has shown an error, it re-checks as the visitor fixes it */
    requiredIn(form).forEach(function (el) {
      function recheck() { if (el.getAttribute("aria-invalid") === "true") setError(el, check(el)); }
      el.addEventListener("input", recheck);
      el.addEventListener("blur", recheck);
    });

    /* ---- steps ---- */
    function show(i, focus) {
      current = i;
      steps.forEach(function (s, k) { s.hidden = k !== i; });
      if (focus) {
        var h = steps[i].querySelector(".bk-step__h");
        if (h) h.focus();
      }
    }
    var next = form.querySelector("[data-bk-next]");
    var back = form.querySelector("[data-bk-back]");
    function advance() {
      var bad = validate(steps[current]);
      if (bad) { bad.focus(); return; }
      if (current < steps.length - 1) show(current + 1, true);
    }
    if (next) next.addEventListener("click", advance);
    if (back) back.addEventListener("click", function () { show(Math.max(0, current - 1), true); });
    if (steps.length > 1) show(0, false);

    /* ---- the health care questions ---- */
    var conds = [].slice.call(form.querySelectorAll("[data-show-if]")).map(function (el) {
      var p = el.getAttribute("data-show-if").split("=");
      return { el: el, field: p[0], value: p[1] };
    });
    function applyConds() {
      conds.forEach(function (c) { c.el.hidden = rawValue(c.field) !== c.value; });
    }
    conds.forEach(function (c) {
      each(form.querySelectorAll('[name="' + c.field + '"]'), function (r) { r.addEventListener("change", applyConds); });
    });

    /* ---- ?talk= ---- */
    each(form.querySelectorAll("[data-prefill]"), function (sel) {
      var v = param(sel.getAttribute("data-prefill"));
      if (!v) return;
      for (var i = 0; i < sel.options.length; i++) if (sel.options[i].value === v) { sel.selectedIndex = i; return; }
    });
    applyConds();

    /* ---- values ---- */
    function rawValue(name) {
      var els = form.elements[name];
      if (!els) return "";
      if (els.length !== undefined && !els.tagName) {           /* a radio group */
        for (var i = 0; i < els.length; i++) if (els[i].checked) return els[i].value;
        return "";
      }
      if (els.type === "checkbox") return els.checked ? els.value : "";
      return trim(els.value);
    }
    /* what a person reads: a choice's label, a select's option text */
    function value(name) {
      var els = form.elements[name];
      if (!els) return "";
      if (els.length !== undefined && !els.tagName) {
        for (var i = 0; i < els.length; i++) if (els[i].checked) {
          var t = els[i].parentNode.querySelector("span");
          return trim(t ? t.textContent : els[i].value);
        }
        return "";
      }
      if (els.type === "checkbox") return els.checked ? els.value : "No";
      if (els.tagName === "SELECT") return els.selectedIndex < 0 ? "" : trim(els.options[els.selectedIndex].text);
      return trim(els.value);
    }
    function labelOf(f) {
      var l = f.querySelector(".bk-label");
      if (!l) return f.getAttribute("data-field");
      var t = l.cloneNode(true), r = t.querySelector(".bk-label__req");
      if (r) t.removeChild(r);
      return trim(t.textContent);
    }
    /* every field that applies, in page order: [label, value, name] */
    function entries() {
      return [].slice.call(form.querySelectorAll("[data-field]")).filter(function (f) {
        return !f.hidden;
      }).map(function (f) {
        var name = f.getAttribute("data-field");
        return [labelOf(f), value(name), name];
      });
    }

    /* ---- submit: the email, then the confirmation ---- */
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      if (status) status.textContent = "";
      /* Enter in a step 1 field means Continue */
      if (current < steps.length - 1) { advance(); return; }
      var bad = validate(form);
      if (bad) {
        for (var k = 0; k < steps.length; k++) if (steps[k].contains(bad)) { show(k, false); break; }
        bad.focus();
        return;
      }

      var empty = form.getAttribute("data-empty") || "";
      var lines = [form.getAttribute("data-intro") || "", ""];
      var rows = entries();
      rows.forEach(function (r) {
        if (r[2] === "notes") { lines.push("", r[0] + ":", r[1] || empty); return; }
        lines.push(r[0] + ": " + (r[1] || empty));
      });
      var who = value("organization") || value("name");
      var subject = (form.getAttribute("data-subject") || "") + (who ? ": " + who : "") +
                    (value("date") ? " (" + value("date") + ")" : "");
      var href = "mailto:" + form.getAttribute("data-to") +
                 "?subject=" + encodeURIComponent(subject) +
                 "&body=" + encodeURIComponent(lines.join("\r\n"));
      window.location.href = href;
      if (status) status.textContent = status.getAttribute("data-sent") || "";
      if (done) showDone(rows, href);
    });

    function showDone(rows, href) {
      var list = done.querySelector("[data-bk-summary]");
      while (list.firstChild) list.removeChild(list.firstChild);
      rows.forEach(function (r) {
        if (!r[1] || (r[2] === "bureau" && r[1] === "No")) return;
        var row = document.createElement("div");
        var dt = document.createElement("dt"), dd = document.createElement("dd");
        dt.textContent = r[0];
        dd.textContent = r[1];
        row.appendChild(dt); row.appendChild(dd);
        list.appendChild(row);
      });
      var again = done.querySelector("[data-bk-again]");
      if (again) again.setAttribute("href", href);
      form.hidden = true;
      done.hidden = false;
      var h = done.querySelector(".bk-done__h");
      if (h) h.focus();
    }
    if (done) {
      var edit = done.querySelector("[data-bk-edit]");
      if (edit) edit.addEventListener("click", function () {
        done.hidden = true;
        form.hidden = false;
        if (status) status.textContent = "";
        show(steps.length - 1, true);
      });
    }
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();

/* Where Stephen has spoken: the client marks land one at a time in
   reading order (a fixed order, so it reads as a story), then the
   invitation card arrives in the last cells and its line and arrow
   follow. Runs once, when the wall is half in view. Reduced motion, no
   IntersectionObserver, or already scrolled past: nothing is armed and
   the full wall shows at once; if the observer never reports, a timer
   shows it. */
(function () {
  "use strict";
  var grid = document.querySelector("[data-bk-wall]");
  if (!grid || !("IntersectionObserver" in window)) return;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  if (grid.getBoundingClientRect().bottom < 0) return;
  var cells = [].slice.call(grid.querySelectorAll(".bk-wall__cell"));
  var STEP = 200, LEAD = 180, PAUSE = 380, heard = false;
  var io = new IntersectionObserver(function (es) {
    heard = true;
    if (!es[0].isIntersecting) return;
    io.disconnect();
    var t = LEAD;
    cells.forEach(function (c) {
      if (c.classList.contains("bk-wall__cell--invite")) t += PAUSE;
      setTimeout(function () { c.classList.add("is-in"); }, t);
      t += STEP;
    });
  }, { threshold: 0.4 });
  grid.classList.add("is-armed");
  io.observe(grid);
  setTimeout(function () {
    if (heard) return;
    io.disconnect();
    cells.forEach(function (c) { c.classList.add("is-in"); });
  }, 2500);
})();

/* What happens next: each step lights as it comes into view, its numeral
   going from faint to full and the accent running along its stretch of
   the hairline. Steps that arrive together light one after another, in
   order. Runs once per step. Reduced motion, no IntersectionObserver, or
   the steps already above the screen: nothing is armed, every step shows
   lit; if the observer never reports, a timer lights them all. */
(function () {
  "use strict";
  var list = document.querySelector("[data-bk-stops]");
  if (!list || !("IntersectionObserver" in window)) return;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  if (list.getBoundingClientRect().bottom < 0) return;
  var steps = [].slice.call(list.querySelectorAll(".bk-stops__s"));
  var GAP = 240, next = 0, heard = false;
  function light(s) {
    var now = Date.now(), at = Math.max(now, next);
    next = at + GAP;
    setTimeout(function () { s.classList.add("is-lit"); }, at - now);
  }
  var io = new IntersectionObserver(function (es) {
    heard = true;
    es.forEach(function (e) {
      if (!e.isIntersecting) return;
      io.unobserve(e.target);
      light(e.target);
    });
  }, { threshold: 0.6, rootMargin: "0px 0px -12% 0px" });
  list.classList.add("is-armed");
  steps.forEach(function (s) { io.observe(s); });
  setTimeout(function () {
    if (heard) return;
    io.disconnect();
    steps.forEach(function (s) { s.classList.add("is-lit"); });
  }, 2500);
})();
