// Client-only: everything here lives in the browser of the machine running the
// countdown. Nothing is uploaded, so the hosted app never sees anyone's media.
import {
  COUNTDOWN_SECONDS,
  FINAL_TITLE,
  OUTRO_START_SECONDS,
  SUBLABEL,
} from "./config";

export type Media = {
  /** The playlist, in filename order. */
  videos: File[];
  /** The closing clip, cued by the clock rather than the playlist. */
  outro: File | null;
  /** Slideshow stills, in filename order. */
  images: File[];
};

export const EMPTY_MEDIA: Media = { videos: [], outro: null, images: [] };

/** The dials someone running a service is expected to change. */
export type Settings = {
  countdownSeconds: number;
  outroStartSeconds: number;
  sublabel: string;
  finalTitle: string;
};

export const DEFAULT_SETTINGS: Settings = {
  countdownSeconds: COUNTDOWN_SECONDS,
  outroStartSeconds: OUTRO_START_SECONDS,
  sublabel: SUBLABEL,
  finalTitle: FINAL_TITLE,
};

const SETTINGS_KEY = "service-countdown:settings";

/**
 * Saved settings merged over the defaults, so a field added in a later version
 * picks up its default rather than coming through undefined. Storage that is
 * blocked or holds junk falls back to the defaults instead of failing setup.
 */
export function loadSettings(): Settings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(settings: Settings) {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch {
    // Private windows and blocked storage: settings last for this visit only.
  }
}

/**
 * Media goes in IndexedDB rather than localStorage: it holds File objects
 * as-is, and its quota runs to gigabytes where localStorage stops at about 5MB.
 */
const DB_NAME = "service-countdown";
const STORE = "media";
const MEDIA_KEY = "current";

function openDb() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(STORE);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function write(change: (store: IDBObjectStore) => void) {
  const db = await openDb();
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, "readwrite");
      change(tx.objectStore(STORE));
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
  } finally {
    db.close();
  }
}

/** Whatever was picked last time, or nothing if it was never saved. */
export async function loadMedia(): Promise<Media> {
  try {
    const db = await openDb();
    try {
      const stored = await new Promise<Media | undefined>((resolve, reject) => {
        const request = db.transaction(STORE).objectStore(STORE).get(MEDIA_KEY);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
      return stored ?? EMPTY_MEDIA;
    } finally {
      db.close();
    }
  } catch {
    return EMPTY_MEDIA;
  }
}

/**
 * Keeps a copy of the picked files so they survive a refresh. Resolves false
 * when the browser refuses — usually a quota limit on a big set of videos.
 *
 * A refused save also clears the previous one. Otherwise the next visit would
 * quietly reload an older set of media than the one last picked.
 */
export async function saveMedia(media: Media) {
  try {
    await write((store) => store.put(media, MEDIA_KEY));
    return true;
  } catch {
    await write((store) => store.delete(MEDIA_KEY)).catch(() => {});
    return false;
  }
}

/**
 * Asks the browser not to evict saved media when the disk runs low. Chrome
 * grants this silently to sites in regular use; a refusal changes nothing.
 */
export function requestPersistentStorage() {
  navigator.storage?.persist?.().catch(() => {});
}
