import type { MetadataRoute } from "next";
import { SITE_URL } from "../lib/site";

const LAST_CONTENT_UPDATE = new Date("2026-07-31T00:00:00Z");

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: SITE_URL, lastModified: LAST_CONTENT_UPDATE },
    { url: `${SITE_URL}/sample`, lastModified: LAST_CONTENT_UPDATE },
  ];
}
