"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  FINAL_TITLE,
  KEN_BURNS_MS,
  MAX_CROP,
  SLIDE_COLORS,
  SLIDE_EASING,
  SLIDE_HEIGHT_VH,
  SLIDE_SECONDS,
  SLIDE_TRANSITION_MS,
  SLIDESHOW_START_SECONDS,
  SUBLABEL,
} from "./config";
import styles from "./countdown.module.css";

/**
 * Slides needed to carry the countdown from SLIDESHOW_START_SECONDS to zero,
 * plus one extra that only ever exists to be the 20% peeking below the last
 * real slide.
 */
const SLIDE_COUNT =
  Math.ceil((SLIDESHOW_START_SECONDS + 1) / SLIDE_SECONDS) + 1;

type Slide = {
  image: string | null;
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

  return Array.from({ length: SLIDE_COUNT }, (_, i) => ({
    image: drawImage(),
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
    const tick = () => {
      const remaining = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
      setSecondsLeft(remaining);
      if (remaining === 0) setEnded(true);
    };

    tick();
    const id = setInterval(tick, 250);
    return () => clearInterval(id);
  }, [started, seconds]);

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
  const slideIndex = Math.min(
    SLIDE_COUNT - 2,
    Math.max(0, Math.floor((slideshowStart - secondsLeft) / SLIDE_SECONDS)),
  );

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
              "--ken-burns-ms": `${KEN_BURNS_MS}ms`,
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
              style={{ flexDirection: slide.imageFirst ? "row" : "row-reverse" }}
            >
              <div className={styles.imagePanel}>
                <div
                  className={styles.imageDrift}
                  style={
                    slide.image
                      ? {
                          backgroundImage: `url("${slide.image}")`,
                          // Opposing drift directions stop the stack from
                          // moving as one block.
                          animationDirection:
                            i % 2 === 0 ? "alternate" : "alternate-reverse",
                        }
                      : undefined
                  }
                />
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
