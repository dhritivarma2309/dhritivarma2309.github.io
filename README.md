# Dhriti Varma · Portfolio

My personal site: the things I build with AI (prototypes, agents, side projects) and the things I care about outside work.

I'm a product manager, and I think PMs today should build as well as spec. So I designed and shipped this site myself: I wireframed it, then built it with Claude as my pair programmer.

**Live site:** https://dhritivarma2309.github.io (not live yet)

## Pages

| Page | Status | What's there |
| --- | --- | --- |
| Music | ✅ Live | Discover carousel, what's on rotation, album ratings, a sketched listening chart, articles |
| Music → *10 Best Bob Dylan Songs* | ✅ Template | Ranked listicle with a listen-along Spotify playlist |
| Lab | 🚧 Coming soon | AI prototypes and agents |
| Tennis | 🚧 Coming soon | |
| Home | 🚧 Coming soon | |

## How it's built

- **Plain HTML, CSS and JavaScript.** No framework and no build step, so the code is easy to read and GitHub Pages serves it as is.
- **Content lives apart from the layout.** Everything on the Music page comes from [`data/music.js`](data/music.js), so updating a song or a rating is a one-line edit.
- **Hybrid Spotify player.** Cards load as my own design. Clicking **Listen** swaps in Spotify's embedded player inside the same card, and only one player is open at a time. The page stays light and on-brand, and audio always plays through Spotify (logged-out visitors hear previews).
- **Notebook look.** Graph-paper background, washi tape, polaroids and hand-drawn SVG doodles. The listening chart is drawn in code with a seeded "pencil wobble", so it looks sketched but renders the same every time.
- Responsive down to phone width, with keyboard and screen-reader support (carousel arrow keys, ARIA labels, reduced-motion support).

```
├── index.html               Home
├── music/
│   ├── index.html           Music page (markup)
│   └── articles/bob-dylan/  Article template
├── lab/  tennis/            Coming-soon pages
├── data/
│   ├── site.js              Name, GitHub and LinkedIn links (used on every page)
│   └── music.js             All Music page content  ← edit this
└── assets/
    ├── css/                 site.css (shared), music.css, article.css
    ├── js/                  site.js (shared), music.js (renders the Music page)
    └── img/
```

## Updating content

1. Open `data/music.js`.
2. Replace a `[placeholder]` with real text, and paste a Spotify share link into `spotify: ""` (track, album or playlist all work).
3. Commit. GitHub Pages redeploys in about a minute.

Cover images: drop files in `assets/img/covers/` and set `cover: "/assets/img/covers/name.jpg"`.

## Run locally

```bash
python3 -m http.server 8000
# open http://localhost:8000/music/
```
