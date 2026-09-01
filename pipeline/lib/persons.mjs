// Detection for the faceless gate. Environment scenes: no person may
// appear. Demo scenes: a person must appear but a face must not (body-only
// framing). COCO-SSD finds people, BlazeFace finds faces; both run on JPEG
// buffers with the pure-JS CPU backend.
import jpeg from "jpeg-js";

let modelPromise = null;
let facePromise = null;
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

export async function loadFaceDetector() {
  if (!facePromise) {
    const blazeface = await import("@tensorflow-models/blazeface");
    await getTf();
    // Default host (tfhub) is unreachable from some proxied environments;
    // BLAZEFACE_MODEL_URL overrides it. A load failure surfaces as a
    // rejected demo clip (gradient fallback), never as a face on screen.
    facePromise = blazeface.load(
      process.env.BLAZEFACE_MODEL_URL ? { modelUrl: process.env.BLAZEFACE_MODEL_URL } : undefined,
    );
  }
  return facePromise;
}

function decodeToTensor(tf, buf) {
  const { data, width, height } = jpeg.decode(buf, {
    useTArray: true,
    formatAsRGBA: false,
    maxMemoryUsageInMB: 1024,
  });
  return tf.tensor3d(data, [height, width, 3], "int32");
}

// True if any person is detected in the JPEG at or above the threshold.
// The threshold is deliberately low: a false rejection costs one candidate
// clip, a false pass breaks the channel's hard faceless rule.
export async function personInJpeg(buf, threshold = 0.25) {
  const model = await loadDetector();
  const tf = await getTf();
  const t = decodeToTensor(tf, buf);
  try {
    const preds = await model.detect(t, 20, threshold);
    return preds.some((p) => p.class === "person" && p.score >= threshold);
  } finally {
    t.dispose();
  }
}

// True if a (near-frontal) face is visible. The back of a head or a body
// framed below the neck passes; a recognizable face does not.
export async function faceInJpeg(buf, threshold = 0.85) {
  const model = await loadFaceDetector();
  const tf = await getTf();
  const t = decodeToTensor(tf, buf);
  try {
    const faces = await model.estimateFaces(t, false);
    return faces.some((f) => {
      const p = Array.isArray(f.probability) ? f.probability[0] : f.probability;
      return (typeof p === "number" ? p : 1) >= threshold;
    });
  } finally {
    t.dispose();
  }
}
