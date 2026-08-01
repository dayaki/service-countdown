"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  COUNTDOWN_SECONDS,
  FINAL_TITLE,
  MAX_CROP,
  SUBLABEL,
  VIDEOS,
} from "./config";
import styles from "./countdown.module.css";

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

export default function Countdown() {
  const videoRef = useRef<HTMLVideoElement>(null);

  const [started, setStarted] = useState(false);
  const [videoIndex, setVideoIndex] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState(COUNTDOWN_SECONDS);
  const [ended, setEnded] = useState(false);
  const [fit, setFit] = useState<"cover" | "contain">("cover");

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
    if (!started) return;
    const video = videoRef.current;
    if (!video) return;

    video.src = VIDEOS[videoIndex];
    video.play().catch((err) => {
      console.error("Error playing video:", err);
    });
  }, [started, videoIndex]);

  // Deadline-based so background-tab throttling can't make the clock drift.
  useEffect(() => {
    if (!started) return;

    const deadline = Date.now() + COUNTDOWN_SECONDS * 1000;
    const tick = () => {
      const remaining = Math.max(
        0,
        Math.ceil((deadline - Date.now()) / 1000),
      );
      setSecondsLeft(remaining);
      if (remaining === 0) setEnded(true);
    };

    tick();
    const id = setInterval(tick, 250);
    return () => clearInterval(id);
  }, [started]);

  useEffect(() => {
    if (!ended) return;
    const video = videoRef.current;
    if (video) video.muted = true;
  }, [ended]);

  const handleVideoEnded = useCallback(() => {
    if (ended) return;
    setVideoIndex((index) => (index + 1 < VIDEOS.length ? index + 1 : index));
  }, [ended]);

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

  return (
    <>
      <div className={styles.videoContainer}>
        <video
          ref={videoRef}
          className={styles.video}
          style={{ objectFit: fit }}
          playsInline
          onLoadedMetadata={measureFit}
          onEnded={handleVideoEnded}
        />
      </div>

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
            started && !ended ? styles.visible : ""
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

        <div
          className={`${styles.finalTitle} ${ended ? styles.visible : ""}`}
        >
          {FINAL_TITLE}
        </div>
      </div>
    </>
  );
}
