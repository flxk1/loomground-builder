/* daw-kit/1 — DOM construction helpers for the DAW genre substrate
   (skill/genres/daw/). Its own small vocabulary — transport button, track
   strip (fader/pan/mute), routing assignment — sitting ALONGSIDE
   twin-sheet/1 (copy both into a DAW twin, load twin-sheet.js first, then
   call DawKit.init(window.TwinSheet) once): the read view and its confirm
   dialogs still come from the sheet verbatim (opRow/opSurface/shelf/
   confirmGate/lamp — twin-sheet.js), this kit only adds the DIRECT-
   MANIPULATION control shapes the rack genre never needed. ADDITIVE under
   twin-sheet/1: does not modify twin-sheet.js/css or synth-kit.js/css.

   Every control here carries the Control grammar's three hooks
   (skill/SKILL.md's "Control grammar" section) — data-op on the commit
   element, data-param on its value field(s), data-gesture naming what
   drives it. The DAW genre names its OWN gestures, honestly, per control
   shape — "trigger" for a transport button (no value, just fires),
   "fade" for a fader, "pan" for a pan control, "mute" for a mute toggle,
   "route" for a bus-routing assignment (new or removed) — because the live
   gate (testing/live/live-gate.mjs) no longer enumerates a fixed gesture
   list: it dispatches on whether a control is "activate" (opens a shared
   op-surface) or anything else (fires its own local [data-param] fields
   directly, scoped to the nearest [data-control-group]). That is the ONLY
   thing that makes a fader, a pan control, a mute toggle, a transport
   button, or a routing control drivable by the gate; nothing about their
   visual form is legible to it at all. Each control's own params live
   beside it in its own "[data-control-group]" wrapper (not behind a
   click-to-open modal panel, unlike the rack's op-surface) — the gate
   scopes its data-param lookup to the nearest such ancestor so multiple
   faders/pans/mutes sharing one data-op (e.g. one fader per track, all
   driving "track.setGain") never collide. */
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

  /* Shared commit path for every daw-kit control: a mutating op ALWAYS
     confirm-gates (twin-sheet.js confirmGate, fail-closed — the same rule
     the rack's opSurface and the synth's knob/cable apply), destructive ops
     require the typed full name. This is what makes G6/G6b hold for a
     fader, a pan control, a mute toggle, a transport button, or a routing
     control exactly as they do for a rack button — the confirm mechanic
     itself is not genre-specific, only the widget offering the params is. */
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

  /* mountTransportButton({fn, label}, opts) — a transport bar button (play
     or stop): no params at all, data-gesture="trigger" — the control's
     commit IS the whole gesture, nothing to fill first. */
  function mountTransportButton(spec, opts) {
    var fn = spec.fn;
    var wrap = T.el("div", { class: "daw-transport-btn", "data-control-group": "" });
    var slot = T.el("div", { class: "transport-slot" });
    var commit = T.el("button", { type: "button", class: "tw-btn primary transport-commit",
      "data-op": fn.name, "data-gesture": "trigger", text: spec.label });
    commit.addEventListener("click", function () {
      fireControl(fn, {}, slot, opts);
    });
    wrap.appendChild(commit);
    wrap.appendChild(slot);
    return wrap;
  }

  /* mountFader({fn, track, label, initial, step}, opts) — a track's gain
     fader. fn: track.setGain descriptor. track: the fixed track id this
     physical fader is wired to (baked in, not user-editable — a real fader
     is wired to one channel). data-gesture="fade" — its value input carries
     data-param="db" beside it, no click-to-open panel. */
  function mountFader(spec, opts) {
    var fn = spec.fn;
    var wrap = T.el("div", { class: "daw-fader", "data-control-group": "" });
    wrap.appendChild(T.el("div", { class: "fader-face" }));
    wrap.appendChild(T.el("div", { class: "fader-label", text: spec.label || "gain" }));
    var trackField = T.el("input", { type: "hidden", "data-param": "track", value: spec.track });
    wrap.appendChild(trackField);
    var valueInput = T.el("input", { type: "number", class: "fader-value",
      "data-param": "db", value: String(spec.initial), step: spec.step || "0.5",
      "aria-label": (spec.label || "gain") + " dB" });
    wrap.appendChild(T.el("div", { class: "fader-value-row" }, [
      valueInput, T.el("span", { class: "fader-unit", text: "dB" })]));
    var slot = T.el("div", { class: "fader-slot" });
    var commit = T.el("button", { type: "button", class: "tw-btn primary fader-commit",
      "data-op": fn.name, "data-gesture": "fade", text: "Fade" });
    commit.addEventListener("click", function () {
      var params = { track: trackField.value, db: numOrRaw(valueInput.value) };
      fireControl(fn, params, slot, opts);
    });
    wrap.appendChild(commit);
    wrap.appendChild(slot);
    return wrap;
  }

  /* mountPan({fn, track, label, initial, step}, opts) — a track's pan
     control. fn: track.setPan descriptor. data-gesture="pan" — its value
     input carries data-param="pos" beside it. */
  function mountPan(spec, opts) {
    var fn = spec.fn;
    var wrap = T.el("div", { class: "daw-pan", "data-control-group": "" });
    wrap.appendChild(T.el("div", { class: "pan-label", text: spec.label || "pan" }));
    var trackField = T.el("input", { type: "hidden", "data-param": "track", value: spec.track });
    wrap.appendChild(trackField);
    var valueInput = T.el("input", { type: "number", class: "pan-value",
      "data-param": "pos", value: String(spec.initial), step: spec.step || "0.1",
      "aria-label": (spec.label || "pan") + " position" });
    wrap.appendChild(valueInput);
    var slot = T.el("div", { class: "pan-slot" });
    var commit = T.el("button", { type: "button", class: "tw-btn pan-commit",
      "data-op": fn.name, "data-gesture": "pan", text: "Pan" });
    commit.addEventListener("click", function () {
      var params = { track: trackField.value, pos: numOrRaw(valueInput.value) };
      fireControl(fn, params, slot, opts);
    });
    wrap.appendChild(commit);
    wrap.appendChild(slot);
    return wrap;
  }

  /* mountMuteToggle({fn, track, label, muted}, opts) — a track's mute
     button. fn: track.mute descriptor (a toggle: no value to set, only to
     flip). data-gesture="mute" — the track id is the control's only param,
     carried as a hidden field; the current state is shown via a lamp,
     always re-read from the last real state, never computed locally. */
  function mountMuteToggle(spec, opts) {
    var fn = spec.fn;
    var wrap = T.el("div", { class: "daw-mute", "data-control-group": "" });
    var trackField = T.el("input", { type: "hidden", "data-param": "track", value: spec.track });
    wrap.appendChild(trackField);
    wrap.appendChild(T.el("div", { class: "mute-state" }, [
      T.lamp(spec.muted ? "muted" : "live", spec.muted ? "stop" : "ok")]));
    var slot = T.el("div", { class: "mute-slot" });
    var commit = T.el("button", { type: "button", class: "tw-btn mute-commit",
      "data-op": fn.name, "data-gesture": "mute", text: spec.label || "Mute" });
    commit.addEventListener("click", function () {
      fireControl(fn, { track: trackField.value }, slot, opts);
    });
    wrap.appendChild(commit);
    wrap.appendChild(slot);
    return wrap;
  }

  /* mountRouteControl(fn, tracks, buses, opts) — a new bus-routing
     assignment: two free-text/select fields (data-param="track"/"bus") plus
     a commit. data-gesture="route" — carries data-op="mix.route" and two
     data-param inputs (track, bus), the same "two endpoints beside a
     commit" shape a real patchbay/router has, named honestly for this
     genre's own vocabulary rather than borrowing the synth's "patch". */
  function mountRouteControl(fn, opts) {
    var wrap = T.el("div", { class: "daw-route daw-route-new", "data-control-group": "" });
    wrap.appendChild(T.el("div", { class: "route-label", text: "New route" }));
    var trackInput = T.el("input", { type: "text", class: "route-field", "data-param": "track",
      placeholder: "track — e.g. t2", "aria-label": "track" });
    var busInput = T.el("input", { type: "text", class: "route-field", "data-param": "bus",
      placeholder: "bus — e.g. busB", "aria-label": "bus" });
    wrap.appendChild(T.el("div", { class: "route-fields" }, [
      trackInput, T.el("span", { class: "route-arrow", text: "→" }), busInput]));
    var slot = T.el("div", { class: "route-slot" });
    var commit = T.el("button", { type: "button", class: "tw-btn primary route-commit",
      "data-op": fn.name, "data-gesture": "route", text: "Route" });
    commit.addEventListener("click", function () {
      fireControl(fn, { track: trackInput.value, bus: busInput.value }, slot, opts);
    });
    wrap.appendChild(commit);
    wrap.appendChild(slot);
    return wrap;
  }

  /* mountUnrouteRow(fn, route, opts) — a quick "unroute" control on an
     EXISTING assignment: its two endpoints are already known (route.track/
     route.bus), carried as hidden data-param fields (the operator sees the
     assignment as text, not as editable inputs — same "the value is always
     visible, not always free-text" shape a real router has for existing
     assignments), plus a destructive commit (mix.unroute — typed-name
     gated, same as the rack's/synth's destructive ops). data-gesture="route"
     — the same gesture name as mountRouteControl above; both are the
     routing control's commit, one composing a new assignment, one removing
     an existing one. */
  function mountUnrouteRow(fn, route, opts) {
    var wrap = T.el("div", { class: "daw-route daw-route-existing", "data-control-group": "" });
    wrap.appendChild(T.el("span", { class: "route-assignment", text: route.track + " → " + route.bus }));
    var trackField = T.el("input", { type: "hidden", "data-param": "track", value: route.track });
    var busField = T.el("input", { type: "hidden", "data-param": "bus", value: route.bus });
    wrap.appendChild(trackField);
    wrap.appendChild(busField);
    var slot = T.el("div", { class: "route-slot" });
    var commit = T.el("button", { type: "button", class: "tw-btn danger route-commit",
      "data-op": fn.name, "data-gesture": "route", text: "Unroute" });
    commit.addEventListener("click", function () {
      fireControl(fn, { track: trackField.value, bus: busField.value }, slot, opts);
    });
    wrap.appendChild(commit);
    wrap.appendChild(slot);
    return wrap;
  }

  /* trackStrip(title, children) — the "strip" vocabulary item: a labelled
     group of one track's controls (fader, pan, mute) — visual grouping
     only, carries no Control grammar attributes itself, its children do. */
  function trackStrip(title, children) {
    var wrap = T.el("div", { class: "daw-strip" });
    wrap.appendChild(T.el("h3", { text: title }));
    (children || []).forEach(function (c) { wrap.appendChild(c); });
    return wrap;
  }

  /* transportBar(children) — the "transport" vocabulary item: a row of
     transport buttons (play/stop) — visual grouping only. */
  function transportBar(children) {
    var wrap = T.el("div", { class: "daw-transport" });
    (children || []).forEach(function (c) { wrap.appendChild(c); });
    return wrap;
  }

  global.DawKit = { init: init, mountTransportButton: mountTransportButton,
    mountFader: mountFader, mountPan: mountPan, mountMuteToggle: mountMuteToggle,
    mountRouteControl: mountRouteControl, mountUnrouteRow: mountUnrouteRow,
    trackStrip: trackStrip, transportBar: transportBar };
})(typeof window !== "undefined" ? window : this);
