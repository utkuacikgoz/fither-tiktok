// Person detection for the faceless gate: no b-roll clip may contain a
// person. Runs COCO-SSD (lite) on JPEG buffers, pure-JS CPU backend.
import jpeg from "jpeg-js";

let modelPromise = null;
let tfPromise = null;

async function getTf() {
  tfPromise ??= import("@tensorflow/tfjs");
  return tfPromise;
}

export async function loadDetector() {
  if (!modelPromise) {
    const cocoSsd = await import("@tensorflow-models/coco-ssd");
    await getTf();
    modelPromise = cocoSsd.load({ base: "lite_mobilenet_v2" });
  }
  return modelPromise;
}

// True if any person is detected in the JPEG at or above the threshold.
// The threshold is deliberately low: a false rejection costs one candidate
// clip, a false pass breaks the channel's hard faceless rule.
export async function personInJpeg(buf, threshold = 0.25) {
  const model = await loadDetector();
  const tf = await getTf();
  const { data, width, height } = jpeg.decode(buf, {
    useTArray: true,
    formatAsRGBA: false,
    maxMemoryUsageInMB: 1024,
  });
  const t = tf.tensor3d(data, [height, width, 3], "int32");
  try {
    const preds = await model.detect(t, 20, threshold);
    return preds.some((p) => p.class === "person" && p.score >= threshold);
  } finally {
    t.dispose();
  }
}
