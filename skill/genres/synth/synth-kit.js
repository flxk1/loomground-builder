/* synth-kit/1 — DOM construction helpers for the modular-synth genre
   substrate (skill/genres/synth/). Its own small vocabulary — knob, cable/
   patchbay, module — sitting ALONGSIDE twin-sheet/1 (copy both into a synth
   twin, load twin-sheet.js first, then call SynthKit.init(window.TwinSheet)
   once): the read view and its confirm dialogs still come from the sheet
   verbatim (opRow/opSurface/shelf/confirmGate/lamp — twin-sheet.js), this
   kit only adds the two DIRECT-MANIPULATION control shapes the rack genre
   never needed.

   Every control here carries the Control grammar's three hooks
   (skill/SKILL.md's "Control grammar" section) — data-op on the commit
   element, data-param on its value field(s), data-gesture naming what
   drives it ("turn" for a knob, "patch" for a cable endpoint) — because
   that triple is the ONLY thing that makes a knob or a cable drivable by
   the live gate (testing/live/live-gate.mjs); nothing about their visual
   form (a dial, two port fields) is legible to the gate at all. Each
   control's own params live beside it in its own "[data-control-group]"
   wrapper (not behind a click-to-open modal panel, unlike the rack's
   op-surface) — the gate scopes its data-param lookup to the nearest such
   ancestor so multiple knobs/cables sharing one data-op (e.g. one knob per
   oscillator, both driving "osc.setFreq") never collide. */
(function (global) {
  "use strict";

  var T = null; // set by init() — the twin-sheet/1 helpers (el, confirmGate, lamp, ...)

  function init(TwinSheet) { T = TwinSheet; }

  function numOrRaw(v) {
    if (v === "") return v;
    var n = Number(v);
    return Number.isFinite(n) ? n : v;
  }

  function renderInline(slot, res) {
    var pre = T.el("pre", { class: "tw-response" + (res.ok ? "" : " error"), text: res.body });
    slot.replaceChildren(T.el("span", { class: "tw-src",
      text: res.ok ? "response · verbatim" : "refused · verbatim" }), pre);
  }

  /* Shared commit path for every synth-kit control: a mutating op ALWAYS
     confirm-gates (twin-sheet.js confirmGate, fail-closed — the same rule
     the rack's opSurface applies), destructive ops require the typed full
     name. This is what makes G6/G6b hold for a knob or a cable exactly as
     they do for a rack button — the confirm mechanic itself is not
     genre-specific, only the widget offering the params is. */
  function fireControl(fn, params, slot, opts) {
    var dialog = T.confirmGate(fn, params, { typedName: !!fn.destructive }, function (p, d) {
      d.remove();
      opts.dispatch(fn, p).then(function (res) {
        renderInline(slot, res);
        if (opts.log) opts.log(fn, p, res);
      });
    }, function (d) { d.remove(); if (opts.onCancel) opts.onCancel(fn); });
    slot.replaceChildren(dialog);
  }

  /* mountKnob({fn, module, valueParam, label, initial, unit, step}, opts)
     fn: the catalogue descriptor for the setter op (e.g. osc.setFreq).
     module: the fixed module id this physical knob is wired to (baked in,
       not user-editable — a real knob is wired to one thing).
     valueParam: the param name the dial's value input carries
       (data-gesture="turn" — SKILL.md's Control grammar: "its value input
       carries data-param"). opts: { dispatch, log, onCancel }. */
  function mountKnob(spec, opts) {
    var fn = spec.fn, valueParam = spec.valueParam;
    var wrap = T.el("div", { class: "synth-knob", "data-control-group": "" });
    wrap.appendChild(T.el("div", { class: "knob-face" }));
    wrap.appendChild(T.el("div", { class: "knob-label", text: spec.label }));
    var moduleField = T.el("input", { type: "hidden", "data-param": "module", value: spec.module });
    wrap.appendChild(moduleField);
    var valueInput = T.el("input", { type: "number", class: "knob-value",
      "data-param": valueParam, value: String(spec.initial), step: spec.step || "1",
      "aria-label": spec.label });
    wrap.appendChild(T.el("div", { class: "knob-value-row" }, [
      valueInput, T.el("span", { class: "knob-unit", text: spec.unit || "" })]));
    var slot = T.el("div", { class: "knob-slot" });
    var commit = T.el("button", { type: "button", class: "tw-btn primary knob-commit",
      "data-op": fn.name, "data-gesture": "turn", text: "Turn" });
    commit.addEventListener("click", function () {
      var params = { module: moduleField.value };
      params[valueParam] = numOrRaw(valueInput.value);
      fireControl(fn, params, slot, opts);
    });
    wrap.appendChild(commit);
    wrap.appendChild(slot);
    return wrap;
  }

  /* mountConnect(fn, opts) — a cable endpoint control for patch.connect:
     two free-text port fields (data-param="from"/"to") plus a commit.
     data-gesture="patch" — SKILL.md's Control grammar: "carries
     data-op='patch.connect' and two data-param inputs (from, to)". */
  function mountConnect(fn, opts) {
    var wrap = T.el("div", { class: "synth-cable synth-cable-connect", "data-control-group": "" });
    wrap.appendChild(T.el("div", { class: "cable-label", text: "New patch cable" }));
    var fromInput = T.el("input", { type: "text", class: "cable-port", "data-param": "from",
      placeholder: "from — e.g. osc1.out", "aria-label": "from port" });
    var toInput = T.el("input", { type: "text", class: "cable-port", "data-param": "to",
      placeholder: "to — e.g. filter1.in", "aria-label": "to port" });
    wrap.appendChild(T.el("div", { class: "cable-ports" }, [
      fromInput, T.el("span", { class: "cable-plug", text: "→" }), toInput]));
    var slot = T.el("div", { class: "cable-slot" });
    var commit = T.el("button", { type: "button", class: "tw-btn primary knob-commit",
      "data-op": fn.name, "data-gesture": "patch", text: "Patch" });
    commit.addEventListener("click", function () {
      fireControl(fn, { from: fromInput.value, to: toInput.value }, slot, opts);
    });
    wrap.appendChild(commit);
    wrap.appendChild(slot);
    return wrap;
  }

  /* mountDisconnectRow(fn, conn, opts) — a quick "unpatch" control on an
     EXISTING connection: its two endpoints are already known (conn.from/
     conn.to), carried as hidden data-param fields (the operator sees the
     route as text, not as editable inputs — same "the value is always
     visible, not always free-text" shape a real patchbay has for existing
     cables), plus a destructive commit (patch.disconnect — typed-name
     gated, same as the rack's destructive ops). */
  function mountDisconnectRow(fn, conn, opts) {
    var wrap = T.el("div", { class: "synth-cable synth-cable-disconnect", "data-control-group": "" });
    wrap.appendChild(T.el("span", { class: "cable-route", text: conn.from + " → " + conn.to }));
    var fromField = T.el("input", { type: "hidden", "data-param": "from", value: conn.from });
    var toField = T.el("input", { type: "hidden", "data-param": "to", value: conn.to });
    wrap.appendChild(fromField);
    wrap.appendChild(toField);
    var slot = T.el("div", { class: "cable-slot" });
    var commit = T.el("button", { type: "button", class: "tw-btn danger knob-commit",
      "data-op": fn.name, "data-gesture": "patch", text: "Unpatch" });
    commit.addEventListener("click", function () {
      fireControl(fn, { from: fromField.value, to: toField.value }, slot, opts);
    });
    wrap.appendChild(commit);
    wrap.appendChild(slot);
    return wrap;
  }

  /* synthModule(title, kind, children) — the "module" vocabulary item: a
     labelled group of one module's knobs (visual grouping only, carries no
     Control grammar attributes itself — its children do). */
  function synthModule(title, kind, children) {
    var wrap = T.el("div", { class: "synth-module" });
    wrap.appendChild(T.el("h3", {}, [title, T.el("span", { class: "synth-kind", text: kind })]));
    (children || []).forEach(function (c) { wrap.appendChild(c); });
    return wrap;
  }

  global.SynthKit = { init: init, mountKnob: mountKnob, mountConnect: mountConnect,
    mountDisconnectRow: mountDisconnectRow, synthModule: synthModule };
})(typeof window !== "undefined" ? window : this);
