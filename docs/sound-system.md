# Sound system

FITHER videos ship with an original, deterministic bed beneath the brand
voice. The bed is generated locally from simple waveforms and filtered noise;
it has no catalogue, attribution or recurring licensing dependency.

## Production contract

Every video sidecar declares:

```json
"sound": { "profile": "quiet-drive", "bed_gain_db": -16 }
```

`quiet-drive` is a restrained 80 BPM tonal pulse with a soft air layer. The
renderer compresses the dialogue stem, ducks the bed whenever voice is present,
then masters the complete mix to -14 LUFS with a -1.5 dB true-peak target.
Validation rejects unknown profiles and bed gains outside -22 to -12 dB.

Slideshows declare `"sound": { "profile": "platform" }` because TikTok photo
posts receive sound during upload. That sound must not carry instructional
meaning.

## Fail-closed QA

The final MP4 is rejected when:

- any scripted voice window is silent or cannot be measured;
- integrated loudness falls outside -17 to -11 LUFS;
- true peak exceeds -1 dBFS; or
- the deterministic sound bed cannot be generated.

The CI golden fixture contains spoken audio followed by a voice-free window.
It checks dialogue and bed audibility, the loudness/peak contract and the AAC
delivery stream. Final video audio is always 48 kHz stereo AAC.

## Posting rule

Do not stack a second music bed on normal video posts. A TikTok-native sound may
be added only as a named experiment, at 0-5%, and recorded in performance notes.
Slideshows still use one calm in-app sound because their delivered asset is a
set of images rather than an audio-bearing MP4.
