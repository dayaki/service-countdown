// Server-only: importing node:fs into a client component is a build error, so
// this module can only be reached from the server side.
import fs from "node:fs";
import path from "node:path";

const VIDEO_EXT = /\.(mp4|webm|mov|m4v)$/i;
const IMAGE_EXT = /\.(jpe?g|png|webp|avif|gif)$/i;

/**
 * The closing clip, picked out by name rather than by position. It shares the
 * folder with the playlist but is never queued as an ordinary clip — the clock
 * cues it (see OUTRO_START_SECONDS in config.ts).
 */
const OUTRO_NAME = /^outro\./i;

/**
 * Lists a folder under public/ as URL paths, optionally keeping only the names
 * a caller is after.
 *
 * Both media folders are gitignored and swapped out per service, so the app
 * discovers whatever is on disk instead of carrying a hardcoded list. Missing
 * or empty folders are not an error — the UI degrades rather than crashing.
 */
function readMediaDir(
  folder: string,
  pattern: RegExp,
  keep: (name: string) => boolean = () => true,
) {
  const dir = path.join(process.cwd(), "public", folder);

  let names: string[];
  try {
    names = fs.readdirSync(dir);
  } catch {
    return [];
  }

  return names
    .filter((name) => pattern.test(name) && keep(name))
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))
    .map((name) => `/${folder}/${encodeURIComponent(name)}`);
}

/** Clips play in filename order, so numbered prefixes control the sequence. */
export function readVideos() {
  return readMediaDir("videos", VIDEO_EXT, (name) => !OUTRO_NAME.test(name));
}

/** The closing clip, or null if the service has not been given one. */
export function readOutro() {
  const found = readMediaDir("videos", VIDEO_EXT, (name) =>
    OUTRO_NAME.test(name),
  );
  return found[0] ?? null;
}

/** Slideshow stills, shown in filename order like the clips. */
export function readImages() {
  return readMediaDir("images", IMAGE_EXT);
}
