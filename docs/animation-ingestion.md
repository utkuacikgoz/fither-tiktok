# Authored animation ingestion

The renderer accepts movement animation only from
`assets/animation-library.json`. The library starts empty and fails closed:
an `animated-demo` sidecar cannot validate until its exact movement has an
approved export. Runway and stock sources are never eligible to
demonstrate exercise form.

## Export contract

Export the authored app animation as a loop-safe MP4 or WebM with:

- 1080x1920 portrait canvas
- 30 fps
- no recognizable face
- 60 seconds or less
- a complete, technically correct repetition with no cut at the loop point
- FITHER-owned rights

Keep the Rive/source file in the app repository. This pipeline consumes the
rendered video export because ffmpeg needs deterministic frames, not a live
authoring runtime.

## Approval and ingestion

1. Watch the complete export at normal speed and frame-step the loop point.
   Confirm the named movement, joint path, range, body framing and faceless
   treatment.
2. Put a local export under `assets/animation-exports/`, or upload it to a
   direct HTTPS `.mp4`/`.webm` URL.
3. Compute its lowercase SHA-256 (`shasum -a 256 FILE`) and add an entry under
   the exact movement name in `assets/animation-library.json`:

```json
{
  "source": "authored",
  "rights": "FITHER-owned",
  "path": "assets/animation-exports/air-squat-v1.mp4",
  "sha256": "64-lowercase-hex-characters",
  "duration": 6,
  "width": 1080,
  "height": 1920,
  "fps": 30,
  "loop_safe": true,
  "movement_verified": true,
  "faceless_verified": true,
  "reviewed_at": "2026-09-02"
}
```

Use `url` instead of `path` for a remote export; never provide both. Then run:

```sh
node pipeline/assets.mjs
npm --prefix pipeline run check
```

The first render downloads or copies the export into the cache, verifies its
SHA-256, probes the real dimensions, frame rate and duration, and writes an
`animation:<sha256>` asset identity. The weekly shot audit prevents the same
export from reappearing in another post after it has been recorded.

## Sidecar contract

Use the dedicated format and scene flag:

```json
{
  "format": "animated-demo",
  "scenes": [{
    "start": 0,
    "end": 6,
    "animation": true,
    "movement": "Air Squat",
    "overlays": []
  }]
}
```

An animated-demo video may contain environment or kinetic-text beats, but it
must contain at least one approved animation scene. `demo: true` remains the
separate contract for reviewed physical footage. A scene cannot claim both.
