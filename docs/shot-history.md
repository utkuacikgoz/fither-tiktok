# Shot identity and reuse gate

Every selected environment or demonstration clip carries a stable identity:
`pexels:<video-id>` or `owned:<sha256>`. The renderer writes those identities
beside each master in `<slug>.assets.json`.

Before a weekly posting sheet is produced, `node pipeline/shots.mjs 01` merges
the records and fails when one asset appears twice in the pack or already
exists in `data/shot-history.json`. The resulting `shot-report.md` is part of
the posting artifact.

After each post is live, record exactly that post:

```bash
node pipeline/shots.mjs 01 --record 2026-09-04-hotel-room-silent-session
```

Commit the updated history before the next render. Future Pexels and approved
demo selection excludes recorded identities before downloading a candidate.
Gradient scenes have no external footage identity and are not recorded.

This gate prevents silent visual reuse; it does not claim that two different
clips are creatively distinct. Final QA still checks angle, room, crop and
motion rhythm across the complete pack.
