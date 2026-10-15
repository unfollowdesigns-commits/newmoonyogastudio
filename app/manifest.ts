import type { MetadataRoute } from "next";
import { studio } from "@/clients";

export default function manifest(): MetadataRoute.Manifest {
  const bg = studio.colors?.sand ?? "#f5f0ec";
  return {
    name: studio.name,
    short_name: studio.shortName,
    start_url: "/",
    display: "standalone",
    background_color: bg,
    theme_color: bg,
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  };
}
