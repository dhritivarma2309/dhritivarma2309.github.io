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
     cta        the button label, e.g. "Try it" (the default) or "How It Works"
     video      an MP4 to play when the button is pressed, e.g. "../assets/video/x.mp4"
     tryUrl     or: a page the button opens (live demo, app). Neither = button greyed out
     caseStudy  the write-up page, e.g. "projects/my-project/". "" = shows "coming soon"

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
      cta: "How It Works",
      video: "",          // add the ~60s MP4 here once it's recorded
      tryUrl: "",
      caseStudy: "projects/trivia-night/",
    },
    { title: "[Project Name]", type: "Prototype", image: "", tryUrl: "", caseStudy: "" },
    { title: "[Project Name]", type: "Side project", image: "", tryUrl: "", caseStudy: "" },
  ],
};
