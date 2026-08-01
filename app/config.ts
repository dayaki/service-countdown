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
export const SLIDE_TRANSITION_MS = 900;

/**
 * Saturation and lightness for the randomly-hued number panel. Only the hue is
 * random; pinning these two keeps white numerals readable on every slide.
 */
export const PANEL_SATURATION = 65;
export const PANEL_LIGHTNESS = 45;

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
