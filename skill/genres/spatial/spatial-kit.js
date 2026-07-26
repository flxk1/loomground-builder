/* spatial-kit/1 — DOM construction helpers for the spatial (walkable 3D
   control room) genre substrate (skill/genres/spatial/). Its own small
   vocabulary — room, floor, station tile, door, adjacency cord — sitting
   ALONGSIDE twin-sheet/1 (copy both into a room twin, load twin-sheet.js
   first, then call SpatialKit.init(window.TwinSheet) once): the read view
   and its confirm dialogs still come from the sheet verbatim (opRow/
   opSurface/shelf/confirmGate/lamp — twin-sheet.js), this kit only adds the
   DIRECT-MANIPULATION control shapes the rack genre never needed. ADDITIVE
   under twin-sheet/1: does not modify twin-sheet.js/css, synth-kit.js/css,
   or daw-kit.js/css.

   Every control here carries the Control grammar's three hooks
   (skill/SKILL.md's "Control grammar" section) — data-op on the commit
   element, data-param on its value field(s), data-gesture naming what
   drives it. The spatial genre names its OWN gestures, honestly, per
   control shape — "dial" for a station's level control, "step" for a door's
   open/close toggle, "link" for an adjacency link's connect/disconnect —
   because the live gate (testing/live/live-gate.mjs) no longer enumerates a
   fixed gesture list: it dispatches on whether a control is "activate"
   (opens a shared op-surface) or anything else (fires its own local
   [data-param] fields directly, scoped to the nearest [data-control-group]).
   That is the ONLY thing that makes a station dial, a door toggle, or a
   link control drivable by the gate; nothing about their visual form — a
   tile positioned in 3D space via CSS transforms — is legible to it at all.

   THE 3D LAYER IS PRESENTATION ONLY. Every control this kit mounts is a
   real DOM element; the walkable-room look comes entirely from CSS 3D
   transforms applied by spatial-kit.css, keyed off the twin root's
   data-degrade attribute ("3d" default | "2d" | "text"). Degrading never
   adds or removes a control — only how it is laid out and which purely
   decorative sub-elements (a station's colour tile, a door's glyph, a
   cord's line) are shown. See spatial-kit.css's degrade rules and
   examples/room/twin.html's D6 note. */
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

  /* Shared commit path for every spatial-kit control: a mutating op ALWAYS
     confirm-gates (twin-sheet.js confirmGate, fail-closed — the same rule
     the rack's opSurface and the synth/DAW kits' direct controls apply),
     destructive ops require the typed full name. This is what makes G6/G6b
     hold for a station dial, a door toggle, or a link control exactly as
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

  /* pos({x,y,z}) -> the inline custom-property style string spatial-kit.css
     reads (--sx/--sy/--sz) to place a tile in 3D space via translate3d. A
     plain style attribute, not a class, because each station/door occupies
     its own fixed point in the room's small, constant layout. */
  function posStyle(p) {
    return "--sx:" + (p.x || 0) + "px; --sy:" + (p.y || 0) + "px; --sz:" + (p.z || 0) + "px;";
  }

  /* mountStation({fn, station, pos, label, initial, unit, step}, opts) — a
     station tile: a labelled dial control wired to one fixed station id
     (baked in, not user-editable — a real station panel is wired to one
     place in the room). fn: the catalogue descriptor for station.setLevel.
     data-gesture="dial" — its value input carries data-param="value" beside
     it, no click-to-open panel (skill/SKILL.md's Control grammar: direct
     mechanism). The tile's positioning (pos) and its decorative face are
     presentation only — see the module doc comment above. */
  function mountStation(spec, opts) {
    var fn = spec.fn;
    var wrap = T.el("div", { class: "spatial-station", "data-control-group": "",
      style: posStyle(spec.pos || {}) });
    wrap.appendChild(T.el("div", { class: "station-face", "aria-hidden": "true" }));
    wrap.appendChild(T.el("div", { class: "station-label", text: spec.label || spec.station }));
    var stationField = T.el("input", { type: "hidden", "data-param": "station", value: spec.station });
    wrap.appendChild(stationField);
    var valueInput = T.el("input", { type: "number", class: "station-value",
      "data-param": "value", value: String(spec.initial), step: spec.step || "1",
      "aria-label": (spec.label || spec.station) + " level" });
    wrap.appendChild(T.el("div", { class: "station-value-row" }, [
      valueInput, T.el("span", { class: "station-unit", text: spec.unit || "" })]));
    var slot = T.el("div", { class: "station-slot" });
    var commit = T.el("button", { type: "button", class: "tw-btn primary station-commit",
      "data-op": fn.name, "data-gesture": "dial", text: "Adjust" });
    commit.addEventListener("click", function () {
      var params = { station: stationField.value, value: numOrRaw(valueInput.value) };
      fireControl(fn, params, slot, opts);
    });
    wrap.appendChild(commit);
    wrap.appendChild(slot);
    return wrap;
  }

  /* mountDoor({openFn, closeFn, door, pos, label, open}, opts) — a door
     tile: two step controls (open/close) wired to one fixed door id.
     data-gesture="step" on both — the control's commit IS the whole
     gesture (no value to fill), same shape as the DAW kit's transport
     button, honestly renamed for this genre's own vocabulary (a room-tile's
     press). The current state is shown via a lamp, always re-read from the
     last real state, never computed locally. */
  function mountDoor(spec, opts) {
    var doorField1 = T.el("input", { type: "hidden", "data-param": "door", value: spec.door });
    var doorField2 = T.el("input", { type: "hidden", "data-param": "door", value: spec.door });
    var wrap = T.el("div", { class: "spatial-door", "data-control-group": "",
      style: posStyle(spec.pos || {}) });
    wrap.appendChild(T.el("div", { class: "door-face", "aria-hidden": "true" }));
    wrap.appendChild(T.el("div", { class: "door-label", text: spec.label || spec.door }));
    wrap.appendChild(T.el("div", { class: "door-state" }, [
      T.lamp(spec.open ? "open" : "closed", spec.open ? "ok" : "warn")]));
    var slot = T.el("div", { class: "door-slot" });
    var openGroup = T.el("div", { "data-control-group": "" }, [doorField1]);
    var openCommit = T.el("button", { type: "button", class: "tw-btn door-commit",
      "data-op": spec.openFn.name, "data-gesture": "step", text: "Open" });
    openCommit.addEventListener("click", function () {
      fireControl(spec.openFn, { door: doorField1.value }, slot, opts);
    });
    openGroup.appendChild(openCommit);
    var closeGroup = T.el("div", { "data-control-group": "" }, [doorField2]);
    var closeCommit = T.el("button", { type: "button", class: "tw-btn door-commit",
      "data-op": spec.closeFn.name, "data-gesture": "step", text: "Close" });
    closeCommit.addEventListener("click", function () {
      fireControl(spec.closeFn, { door: doorField2.value }, slot, opts);
    });
    closeGroup.appendChild(closeCommit);
    wrap.appendChild(T.el("div", { class: "door-controls" }, [openGroup, closeGroup]));
    wrap.appendChild(slot);
    return wrap;
  }

  /* mountLinkNew(fn, opts) — a new-adjacency-link control: two free-text
     station-id fields (data-param="a"/"b") plus a commit. data-gesture=
     "link" — the same "two endpoints beside a commit" shape the synth's
     cable and the DAW's routing control share, named honestly for this
     genre's own vocabulary (adjacency, not a signal path or a bus route). */
  function mountLinkNew(fn, opts) {
    var wrap = T.el("div", { class: "spatial-link spatial-link-new", "data-control-group": "" });
    wrap.appendChild(T.el("div", { class: "link-label", text: "New adjacency link" }));
    var aInput = T.el("input", { type: "text", class: "link-field", "data-param": "a",
      placeholder: "a — e.g. comms", "aria-label": "station a" });
    var bInput = T.el("input", { type: "text", class: "link-field", "data-param": "b",
      placeholder: "b — e.g. power", "aria-label": "station b" });
    wrap.appendChild(T.el("div", { class: "link-fields" }, [
      aInput, T.el("span", { class: "link-arrow", text: "↔" }), bInput]));
    var slot = T.el("div", { class: "link-slot" });
    var commit = T.el("button", { type: "button", class: "tw-btn primary link-commit",
      "data-op": fn.name, "data-gesture": "link", text: "Link" });
    commit.addEventListener("click", function () {
      fireControl(fn, { a: aInput.value, b: bInput.value }, slot, opts);
    });
    wrap.appendChild(commit);
    wrap.appendChild(slot);
    return wrap;
  }

  /* mountUnlinkRow(fn, link, opts) — a quick "unlink" control on an EXISTING
     adjacency link: its two endpoints are already known (link.a/link.b),
     carried as hidden data-param fields (the operator sees the link as
     text, not as editable inputs), plus a destructive commit
     (link.disconnect — typed-name gated, same as the rack's/synth's/DAW's
     destructive ops). data-gesture="link" — the same gesture name as
     mountLinkNew above; both are the link control's commit, one composing a
     new link, one removing an existing one. */
  function mountUnlinkRow(fn, link, opts) {
    var wrap = T.el("div", { class: "spatial-link spatial-link-existing", "data-control-group": "" });
    wrap.appendChild(T.el("span", { class: "link-assignment", text: link.a + " ↔ " + link.b }));
    var aField = T.el("input", { type: "hidden", "data-param": "a", value: link.a });
    var bField = T.el("input", { type: "hidden", "data-param": "b", value: link.b });
    wrap.appendChild(aField);
    wrap.appendChild(bField);
    var slot = T.el("div", { class: "link-slot" });
    var commit = T.el("button", { type: "button", class: "tw-btn danger link-commit",
      "data-op": fn.name, "data-gesture": "link", text: "Unlink" });
    commit.addEventListener("click", function () {
      fireControl(fn, { a: aField.value, b: bField.value }, slot, opts);
    });
    wrap.appendChild(commit);
    wrap.appendChild(slot);
    return wrap;
  }

  /* mountCord(fromPos, toPos) — the "cord" vocabulary item: a purely
     decorative line drawn between two stations' fixed 3D positions,
     visualising an adjacency link. Carries no Control grammar attributes —
     it is presentation only, hidden entirely at data-degrade="2d"/"text"
     (spatial-kit.css) without touching any control's reachability. The
     textual link list (mountLinkNew/mountUnlinkRow above) is what actually
     carries the link's function in every degrade mode. */
  function mountCord(fromPos, toPos) {
    var dx = (toPos.x || 0) - (fromPos.x || 0);
    var dz = (toPos.z || 0) - (fromPos.z || 0);
    var length = Math.sqrt(dx * dx + dz * dz);
    var angle = Math.atan2(dz, dx) * (180 / Math.PI);
    var midX = ((fromPos.x || 0) + (toPos.x || 0)) / 2;
    var midY = ((fromPos.y || 0) + (toPos.y || 0)) / 2;
    var midZ = ((fromPos.z || 0) + (toPos.z || 0)) / 2;
    var style = "--sx:" + midX + "px; --sy:" + midY + "px; --sz:" + midZ + "px; " +
      "--cord-len:" + length + "px; --cord-rot:" + angle + "deg;";
    return T.el("div", { class: "spatial-cord", "aria-hidden": "true", style: style });
  }

  /* spatialRoom(children) — the "room" vocabulary item: the 3D perspective
     container. Presentation only; the data-degrade attribute that actually
     switches 3d/2d/text presentation lives on the twin root (see
     examples/room/twin.html), not here — this wrapper only needs to exist
     so spatial-kit.css has a stable ancestor to key its rules off. */
  function spatialRoom(children) {
    var wrap = T.el("div", { class: "spatial-room" });
    (children || []).forEach(function (c) { wrap.appendChild(c); });
    return wrap;
  }

  /* roomFloor(children) — the "floor" vocabulary item: the preserve-3d
     plane every station/door/cord is positioned within. */
  function roomFloor(children) {
    var wrap = T.el("div", { class: "spatial-floor" });
    (children || []).forEach(function (c) { wrap.appendChild(c); });
    return wrap;
  }

  global.SpatialKit = { init: init, mountStation: mountStation, mountDoor: mountDoor,
    mountLinkNew: mountLinkNew, mountUnlinkRow: mountUnlinkRow, mountCord: mountCord,
    spatialRoom: spatialRoom, roomFloor: roomFloor };
})(typeof window !== "undefined" ? window : this);
