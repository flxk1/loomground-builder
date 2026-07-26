/* twin-sheet/1 — DOM construction helpers for the component sheet.
   Vanilla, framework-free, data-driven. Components render server-declared
   state; they never compute a verdict. Gating: a function descriptor with
   mutating !== false always goes through the confirm flow (fail-closed).
   Vocabulary→role mapping arrives as data from the surface pack.
   Additive under twin-sheet/1: opRow emits data-op + data-gesture, and
   opSurface's param inputs emit data-param — the Control grammar (see
   SKILL.md's "Control grammar" section). This is what makes a control
   drivable by its {op,params,gesture} contract rather than by its visible
   label or form; no existing binding or markup contract changes. */
(function (global) {
  "use strict";

  function el(tag, attrs, children) {
    var n = document.createElement(tag);
    if (attrs) Object.keys(attrs).forEach(function (k) {
      if (k === "class") n.className = attrs[k];
      else if (k === "text") n.textContent = attrs[k];
      else if (k.slice(0, 2) === "on") n.addEventListener(k.slice(2), attrs[k]);
      else n.setAttribute(k, attrs[k]);
    });
    (children || []).forEach(function (c) {
      n.appendChild(typeof c === "string" ? document.createTextNode(c) : c);
    });
    return n;
  }

  /* 2.5 verdict/status lamp. word: verbatim vocabulary string; role: one of
     ok|warn|stop|info|emph, from the surface pack's vocabulary→role map. */
  function lamp(word, role) {
    return el("span", { class: "tw-lamp " + (role || ""), role: "status",
      "aria-label": word }, [word]);
  }

  /* 2.5 mutation lamp from a function descriptor (fail-closed). */
  function mutLamp(fn) {
    if (fn.mutating === false) return lamp("read", "ok");
    if (fn.destructive) return lamp("destructive", "stop");
    return lamp("mutates", "warn");
  }

  /* 2.5 stepped ordinal, e.g. autonomy grades. n steps, active index, label. */
  function steps(n, active, label) {
    var wrap = el("span", { class: "tw-steps", role: "img", "aria-label": label });
    for (var i = 0; i < n; i++)
      wrap.appendChild(el("i", { class: i <= active ? "on-" + i : "" }));
    wrap.appendChild(el("span", { class: "tw-steps-label", text: label }));
    return wrap;
  }

  /* 2.9 header/pin. stamped=true shows the design-unverified stamp. */
  function header(opts) {
    return el("header", { class: "tw-header" }, [
      el("h1", { text: opts.title }),
      el("span", { class: "tw-pin", text: opts.pin || "" }),
      el("span", { class: "tw-badge " + (opts.live ? "live" : "fixture"),
        text: opts.live ? "live" : "fixture-backed" }),
      el("span", { class: "tw-stamp" + (opts.stamped ? " on" : ""),
        text: "design-unverified" })
    ]);
  }

  /* 2.3 confirm flow. Two-phase: compose → confirm card → dispatch/cancel.
     opts.typedName: require typing fn.name to enable confirm (current rule:
     recommended for destructive; pending-decider whether required). */
  function confirmGate(fn, params, opts, onConfirm, onCancel) {
    var composed = JSON.stringify(params, null, 2);
    var okBtn = el("button", { class: "tw-btn " + (fn.destructive ? "danger" : "primary"),
      text: "Confirm" });
    var dialog = el("div", { class: "tw-dialog" + (fn.destructive ? " destructive" : ""),
      role: "alertdialog", "aria-label": "Confirm " + fn.name });
    dialog.appendChild(el("h3", { text: "Confirm: " + fn.name }));
    dialog.appendChild(el("p", { class: "tw-consequence",
      text: fn.consequence || "This call is a recorded action on the target." }));
    dialog.appendChild(el("pre", { class: "tw-response tw-composed", text: composed }));
    if (opts && opts.typedName) {
      okBtn.disabled = true;
      var gateField = el("div", { class: "tw-field" }, [
        el("label", { text: "Type the function name to enable confirm" }),
        el("input", { type: "text", oninput: function (e) {
          okBtn.disabled = e.target.value !== fn.name;
        } })
      ]);
      dialog.appendChild(gateField);
    }
    okBtn.addEventListener("click", function () { onConfirm(params, dialog); });
    dialog.appendChild(el("div", { class: "tw-actions" }, [
      el("button", { class: "tw-btn", text: "Cancel",
        onclick: function () { onCancel(dialog); } }),
      okBtn
    ]));
    return dialog;
  }

  /* 2.3 op surface for one function descriptor:
     { name, note, facade, params: [names], mutating, destructive,
       consequence } — dispatch(fn, params) => Promise<{ok, body, error}>.
     Renders responses verbatim; a failed call renders as .error. Each
     parameter input carries data-param="pname" — the Control grammar's
     param hook (see opRow below and SKILL.md's "Control grammar" section) —
     so the gate can fill it by the catalogued param name, not by scanning
     field-label text. */
  function opSurface(fn, opts) {
    var root = el("section", { class: "tw-opsurface",
      "aria-label": fn.name });
    root.appendChild(el("h2", { text: fn.name }));
    if (fn.note) root.appendChild(el("p", { class: "tw-src", text: fn.note }));
    var form = el("div", { class: "tw-params" });
    var inputs = {};
    (fn.params || []).forEach(function (p) {
      var input = el("input", { type: "text", "aria-label": p, "data-param": p });
      inputs[p] = input;
      form.appendChild(el("div", { class: "tw-field" }, [
        el("label", { text: p }), input]));
    });
    root.appendChild(form);
    var slot = el("div");
    var runBtn = el("button", { class: "tw-btn primary",
      text: fn.mutating === false ? "Run" : "Compose…" });
    function renderResponse(res) {
      var pre = el("pre", { class: "tw-response" + (res.ok ? "" : " error"),
        text: res.body });
      slot.replaceChildren(el("span", { class: "tw-src",
        text: res.ok ? "response · verbatim" : "refused · verbatim" }), pre);
    }
    runBtn.addEventListener("click", function () {
      var params = {};
      Object.keys(inputs).forEach(function (p) {
        var v = inputs[p].value;
        if (v !== "") { try { params[p] = JSON.parse(v); } catch (_) { params[p] = v; } }
      });
      if (fn.mutating === false) {
        opts.dispatch(fn, params).then(renderResponse);
        return;
      }
      var dialog = confirmGate(fn, params,
        { typedName: !!fn.destructive && opts.typedName !== false },
        function (p, d) {
          d.remove();
          opts.dispatch(fn, p).then(function (res) {
            renderResponse(res);
            if (opts.log) opts.log(fn, p, res);
          });
        },
        function (d) { d.remove(); if (opts.onCancel) opts.onCancel(fn); });
      slot.replaceChildren(dialog);
    });
    root.appendChild(el("div", { class: "tw-row" }, [runBtn]));
    root.appendChild(slot);
    return root;
  }

  /* 2.2 op row. Carries the Control grammar's two control-level hooks:
     data-op="facade.op" (the exact catalogued function name — the identifier
     the gate keys on, independent of the visible label/text) and
     data-gesture="activate" (the gesture that invokes the op; "activate" is
     the default that click/press/drag-release/turn-past-threshold all
     normalise to — see SKILL.md's "Control grammar" section). The op's
     params, once the surface opens, each carry data-param (opSurface
     above) — together the three attributes make this control (and any
     other genre's knob/cable/tile carrying the same three) drivable by the
     gate independent of its visible form. */
  function opRow(fn, onOpen) {
    return el("button", { class: "tw-oprow", "data-op": fn.name,
      "data-gesture": "activate", onclick: function () { onOpen(fn); } }, [
      el("span", { class: "tw-opname", text: fn.name }),
      el("span", { class: "tw-opnote", text: fn.note || "" }),
      mutLamp(fn)
    ]);
  }

  /* 2.1 rack shelf: one facade, its functions. */
  function shelf(facade, fns, onOpen, open) {
    var d = el("details", { class: "tw-shelf" });
    if (open) d.setAttribute("open", "");
    d.appendChild(el("summary", {}, [
      facade, el("span", { class: "tw-count", text: fns.length + " ops" })]));
    fns.forEach(function (fn) { d.appendChild(opRow(fn, onOpen)); });
    return d;
  }

  /* 2.4 tier-0 palette over the whole catalogue. */
  function palette(catalogue, onOpen) {
    var wrap = el("div", { class: "tw-palette" });
    var list = el("ul", { class: "tw-palette-list", hidden: "" });
    var input = el("input", { type: "search",
      placeholder: "Find any function — name, note, facade",
      "aria-label": "Search all functions" });
    input.addEventListener("input", function () {
      var q = input.value.trim().toLowerCase();
      list.replaceChildren();
      if (!q) { list.hidden = true; return; }
      var hits = catalogue.filter(function (fn) {
        return (fn.name + " " + (fn.note || "") + " " + (fn.facade || ""))
          .toLowerCase().indexOf(q) !== -1;
      }).slice(0, 40);
      hits.forEach(function (fn) {
        list.appendChild(el("li", {}, [el("button", {
          onclick: function () { list.hidden = true; input.value = ""; onOpen(fn); } }, [
          el("span", { class: "tw-opname", text: fn.name }),
          el("span", { class: "tw-opnote", text: fn.note || "" }),
          el("span", { class: "tw-facet", text: fn.facade || "" })])]));
      });
      list.hidden = hits.length === 0;
    });
    wrap.appendChild(input); wrap.appendChild(list);
    return wrap;
  }

  /* 2.8 call log */
  function logList() { return el("ul", { class: "tw-log", "aria-label": "Call log" }); }
  function logEntry(list, fn, params, res) {
    list.appendChild(el("li", {}, [
      el("time", { text: new Date().toISOString() }),
      el("span", { class: "tw-opname", text: fn.name }),
      lamp(res ? (res.ok ? "answered" : "refused") : "NOT SENT", res ? (res.ok ? "ok" : "stop") : "stop"),
      el("span", { class: "tw-opnote", text: JSON.stringify(params) })
    ]));
  }

  global.TwinSheet = { el: el, lamp: lamp, mutLamp: mutLamp, steps: steps,
    header: header, opSurface: opSurface, opRow: opRow, shelf: shelf,
    palette: palette, confirmGate: confirmGate, logList: logList, logEntry: logEntry };
})(typeof window !== "undefined" ? window : this);
