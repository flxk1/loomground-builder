# Stage: layout — relationships → arrangement

Cascade position: `genre-select → substrate → **layout** → bind`. Genre-
independent in its rule, genre-specific in its vocabulary: every genre
arranges its own primitives (the rack's shelves grouped by facade, the
synth's knobs grouped into a module, the DAW's faders grouped into a track
strip, the spatial genre's tiles positioned in a room), but every genre does
so on top of one fixed scale, never inventing its own.

## The fixed contract

The component sheet (`../sheet/twin-sheet.css`, contract `twin-sheet/1`)
fixes the type scale, the spacing scale, and the density modes; a genre's
substrate kit composes its own primitives on top of that scale, never
underneath it. **Tier-1 views may add their own layout CSS on top of the
sheet's tokens and scales, never beneath them.** This is the composition
discipline every genre kit's own doc comment cites (`skill/SKILL.md's
"Control grammar" section` and the composition rule together): freestyling a
parallel size system is exactly the sprawl an earlier version of this skill
measured (4 ad-hoc sizes, then 13, neither a scale) - see `../SKILL.md`'s
substrate-composition rule.

## Genre-specific arrangement

Each genre's substrate kit supplies its own grouping primitives - visual
grouping only, carrying no Control grammar attributes themselves (their
children do):

- rack: `shelf` groups one facade's op-rows (`../sheet/twin-sheet.js`).
- synth: `synthModule` groups one module's knobs/cables
  (`../genres/synth/synth-kit.js`).
- DAW: `trackStrip` groups one track's fader/pan/mute; `transportBar` groups
  the transport buttons (`../genres/daw/daw-kit.js`).
- spatial: `spatialRoom`/`roomFloor` position stations, doors, and cords in
  3D space via CSS custom properties (`../genres/spatial/spatial-kit.js`);
  see `../genres/spatial/GENRE.md` for how that positioning survives the D6
  degrade.

## Arrangement authority

Arrangement is authored per twin on top of the fixed scale above. The
component and live gates verify control coverage and behavior; the critique
loop (`critique.md`) verifies visual craft. No external layout solver or
unpublished planning artifact is part of this release contract.

## References

- `../sheet/twin-sheet.css` - the fixed type/spacing scale and density modes.
- `critique.md` - where "a real layout system rather than ad-hoc positioning"
  is checked.
- each genre's `GENRE.md` - its own substrate grouping primitives in full.
