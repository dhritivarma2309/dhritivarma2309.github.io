/* ==========================================================================
   LAB PAGE CONTENT
   --------------------------------------------------------------------------
   This is the only file you need to edit to update the Lab page cards.

   Each project is one card:
     title      the project name (the card's header)
     type       a small label, e.g. "Agent", "Prototype", "Side project"
     blurb      optional one-line description under the name
     image      a screenshot, e.g. "../assets/img/lab/my-project.jpg"
                (leave "" for a pastel placeholder)
     buttons    the card's buttons, left to right. Each one is
                  { label: "Try Now", href: "trivia/", newTab: true }
                The first is the solid (dark) button, the rest are outlined.
                newTab: true opens the link in a new tab. No href = greyed out.
                When a card has buttons, "Read the case study →" is left off
                (point a button at the case study instead).
     cta        (cards without buttons) the button label, default "Try it"
     video      (cards without buttons) an MP4 the button plays in a pop-up
     tryUrl     (cards without buttons) a page the button opens. Neither = greyed out
     caseStudy  the write-up page, e.g. "projects/my-project/". Clicking the
                card opens it. "" = shows "coming soon"

   To add a case study: copy the folder lab/projects/project-1/ to
   lab/projects/<your-project>/, write it, and point caseStudy at it.
   ========================================================================== */

window.LAB = {
  title: "Things I've Built",
  intro: "How I have been using AI to boost productivity and explore personal interests",

  projects: [
    {
      title: "Trivia Night",
      type: "Side project",
      blurb: "Host a Jeopardy-style trivia for friends and family over video call. Live buzzers on everyone's phone, questions drafted by you and Claude.",
      image: "../assets/img/lab/trivia-night.jpg",
      buttons: [
        { label: "How It Works", href: "projects/trivia-night/" },
        { label: "Try Now", href: "trivia/", newTab: true },
      ],
      caseStudy: "projects/trivia-night/",
    },
    { title: "[Project Name]", type: "Prototype", image: "", tryUrl: "", caseStudy: "" },
    { title: "[Project Name]", type: "Side project", image: "", tryUrl: "", caseStudy: "" },
  ],
};
