/** How long the countdown runs, in seconds. */
export const COUNTDOWN_SECONDS = 25 * 60;

/**
 * Seconds remaining when the video gives way to the split slideshow. The video
 * keeps playing underneath so its audio carries through the final stretch.
 */
export const SLIDESHOW_START_SECONDS = 59;

/** How long each slide holds before the stack slides up to the next one. */
export const SLIDE_SECONDS = 5;

/**
 * Percentage of the viewport height the active slide occupies. The remainder
 * is the next slide peeking in from below, which is what makes the movement
 * legible as a slideshow rather than a cut.
 */
export const SLIDE_HEIGHT_VH = 80;

/** How long a slide takes to travel, in ms. */
export const SLIDE_TRANSITION_MS = 1200;

/**
 * Easing for the slide movement. easeInOutQuart: eases away, carries speed
 * through the middle, settles rather than stops. Any CSS easing works here.
 */
export const SLIDE_EASING = "cubic-bezier(0.76, 0, 0.24, 1)";

/**
 * How long one Ken Burns drift takes. The images slowly push in and out so a
 * slide is never completely static while it holds.
 */
export const KEN_BURNS_MS = 18000;

/**
 * Backdrops for the number panel, picked at random per slide. Add, remove or
 * replace freely — the only requirement is that white numerals stay legible,
 * so keep them mid-to-dark. Every colour here clears 4.5:1 against white.
 */
export const SLIDE_COLORS = [
  "#1E3A8A", // deep blue
  "#0F766E", // teal
  "#14532D", // forest
  "#581C87", // royal purple
  "#9F1239", // crimson
  "#9A3412", // burnt orange
  "#155E75", // petrol
  "#3F3F46", // graphite
];

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
