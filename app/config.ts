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
 * The slideshow is a vertical stack. Almost every slide is an ordinary one:
 * an even split, picture on one side and the number on the other, holding for
 * SLIDE_SECONDS before the stack slides up to the next.
 *
 *   ┌─────┬──────┐  holds SLIDE_SECONDS, then slides up.
 *   │ IMG │  54  │  Sides alternate on each slide.
 *   └─────┴──────┘
 *
 * At the few moments listed in HORIZONTAL_AT_SECONDS, one slide sweeps sideways
 * instead — a carousel that carries the picture from right to left:
 *
 *   ┌─────┬──────┐  LEAD    ordinary-looking even split. Holds LEAD_SECONDS,
 *   │  13 │ IMG  │            cycling LEAD_IMAGE_COUNT pictures.
 *   └─────┴──────┘
 *          ↓ the track slides left over CAROUSEL_MS
 *   ┌┬──────────┬┐  MID     picture sweeps through the middle, an edge of the
 *   ││   IMG    ││           number showing at BOTH sides. The last lead
 *   └┴──────────┴┘           picture stays put for the whole sweep.
 *          ↓
 *   ┌──────┬─────┐  SETTLED picture has landed on the left. Holds
 *   │ IMG  │  09 │            SETTLE_SECONDS, cycling SETTLE_IMAGE_COUNT more
 *   └──────┴─────┘            pictures while drifting to show more of each.
 *          ↓ then the ordinary vertical slides resume, back to an even split
 *
 * The sweep is a track of three panels — number, picture, number — that slides
 * left by exactly one number-panel width. That is why an edge of the number
 * shows on both sides mid-sweep: they are two different panels, the one being
 * pushed off and the one arriving.
 *
 * The vertical stack pauses while this plays out, so a carousel slide lasts
 * LEAD_SECONDS + SETTLE_SECONDS rather than SLIDE_SECONDS.
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
 * How long an ordinary slide holds before the stack moves up to the next.
 *
 * Higher → slower, calmer slideshow, fewer slides, each picture gets longer.
 * Lower  → busier and more urgent, more slides, each picture gets a glance.
 */
export const SLIDE_SECONDS = 5;

/**
 * Seconds remaining at which a slide does the sideways reveal instead of
 * behaving normally. Everything not listed here is an ordinary slide.
 *
 * More entries → more reveals, less of the steady vertical rhythm.
 * Fewer        → the reveal stays a rare punctuation mark.
 *
 * These are the moment the sweep itself starts, matching "at 10" in the
 * sketches. The slide begins LEAD_SECONDS earlier so the lead-in has somewhere
 * to run.
 *
 * Each carousel occupies LEAD_SECONDS + SETTLE_SECONDS (9s as set), so space
 * entries at least that far apart — a mark landing inside a carousel already
 * running is dropped, and you would silently get fewer than you listed.
 *
 * A carousel snaps to the nearest slide boundary, so the sweep can land up to
 * one SLIDE_SECONDS away from the second you name.
 */
export const HORIZONTAL_AT_SECONDS = [50, 42, 28];

/**
 * How long the carousel slide looks ordinary before the sweep begins — the
 * "count down to 10" part of the sketch.
 *
 * Higher → a longer run-up, and more of the final minute spent on the slide.
 * Lower  → the sweep arrives sooner after the slide appears.
 */
export const LEAD_SECONDS = 4;

/**
 * How many pictures cycle during the lead-in. The last one stays put for the
 * whole sweep, so it is the picture people see travelling across.
 *
 * Higher → faster changes in the run-up (LEAD_SECONDS split more ways).
 * Lower  → each lingers. 1 means no cycling before the sweep.
 */
export const LEAD_IMAGE_COUNT = 4;

/**
 * The sweep is not one rigid movement — the picture's two edges travel
 * separately, which is what makes it stretch and settle rather than slide.
 *
 * The leading edge (the one heading for the left of the screen) runs ahead on
 * CAROUSEL_MS. The trailing edge follows on CAROUSEL_TRAIL_MS. While the lead
 * is ahead the picture is wider than it starts or ends, so it appears to grow
 * into place, and the crop of the picture inside it shifts as it goes.
 *
 * Set both durations and both easings the same and you get the old rigid
 * slide back. The further apart they are, the more it stretches.
 *
 * Higher → a longer, more languid sweep (3000+ is very slow).
 * Lower  → the picture snaps across.
 *
 * Keep BOTH below SETTLE_SECONDS × 1000, or the sweep will not have finished
 * before the slide moves on.
 */
export const CAROUSEL_MS = 2200;

/**
 * How long the trailing edge takes. Longer than CAROUSEL_MS so the picture is
 * still catching up with itself after the front has arrived.
 *
 * Higher → the stretch hangs open for longer and settles later.
 * Lower  → tighter. Equal to CAROUSEL_MS removes the stretch entirely.
 */
export const CAROUSEL_TRAIL_MS = 2900;

/**
 * Easing for the leading edge. An ease-out shape gets it moving immediately,
 * which is what opens the stretch early in the sweep.
 */
export const CAROUSEL_LEAD_EASING = "cubic-bezier(0.33, 1, 0.68, 1)";

/**
 * Easing for the trailing edge. A symmetric ease-in-out holds it back through
 * the first half — that lag is the stretch — then brings it in smoothly.
 */
export const CAROUSEL_TRAIL_EASING = "cubic-bezier(0.76, 0, 0.24, 1)";

/**
 * How long the landed 60/40 split holds before the ordinary vertical slides
 * resume — the "count down to 5" part of the sketch. Includes the sweep.
 *
 * Higher → the picture sits on the left for longer after landing.
 * Lower  → returns to the normal rhythm sooner.
 */
export const SETTLE_SECONDS = 5;

/**
 * How many more pictures cycle after the sweep lands — the 5th and 6th in the
 * sketch.
 *
 * Higher → faster changes while the number counts down beside them.
 * Lower  → calmer. 1 means the travelling picture simply stays.
 */
export const SETTLE_IMAGE_COUNT = 2;

/**
 * Width of a number panel in the carousel track, as a percentage of the
 * screen. Also exactly how far the track travels.
 *
 * Higher → the number starts wider and the sweep is longer.
 * Lower  → a narrower number panel and a shorter sweep.
 *
 * At 50 the slide starts as an even split, matching the ordinary slides
 * either side of it.
 */
export const COUNTDOWN_PANEL_PERCENT = 50;

/**
 * Width of the picture panel in the carousel track, as a percentage of the
 * screen. What is left once the track has travelled is the number's share, so
 * 60 here lands the sketch's 60/40 split.
 *
 * Higher → picture dominates after landing and fills more of the screen
 *          mid-sweep (100 covers it completely, hiding both number edges).
 * Lower  → more number, less picture. Below COUNTDOWN_PANEL_PERCENT the
 *          picture would end up smaller than it started.
 */
export const IMAGE_PANEL_PERCENT = 60;

/**
 * How long one picture takes to crossfade into the next, in milliseconds.
 *
 * Higher → a softer dissolve.
 * Lower  → closer to a hard cut. 0 is an instant switch.
 *
 * Must stay below the gap between picture changes, or a fade never finishes
 * before the next begins and no picture is ever seen at full strength — which
 * reads as a permanent blur. The tightest gap is the lead-in:
 * LEAD_SECONDS ÷ LEAD_IMAGE_COUNT, currently 1000ms.
 */
export const IMAGE_FADE_MS = 800;

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
 * Keep this comfortably below SLIDE_SECONDS × 1000, or the next move starts
 * before the last one has settled.
 */
export const SLIDE_TRANSITION_MS = 1800;

/**
 * The shape of the slide movement — how it accelerates and slows.
 *
 * Any CSS easing works. Useful ones:
 *   cubic-bezier(0.76, 0, 0.24, 1)  eases away and settles       (current)
 *   cubic-bezier(0.16, 1, 0.3, 1)   quick off the mark, long glide to a stop
 *   cubic-bezier(0.4, 0, 0.2, 1)    gentle and neutral
 *   linear                          mechanical, constant speed
 */
export const SLIDE_EASING = "cubic-bezier(0.37, 0, 0.63, 1)";

/**
 * How long one slow push-in of a picture takes, in milliseconds. Keeps a slide
 * from ever looking completely frozen.
 *
 * Higher → drift is slower and subtler (30000 is barely perceptible).
 * Lower  → more obvious movement (5000 starts to feel restless).
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
