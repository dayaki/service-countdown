export const VIDEOS = [
  "/videos/01.mp4",
  "/videos/02.mp4",
  "/videos/03.mp4",
  "/videos/04.mp4",
  "/videos/05.mp4",
  "/videos/06.mp4",
];

/** How long the countdown runs, in seconds. */
export const COUNTDOWN_SECONDS = 25 * 60;

/**
 * How much of a clip may be cropped before we letterbox it instead.
 *
 * Each video is measured on load and compared against the viewport. If filling
 * the screen would cut less than this fraction off, it fills (`cover`);
 * anything more and it shows the whole frame with bars (`contain`). Raise it to
 * favour a full screen, lower it to favour never losing picture.
 *
 * 0.15 sits in the gap between the two cases that actually occur: a 16:9 clip
 * on a 16:10-ish laptop crops 10–14% (worth absorbing, the alternative is bars
 * on every clip), while a genuinely different shape — 4:3 or ultrawide — costs
 * 17% or more, which is real picture and better letterboxed.
 */
export const MAX_CROP = 0.15;

export const SUBLABEL = "Service starts:";
export const FINAL_TITLE = "Welcome to Church";
