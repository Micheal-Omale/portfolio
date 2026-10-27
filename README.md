# Michael Omale — portfolio

The studio site for Michael Omale, software engineer: AI tools, SaaS dashboards and brand sites with Vue, React, Nuxt and Next.

**Live:** https://portfolio-theta-ten-n4gyyye5st.vercel.app

## What's inside

- **Hero tray** — real product screenshots develop out of white paper in a WebGL developing tray.
- **Work** — a sticky pile of case studies, each print sinking into the stack as the next lands.
- **Contact sheet** — the archive on 35mm strips, with a magnifying loupe and a grease pencil.
- **Drying line** — the story so far, hung on a rope you can pull.
- **Paper Flight** — a small Three.js game: fly a paper plane through the studio, thread film frames, dodge drying lines and pass every project on the way.
- **Paper planes** — a wingman that rides your scroll and signs each heading, plus a flock you can throw, catch and fly in formation.

## Stack

Plain HTML, CSS and JavaScript — no build step. GSAP (ScrollTrigger, SplitText, CustomEase), Lenis and Three.js from CDNs.

## Run locally

Serve the folder over HTTP (opening the file directly works, but the game can't use screenshots from `file://`):

```sh
npx serve .
```
