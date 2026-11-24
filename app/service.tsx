"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Countdown from "./countdown";
import Setup, { type SaveState } from "./setup";
import styles from "./setup.module.css";
import {
  DEFAULT_SETTINGS,
  type Media,
  type Settings,
  loadMedia,
  loadSettings,
  requestPersistentStorage,
  saveMedia,
  saveSettings,
} from "./storage";

type MediaUrls = {
  videos: string[];
  outro: string | null;
  images: string[];
};

/**
 * Setup until the operator is ready, then the countdown. Media and settings
 * are restored from this browser on load, so a refresh lands back on setup
 * with everything already chosen.
 */
export default function Service({
  secondsOverride,
}: {
  secondsOverride: number | null;
}) {
  // Null until storage has been read, so setup never flashes empty first.
  const [media, setMedia] = useState<Media | null>(null);
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [saveState, setSaveState] = useState<SaveState>("saved");
  const [ready, setReady] = useState(false);
  const [urls, setUrls] = useState<MediaUrls | null>(null);
  const latestSave = useRef(0);

  useEffect(() => {
    setSettings(loadSettings());
    loadMedia().then(setMedia);
    requestPersistentStorage();
  }, []);

  // Saves can finish out of order with big files, so only the most recent one
  // gets to report.
  const changeMedia = useCallback((next: Media) => {
    setMedia(next);
    setSaveState("saving");
    const id = ++latestSave.current;
    saveMedia(next).then((saved) => {
      if (id === latestSave.current) setSaveState(saved ? "saved" : "unsaved");
    });
  }, []);

  const changeSettings = useCallback((next: Settings) => {
    setSettings(next);
    saveSettings(next);
  }, []);

  // Object URLs pin their file in memory until revoked, so they exist only
  // while the countdown is up and are released on the way back to setup.
  useEffect(() => {
    if (!ready || !media) return;

    const made: MediaUrls = {
      videos: media.videos.map((file) => URL.createObjectURL(file)),
      outro: media.outro && URL.createObjectURL(media.outro),
      images: media.images.map((file) => URL.createObjectURL(file)),
    };
    setUrls(made);

    return () => {
      setUrls(null);
      for (const url of [...made.videos, ...made.images, made.outro]) {
        if (url) URL.revokeObjectURL(url);
      }
    };
  }, [ready, media]);

  const exit = useCallback(() => setReady(false), []);

  if (!media) {
    return <div className={styles.loading}>Loading…</div>;
  }

  if (ready) {
    return (
      urls && (
        <Countdown
          videos={urls.videos}
          outro={urls.outro}
          images={urls.images}
          seconds={secondsOverride ?? settings.countdownSeconds}
          outroStartSeconds={settings.outroStartSeconds}
          sublabel={settings.sublabel}
          finalTitle={settings.finalTitle}
          onExit={exit}
        />
      )
    );
  }

  return (
    <Setup
      media={media}
      settings={settings}
      saveState={saveState}
      onMediaChange={changeMedia}
      onSettingsChange={changeSettings}
      onReady={() => setReady(true)}
    />
  );
}
