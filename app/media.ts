// Server-only: importing node:fs into a client component is a build error, so
// this module can only be reached from the server side.
import fs from "node:fs";
import path from "node:path";

const VIDEO_EXT = /\.(mp4|webm|mov|m4v)$/i;
const IMAGE_EXT = /\.(jpe?g|png|webp|avif|gif)$/i;

/**
 * Lists a folder under public/ as URL paths.
 *
 * Both media folders are gitignored and swapped out per service, so the app
 * discovers whatever is on disk instead of carrying a hardcoded list. Missing
 * or empty folders are not an error — the UI degrades rather than crashing.
 */
function readMediaDir(folder: string, pattern: RegExp) {
  const dir = path.join(process.cwd(), "public", folder);

  let names: string[];
  try {
    names = fs.readdirSync(dir);
  } catch {
    return [];
  }

  return names
    .filter((name) => pattern.test(name))
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))
    .map((name) => `/${folder}/${encodeURIComponent(name)}`);
}

/** Clips play in filename order, so numbered prefixes control the sequence. */
export function readVideos() {
  return readMediaDir("videos", VIDEO_EXT);
}

/** Slideshow stills, shown in filename order like the clips. */
export function readImages() {
  return readMediaDir("images", IMAGE_EXT);
}
