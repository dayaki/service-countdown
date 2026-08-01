import Countdown from "./countdown";
import { readImages, readVideos } from "./media";

// Media is read per request rather than baked in at build time, so dropping new
// clips or stills into public/ takes effect on a refresh with no rebuild.
export const dynamic = "force-dynamic";

export default function Home() {
  return <Countdown videos={readVideos()} images={readImages()} />;
}
