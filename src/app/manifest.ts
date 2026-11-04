import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "MangaAI — manga for kids",
    short_name: "MangaAI",
    description: "Safe, ad-free manga for kids, with new chapters every week.",
    start_url: "/profiles",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#eef2fb",
    theme_color: "#1c1f4a",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
