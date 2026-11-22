"use client";

import { useEffect, useState } from "react";
import { SLIDESHOW_START_SECONDS } from "./config";
import { IMAGE_CAPACITY, SLIDE_COUNT } from "./countdown";
import type { Media, Settings } from "./storage";
import styles from "./setup.module.css";

const VIDEO_EXT = /\.(mp4|webm|mov|m4v)$/i;
const IMAGE_EXT = /\.(jpe?g|png|webp|avif|gif)$/i;

/**
 * A clip named `outro` picked along with the playlist is moved to the closing
 * slot, so a folder laid out the old way still works.
 */
const OUTRO_NAME = /^outro\./i;

/** Shortest countdown that still leaves the slideshow its full minute. */
const MIN_COUNTDOWN_MINUTES = Math.ceil(SLIDESHOW_START_SECONDS / 60) + 1;
const MAX_COUNTDOWN_MINUTES = 180;

export type SaveState = "saving" | "saved" | "unsaved";

const byName = (a: File, b: File) =>
  a.name.localeCompare(b.name, undefined, { numeric: true });

/** Keeps the files a picker returned that the countdown can play, in order. */
function pick(list: FileList | null, pattern: RegExp) {
  return Array.from(list ?? [])
    .filter((file) => pattern.test(file.name))
    .sort(byName);
}

function formatBytes(bytes: number) {
  if (bytes < 1e6) return `${Math.max(1, Math.round(bytes / 1e3))} KB`;
  if (bytes < 1e9) return `${Math.round(bytes / 1e6)} MB`;
  return `${(bytes / 1e9).toFixed(1)} GB`;
}

function formatClock(totalSeconds: number) {
  const mins = Math.floor(totalSeconds / 60);
  const secs = Math.round(totalSeconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

function totalSize(files: File[]) {
  return formatBytes(files.reduce((sum, file) => sum + file.size, 0));
}

/** A clip's running time in seconds, read from its metadata alone. */
function useDuration(file: File | null) {
  const [duration, setDuration] = useState<number | null>(null);

  useEffect(() => {
    setDuration(null);
    if (!file) return;

    const url = URL.createObjectURL(file);
    const video = document.createElement("video");
    video.preload = "metadata";
    video.onloadedmetadata = () => {
      if (Number.isFinite(video.duration)) setDuration(video.duration);
    };
    video.src = url;

    return () => {
      video.removeAttribute("src");
      video.load();
      URL.revokeObjectURL(url);
    };
  }, [file]);

  return duration;
}

/**
 * A whole-number input that lets the field sit empty or out of range while it
 * is being typed in, and only reports values that are usable. Leaving the
 * field puts back the last good value.
 */
function NumberField({
  id,
  value,
  min,
  max,
  onChange,
}: {
  id: string;
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
}) {
  const [draft, setDraft] = useState(String(value));

  useEffect(() => setDraft(String(value)), [value]);

  return (
    <input
      id={id}
      className={styles.number}
      type="number"
      inputMode="numeric"
      min={min}
      max={max}
      step={1}
      value={draft}
      onChange={(e) => {
        const raw = e.target.value;
        setDraft(raw);
        const n = Number(raw);
        if (raw !== "" && Number.isInteger(n) && n >= min && n <= max) {
          onChange(n);
        }
      }}
      onBlur={() => setDraft(String(value))}
    />
  );
}

/**
 * A button that opens the file picker. The input is reset after each pick so
 * choosing the same files again still registers as a change.
 */
function Picker({
  label,
  accept,
  multiple = false,
  folder = false,
  secondary = false,
  onPick,
}: {
  label: string;
  accept?: string;
  multiple?: boolean;
  folder?: boolean;
  secondary?: boolean;
  onPick: (files: FileList | null) => void;
}) {
  return (
    <label className={secondary ? styles.buttonSecondary : styles.button}>
      <input
        type="file"
        hidden
        accept={accept}
        multiple={multiple}
        // Not in React's types, but every current browser supports it.
        {...(folder ? { webkitdirectory: "" } : {})}
        onChange={(e) => {
          onPick(e.currentTarget.files);
          e.currentTarget.value = "";
        }}
      />
      {label}
    </label>
  );
}

function FileOrder({ files }: { files: File[] }) {
  if (files.length === 0) return null;
  return (
    <details className={styles.fileList}>
      <summary>Show order</summary>
      <ol>
        {files.map((file, i) => (
          <li key={`${i}-${file.name}`}>{file.name}</li>
        ))}
      </ol>
    </details>
  );
}

export default function Setup({
  media,
  settings,
  saveState,
  onMediaChange,
  onSettingsChange,
  onReady,
}: {
  media: Media;
  settings: Settings;
  saveState: SaveState;
  onMediaChange: (media: Media) => void;
  onSettingsChange: (settings: Settings) => void;
  onReady: () => void;
}) {
  const outroDuration = useDuration(media.outro);
  const set = (patch: Partial<Settings>) =>
    onSettingsChange({ ...settings, ...patch });

  const chooseVideos = (list: FileList | null) => {
    const picked = pick(list, VIDEO_EXT);
    if (picked.length === 0) return;
    const outro = picked.find((file) => OUTRO_NAME.test(file.name));
    onMediaChange({
      ...media,
      videos: picked.filter((file) => file !== outro),
      outro: outro ?? media.outro,
    });
  };

  const chooseOutro = (list: FileList | null) => {
    const [outro] = pick(list, VIDEO_EXT);
    if (outro) onMediaChange({ ...media, outro });
  };

  const chooseImages = (list: FileList | null) => {
    const images = pick(list, IMAGE_EXT);
    if (images.length > 0) onMediaChange({ ...media, images });
  };

  // Started so that the clip ends just as the slideshow takes over.
  const matchedOutroStart =
    outroDuration === null
      ? null
      : SLIDESHOW_START_SECONDS + Math.ceil(outroDuration);

  const hasMedia =
    media.videos.length > 0 || media.outro !== null || media.images.length > 0;

  return (
    <main className={styles.page}>
      <div className={styles.column}>
        <header className={styles.header}>
          <h1 className={styles.title}>Service Countdown</h1>
          <p className={styles.lede}>
            Choose your videos and pictures. They play straight from this
            computer and are never uploaded.
          </p>
        </header>

        <section className={styles.section}>
          <div className={styles.sectionHead}>
            <h2>Videos</h2>
            <span className={styles.meta}>
              {media.videos.length > 0
                ? `${media.videos.length} · ${totalSize(media.videos)}`
                : "None chosen"}
            </span>
          </div>
          <p className={styles.help}>
            Played one after another while the timer counts down, in filename
            order. Number the files (01, 02…) to set the order.
          </p>
          <div className={styles.actions}>
            <Picker
              label="Choose videos"
              accept="video/*"
              multiple
              onPick={chooseVideos}
            />
            {media.videos.length > 0 && (
              <button
                type="button"
                className={styles.buttonSecondary}
                onClick={() => onMediaChange({ ...media, videos: [] })}
              >
                Clear
              </button>
            )}
          </div>
          <FileOrder files={media.videos} />
        </section>

        <section className={styles.section}>
          <div className={styles.sectionHead}>
            <h2>
              Closing clip <span className={styles.optional}>optional</span>
            </h2>
            <span className={styles.meta}>
              {media.outro
                ? `${media.outro.name} · ${formatBytes(media.outro.size)}`
                : "None chosen"}
            </span>
          </div>
          <p className={styles.help}>
            Fades in over the videos at a set time, so it always plays last.
          </p>
          <div className={styles.actions}>
            <Picker label="Choose clip" accept="video/*" onPick={chooseOutro} />
            {media.outro && (
              <button
                type="button"
                className={styles.buttonSecondary}
                onClick={() => onMediaChange({ ...media, outro: null })}
              >
                Remove
              </button>
            )}
          </div>

          {media.outro && (
            <div className={styles.field}>
              <label htmlFor="outro-start">
                Starts with this many seconds left
              </label>
              <div className={styles.inline}>
                <NumberField
                  id="outro-start"
                  value={settings.outroStartSeconds}
                  min={SLIDESHOW_START_SECONDS + 1}
                  max={24 * 60 * 60}
                  onChange={(outroStartSeconds) => set({ outroStartSeconds })}
                />
                <span className={styles.meta}>
                  {formatClock(settings.outroStartSeconds)} on the clock
                </span>
              </div>
              {matchedOutroStart !== null && outroDuration !== null && (
                <p className={styles.help}>
                  The clip is {formatClock(outroDuration)} long. Starting it at{" "}
                  {formatClock(matchedOutroStart)} ends it just as the
                  slideshow begins.{" "}
                  {settings.outroStartSeconds !== matchedOutroStart && (
                    <button
                      type="button"
                      className={styles.link}
                      onClick={() =>
                        set({ outroStartSeconds: matchedOutroStart })
                      }
                    >
                      Use {formatClock(matchedOutroStart)}
                    </button>
                  )}
                </p>
              )}
            </div>
          )}
        </section>

        <section className={styles.section}>
          <div className={styles.sectionHead}>
            <h2>Pictures</h2>
            <span className={styles.meta}>
              {media.images.length > 0
                ? `${media.images.length} · ${totalSize(media.images)}`
                : "None chosen"}
            </span>
          </div>
          <p className={styles.help}>
            Shown in the final minute beside the countdown, in filename order.{" "}
            {SLIDE_COUNT} fills it with one each; up to {IMAGE_CAPACITY} get
            used.
          </p>
          <div className={styles.actions}>
            <Picker
              label="Choose pictures"
              accept="image/*"
              multiple
              onPick={chooseImages}
            />
            <Picker
              label="Choose a folder"
              folder
              secondary
              onPick={chooseImages}
            />
            {media.images.length > 0 && (
              <button
                type="button"
                className={styles.buttonSecondary}
                onClick={() => onMediaChange({ ...media, images: [] })}
              >
                Clear
              </button>
            )}
          </div>
          {media.images.length > IMAGE_CAPACITY && (
            <p className={styles.warning}>
              Only the first {IMAGE_CAPACITY} will be shown.
            </p>
          )}
          {media.images.length > 0 && media.images.length < SLIDE_COUNT && (
            <p className={styles.warning}>
              Fewer than {SLIDE_COUNT}, so some will repeat.
            </p>
          )}
          <FileOrder files={media.images} />
        </section>

        <section className={styles.section}>
          <div className={styles.sectionHead}>
            <h2>Words and timing</h2>
          </div>

          <div className={styles.field}>
            <label htmlFor="minutes">Countdown length, in minutes</label>
            <NumberField
              id="minutes"
              value={Math.round(settings.countdownSeconds / 60)}
              min={MIN_COUNTDOWN_MINUTES}
              max={MAX_COUNTDOWN_MINUTES}
              onChange={(minutes) => set({ countdownSeconds: minutes * 60 })}
            />
          </div>

          <div className={styles.field}>
            <label htmlFor="sublabel">Line above the timer</label>
            <input
              id="sublabel"
              className={styles.text}
              value={settings.sublabel}
              onChange={(e) => set({ sublabel: e.target.value })}
            />
          </div>

          <div className={styles.field}>
            <label htmlFor="final-title">Title at zero</label>
            <input
              id="final-title"
              className={styles.text}
              value={settings.finalTitle}
              onChange={(e) => set({ finalTitle: e.target.value })}
            />
          </div>
        </section>

        <footer className={styles.footer}>
          {hasMedia && (
            <p
              className={
                saveState === "unsaved" ? styles.warning : styles.status
              }
              role="status"
            >
              {saveState === "saving" && "Saving to this browser…"}
              {saveState === "saved" &&
                "Saved in this browser, so it will be here next time."}
              {saveState === "unsaved" &&
                "Too large to keep in this browser. It all works now, but you will need to choose the files again next visit."}
            </p>
          )}
          <button type="button" className={styles.primary} onClick={onReady}>
            Go to countdown →
          </button>
          <p className={styles.help}>
            The screen goes black and waits. Go fullscreen with the button in
            the top-right corner, then click anywhere to start. Press Esc
            before starting to come back here.
          </p>
        </footer>
      </div>
    </main>
  );
}
