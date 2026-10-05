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

  // 02 · Discover New: themed recommendations.
  // Each theme has a name and 5 songs. Add or remove themes freely.
  discover: {
    intro: "Mini mixtapes I'd make for a friend",
    themes: [
      {
        name: "Favorites from Coke Studio Pakistan",
        songs: [
          {
            title: "Tu Jhoom", artist: "Naseebo Lal, Abida Parveen",
            cover: "https://i.scdn.co/image/ab67616d00001e029e0b1e09ab34a9251d2e8667",
            spotify: "https://open.spotify.com/track/7t1nus1PrCP2ABTndYfMks",
          },
          {
            title: "Pasoori", artist: "Ali Sethi, Shae Gill",
            cover: "https://i.scdn.co/image/ab67616d00001e023f3d35703bdcd917dad51c4f",
            spotify: "https://open.spotify.com/track/7lvDsmTRXFE3dK4OjvRiWB",
          },
          {
            title: "Par Chanaa De", artist: "Shilpa Rao, Noori",
            cover: "https://i.scdn.co/image/ab67616d00001e0275efc3c8640ac29607f11494",
            spotify: "https://open.spotify.com/track/38O8NJUVsAiJYYv8YN8AAz",
          },
          {
            title: "Jhol", artist: "Maanu, Annural Khalid",
            cover: "https://i.scdn.co/image/ab67616d00001e02da7d1408f8e776063963572f",
            spotify: "https://open.spotify.com/track/4XTgFBxBHN6var1BzAgE1m",
          },
          {
            title: "Ranjish Hi Sahi", artist: "Ali Sethi",
            cover: "https://i.scdn.co/image/ab67616d00001e020a8f94c8bcc814f0fb389bdf",
            spotify: "https://open.spotify.com/track/4t2sMBajRuSKudtieXPgPp",
          },
        ],
      },
      {
        name: "Favorite Suits Soundtrack",
        songs: [
          {
            title: "Short Change Hero", artist: "The Heavy",
            cover: "https://i.scdn.co/image/ab67616d00001e02463986d828c59a03f2ab0a3f",
            spotify: "https://open.spotify.com/track/7JOizhmt3HlBgQyJEa0AgK",
          },
          {
            title: "Phantoms and Friends", artist: "Old Man Canyon",
            cover: "https://i.scdn.co/image/ab67616d00001e02772410ccaa78a193b7490c98",
            spotify: "https://open.spotify.com/track/5AyC8MfFvsuT8knryzcVYU",
          },
          {
            title: "The Angel and the Fool", artist: "Broken Bells",
            cover: "https://i.scdn.co/image/ab67616d00001e02198d560b5547761babc7607d",
            spotify: "https://open.spotify.com/track/6Npas0IWUiZEsSt0J5VHRC",
          },
          {
            title: "Wish I Knew You", artist: "The Revivalists",
            cover: "https://i.scdn.co/image/ab67616d00001e0279b304ea995d0fc2c12d6a66",
            spotify: "https://open.spotify.com/track/7jpP6QKGSJDpSFkAy3nKxG",
          },
          {
            title: "Stompa", artist: "Serena Ryder",
            cover: "https://i.scdn.co/image/ab67616d00001e02d4a988c472c0bffc143f7f84",
            spotify: "https://open.spotify.com/track/0JQaQfhlQbY4RljVwnAval",
          },
        ],
      },
    ],
  },

  // 03 · On rotation: the five songs I can't get enough of right now (#1 = most played)
  onRotation: {
    intro: "The five songs I keep coming back to right now",
    tracks: [
      {
        title: "Born Under Punches", artist: "Talking Heads", length: "5:49",
        cover: "https://i.scdn.co/image/ab67616d00001e02be729cf3617a0be917fafc71",
        spotify: "https://open.spotify.com/track/378M7erMwhXqPxk5hhkfyv",
      },
      {
        title: "Merry Christmas, Please Don't Call", artist: "Bleachers", length: "3:22",
        cover: "https://i.scdn.co/image/ab67616d00001e027fbed05d7226834da74c652b",
        spotify: "https://open.spotify.com/track/0UOG0zUn7t8m8QcxfzR7AH",
      },
      {
        title: "Dirty Blvd.", artist: "Lou Reed", length: "3:29",
        cover: "https://i.scdn.co/image/ab67616d00001e026386bf63d1326306c9b168ef",
        spotify: "https://open.spotify.com/track/4TDLfAmx45EpSiQYG6hCzT",
      },
      {
        title: "Sunday Morning", artist: "Amanaz", length: "4:59",
        cover: "https://i.scdn.co/image/ab67616d00001e021a3e9f74688b6c8f7fe97751",
        spotify: "https://open.spotify.com/track/7rFu5IhLj50r2tNM2d2cat",
      },
      {
        title: "In the Aeroplane Over the Sea", artist: "Neutral Milk Hotel", length: "3:22",
        cover: "https://i.scdn.co/image/ab67616d00001e022dde3ceb3548ffbdb77a97e1",
        spotify: "https://open.spotify.com/track/2SlmTRmuDJbFW7Hjzn6fCK",
      },
    ],
  },

  // 04 · Album ratings
  albumsIntro: "Not a critic, just an enthusiastic listener with a scorecard", // optional line under the heading; leave empty to hide
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
