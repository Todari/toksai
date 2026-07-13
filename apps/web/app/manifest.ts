import type { MetadataRoute } from "next";
import { SITE_NAME, SITE_DESC } from "../lib/site";
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: `${SITE_NAME} — 카톡 대화로 보는 우리 사이`,
    short_name: SITE_NAME,
    description: SITE_DESC,
    start_url: "/",
    display: "standalone",
    background_color: "#FFFBF3",
    theme_color: "#F5B301",
    icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml" }],
  };
}
