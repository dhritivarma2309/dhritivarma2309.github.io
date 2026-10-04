/* ==========================================================================
   MUSIC PAGE CONTENT
   --------------------------------------------------------------------------
   This is the only file you need to edit to update the music page.

   Spotify links: paste any Spotify share link (track, album or playlist),
   e.g. "https://open.spotify.com/track/4uLU6hMCjMI75M1A2tKUQC?si=..."
   Leave it as "" and the Listen button will stay disabled.

   cover: an image URL or a path like "/assets/img/covers/blonde.jpg".
   Leave it as "" to show a pastel placeholder.
   ========================================================================== */

window.MUSIC = {
  intro:
    "[One line in your voice on what music is to you, e.g. what you listen to and why you rate albums.]",

  // 02 · Discover New: a carousel of songs you think visitors should hear
  discover: [
    { title: "[Song title 1]", artist: "[Artist]", album: "[Album]", hypothesis: "Hypothesis: you'll like this", cover: "", spotify: "" },
    { title: "[Song title 2]", artist: "[Artist]", album: "[Album]", hypothesis: "Hypothesis: perfect for a long drive", cover: "", spotify: "" },
    { title: "[Song title 3]", artist: "[Artist]", album: "[Album]", hypothesis: "Hypothesis: you'll replay the bridge", cover: "", spotify: "" },
    { title: "[Song title 4]", artist: "[Artist]", album: "[Album]", hypothesis: "Hypothesis: a new favourite", cover: "", spotify: "" },
    { title: "[Song title 5]", artist: "[Artist]", album: "[Album]", hypothesis: "Hypothesis: trust me on this one", cover: "", spotify: "" },
  ],

  // 03 · On rotation: what you're playing most right now
  onRotation: {
    playlist: "", // Spotify playlist link for the "Listen" + "Open in Spotify" buttons
    tracks: [
      { title: "[Track]", artist: "[Artist]", length: "3:42", cover: "", note: "on repeat" },
      { title: "[Track]", artist: "[Artist]", length: "4:05", cover: "" },
      { title: "[Track]", artist: "[Artist]", length: "2:58", cover: "" },
      { title: "[Track]", artist: "[Artist]", length: "3:17", cover: "" },
      { title: "[Track]", artist: "[Artist]", length: "3:51", cover: "" },
    ],
  },

  // 04 · Album ratings
  albumsIntro: "[One line in your voice describing this section.]",
  albums: [
    { title: "[Album title]", artist: "[Artist]", year: "[Year]", rating: "x.x", bestSong: "[Track name]", date: "[DATE]", cover: "", spotify: "" },
    { title: "[Album title]", artist: "[Artist]", year: "[Year]", rating: "x.x", bestSong: "[Track name]", date: "[DATE]", cover: "", spotify: "" },
    { title: "[Album title]", artist: "[Artist]", year: "[Year]", rating: "x.x", bestSong: "[Track name]", date: "[DATE]", cover: "", spotify: "" },
    { title: "[Album title]", artist: "[Artist]", year: "[Year]", rating: "x.x", bestSong: "[Track name]", date: "[DATE]", cover: "", spotify: "" },
  ],

  // Lab results: "What I Listened To" chart. Values are relative (hours, plays, %)
  listening: {
    intro:
      "[A pencil-sketched chart of your year in music, by genre, artist or hours. Bar heights here are only illustrative; real data later.]",
    unit: "hours",
    bars: [
      { label: "[Genre]", value: 62 },
      { label: "[Genre]", value: 88, surprise: true },
      { label: "[Genre]", value: 44 },
      { label: "[Genre]", value: 28 },
      { label: "[Genre]", value: 18 },
    ],
  },

  // 05 · Liner Notes: articles
  articlesIntro: "[One line in your voice describing this section.]",
  articles: [
    { title: "10 Best Bob Dylan Songs", minutes: "x", href: "articles/bob-dylan/", image: "" },
    { title: "[Article Title]", minutes: "x", href: "", image: "" },
    { title: "[Article Title]", minutes: "x", href: "", image: "" },
  ],

  // Ticket-stub doodle next to Liner Notes (a gig you loved)
  ticket: { artist: "[Artist]", venue: "[Venue]", date: "[Date]", number: "000" },
};
