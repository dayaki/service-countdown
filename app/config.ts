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
 * Each slide of the slideshow runs a two-phase cycle:
 *
 *   ┌──────────┬─┐  WIDE     picture takes IMAGE_WIDE_PERCENT of the width,
 *   │  IMAGE   │5│             an edge of the number showing beside it.
 *   └──────────┴─┘             Holds WIDE_HOLD_SECONDS, cycling
 *                              WIDE_IMAGE_COUNT pictures.
 *          ↓ opens sideways over HORIZONTAL_TRANSITION_MS
 *   ┌─────┬──────┐  EVEN     even split, number fully revealed.
 *   │ IMG │  54  │             Holds EVEN_HOLD_SECONDS, cycling
 *   └─────┴──────┘             EVEN_IMAGE_COUNT more pictures.
 *          ↓ slides up over SLIDE_TRANSITION_MS
 *        next slide, picture on the opposite side
 *
 * So one slide lasts WIDE_HOLD_SECONDS + EVEN_HOLD_SECONDS, and the number of
 * slides in the final minute is SLIDESHOW_START_SECONDS divided by that.
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
 * How long the wide phase holds — picture dominant, number reduced to an edge —
 * before it opens out to an even split.
 *
 * Higher → longer to enjoy the big picture, but the number stays clipped for
 *          longer and the whole cycle slows down.
 * Lower  → the number is revealed sooner and more often.
 */
export const WIDE_HOLD_SECONDS = 5;

/**
 * How long the even 50/50 split holds after opening, before the stack slides
 * up to the next slide.
 *
 * Higher → the number is fully readable for longer, fewer slides overall.
 * Lower  → moves on quickly, more slides in the final minute.
 */
export const EVEN_HOLD_SECONDS = 5;

/**
 * How many different pictures cycle through during the wide phase.
 *
 * Higher → pictures change faster (WIDE_HOLD_SECONDS split more ways; at 5s
 *          and 4 pictures that is 1.25s each).
 * Lower  → each picture lingers. 1 means no cycling at all.
 */
export const WIDE_IMAGE_COUNT = 4;

/**
 * How many pictures cycle during the even phase, once the number is revealed.
 *
 * Higher → faster changes alongside the number.
 * Lower  → calmer. At 5s and 3 pictures that is about 1.7s each.
 */
export const EVEN_IMAGE_COUNT = 3;

/**
 * How much of the width the picture takes during the wide phase, as a
 * percentage. The rest is the edge of the number panel.
 *
 * Higher → picture dominates and less of the number shows (95 is nearly a
 *          full-bleed image with a colour stripe).
 * Lower  → more of the number stays readable, less dramatic reveal. At 50
 *          there is no reveal at all, since it already matches the even phase.
 */
export const IMAGE_WIDE_PERCENT = 80;

/**
 * How long the sideways opening takes, in milliseconds. Deliberately slower
 * than the vertical move so there is time to take the picture in.
 *
 * Higher → a longer, more languid reveal (3000 is very slow).
 * Lower  → the number snaps into place.
 *
 * Keep it below WIDE_HOLD_SECONDS × 1000 or it will not have finished opening
 * before the slide moves on.
 */
export const HORIZONTAL_TRANSITION_MS = 1800;

/**
 * How long one picture takes to crossfade into the next, in milliseconds.
 *
 * Higher → a softer dissolve; too high and pictures blur together.
 * Lower  → closer to a hard cut. 0 is an instant switch.
 */
export const IMAGE_FADE_MS = 700;

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
 * Higher → slower, more graceful movement (2000 is a long, cinematic glide).
 * Lower  → snappier (300 feels like a jump cut).
 *
 * Keep this comfortably below EVEN_HOLD_SECONDS × 1000, or the next move
 * starts before the last one has settled.
 */
export const SLIDE_TRANSITION_MS = 1000;

/**
 * The shape of the slide movement — how it accelerates and slows.
 *
 * Any CSS easing works. Useful ones:
 *   cubic-bezier(0.76, 0, 0.24, 1)  eases away and settles       (current)
 *   cubic-bezier(0.16, 1, 0.3, 1)   quick off the mark, long glide to a stop
 *   cubic-bezier(0.4, 0, 0.2, 1)    gentle and neutral
 *   linear                          mechanical, constant speed
 */
export const SLIDE_EASING = "cubic-bezier(0.76, 0, 0.24, 1)";

/**
 * How long one slow push-in of a picture takes, in milliseconds. Keeps a slide
 * from ever looking completely frozen.
 *
 * Higher → drift is slower and subtler (30000 is barely perceptible).
 * Lower  → more obvious movement (5000 starts to feel restless).
 *
 * Turned off automatically for anyone with reduced-motion enabled.
 */
export const KEN_BURNS_MS = 18000;

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
