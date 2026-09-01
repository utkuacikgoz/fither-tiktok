// ElevenLabs text-to-speech, one clip per voiceover line, cached by content.
// Without ELEVENLABS_API_KEY the render proceeds silent (draft mode).
import { createHash } from "node:crypto";
import { writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { cacheDir, ensureDir } from "./env.mjs";

const API = "https://api.elevenlabs.io/v1/text-to-speech";

export function ttsAvailable() {
  return Boolean(process.env.ELEVENLABS_API_KEY && process.env.ELEVENLABS_VOICE_ID);
}

export async function synthesizeLines(lines) {
  if (!ttsAvailable()) return null;
  const voice = process.env.ELEVENLABS_VOICE_ID;
  const model = process.env.ELEVENLABS_MODEL_ID || "eleven_multilingual_v2";
  const dir = ensureDir(join(cacheDir, "tts"));
  const files = [];
  for (const line of lines) {
    const key = createHash("sha1").update(`${voice}|${model}|${line.text}`).digest("hex");
    const file = join(dir, `${key}.mp3`);
    if (!existsSync(file)) {
      const res = await fetch(`${API}/${voice}?output_format=mp3_44100_128`, {
        method: "POST",
        headers: {
          "xi-api-key": process.env.ELEVENLABS_API_KEY,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          text: line.text,
          model_id: model,
          voice_settings: { stability: 0.55, similarity_boost: 0.75, style: 0.15 },
        }),
      });
      if (!res.ok) throw new Error(`ElevenLabs ${res.status}: ${(await res.text()).slice(0, 300)}`);
      writeFileSync(file, Buffer.from(await res.arrayBuffer()));
    }
    files.push({ t: line.t, file });
  }
  return files;
}
