// Canonical 2D keyframes for the first FITHER-authored movement animation
// candidates. These are visual authoring data, not exercise prescriptions;
// movement names and cues remain sourced from the app movement library.
const point = (x, y) => ({ x, y });

export const AUTHORING_MOVEMENTS = [
  { id: "wall-push-up", name: "Wall Push-Up", appId: "wall-push-up" },
  { id: "air-squat", name: "Air Squat", appId: "air-squat" },
  { id: "reverse-lunge", name: "Reverse Lunge", appId: "reverse-lunge" },
  { id: "glute-bridge", name: "Glute Bridge", appId: "glute-bridge" },
  { id: "seated-knee-lift", name: "Seated Knee Lift", appId: "seated-knee-lift" },
  { id: "full-plank", name: "Full Plank", appId: "full-plank" },
  { id: "doorframe-row", name: "Doorframe Row", appId: "doorframe-row" },
];

export function loopProgress(t) {
  return (1 - Math.cos(Math.PI * 2 * t)) / 2;
}

const mix = (a, b, p) => point(
  a.x + (b.x - a.x) * p,
  a.y + (b.y - a.y) * p,
);

function interpolate(start, end, p) {
  const pose = {};
  for (const key of Object.keys(start)) pose[key] = mix(start[key], end[key], p);
  return pose;
}

const POSES = {
  "wall-push-up": {
    context: "wall",
    focus: ["elbow", "shoulder"],
    start: {
      head: point(595, 665), shoulder: point(630, 805), elbow: point(765, 875), hand: point(885, 850),
      hip: point(475, 1095), knee: point(380, 1325), ankle: point(295, 1545), toe: point(390, 1585),
    },
    end: {
      head: point(705, 700), shoulder: point(735, 840), elbow: point(785, 960), hand: point(885, 850),
      hip: point(545, 1115), knee: point(420, 1330), ankle: point(295, 1545), toe: point(390, 1585),
    },
  },
  "air-squat": {
    context: "floor",
    focus: ["hip", "knee"],
    start: {
      head: point(545, 625), shoulder: point(545, 755), elbow: point(610, 910), hand: point(650, 1015),
      hip: point(550, 1070), knee: point(555, 1320), ankle: point(545, 1540), toe: point(675, 1590),
    },
    end: {
      head: point(655, 740), shoulder: point(625, 865), elbow: point(690, 955), hand: point(795, 955),
      hip: point(515, 1190), knee: point(710, 1350), ankle: point(650, 1540), toe: point(790, 1590),
    },
  },
  "reverse-lunge": {
    context: "floor",
    focus: ["knee", "farKnee"],
    start: {
      head: point(555, 625), shoulder: point(555, 760), elbow: point(500, 920), hand: point(520, 1070),
      hip: point(555, 1065), knee: point(625, 1320), ankle: point(650, 1545), toe: point(775, 1590),
      farKnee: point(490, 1320), farAnkle: point(480, 1545), farToe: point(585, 1590),
    },
    end: {
      head: point(555, 720), shoulder: point(555, 855), elbow: point(500, 1010), hand: point(520, 1160),
      hip: point(555, 1160), knee: point(690, 1350), ankle: point(650, 1545), toe: point(785, 1590),
      farKnee: point(405, 1390), farAnkle: point(285, 1545), farToe: point(410, 1590),
    },
  },
  "glute-bridge": {
    context: "floor",
    focus: ["hip"],
    start: {
      head: point(285, 1325), shoulder: point(395, 1380), elbow: point(500, 1450), hand: point(640, 1470),
      hip: point(650, 1420), knee: point(820, 1230), ankle: point(900, 1480), toe: point(1010, 1510),
    },
    end: {
      head: point(285, 1325), shoulder: point(395, 1380), elbow: point(500, 1450), hand: point(640, 1470),
      hip: point(645, 1135), knee: point(820, 1230), ankle: point(900, 1480), toe: point(1010, 1510),
    },
  },
  "seated-knee-lift": {
    context: "chair",
    focus: ["hip", "knee"],
    start: {
      head: point(520, 625), shoulder: point(520, 770), elbow: point(470, 930), hand: point(500, 1080),
      hip: point(540, 1110), knee: point(755, 1190), ankle: point(745, 1480), toe: point(860, 1530),
    },
    end: {
      head: point(520, 625), shoulder: point(520, 770), elbow: point(470, 930), hand: point(500, 1080),
      hip: point(540, 1110), knee: point(735, 970), ankle: point(790, 1190), toe: point(900, 1240),
    },
  },
  "full-plank": {
    context: "floor",
    focus: ["shoulder", "hip"],
    start: {
      head: point(765, 1040), shoulder: point(650, 1110), elbow: point(655, 1435), hand: point(825, 1460),
      hip: point(445, 1215), knee: point(300, 1310), ankle: point(175, 1410), toe: point(215, 1490),
    },
    end: {
      head: point(765, 1032), shoulder: point(650, 1102), elbow: point(655, 1435), hand: point(825, 1460),
      hip: point(445, 1207), knee: point(300, 1305), ankle: point(175, 1410), toe: point(215, 1490),
    },
  },
  "doorframe-row": {
    context: "doorframe",
    // A single hip marker avoids two adjacent highlighted joints reading as
    // face-like geometry to the output gate while keeping the body-line cue.
    focus: ["hip"],
    start: {
      head: point(570, 700), shoulder: point(610, 835), elbow: point(735, 875), hand: point(875, 850),
      hip: point(470, 1130), knee: point(370, 1355), ankle: point(285, 1550), toe: point(410, 1590),
    },
    end: {
      head: point(700, 700), shoulder: point(735, 835), elbow: point(770, 990), hand: point(875, 850),
      hip: point(550, 1130), knee: point(420, 1360), ankle: point(285, 1550), toe: point(410, 1590),
    },
  },
};

export function movementFrame(id, t) {
  const definition = POSES[id];
  if (!definition) throw new Error(`Unknown authored movement ${id}`);
  return {
    ...definition,
    pose: interpolate(definition.start, definition.end, loopProgress(t)),
  };
}

export function validateAuthoredPoses() {
  const errors = [];
  const required = ["head", "shoulder", "elbow", "hand", "hip", "knee", "ankle", "toe"];
  for (const movement of AUTHORING_MOVEMENTS) {
    const definition = POSES[movement.id];
    if (!definition) {
      errors.push(`${movement.id}: missing pose definition`);
      continue;
    }
    for (const phase of [0, 0.25, 0.5, 0.75, 1]) {
      const { pose } = movementFrame(movement.id, phase);
      for (const key of required) {
        const p = pose[key];
        if (!p || !Number.isFinite(p.x) || !Number.isFinite(p.y)) errors.push(`${movement.id}: missing ${key}`);
        else if (p.x < 70 || p.x > 1010 || p.y < 400 || p.y > 1650) errors.push(`${movement.id}: ${key} leaves safe frame`);
      }
    }
    const first = movementFrame(movement.id, 0).pose;
    const last = movementFrame(movement.id, 1).pose;
    for (const key of required) {
      if (first[key].x !== last[key].x || first[key].y !== last[key].y) errors.push(`${movement.id}: loop seam at ${key}`);
    }
  }
  return errors;
}
