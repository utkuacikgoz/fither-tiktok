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
  // Second batch, in the order of how many week 02 cards each one unlocks.
  { id: "sit-to-stand", name: "Sit-to-Stand", appId: "sit-to-stand" },
  { id: "wall-sit", name: "Wall Sit", appId: "wall-sit" },
  { id: "standing-hip-hinge", name: "Standing Hip Hinge", appId: "standing-hip-hinge" },
  { id: "wall-slide", name: "Wall Slide", appId: "wall-slide" },
  { id: "knee-plank", name: "Knee Plank", appId: "knee-plank" },
  { id: "doorframe-lean-row", name: "Doorframe Lean Row", appId: "doorframe-lean-row" },
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
  // Seated on the chair, arms reaching forward for balance, then standing
  // tall in front of it with the arms down. The peak (standing) is the card
  // still, with the chair behind it saying where the rep started.
  "sit-to-stand": {
    context: "chair",
    focus: ["hip", "knee"],
    start: {
      head: point(525, 660), shoulder: point(525, 800), elbow: point(640, 880), hand: point(770, 860),
      hip: point(540, 1110), knee: point(780, 1240), ankle: point(750, 1545), toe: point(875, 1590),
    },
    end: {
      head: point(745, 550), shoulder: point(745, 690), elbow: point(760, 850), hand: point(775, 970),
      hip: point(740, 990), knee: point(760, 1240), ankle: point(750, 1545), toe: point(875, 1590),
    },
  },
  // Back flat on the wall, thighs level, hands resting on the thighs. A hold,
  // so the loop is a breath: the torso lifts a few pixels and settles.
  "wall-sit": {
    context: "wall",
    focus: ["knee", "hip"],
    start: {
      head: point(850, 780), shoulder: point(850, 920), elbow: point(820, 1075), hand: point(700, 1150),
      hip: point(850, 1230), knee: point(610, 1230), ankle: point(605, 1545), toe: point(485, 1590),
    },
    end: {
      head: point(850, 772), shoulder: point(850, 912), elbow: point(820, 1068), hand: point(700, 1145),
      hip: point(850, 1230), knee: point(610, 1230), ankle: point(605, 1545), toe: point(485, 1590),
    },
  },
  // Standing tall, then the hips travel back and the flat torso folds forward
  // over soft knees, arms hanging. Feet never move.
  "standing-hip-hinge": {
    context: "floor",
    focus: ["hip"],
    start: {
      head: point(545, 625), shoulder: point(545, 760), elbow: point(560, 915), hand: point(570, 1050),
      hip: point(550, 1070), knee: point(555, 1320), ankle: point(545, 1540), toe: point(675, 1590),
    },
    end: {
      head: point(775, 790), shoulder: point(675, 890), elbow: point(680, 1040), hand: point(685, 1160),
      hip: point(455, 1110), knee: point(520, 1335), ankle: point(545, 1540), toe: point(675, 1590),
    },
  },
  // Back on the wall, forearms on the wall in a W, then the hands slide up
  // into a Y and back. In profile the upper arm foreshortens, so it is drawn
  // short and angled behind the shoulder rather than out to the side.
  "wall-slide": {
    context: "wall",
    focus: ["shoulder", "elbow"],
    start: {
      head: point(850, 630), shoulder: point(850, 770), elbow: point(885, 860), hand: point(885, 700),
      hip: point(850, 1080), knee: point(835, 1320), ankle: point(830, 1545), toe: point(710, 1590),
    },
    end: {
      head: point(850, 630), shoulder: point(850, 770), elbow: point(880, 640), hand: point(885, 480),
      hip: point(850, 1080), knee: point(835, 1320), ankle: point(830, 1545), toe: point(710, 1590),
    },
  },
  // Full Plank's sibling: same forearm contact line and shoulder height, the
  // knees down and the shins resting behind. The hold breathes like Full Plank.
  "knee-plank": {
    context: "floor",
    focus: ["shoulder", "hip"],
    start: {
      head: point(830, 1035), shoulder: point(720, 1105), elbow: point(725, 1435), hand: point(895, 1460),
      hip: point(545, 1280), knee: point(400, 1440), ankle: point(190, 1445), toe: point(135, 1475),
    },
    end: {
      head: point(830, 1027), shoulder: point(720, 1097), elbow: point(725, 1435), hand: point(895, 1460),
      hip: point(545, 1272), knee: point(400, 1436), ankle: point(190, 1445), toe: point(135, 1475),
    },
  },
  // Doorframe Row's easier sibling: feet close to the frame, a slight lean
  // back with the arm long, then the body pivots on the ankles toward the
  // frame as the elbow drives back. Single hip marker for the same reason
  // as Doorframe Row.
  "doorframe-lean-row": {
    context: "doorframe",
    focus: ["hip"],
    start: {
      head: point(604, 667), shoulder: point(615, 800), elbow: point(745, 840), hand: point(875, 860),
      hip: point(640, 1105), knee: point(660, 1330), ankle: point(670, 1545), toe: point(795, 1590),
    },
    end: {
      head: point(726, 665), shoulder: point(715, 800), elbow: point(735, 955), hand: point(875, 860),
      hip: point(690, 1100), knee: point(665, 1325), ankle: point(670, 1545), toe: point(795, 1590),
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
