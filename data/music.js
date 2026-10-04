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
  albumsIntro: "[Two lines in your voice describing this section: how you rate albums, what makes a 10, and what you're listening for.]",
  ratingScale: 10, // ratings are out of 10
  // Tip: to use your own cover image, drop it in assets/img/covers/ and set cover: "../assets/img/covers/<file>.jpg"
  albums: [
    {
      title: "Random Access Memories", artist: "Daft Punk", year: "2013",
      rating: "9", favoriteSong: "Giorgio by Moroder",
      cover: "https://i.scdn.co/image/ab67616d0000b2739b9b36b0e22870b9f542d937",
      spotify: "https://open.spotify.com/album/4m2880jivSbbyEGAKfITCa",
    },
    {
      title: "Graceland", artist: "Paul Simon", year: "1986",
      rating: "8", favoriteSong: "You Can Call Me Al",
      cover: "https://i.scdn.co/image/ab67616d0000b273dd83eef605c1ce2f27722ea1",
      spotify: "https://open.spotify.com/album/4WoQ94qzwQj28n3nlSOVLB",
    },
    {
      title: "The Velvet Underground & Nico", artist: "The Velvet Underground", year: "1967",
      rating: "9", favoriteSong: "Venus in Furs",
      cover: "https://i.scdn.co/image/ab67616d0000b273449911a105dba137b650d3e7",
      spotify: "https://open.spotify.com/album/2QkDDVLuh025znjaxvTfAY",
    },
    {
      title: "Transformer", artist: "Lou Reed", year: "1972",
      rating: "7", favoriteSong: "Vicious",
      cover: "https://i.scdn.co/image/ab67616d0000b2737af33100829e8ad29c790cf0",
      spotify: "https://open.spotify.com/album/0ut7Kp2wU9k3nNCFk3f71W",
    },
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
