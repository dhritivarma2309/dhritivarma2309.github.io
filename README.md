# Dhriti Varma · Portfolio

My personal site: the things I build with AI (prototypes, agents, side projects) and the things I care about outside work.

I'm a product manager, and I think PMs today should build as well as spec. So I designed and shipped this site myself: I wireframed it, then built it with Claude as my pair programmer.

**Live site:** https://dhritivarma2309.github.io (not live yet)

## Pages

| Page | Status | What's there |
| --- | --- | --- |
| Home | 🚧 Coming soon | |
| Projects | ✅ Live | Things I've built with AI: side projects, prototypes and agents, each with a case study |
| Projects → *Trivia Night* | ✅ Live | Jeopardy-style trivia for friends over video call: phones as buzzers, live rooms on Firebase, questions drafted with Claude through a Cloudflare Worker ([case study](projects/trivia-night/), [code](projects/trivia/)) |
| Personal | ✅ Live | Creative pursuits: album ratings (working through Rolling Stone's 500 Greatest Albums), playlists and what's on heavy rotation |
| Personal → *All album ratings* | ✅ Live | Every album I've rated, with search and filters |

## How it's built

- **Plain HTML, CSS and JavaScript.** No framework and no build step, so the code is easy to read and GitHub Pages serves it as is.
- **Content lives apart from the layout.** The Projects cards come from [`data/lab.js`](data/lab.js) and the Personal page from [`data/music.js`](data/music.js), so adding a project or an album is a short edit.
- **Spotify links.** Every Listen button opens the song or album on Spotify in a new tab, so signed-in visitors hear full tracks.
- **Notebook look.** Graph-paper background, washi tape, polaroids and hand-drawn SVG doodles.
- Responsive down to phone width, with keyboard and screen-reader support (ARIA labels, reduced-motion support).

```
├── index.html               Home
├── projects/
│   ├── index.html           Projects page (cards from data/lab.js)
│   ├── trivia-night/        Trivia Night case study
│   ├── trivia/              Trivia Night app (hub, play, host, build; ai/ worker; firebase/ rules; tests/)
│   └── project-1/           Case study template
├── personal/
│   ├── index.html           Personal page (content from data/music.js)
│   ├── albums/              All album ratings
│   └── articles/bob-dylan/  Article template
├── 404.html                 Not-found page; forwards old /lab/ and /music/ links
├── data/
│   ├── site.js              GitHub and LinkedIn links (used on every page)
│   ├── lab.js               Projects page cards  ← edit this
│   └── music.js             Personal page content  ← edit this
└── assets/                  css/, js/, img/, video/
```

## Updating content

1. Open `data/music.js`.
2. Replace a `[placeholder]` with real text, and paste a Spotify share link into `spotify: ""` (track, album or playlist all work).
3. Commit. GitHub Pages redeploys in about a minute.

Cover images: drop files in `assets/img/covers/` and set `cover: "/assets/img/covers/name.jpg"`.

## Run locally

```bash
python3 -m http.server 8000
# open http://localhost:8000/
```
