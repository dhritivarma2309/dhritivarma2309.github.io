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
  intro: "", // optional line under the record player at the top; leave empty to hide

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
  albumsIntro: "Just an enthusiastic listener with a scorecard, listening to Rolling Stone's 500 Greatest Albums of All Time", // optional line under the heading; leave empty to hide
  // How I rate: each album's rating is one of these keys ("masterpiece", "respect", "gems", "notforme")
  rubric: [
    { key: "masterpiece", emoji: "💖", label: "Masterpiece", note: "Loved it, start to finish." },
    { key: "respect", emoji: "🙌", label: "Deep respect", note: "I see the greatness." },
    { key: "gems", emoji: "✨", label: "A few gems", note: "Some songs I'll keep." },
    { key: "notforme", emoji: "🤷‍♀️", label: "Not for me", note: "Did not work for me." },
  ],
  // rsRank: the album's place on Rolling Stone's 500 Greatest Albums of All Time (2020 list)
  rsList: "https://www.rollingstone.com/music/music-lists/best-albums-of-all-time-1062063/",
  // Tip: to use your own cover image, drop it in assets/img/covers/ and set cover: "../assets/img/covers/<file>.jpg"
  albums: [
    {
      title: "Random Access Memories", artist: "Daft Punk", year: "2013",
      rating: "masterpiece", favoriteSong: "Giorgio by Moroder", rsRank: "295",
      cover: "https://i.scdn.co/image/ab67616d0000b2739b9b36b0e22870b9f542d937",
      spotify: "https://open.spotify.com/album/4m2880jivSbbyEGAKfITCa",
    },
    {
      title: "Graceland", artist: "Paul Simon", year: "1986",
      rating: "masterpiece", favoriteSong: "You Can Call Me Al", rsRank: "46",
      cover: "https://i.scdn.co/image/ab67616d0000b273dd83eef605c1ce2f27722ea1",
      spotify: "https://open.spotify.com/album/4WoQ94qzwQj28n3nlSOVLB",
    },
    {
      title: "The Velvet Underground & Nico", artist: "The Velvet Underground", year: "1967",
      rating: "masterpiece", favoriteSong: "Venus in Furs", rsRank: "23",
      cover: "https://i.scdn.co/image/ab67616d0000b273449911a105dba137b650d3e7",
      spotify: "https://open.spotify.com/album/2QkDDVLuh025znjaxvTfAY",
    },
    {
      title: "Transformer", artist: "Lou Reed", year: "1972",
      rating: "gems", favoriteSong: "Vicious", rsRank: "109",
      cover: "https://i.scdn.co/image/ab67616d0000b2737af33100829e8ad29c790cf0",
      spotify: "https://open.spotify.com/album/0ut7Kp2wU9k3nNCFk3f71W",
    },
    {
      title: "Remain in Light", artist: "Talking Heads", year: "1980",
      rating: "masterpiece", favoriteSong: "Once in a Lifetime", rsRank: "39",
      cover: "https://i.scdn.co/image/ab67616d0000b273e49a405217bda217816f7bf5",
      spotify: "https://open.spotify.com/album/1JvXxLsm0PxlGH4LXzqMGq",
    },
  ],

  // 05 · Liner Notes: articles
  articlesIntro: "",
  articles: [
    { title: "[Article Title]", minutes: "x", href: "", image: "" },
    { title: "[Article Title]", minutes: "x", href: "", image: "" },
    { title: "[Article Title]", minutes: "x", href: "", image: "" },
  ],
};
