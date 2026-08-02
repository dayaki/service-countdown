/**
 * Every dial for the countdown lives here. Nothing in this file needs code
 * knowledge to change — pick a number, save, refresh.
 *
 * How a service runs:
 *
 *   1. Click anywhere         → video starts (audio needs the click)
 *   2. Video plays            → big MM:SS timer, top right
 *   3. SLIDESHOW_START_SECONDS → video fades out, split slideshow takes over
 *   4. Zero                   → last picture fills the screen, title fades in
 *
 * The slideshow is a vertical stack. Every slide is an even split, picture on
 * one side and the number on the other, holding for SLIDE_SECONDS before the
 * stack slides up to the next:
 *
 *   ┌─────┬──────┐  holds SLIDE_SECONDS, then slides up.
 *   │ IMG │  54  │  Sides alternate on each slide.
 *   └─────┴──────┘
 *
 * To rehearse the last minute without waiting, add `?seconds=70` to the URL.
 */

/**
 * Total countdown length, in seconds.
 *
 * Higher → longer wait before the service starts.
 * Lower  → shorter.
 *
 * Written as `25 * 60` so it reads as minutes; `30 * 60` is half an hour.
 * A `?seconds=` in the URL overrides this for one page load.
 */
export const COUNTDOWN_SECONDS = 25 * 60;

/**
 * Seconds remaining when the video hands over to the split slideshow.
 *
 * Higher → slideshow starts earlier and runs for longer, video gets less time.
 * Lower  → video plays for longer, slideshow is a shorter finale.
 *
 * The video is not stopped, only faded out, so its audio carries through to
 * zero. Must be less than COUNTDOWN_SECONDS or the video never shows at all.
 */
export const SLIDESHOW_START_SECONDS = 60;

/**
 * How long a slide holds before the stack moves up to the next.
 *
 * Higher → slower, calmer slideshow, fewer slides, each picture gets longer.
 * Lower  → busier and more urgent, more slides, each picture gets a glance.
 *
 * Slides needed is SLIDESHOW_START_SECONDS ÷ this, so at 60s and 5s that is
 * 12 slides. With 10 pictures in the folder each shows about once.
 */
export const SLIDE_SECONDS = 5;

/**
 * How much of the screen height the active slide takes, as a percentage. The
 * remainder is the next slide showing below it.
 *
 * Higher → active slide dominates, thinner strip of the next one (88 = 12%).
 * Lower  → more of the next slide visible, stronger sense of a queue.
 *
 * 100 would fill the screen and remove the preview strip entirely, turning
 * each move into a hard cut. Below about 70 the strip starts competing with
 * the slide you actually want people looking at.
 */
export const SLIDE_HEIGHT_VH = 88;

/**
 * How long the upward move to the next slide takes, in milliseconds.
 *
 * Higher → slower, more graceful movement (2500 is a long, cinematic glide).
 * Lower  → snappier (300 feels like a jump cut).
 *
 * Keep this comfortably below SLIDE_SECONDS × 1000, or the next move starts
 * before the last one has settled.
 */
export const SLIDE_TRANSITION_MS = 1800;

/**
 * The shape of the slide movement — how it accelerates and slows.
 *
 * Any CSS easing works. Useful ones:
 *   cubic-bezier(0.37, 0, 0.63, 1)  gentle at both ends, no lunge   (current)
 *   cubic-bezier(0.76, 0, 0.24, 1)  slow away, fast middle, settles
 *   cubic-bezier(0.16, 1, 0.3, 1)   quick off the mark, long glide to a stop
 *   linear                          mechanical, constant speed
 */
export const SLIDE_EASING = "cubic-bezier(0.37, 0, 0.63, 1)";

/**
 * How long one slow push-in of a picture takes, in milliseconds. Keeps a slide
 * from ever looking completely frozen.
 *
 * Higher → drift is slower and subtler (40000 is barely perceptible).
 * Lower  → more obvious movement (8000 starts to feel restless).
 *
 * Turned off automatically for anyone with reduced-motion enabled.
 */
export const KEN_BURNS_MS = 24000;

/**
 * How dim a slide looks while it waits its turn, from 0 to 1. The active slide
 * is always full brightness; this is everything else.
 *
 * Higher → waiting slides are brighter, the stack looks flatter (1 = no dimming).
 * Lower  → stronger depth, more focus on the active slide (0 = black).
 */
export const SLIDE_DIM = 0.55;

/**
 * Backdrops for the number panel, picked at random per slide.
 *
 * More colours → more variety before one repeats.
 * Fewer        → a tighter, more branded look.
 *
 * Colours are drawn from a shuffled bag, so every colour appears once before
 * any repeats. The only rule for new entries: keep them mid-to-dark, since the
 * numerals are white. Every colour here clears 4.5:1 contrast against white
 * (worst is teal at 5.47:1). Pale colours will wash the numbers out.
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
 * How much of a video may be cropped before it gets letterboxed instead.
 *
 * Higher → videos fill the screen more often, accepting more crop off the
 *          edges (0.3 fills almost always).
 * Lower  → letterboxes sooner, black bars but never a lost edge (0 always
 *          shows the whole frame).
 *
 * Every clip is measured against the screen shape on load, so this works for
 * whatever gets dropped into public/videos.
 *
 * 0.15 sits in the gap between the two cases that actually occur: a 16:9 clip
 * on a 16:10-ish laptop crops 10–14% (worth absorbing, the alternative is bars
 * on every clip), while a genuinely different shape — 4:3 or ultrawide — costs
 * 17% or more, which is real picture and better letterboxed.
 */
export const MAX_CROP = 0.15;

/** Small line above the big timer during the video phase. */
export const SUBLABEL = "Service starts:";

/** Shown over the last picture once the countdown reaches zero. */
export const FINAL_TITLE = "Welcome to Church";
