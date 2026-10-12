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
        name: "Covers That Beat The Original",
        songs: [
          {
            title: "Hallelujah", artist: "Jeff Buckley",
            cover: "https://i.scdn.co/image/ab67616d00001e02afc2d1d2c8703a10aeded0af",
            spotify: "https://open.spotify.com/track/3pRaLNL3b8x5uBOcsgvdqM",
          },
          {
            title: "You Can't Hurry Love", artist: "Phil Collins",
            cover: "https://i.scdn.co/image/ab67616d00001e02031a70a145ed2b35c1d1c87a",
            spotify: "https://open.spotify.com/track/4YUlGNZfYA6EUE5KDsGqpC",
          },
          {
            title: "The Man Who Sold The World", artist: "Nirvana",
            cover: "https://i.scdn.co/image/ab67616d00001e02f411d2833d932f4d84d616ef",
            spotify: "https://open.spotify.com/track/48psxWnIVYCPUZJKiuDiEf",
          },
          {
            title: "Girls Just Want to Have Fun", artist: "Cyndi Lauper",
            cover: "https://i.scdn.co/image/ab67616d00001e02ce023ce7dfdd5199bcdfd5a1",
            spotify: "https://open.spotify.com/track/4y1LsJpmMti1PfRQV9AWWe",
          },
          {
            title: "Knockin' On Heaven's Door", artist: "Guns N' Roses",
            cover: "https://i.scdn.co/image/ab67616d00001e0297454cdb9f00c4612f3174e4",
            spotify: "https://open.spotify.com/track/3SOR72keyMrnQbBR1y1tSu",
          },
        ],
      },
      {
        name: "My Favourite Music From Suits",
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
      {
        name: "Coke Studio Pakistan Essentials",
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
  albumsIntro: "Just an enthusiastic listener with a scorecard. Currently listening to Rolling Stone's 500 Greatest Albums of All Time", // optional line under the heading; leave empty to hide
  // The note card under the rating rubric. One string per paragraph.
  albumsStory: {
    title: "Why I started",
    paragraphs: [
      "A while ago I noticed I'd fallen into a listening rut. I was often playing the same artists on repeat, and my Spotify recommendations kept serving me more of what I already liked.",
      "Wanting to hear something completely new, I started working my way through Rolling Stone's 500 Greatest Albums of All Time. I know the list isn't perfect, but it has been a great way for me to discover music I'd have struggled to find on my own.",
      "One beautiful outcome of this exercise has been learning to listen to albums with intention: appreciating each album as a whole, the way the artist meant for us to listen. I have started to notice how songs set each other up, and how some underrated tracks make most sense in context of the entire album. Many surprising moments have come from albums I thought I already knew. Hearing them all the way through, with fresh ears, I've found a much deeper relationship with music that I had been listening to all along.",
    ],
  },
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
    {
      title: "AM", artist: "Arctic Monkeys", year: "2013",
      rating: "respect", favoriteSong: "Do I Wanna Know?", rsRank: "346",
      cover: "https://i.scdn.co/image/ab67616d0000b2734f669de38690faf2cf88c245",
      spotify: "https://open.spotify.com/album/5bU1XKYxHhEwukllT20xtk",
    },
    {
      title: "Let It Bleed", artist: "The Rolling Stones", year: "1969",
      rating: "gems", favoriteSong: "Gimme Shelter", rsRank: "41",
      cover: "https://i.scdn.co/image/ab67616d0000b2732af30c881bb23cfb82a8cf99",
      spotify: "https://open.spotify.com/album/4l4u9e9jSbotSXNjYfOugy",
    },
    {
      title: "Rumours", artist: "Fleetwood Mac", year: "1977",
      rating: "respect", favoriteSong: "The Chain", rsRank: "7",
      cover: "https://i.scdn.co/image/ab67616d0000b27357df7ce0eac715cf70e519a7",
      spotify: "https://open.spotify.com/album/1bt6q2SruMsBtcerNVtpZB",
    },
    {
      title: "Thriller", artist: "Michael Jackson", year: "1982",
      rating: "masterpiece", favoriteSong: "Wanna Be Startin' Somethin'", rsRank: "12",
      cover: "https://i.scdn.co/image/ab67616d0000b27332a7d87248d1b75463483df5",
      spotify: "https://open.spotify.com/album/2ANVost0y2y52ema1E9xAZ",
    },
    {
      title: "MTV Unplugged In New York", artist: "Nirvana", year: "1994",
      rating: "respect", favoriteSong: "Where Did You Sleep Last Night", rsRank: "279",
      cover: "https://i.scdn.co/image/ab67616d0000b27336c5417732e53e23cb219246",
      spotify: "https://open.spotify.com/album/1To7kv722A8SpZF789MZy7",
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
