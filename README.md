# Service Countdown

A full-screen countdown for church services. A video plays while people arrive, and in the last minute it hands over to a slideshow of pictures paired with the seconds ticking down. At zero the final picture fills the screen and the welcome title fades in.

Built with Next.js. Designed to be driven from a laptop plugged into the projector.

## Running a service

```bash
pnpm install
pnpm dev
```

Open the page, click **Fullscreen**, then click anywhere to start. The click matters — browsers won't play audio without one, so nothing begins until the screen is clicked.

To rehearse the last minute without sitting through the whole countdown, add `?seconds=70` to the URL.

## Adding media

Drop files into two folders. Neither is in git — the media changes every service and the clips run to gigabytes, so they live on disk only.

```
public/videos/    clips, played in filename order
public/images/    stills for the slideshow
```

Both are read at runtime, so adding or removing files needs no code change — just refresh. Prefix filenames with numbers (`01-`, `02-`, …) to control the order.

Videos are measured against the screen shape as they load and either fill it or letterbox, whichever loses less picture, so mixed aspect ratios in one folder are fine.

## Changing how it looks

Everything adjustable lives in [`app/config.ts`](app/config.ts) — countdown length, how long each slide holds, the panel colours, the welcome title. Every setting is commented with what raising or lowering it does. No code knowledge needed: pick a number, save, refresh.

The two you'll reach for most:

| Setting | What it does |
| --- | --- |
| `COUNTDOWN_SECONDS` | Total length. Written as `25 * 60` so it reads as minutes. |
| `SLIDESHOW_START_SECONDS` | When the video hands over to the slideshow. |

## Layout

```
app/config.ts     every dial, heavily commented
app/countdown.tsx the countdown and slideshow
app/media.ts      reads the media folders from disk
public/           videos and images (gitignored)
```

Respects `prefers-reduced-motion` — the drift and slide animations are turned off for anyone who has it enabled.
