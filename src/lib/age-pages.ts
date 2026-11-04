import type { AgeBand } from "@/lib/constants";

/** Copy for the age-range landing pages: what suits each age, written for parents. */
export const AGE_PAGE_COPY: Record<AgeBand, { title: string; intro: string; tips: string[] }> = {
  "4-6": {
    title: "Manga for kids ages 4 to 6",
    intro:
      "For the youngest readers we keep stories short, gentle and picture-led: friendly animals, everyday adventures and lots of humour, with very little text per page. They're made for reading together, and for early readers to try on their own.",
    tips: [
      "Read the first book side by side and point out which way the pages turn.",
      "Let them retell the story from the pictures. That's real reading practice.",
      "Short daily sessions work better than long ones. You can set a daily limit.",
    ],
  },
  "7-9": {
    title: "Manga for kids ages 7 to 9",
    intro:
      "Readers aged 7 to 9 are ready for longer stories with real plots: mysteries to solve, sports teams to cheer for and friends on an adventure. Pictures still carry a lot of the story, which helps children who are building reading confidence.",
    tips: [
      "Series with several volumes give kids something to look forward to.",
      "Ask what they think will happen next. Prediction is a key reading skill.",
      "Mix genres: a funny series and an adventure series keep things fresh.",
    ],
  },
  "10-12": {
    title: "Manga for kids ages 10 to 12",
    intro:
      "Ten to twelve is when many kids fall in love with manga. Stories get bigger and more exciting, with fantasy worlds, rivalries and characters who grow over many volumes, while staying free of the mature themes found in teen and adult series.",
    tips: [
      "Longer series build reading stamina. Streaks and badges help keep it going.",
      "Talk about the characters' choices. Manga often explores friendship and fairness.",
      "Check age ranges as they move on: many popular manga are written for older teens.",
    ],
  },
  "13+": {
    title: "Manga for young teens, 13 and up",
    intro:
      "For young teens we offer richer stories with more complex characters and higher stakes, still reviewed page by page before publishing, and still with no ads, chat or contact with strangers.",
    tips: [
      "Teens can explore genres more freely, and you can still hide any series.",
      "Reading history in the grown-ups area shows what they've been enjoying.",
      "A complete book at a time makes a good habit without endless scrolling.",
    ],
  },
};
