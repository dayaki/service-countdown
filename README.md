# Service Countdown

A full-screen countdown for church services. A video plays while people arrive, and in the last minute it hands over to a slideshow of pictures paired with the seconds ticking down. At zero the final picture fills the screen and the welcome title fades in.

Built with Next.js. Designed to be driven from a laptop plugged into the projector.

Live at **[service-countdown.vercel.app](https://service-countdown.vercel.app)** — anyone can use it with their own videos and pictures.

## Running a service

Open the site and the setup screen comes up. Choose your media, set the words and timing, then click **Go to countdown**.

The screen goes black and waits. Click **Fullscreen** (top right, shows on hover), then click anywhere to start. The click matters — browsers won't play audio without one, so nothing begins until the screen is clicked. Before starting, **← Setup** (top left) or Esc goes back.

To rehearse the last minute without sitting through the whole countdown, add `?seconds=70` to the URL.

## The setup screen

Media plays straight from the computer running the countdown. Nothing is uploaded — the site never sees anyone's videos or pictures.

| Section | What goes in it |
| --- | --- |
| **Videos** | The clips that play while the timer counts down, in filename order. Prefix names with numbers (`01-`, `02-`, …) to set the order; **Show order** lists it. |
| **Closing clip** | Optional. Fades in over the videos at a set time, so it always plays last — the place for an `outro.mp4`. A file named `outro` picked with the videos is moved here on its own. Setup shows the clip's length and offers a start time that ends it exactly as the slideshow begins. |
| **Pictures** | Stills for the final-minute slideshow, in filename order. Pick files or a whole folder. 16 gives each slide one picture; up to 31 get used, with the spares paired two to a slide. Fewer than 16 and some repeat. |
| **Words and timing** | Countdown length in minutes, the line above the timer, and the title at zero. |

Everything is remembered by the browser, so a refresh comes back to setup with it all still chosen. A large set of videos can be more than the browser will keep — setup says so when that happens, and the files need choosing again next visit. Everything still works for the visit itself.

It is remembered per browser on one computer. Setting up on a different machine means choosing the files there.

Videos are measured against the screen shape as they load and either fill it or letterbox, whichever loses less picture, so mixed aspect ratios are fine. MP4 (H.264) plays everywhere; `.mov` files from iPhones are often HEVC, which Chrome may not play.

## Changing how it looks

The setup screen covers what changes from service to service. Everything else — how long each slide holds, the slide movement, the panel colours — lives in [`app/config.ts`](app/config.ts). Every setting is commented with what raising or lowering it does. No code knowledge needed: pick a number, save, push.

The values marked "Setup default" there are only what a browser starts with; once someone changes them in setup, their browser keeps its own.

## Developing

```bash
pnpm install
pnpm dev
```

Pushes to `main` deploy to Vercel automatically.

```
app/config.ts     every dial, heavily commented
app/setup.tsx     the setup screen
app/service.tsx   switches between setup and the countdown
app/storage.ts    remembers media and settings in the browser
app/countdown.tsx the countdown and slideshow
```
