"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  CAROUSEL_LEAD_EASING,
  CAROUSEL_MS,
  CAROUSEL_TRAIL_EASING,
  CAROUSEL_TRAIL_MS,
  COUNTDOWN_PANEL_PERCENT,
  FINAL_TITLE,
  HORIZONTAL_AT_SECONDS,
  IMAGE_FADE_MS,
  IMAGE_PANEL_PERCENT,
  KEN_BURNS_MS,
  LEAD_IMAGE_COUNT,
  LEAD_SECONDS,
  MAX_CROP,
  SETTLE_IMAGE_COUNT,
  SETTLE_SECONDS,
  SLIDE_COLORS,
  SLIDE_DIM,
  SLIDE_EASING,
  SLIDE_HEIGHT_VH,
  SLIDE_SECONDS,
  SLIDE_TRANSITION_MS,
  SLIDESHOW_START_SECONDS,
  SUBLABEL,
} from "./config";
import styles from "./countdown.module.css";

const LEAD_MS = LEAD_SECONDS * 1000;
/** The sweep is over once the slower of the two edges has landed. */
const SWEEP_MS = Math.max(CAROUSEL_MS, CAROUSEL_TRAIL_MS);
const REVEAL_SECONDS = LEAD_SECONDS + SETTLE_SECONDS;
const REVEAL_MS = REVEAL_SECONDS * 1000;
const IMAGES_PER_REVEAL = LEAD_IMAGE_COUNT + SETTLE_IMAGE_COUNT;

type Slide = {
  /**
   * One picture for an ordinary slide; WIDE_IMAGE_COUNT + EVEN_IMAGE_COUNT for
   * a reveal, which cycles through them.
   */
  images: string[];
  color: string;
  /** Slides alternate which side the picture sits on. */
  imageFirst: boolean;
  /** True for the few slides listed in HORIZONTAL_AT_SECONDS. */
  reveal: boolean;
  /** Where this slide sits on the clock, in ms since the slideshow began. */
  startMs: number;
  endMs: number;
};

/**
 * Lays out the whole run before it starts.
 *
 * Slides are ordinary and SLIDE_SECONDS long unless a mark from
 * HORIZONTAL_AT_SECONDS falls inside their window, in which case that slide
 * becomes a reveal and runs for REVEAL_SECONDS instead — the vertical stack
 * holds still while it plays out.
 *
 * A mark swallowed by a reveal already running is dropped rather than queued,
 * since stacking two reveals back to back defeats the point of them being
 * occasional.
 */
function buildTimeline() {
  // A mark names when the sweep happens, but the slide has to start
  // LEAD_SECONDS earlier for the run-up to fit.
  const marks = [...new Set(HORIZONTAL_AT_SECONDS)]
    .map((mark) => mark + LEAD_SECONDS)
    .filter((mark) => mark > 0 && mark <= SLIDESHOW_START_SECONDS)
    .sort((a, b) => b - a);

  const out: { reveal: boolean; startMs: number; endMs: number }[] = [];
  let remaining = SLIDESHOW_START_SECONDS;
  let used = 0;

  while (remaining > 0 && out.length < 200) {
    const windowEnd = remaining - SLIDE_SECONDS;
    const hit = marks.some(
      (mark) => mark <= remaining && mark > windowEnd && mark <= remaining,
    );

    const duration = hit
      ? Math.min(REVEAL_SECONDS, remaining)
      : Math.min(SLIDE_SECONDS, remaining);

    const startMs = used * 1000;
    used += duration;
    out.push({ reveal: hit, startMs, endMs: used * 1000 });

    remaining -= duration;
    // Drop any marks this slide has now passed, so a reveal cannot immediately
    // retrigger on a mark it just covered.
    for (let i = marks.length - 1; i >= 0; i--) {
      if (marks[i] > remaining) marks.splice(i, 1);
    }
  }

  // One extra so there is always a slide peeking below the last real one.
  const last = out[out.length - 1];
  out.push({
    reveal: false,
    startMs: last?.endMs ?? 0,
    endMs: (last?.endMs ?? 0) + SLIDE_SECONDS * 1000,
  });

  return out;
}

/**
 * Which picture a carousel slide is showing, as an index into slide.images.
 *
 * The lead-in divides its time between LEAD_IMAGE_COUNT pictures, then the
 * last of them holds for the whole sweep — that is the picture people watch
 * travel across — and the remainder cycle once it has landed.
 */
function imageSlotAt(withinMs: number) {
  if (withinMs < LEAD_MS) {
    const each = LEAD_MS / LEAD_IMAGE_COUNT;
    return Math.min(LEAD_IMAGE_COUNT - 1, Math.floor(withinMs / each));
  }

  // The travelling picture stays put until the sweep is done.
  const sweptMs = withinMs - LEAD_MS - SWEEP_MS;
  if (sweptMs < 0) return LEAD_IMAGE_COUNT - 1;

  const each = (REVEAL_MS - LEAD_MS - SWEEP_MS) / SETTLE_IMAGE_COUNT;
  return (
    LEAD_IMAGE_COUNT +
    Math.min(SETTLE_IMAGE_COUNT - 1, Math.floor(sweptMs / each))
  );
}

function formatTime(totalSeconds: number) {
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  return `${mins.toString().padStart(2, "0")}:${secs
    .toString()
    .padStart(2, "0")}`;
}

/**
 * Fraction of the frame `object-fit: cover` would crop for this pairing.
 * Symmetric: whichever axis overflows, it's the ratio of the smaller aspect to
 * the larger. 16:9 in a 16:9 window is 0; 4:3 in a 16:9 window is 0.25.
 */
function cropFraction(videoAspect: number, viewAspect: number) {
  return (
    1 - Math.min(videoAspect, viewAspect) / Math.max(videoAspect, viewAspect)
  );
}

function shuffle<T>(items: T[]) {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/**
 * Draws at random without repeating until the set is exhausted, which spreads
 * picks far more evenly than choosing independently each time.
 */
function makeBag<T>(items: T[]) {
  let bag: T[] = [];
  return () => {
    if (items.length === 0) return null;
    if (bag.length === 0) bag = shuffle(items);
    return bag.pop() ?? null;
  };
}

/**
 * Builds the whole run up front so each slide's picture and colour are fixed
 * the moment the slideshow starts — re-rolling per render would reshuffle the
 * screen on every tick.
 */
function buildSlides(images: string[]): Slide[] {
  const drawImage = makeBag(images);
  const drawColor = makeBag(SLIDE_COLORS);

  return buildTimeline().map((timing, i) => ({
    ...timing,
    // A reveal needs a picture for every slot it cycles through; an ordinary
    // slide needs one.
    images: Array.from(
      { length: timing.reveal ? IMAGES_PER_REVEAL : 1 },
      () => drawImage() ?? "",
    ).filter(Boolean),
    color: drawColor() ?? SLIDE_COLORS[0],
    imageFirst: i % 2 === 0,
  }));
}

export default function Countdown({
  videos,
  images,
  seconds,
}: {
  videos: string[];
  images: string[];
  seconds: number;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);

  const [started, setStarted] = useState(false);
  const [videoIndex, setVideoIndex] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState(seconds);
  /** Milliseconds since the slideshow began; the cycle needs sub-second detail. */
  const [slideshowMs, setSlideshowMs] = useState(0);
  const [ended, setEnded] = useState(false);
  const [fit, setFit] = useState<"cover" | "contain">("cover");
  const [slides, setSlides] = useState<Slide[] | null>(null);

  // A `?seconds=` override shorter than the slideshow means it should open on
  // the first slide, not jump into the middle of the run.
  const slideshowStart = Math.min(SLIDESHOW_START_SECONDS, seconds);
  const inSlideshow = started && secondsLeft <= slideshowStart;

  // Clips vary in shape (16:9, 4:3, ultrawide), so the fit is decided per clip
  // once its intrinsic size is known rather than fixed in CSS.
  const measureFit = useCallback(() => {
    const video = videoRef.current;
    if (!video?.videoWidth || !video.videoHeight) return;

    const crop = cropFraction(
      video.videoWidth / video.videoHeight,
      window.innerWidth / window.innerHeight,
    );
    setFit(crop <= MAX_CROP ? "cover" : "contain");
  }, []);

  // The viewport aspect is half the calculation, so re-measure when it changes.
  useEffect(() => {
    window.addEventListener("resize", measureFit);
    document.addEventListener("fullscreenchange", measureFit);
    return () => {
      window.removeEventListener("resize", measureFit);
      document.removeEventListener("fullscreenchange", measureFit);
    };
  }, [measureFit]);

  // Videos carry audio, so playback can only begin from a user gesture.
  const handleStart = useCallback(() => {
    setStarted((wasStarted) => (wasStarted ? wasStarted : true));
  }, []);

  // Drive playback off state so a paused/errored video never desyncs the index.
  useEffect(() => {
    if (!started || videos.length === 0) return;
    const video = videoRef.current;
    if (!video) return;

    video.src = videos[videoIndex];
    video.play().catch((err) => {
      console.error("Error playing video:", err);
    });
  }, [started, videoIndex, videos]);

  // Deadline-based so background-tab throttling can't make the clock drift.
  useEffect(() => {
    if (!started) return;

    const deadline = Date.now() + seconds * 1000;
    const slideshowBegins = deadline - slideshowStart * 1000;

    const tick = () => {
      const now = Date.now();
      const remaining = Math.max(0, Math.ceil((deadline - now) / 1000));
      setSecondsLeft(remaining);
      setSlideshowMs(Math.max(0, now - slideshowBegins));
      if (remaining === 0) setEnded(true);
    };

    // 125ms keeps the picture crossfades landing close to their intended
    // moment; at 1s they would drift by up to a second against the cycle.
    tick();
    const id = setInterval(tick, 125);
    return () => clearInterval(id);
  }, [started, seconds, slideshowStart]);

  // Built once, on the client, at the moment the slideshow is due. Doing this
  // during render would desync server and client on the random values.
  useEffect(() => {
    if (!inSlideshow || slides) return;
    setSlides(buildSlides(images));
  }, [inSlideshow, slides, images]);

  useEffect(() => {
    if (!ended) return;
    const video = videoRef.current;
    if (video) video.muted = true;
  }, [ended]);

  const handleVideoEnded = useCallback(() => {
    if (ended) return;
    setVideoIndex((index) => (index + 1 < videos.length ? index + 1 : index));
  }, [ended, videos.length]);

  const toggleFullscreen = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch((err) => {
        console.error("Error entering fullscreen:", err);
      });
    } else {
      document.exitFullscreen();
    }
  }, []);

  // Clamped to the last real slide so the trailing peek slide is never scrolled
  // to — it exists only to fill the strip below.
  // The last entry is the peek slide, which is never scrolled to.
  const lastReal = slides ? slides.length - 2 : 0;
  const found = slides?.findIndex((slide) => slideshowMs < slide.endMs) ?? 0;
  const slideIndex = Math.min(lastReal, found < 0 ? lastReal : found);

  const active = slides?.[slideIndex];
  const withinMs = active ? slideshowMs - active.startMs : 0;
  const imageSlot = active?.reveal ? imageSlotAt(withinMs) : 0;

  /**
   * Whether a carousel slide has swept yet. Slides already passed stay swept
   * so none of them rewinds on the way out.
   */
  const hasSwept = (i: number) => {
    if (i < slideIndex) return true;
    if (i > slideIndex) return false;
    return withinMs >= LEAD_MS;
  };

  return (
    <>
      <div
        className={`${styles.videoContainer} ${
          inSlideshow ? styles.hidden : ""
        }`}
      >
        <video
          ref={videoRef}
          className={styles.video}
          style={{ objectFit: fit }}
          playsInline
          onLoadedMetadata={measureFit}
          onEnded={handleVideoEnded}
        />
      </div>

      {slides && (
        <div
          className={`${styles.slideshow} ${ended ? styles.slideshowEnded : ""}`}
          style={
            {
              // At zero the slide grows to fill the viewport; the transform is
              // expressed in the same unit so it stays aligned as it grows.
              "--slide-h": ended ? "100vh" : `${SLIDE_HEIGHT_VH}vh`,
              "--slide-ms": `${SLIDE_TRANSITION_MS}ms`,
              "--slide-ease": SLIDE_EASING,
              "--slide-dim": SLIDE_DIM,
              "--ken-burns-ms": `${KEN_BURNS_MS}ms`,
              "--lead-ms": `${CAROUSEL_MS}ms`,
              "--lead-ease": CAROUSEL_LEAD_EASING,
              "--trail-ms": `${CAROUSEL_TRAIL_MS}ms`,
              "--trail-ease": CAROUSEL_TRAIL_EASING,
              "--fade-ms": `${IMAGE_FADE_MS}ms`,
              transform: `translateY(calc(-${slideIndex} * var(--slide-h)))`,
            } as React.CSSProperties
          }
        >
          {slides.map((slide, i) => {
            // Every picture for a slide is stacked and crossfaded by opacity,
            // so a change never shows a gap while the next one decodes.
            const pictures = (
              <>
                {slide.images.map((image, slot) => (
                  <div
                    key={slot}
                    className={styles.imageDrift}
                    style={{
                      backgroundImage: `url("${image}")`,
                      opacity:
                        (i === slideIndex ? imageSlot : 0) === slot ? 1 : 0,
                      // Opposing drift directions stop the stack from moving
                      // as one block.
                      animationDirection:
                        (i + slot) % 2 === 0 ? "alternate" : "alternate-reverse",
                    }}
                  />
                ))}
              </>
            );

            const number = (
              <span className={styles.slideNumber}>{secondsLeft}</span>
            );

            // At zero everything collapses to a single full-bleed picture, so
            // a sweep slide drops back to the ordinary structure to get there.
            if (slide.reveal && !ended) {
              // The picture is defined by where its two edges are, not by a
              // width. Each edge has its own timing, so while the leading one
              // is ahead the picture is stretched wider than it starts or
              // ends — that is the morph. The number panels are simply
              // whatever is left either side, so both show as slivers while
              // the stretch is open.
              const swept = hasSwept(i);
              const leading = swept ? 0 : COUNTDOWN_PANEL_PERCENT;
              const trailing = swept
                ? IMAGE_PANEL_PERCENT
                : COUNTDOWN_PANEL_PERCENT + IMAGE_PANEL_PERCENT;

              return (
                <div
                  key={i}
                  className={`${styles.slide} ${styles.slideSweep} ${
                    i === slideIndex ? styles.slideActive : ""
                  }`}
                >
                  <div className={styles.carousel}>
                    <div
                      className={`${styles.carouselNumber} ${styles.numberOut}`}
                      style={{
                        left: 0,
                        right: `${100 - leading}%`,
                        background: slide.color,
                      }}
                    >
                      {number}
                    </div>
                    <div
                      className={styles.carouselImage}
                      style={{
                        left: `${leading}%`,
                        right: `${100 - trailing}%`,
                      }}
                    >
                      {pictures}
                    </div>
                    <div
                      className={`${styles.carouselNumber} ${styles.numberIn}`}
                      style={{
                        left: `${trailing}%`,
                        right: 0,
                        background: slide.color,
                      }}
                    >
                      {number}
                    </div>
                  </div>
                </div>
              );
            }

            return (
              <div
                key={i}
                className={`${styles.slide} ${
                  i === slideIndex ? styles.slideActive : ""
                }`}
                style={{
                  flexDirection: slide.imageFirst ? "row" : "row-reverse",
                }}
              >
                <div className={styles.imagePanel}>{pictures}</div>
                <div
                  className={styles.numberPanel}
                  style={{ background: slide.color }}
                >
                  {number}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div
        className={[
          styles.overlay,
          started ? styles.started : "",
          ended ? styles.final : "",
        ]
          .filter(Boolean)
          .join(" ")}
        onClick={started ? undefined : handleStart}
      >
        <button
          type="button"
          className={`${styles.fullscreenBtn} ${ended ? styles.hidden : ""}`}
          onClick={toggleFullscreen}
        >
          Fullscreen
        </button>

        <div
          className={`${styles.countdownWrapper} ${
            started && !inSlideshow ? styles.visible : ""
          }`}
        >
          <div className={styles.countdownSublabel}>{SUBLABEL}</div>
          <div className={styles.countdownTimer}>
            {formatTime(secondsLeft)
              .split("")
              .map((char, i) => (
                <span
                  key={i}
                  className={char === ":" ? styles.colon : styles.digit}
                >
                  {char}
                </span>
              ))}
          </div>
        </div>

        <div className={`${styles.finalTitle} ${ended ? styles.visible : ""}`}>
          {FINAL_TITLE}
        </div>
      </div>
    </>
  );
}
