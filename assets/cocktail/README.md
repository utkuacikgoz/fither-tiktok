# Cocktail cover photos

The default source for a cover photo is Pexels stock search: set
`scenes[0].stock_query` in the sidecar and the render fetches, face-screens
and crops a candidate at build time (`fetchCoverPhoto()` in
`pipeline/lib/broll.mjs`). See "Stock photo covers" in
`docs/cocktail-content.md`. Nothing needs to live in this directory for that
path.

This directory is for the owner-shot alternative, which still takes
priority when both are set. One photo per cocktail post, shot by the owner
with the face fully hidden (phone, hair, visor, door edge, towel or crop).
The contract in `docs/footage-capture.md` applies: no recognizable face at
any point, in the subject or in a mirror.

Name each file after the post slug, e.g.
`2026-09-09-group-chat-floor-cocktail.jpg`, then set `scenes[0].photo` in the
sidecar to `assets/cocktail/<file>`. With neither `photo` nor `stock_query`
set, the render draws a striped placeholder carrying the shot brief, so the
deck can be reviewed with the cover line in place.

Portrait, at least 1080x1920. JPG or PNG.
