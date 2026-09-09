# Cocktail cover photos

One photo per cocktail post, shot by the owner with the face fully hidden
(phone, hair, visor, door edge, towel or crop). The contract in
`docs/footage-capture.md` applies: no recognizable face at any point, in the
subject or in a mirror.

Name each file after the post slug, e.g.
`2026-09-09-group-chat-floor-cocktail.jpg`, then set `scenes[0].photo` in the
sidecar to `assets/cocktail/<file>`. Until then the render draws a striped
placeholder carrying the shot brief, so the deck can be reviewed with the
cover line in place.

Portrait, at least 1080x1920. JPG or PNG.
