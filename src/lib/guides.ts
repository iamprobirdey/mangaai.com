export type Guide = {
  slug: string;
  title: string;
  description: string;
  updated: string; // ISO date
  sections: { heading: string; paragraphs: string[] }[];
};

export const GUIDES: Guide[] = [
  {
    slug: "is-manga-ok-for-kids",
    title: "Is manga OK for kids? A parent's guide",
    description: "What manga is, how age ratings work, what to look out for, and how to pick the right series for your child.",
    updated: "2026-11-04",
    sections: [
      {
        heading: "What manga is",
        paragraphs: [
          "Manga are comics that started in Japan. They are read in black and white, usually from right to left, and come out in chapters that are later collected into volumes. Like any kind of book, manga is a format, not a genre: there are manga for toddlers, manga for teens and manga for adults.",
          "That is the most important thing to know as a parent. Asking whether manga is OK for kids is like asking whether films are OK for kids. The answer depends entirely on which ones.",
        ],
      },
      {
        heading: "Why kids love it, and why that's good",
        paragraphs: [
          "Manga pulls in reluctant readers. The pictures carry part of the story, so children who find a page of plain text tiring can follow along, and the chapter structure gives them a sense of progress. Many librarians and teachers now use comics and manga to build reading stamina.",
          "Reading manga still exercises real reading skills: following a plot across panels, tracking characters, reading facial expressions and inferring what happens between frames.",
        ],
      },
      {
        heading: "What to look out for",
        paragraphs: [
          "Age ratings vary by publisher and country, and many popular series were written for teenagers or adults even when the art looks cute. Check the age rating on every series, not just the first one your child picks.",
          "Watch for violence, scary themes and romance that is aimed at older readers. Open sites that host scanned manga for free are often full of adult content and aggressive ads, and they are usually pirated, so they're best avoided for children.",
        ],
      },
      {
        heading: "How to choose the right series",
        paragraphs: [
          "Start with your child's interests: animals, sport, mystery, friendship, funny stories. Then match the age range. Read the first book together, or at least skim it, so you know the tone. Short, light series are a good first step before longer adventures.",
          "On MangaAI, every series has an age range, and each reader profile only shows stories for that child's range and younger. Parents can also hide any series and set a daily reading limit.",
        ],
      },
      {
        heading: "Reading right to left",
        paragraphs: [
          "Many manga read from the top right of the page to the bottom left. Children usually get used to it within a few pages. Our reader shows a quick hint the first time and turns pages in the right direction for each series.",
        ],
      },
    ],
  },
  {
    slug: "how-to-read-manga",
    title: "How to read manga: a quick guide for kids and parents",
    description: "Right-to-left pages, panel order, speech bubbles and sound effects, explained simply.",
    updated: "2026-11-04",
    sections: [
      {
        heading: "Start at the top right",
        paragraphs: [
          "Traditional manga is read from right to left. Open the page, start at the top right panel, and move left along the row before going down to the next row. Inside each panel, speech bubbles are read the same way: right to left, top to bottom.",
        ],
      },
      {
        heading: "Turning pages",
        paragraphs: [
          "Because the story flows to the left, the next page is on the left too. In the MangaAI reader, tap the left side of the screen or swipe right to go forward. Comics that read left to right, and vertical webtoon-style stories, turn the usual way, and the reader handles that for you.",
        ],
      },
      {
        heading: "Speech bubbles, thoughts and sound effects",
        paragraphs: [
          "Round bubbles are speech. Cloud-shaped or dotted bubbles are usually thoughts. Spiky bubbles mean shouting or surprise. Big drawn letters in the picture are sound effects, like a door slamming or a dog barking, and they're part of the fun.",
        ],
      },
      {
        heading: "Zooming in",
        paragraphs: [
          "On a phone, some panels are small. Double-tap or use the Zoom button in the reader to look closer, then tap Fit to go back.",
        ],
      },
    ],
  },
];

export function guideBySlug(slug: string) {
  return GUIDES.find((g) => g.slug === slug) ?? null;
}
