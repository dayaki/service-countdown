import Service from "./service";

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

/**
 * Media is chosen in the browser and never reaches the server, so the server's
 * only job is passing through the rehearsal override.
 */
export default async function Home({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { seconds } = await searchParams;

  return <Service secondsOverride={parseSeconds(seconds)} />;
}
