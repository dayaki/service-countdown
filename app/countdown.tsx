"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  FINAL_TITLE,
  KEN_BURNS_MS,
  MAX_CROP,
  OUTRO_CROSSFADE_MS,
  OUTRO_START_SECONDS,
  PAIR_FADE_MS,
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

const SLIDE_MS = SLIDE_SECONDS * 1000;

/**
 * How far ahead of its cue the outro starts buffering. The clips run to
 * hundreds of megabytes, and an unbuffered one shows a black frame while it
 * loads instead of a dissolve. Late enough that it is not competing for
 * bandwidth with the playlist for the whole service.
 */
const OUTRO_PRELOAD_LEAD_SECONDS = 30;

/**
 * Slides needed to carry the countdown from SLIDESHOW_START_SECONDS to zero,
 * plus one extra that only ever exists to be the strip peeking below the last
 * real slide.
 */
const SLIDE_COUNT = Math.ceil(SLIDESHOW_START_SECONDS / SLIDE_SECONDS) + 1;

/**
 * Slides that get a turn as the active slide — every one but the trailing peek
 * slide. Only these can hold a pair, since the dissolve is triggered by a slide
 * taking the screen and the peek slide never does.
 */
const TURN_TAKING_SLIDES = SLIDE_COUNT - 1;

/**
 * Most pictures a run can show: two on every slide that gets a turn, plus the
 * one on the peek slide.
 */
const IMAGE_CAPACITY = TURN_TAKING_SLIDES * 2 + 1;

/**
 * When a paired slide starts its dissolve, measured from the moment it takes
 * its turn.
 *
 * The stack is still gliding for the first SLIDE_TRANSITION_MS of a hold, and a
 * dissolve running underneath that movement reads as a jump rather than a
 * blend. So it waits for the travel to finish and then centres itself in the
 * stillness that follows, giving each picture an equal beat on its own.
 */
const PAIR_FADE_DELAY_MS = Math.max(
  0,
  SLIDE_TRANSITION_MS + (SLIDE_MS - SLIDE_TRANSITION_MS - PAIR_FADE_MS) / 2,
);

/**
 * Half a drift cycle, applied to the second picture of a pair so the two are
 * never at the same point in their push-in. Through the dissolve one is easing
 * out of a zoom while the other eases into it, which gives the blend some depth
 * instead of laying one flat picture over another.
 */
const PAIR_DRIFT_OFFSET_MS = -KEN_BURNS_MS / 2;

type Slide = {
  /** One picture, or two that dissolve from the first to the second. */
  images: string[];
  color: string;
  /** Slides alternate which side the picture sits on. */
  imageFirst: boolean;
};

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

/**
 * Whether a clip should fill the screen or be letterboxed, or null while its
 * dimensions are still unknown. Clips vary in shape (16:9, 4:3, ultrawide), so
 * this is decided per clip once its metadata lands rather than fixed in CSS.
 */
function fitFor(video: HTMLVideoElement | null) {
  if (!video?.videoWidth || !video.videoHeight) return null;

  const crop = cropFraction(
    video.videoWidth / video.videoHeight,
    window.innerWidth / window.innerHeight,
  );
  return crop <= MAX_CROP ? "cover" : "contain";
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
 * Which slides take a second picture, given how many are in the folder. Any
 * beyond one per slide are dealt out as evenly as they go, so the extra motion
 * is spaced through the run rather than clumped at one end: eight spares over
 * fifteen slides lands on every other one.
 *
 * Offsetting by half a step centres the picks — a single spare falls in the
 * middle of the run instead of on the very first slide.
 */
function pairedSlides(imageCount: number) {
  const paired = new Set<number>();
  const spares = Math.min(imageCount, IMAGE_CAPACITY) - SLIDE_COUNT;

  for (let n = 0; n < spares; n++) {
    paired.add(Math.floor(((n + 0.5) * TURN_TAKING_SLIDES) / spares));
  }
  return paired;
}

/**
 * Builds the whole run up front so each slide's pictures and colour are fixed
 * the moment the slideshow starts — re-rolling per render would reshuffle the
 * screen on every tick.
 *
 * Pictures run in filename order, same as the videos, so numbered prefixes
 * control the sequence. They are dealt straight through the slides, one each
 * until the paired ones take a second — so the whole folder gets on screen
 * rather than only the first sixteen files. Colours are still drawn at random.
 *
 * The deal never runs past the end of a folder large enough to fill the run, so
 * the wrap here only bites when there are fewer pictures than slides. That is
 * the only way one repeats — see SLIDE_SECONDS in config.ts.
 */
function buildSlides(images: string[]): Slide[] {
  const drawColor = makeBag(SLIDE_COLORS);
  const paired = pairedSlides(images.length);

  let dealt = 0;
  const take = () =>
    images.length > 0 ? images[dealt++ % images.length] : null;

  return Array.from({ length: SLIDE_COUNT }, (_, i) => ({
    images: [take(), paired.has(i) ? take() : null].filter(
      (image): image is string => image !== null,
    ),
    color: drawColor() ?? SLIDE_COLORS[0],
    imageFirst: i % 2 === 0,
  }));
}

export default function Countdown({
  videos,
  outro,
  images,
  seconds,
}: {
  videos: string[];
  outro: string | null;
  images: string[];
  seconds: number;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const outroRef = useRef<HTMLVideoElement>(null);

  const [started, setStarted] = useState(false);
  const [videoIndex, setVideoIndex] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState(seconds);
  /** Milliseconds since the slideshow began; drives which slide is showing. */
  const [slideshowMs, setSlideshowMs] = useState(0);
  const [ended, setEnded] = useState(false);
  const [fit, setFit] = useState<"cover" | "contain">("cover");
  const [outroFit, setOutroFit] = useState<"cover" | "contain">("cover");
  const [slides, setSlides] = useState<Slide[] | null>(null);

  // A `?seconds=` override shorter than the slideshow means it should open on
  // the first slide, not jump into the middle of the run.
  const slideshowStart = Math.min(SLIDESHOW_START_SECONDS, seconds);
  const inSlideshow = started && secondsLeft <= slideshowStart;

  const inOutro =
    started && outro !== null && secondsLeft <= OUTRO_START_SECONDS;
  // An element with a src buffers on its own, so withholding the src is what
  // keeps the download out of the playlist's way until the lead comes round.
  const outroCued =
    started &&
    outro !== null &&
    secondsLeft <= OUTRO_START_SECONDS + OUTRO_PRELOAD_LEAD_SECONDS;

  const measureFit = useCallback(() => {
    const next = fitFor(videoRef.current);
    if (next) setFit(next);
  }, []);

  const measureOutroFit = useCallback(() => {
    const next = fitFor(outroRef.current);
    if (next) setOutroFit(next);
  }, []);

  // The viewport aspect is half the calculation, so re-measure when it changes.
  useEffect(() => {
    const remeasure = () => {
      measureFit();
      measureOutroFit();
    };

    window.addEventListener("resize", remeasure);
    document.addEventListener("fullscreenchange", remeasure);
    return () => {
      window.removeEventListener("resize", remeasure);
      document.removeEventListener("fullscreenchange", remeasure);
    };
  }, [measureFit, measureOutroFit]);

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

  // The outro is cued by the clock, not by the playlist finishing, so it gets
  // its own element layered over the playlist and crossfaded in. One element
  // swapping its src would go black while the new clip loads.
  useEffect(() => {
    if (!inOutro) return;
    const outroVideo = outroRef.current;
    if (!outroVideo) return;

    outroVideo.play().catch((err) => {
      console.error("Error playing outro:", err);
    });
  }, [inOutro]);

  // The picture dissolves in CSS; sound has to be ramped by hand, or the music
  // would cut dead underneath it. Once silent the clip is paused outright —
  // nothing below is ever seen again.
  useEffect(() => {
    if (!inOutro) return;
    const video = videoRef.current;
    if (!video) return;

    const fadeFrom = Date.now();
    const id = setInterval(() => {
      const elapsed = Date.now() - fadeFrom;
      const progress = Math.min(1, elapsed / Math.max(1, OUTRO_CROSSFADE_MS));

      video.volume = 1 - progress;
      if (progress === 1) {
        clearInterval(id);
        video.pause();
      }
    }, 50);

    return () => clearInterval(id);
  }, [inOutro]);

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

    tick();
    const id = setInterval(tick, 250);
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
    for (const video of [videoRef.current, outroRef.current]) {
      if (video) video.muted = true;
    }
  }, [ended]);

  // Held on the last frame once the outro has taken over: advancing would move
  // an element nobody can see, and a short outro would drag the playlist on.
  const handleVideoEnded = useCallback(() => {
    if (ended || inOutro) return;
    setVideoIndex((index) => (index + 1 < videos.length ? index + 1 : index));
  }, [ended, inOutro, videos.length]);

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

  // Clamped to the last real slide so the trailing peek slide is never
  // scrolled to — it exists only to fill the strip below.
  const slideIndex = Math.min(
    SLIDE_COUNT - 2,
    Math.max(0, Math.floor(slideshowMs / SLIDE_MS)),
  );

  return (
    <>
      <div
        className={`${styles.videoContainer} ${
          inSlideshow ? styles.hidden : ""
        }`}
        style={
          { "--outro-ms": `${OUTRO_CROSSFADE_MS}ms` } as React.CSSProperties
        }
      >
        <video
          ref={videoRef}
          className={styles.video}
          style={{ objectFit: fit }}
          playsInline
          onLoadedMetadata={measureFit}
          onEnded={handleVideoEnded}
        />

        {outro && (
          <video
            ref={outroRef}
            className={`${styles.video} ${styles.outro} ${
              inOutro ? styles.outroVisible : ""
            }`}
            style={{ objectFit: outroFit }}
            src={outroCued ? outro : undefined}
            preload="auto"
            playsInline
            onLoadedMetadata={measureOutroFit}
          />
        )}
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
              "--pair-fade-ms": `${PAIR_FADE_MS}ms`,
              "--pair-fade-delay": `${PAIR_FADE_DELAY_MS}ms`,
              transform: `translateY(calc(-${slideIndex} * var(--slide-h)))`,
            } as React.CSSProperties
          }
        >
          {slides.map((slide, i) => (
            <div
              key={i}
              className={`${styles.slide} ${
                i === slideIndex ? styles.slideActive : ""
              }`}
              style={{
                flexDirection: slide.imageFirst ? "row" : "row-reverse",
              }}
            >
              <div className={styles.imagePanel}>
                {/* The dissolve rides on a wrapper rather than the drifting
                    element itself. Sharing one element would mean sharing the
                    animation shorthand, and the drift's own direction and delay
                    would be applied to the dissolve as well — on an odd slide
                    `alternate-reverse` would run it backwards. */}
                {slide.images.map((image, layer) => (
                  <div
                    key={layer}
                    className={[
                      styles.imageLayer,
                      layer > 0 ? styles.imageSecond : "",
                      // Held up from the moment the slide has had its turn,
                      // not only while it has one: dropping back to the first
                      // picture as it travels away would read as a fault.
                      layer > 0 && i <= slideIndex ? styles.imageRevealed : "",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                  >
                    <div
                      className={styles.imageDrift}
                      style={{
                        backgroundImage: `url("${image}")`,
                        // Opposing drift directions stop the stack from moving
                        // as one block.
                        animationDirection:
                          i % 2 === 0 ? "alternate" : "alternate-reverse",
                        animationDelay:
                          layer > 0 ? `${PAIR_DRIFT_OFFSET_MS}ms` : undefined,
                      }}
                    />
                  </div>
                ))}
              </div>
              <div
                className={styles.numberPanel}
                style={{ background: slide.color }}
              >
                <span className={styles.slideNumber}>{secondsLeft}</span>
              </div>
            </div>
          ))}
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
