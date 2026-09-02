# Exercise footage capture brief

The immediate visual target is three approved body-only clips for every
movement used in the current week. That is 18 clips across six movements.
Stock search remains useful for discovery, but it cannot verify movement truth
or hide every profile. Owner-shot footage is the dependable route.

## Capture standard

- Portrait 9:16, 1080×1920 minimum, 4K preferred, 30 fps.
- Locked phone, locked exposure and focus, no digital zoom or beauty filters.
- Eight to twelve seconds per take, with three controlled repetitions or one
  steady hold. Leave one clean second before and after the movement.
- Frame below the chin or from a rear angle with the face fully obscured for
  the entire take. A small or side-profile face still fails.
- Keep every loaded joint visible. A face-free crop that hides the working
  joints is not a coaching demo.
- Plain clothing without logos. Quiet neutral room. No mirrors, screens,
  photographs or bystanders that can introduce another face.
- Record without music. The renderer does not use source audio.

## The 18 required takes

| Movement | Take A | Take B | Take C | Joints that must remain visible |
|---|---|---|---|---|
| Wall Push-Up | side, collarbone down | rear three-quarter | tight hands-to-heels diagonal | wrists, elbows, shoulders, hips, heels |
| Air Squat | side, collarbone down | rear three-quarter | front, neck down | hips, knees, ankles, heels |
| Reverse Lunge | side, neck down | rear three-quarter | front, neck down | hips, both knees, ankles, feet |
| Glute Bridge | side, head outside frame | rear diagonal from feet | tight shoulders-to-knees | shoulders, hips, knees, feet |
| Full Plank | side, head outside frame | rear three-quarter | low diagonal | shoulders, hips, knees, ankles |
| Seated Knee Lift | side, neck down | front, neck down | tight pelvis-to-feet | pelvis, working knee, supporting foot |

Each take must look materially different. Changing only the shirt does not
create footage depth; change angle, distance or room context while preserving
the form view.

## File names

Use lowercase movement, angle and take number:

```text
wall-push-up-side-01.mp4
wall-push-up-rear-02.mp4
wall-push-up-tight-03.mp4
```

## Approval checklist

Watch the entire source clip at normal speed and frame by frame.

1. The clip depicts the exact named movement, not a nearby variation.
2. The required joints remain visible through the complete repetition.
3. No recognizable face appears in the subject, a mirror, a screen or the
   background.
4. The vertical crop is useful and the subject is not covered by TikTok's
   right-side or lower interface zones.
5. Focus, exposure and motion are stable enough for a 1080×1920 master.
6. Usage rights and source provenance are recorded.

Only after all six checks pass does a clip enter `assets/demo-library.json`.
Machine screening creates candidates; it never grants approval.

## Registering an owned clip

Upload the approved master to a stable HTTPS location, calculate its SHA-256,
and register both. The renderer verifies the checksum before caching the file,
so a replaced or corrupted remote asset fails instead of silently changing a
published scene.

```json
{
  "source": "owned",
  "url": "https://media.example.com/fither/wall-push-up-side-01.mp4",
  "sha256": "64-lowercase-hex-characters",
  "duration": 10,
  "movement_verified": true,
  "faceless_verified": true,
  "reviewed_at": "2026-09-02"
}
```

Pexels approvals use `source: "pexels"`, `pexels_id` and `pexels_url` with
the same three review fields. Quarantined records never enter the render pool.
