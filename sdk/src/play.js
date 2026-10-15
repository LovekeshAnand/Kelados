import { spawn } from "node:child_process";
import { rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

/** The OS's own WAV player, so playback needs no native dependency. */
export function playerFor(platform, file) {
  if (platform === "win32") return ["powershell", ["-NoProfile", "-Command", `(New-Object Media.SoundPlayer '${file.replace(/'/g, "''")}').PlaySync()`]];
  if (platform === "darwin") return ["afplay", [file]];
  return ["sh", ["-c", 'paplay "$0" 2>/dev/null || aplay -q "$0" 2>/dev/null || ffplay -nodisp -autoexit -loglevel quiet "$0"', file]];
}

/** Play a WAV buffer through the speakers and resolve when it finishes. */
export async function playWav(wav) {
  const file = join(tmpdir(), `kelados-${process.pid}-${Date.now()}.wav`);
  await writeFile(file, wav);
  try {
    const [cmd, args] = playerFor(process.platform, file);
    await new Promise((ok, fail) => spawn(cmd, args, { stdio: "ignore" }).on("error", fail).on("exit", (c) => (c ? fail(new Error(`${cmd} exited with ${c}`)) : ok())));
  } finally {
    await rm(file, { force: true });
  }
}
