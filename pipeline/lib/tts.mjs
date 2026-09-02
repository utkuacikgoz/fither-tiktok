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
      // The subscription allows 3 concurrent requests; parallel render
      // shards collide on that. Back off and retry instead of dying.
      let res;
      for (let attempt = 0; ; attempt++) {
        res = await fetch(`${API}/${voice}?output_format=mp3_44100_128`, {
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
        if (res.ok) break;
        const retryable = res.status === 429 || res.status >= 500;
        if (!retryable || attempt >= 7) {
          throw new Error(`ElevenLabs ${res.status}: ${(await res.text()).slice(0, 300)}`);
        }
        const wait = Math.min(30000, 1500 * 2 ** attempt) + Math.random() * 1000;
        console.log(`  tts: ${res.status}, retrying in ${(wait / 1000).toFixed(1)}s (attempt ${attempt + 1}/7)`);
        await res.text().catch(() => {});
        await new Promise((r) => setTimeout(r, wait));
      }
      writeFileSync(file, Buffer.from(await res.arrayBuffer()));
    }
    files.push({ t: line.t, text: line.text, file });
  }
  return files;
}
