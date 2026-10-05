/* ==========================================================================
   LAB PAGE CONTENT
   --------------------------------------------------------------------------
   This is the only file you need to edit to update the Lab page cards.

   Each project is one card:
     title      the project name (the card's header)
     type       a small label, e.g. "Agent", "Prototype", "Side project"
     image      a screenshot, e.g. "../assets/img/lab/my-project.png"
                (leave "" for a pastel placeholder)
     tryUrl     where people can try it (live demo, app, video). "" = button greyed out
     caseStudy  the write-up page, e.g. "projects/my-project/". "" = shows "coming soon"

   To add a case study: copy the folder lab/projects/project-1/ to
   lab/projects/<your-project>/, write it, and point caseStudy at it.
   ========================================================================== */

window.LAB = {
  title: "Things I've Built",
  intro: "Prototypes, agents and side projects I've made with AI",

  projects: [
    { title: "[Project Name]", type: "Agent", image: "", tryUrl: "", caseStudy: "projects/project-1/" },
    { title: "[Project Name]", type: "Prototype", image: "", tryUrl: "", caseStudy: "" },
    { title: "[Project Name]", type: "Side project", image: "", tryUrl: "", caseStudy: "" },
  ],
};
