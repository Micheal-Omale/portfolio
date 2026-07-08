### Portfolio Design System — Paper / Ink / Coral

Source: [design-reference/Michael Omale - Portfolio.html](/c:/Users/LENOVO/Desktop/personal%20website/design-reference/Michael%20Omale%20-%20Portfolio.html)
Home built in: [src/views/HomeView.vue](/c:/Users/LENOVO/Desktop/personal%20website/src/views/HomeView.vue)
About built in: [src/views/AboutView.vue](/c:/Users/LENOVO/Desktop/personal%20website/src/views/AboutView.vue) (single-file page — sections inline, not componentized)
Last updated: 2026-07-07

#### Tokens (defined in [src/style.css](/c:/Users/LENOVO/Desktop/personal%20website/src/style.css) `@theme`)

| Token          | Value     | Tailwind usage                          |
| -------------- | --------- | --------------------------------------- |
| `--color-paper`| `#ECE6D9` | `bg-paper`, `text-paper`, `text-paper/65` |
| `--color-ink`  | `#17150E` | `bg-ink`, `text-ink`, `text-ink/[0.72]`, `border-ink/[0.16]` |
| `--color-accent` (`--accent`) | `#FF4B26` | `bg-accent`, `text-accent` (also read by JS cursor/ruler) |
| `--font-display` | Bricolage Grotesque | `font-display` — headings, name, marquee |
| `--font-serif`   | Instrument Serif    | `font-serif italic` — soft accent phrases |
| `--font-mono`    | JetBrains Mono      | `font-mono` — labels, nav, pills, metrics |

#### Recurring patterns

| Property        | Convention |
| --------------- | ---------- |
| Section padding | `px-[clamp(20px,5vw,72px)]`; hero/about get extra left `pl-[clamp(72px,7vw,120px)]`; vertical `py-[clamp(80px,12vh,160px)]` |
| Display type    | `font-display font-extrabold leading-[0.84–0.9] tracking-[-0.04em]`, sizes via `text-[clamp(...)]` |
| Hero name panel | "MICHAEL" = paper text on an inline-block coral panel; "OMALE." = ink on the next line pulled up (`margin-top:-0.1em`) to overlap the panel — see the scoped `.mo-hero-panel` / `.mo-hero-line-2` in [HeroSection.vue](/c:/Users/LENOVO/Desktop/personal%20website/src/components/sections/HeroSection.vue) |
| Labels / eyebrows | `font-mono text-[11px] tracking-[0.16em–0.24em]`; section eyebrows in `text-accent` (`[ 01 ] — ABOUT ME`) |
| Pills           | outline: `rounded-full border border-ink/25`; soft: `bg-ink/[0.06]` — see [PillTag.vue](/c:/Users/LENOVO/Desktop/personal%20website/src/components/ui/PillTag.vue) |
| Buttons         | `rounded-full` — primary `bg-ink text-paper hover:bg-accent`; outline `border border-ink hover:bg-ink hover:text-paper` |
| Dark bands      | `bg-ink text-paper` (marquee, contact, footer); dividers `border-paper/[0.16]` |
| Image slots     | tinted `bg-ink/[0.06]` rounded boxes — see [ImagePlaceholder.vue](/c:/Users/LENOVO/Desktop/personal%20website/src/components/ui/ImagePlaceholder.vue) |
| Section labels  | two flavors: numbered coral eyebrows (`[ 01 ] — ABOUT ME`) OR muted plain labels (`— EXPERIENCE`, `— CAPABILITIES` in `text-ink/45`) for in-page subsections — see AboutView |
| Timeline rows   | `<ul>` of rows, each `border-t border-ink/[0.16]` + `py-[clamp(...)]`, 3-col on desktop `min-[760px]:grid-cols-[130px_minmax(0,1fr)_auto]` = period (mono) · role (display bold) + blurb · org tag (mono, right); collapses to 1-col — see AboutView EXPERIENCE |
| Reveal          | add `data-reveal` (+ optional `data-reveal-delay="120"`) — animated by `useScrollReveal` (GSAP ScrollTrigger) |
| Cursor          | add `data-cursor` to interactive elements to trigger the custom-cursor grow/fill |
| Breakpoint      | desktop-only chrome uses `min-[861px]:` (ruler, desktop nav); mobile menu below |

**CSS gotcha (Tailwind v4):** base element styles in [style.css](/c:/Users/LENOVO/Desktop/personal%20website/src/style.css) MUST live inside `@layer base` — unlayered rules beat *every* Tailwind utility regardless of specificity. A stray unlayered `* { margin:0; padding:0 }` silently zeroed all section spacing, and an unlayered `a { color: inherit }` made `text-paper` links invisible. Never reintroduce a universal reset (Preflight handles it).

**Pattern notes:**
Warm editorial light theme — cream paper, near-black ink, a single coral accent used sparingly for emphasis, dots, and eyebrows. Type does the heavy lifting: oversized Bricolage Grotesque display, Instrument Serif italic for warmth, JetBrains Mono for technical labels. Dark ink bands punctuate the flow (marquee, contact, footer). Motion is subtle: soft scroll reveals, a trailing custom cursor, a fixed scroll ruler, one marquee. Keep new sections on this palette, corner-rounding (`rounded-full` pills/buttons, `rounded-lg`/`rounded-8px` media), and clamp-based responsive type so the site reads as one system. Respect `prefers-reduced-motion` and keep interactive elements keyboard-accessible.
