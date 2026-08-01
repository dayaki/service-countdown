import Countdown from "./countdown";
import { COUNTDOWN_SECONDS } from "./config";
import { readImages, readVideos } from "./media";

// Media is read per request rather than baked in at build time, so dropping new
// clips or stills into public/ takes effect on a refresh with no rebuild.
export const dynamic = "force-dynamic";

/** A day, past which an override is more likely a typo than an intent. */
const MAX_OVERRIDE_SECONDS = 24 * 60 * 60;

/**
 * `?seconds=70` shortens the countdown so the final minute can be rehearsed
 * without sitting through the whole thing. Anything unparseable is ignored in
 * favour of the configured duration rather than failing the page.
 */
function parseSeconds(raw: string | string[] | undefined) {
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (!value) return null;

  const seconds = Number(value);
  if (!Number.isInteger(seconds)) return null;
  if (seconds < 1 || seconds > MAX_OVERRIDE_SECONDS) return null;

  return seconds;
}

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { seconds } = await searchParams;

  return (
    <Countdown
      videos={readVideos()}
      images={readImages()}
      seconds={parseSeconds(seconds) ?? COUNTDOWN_SECONDS}
    />
  );
}
