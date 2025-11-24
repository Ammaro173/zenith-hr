import { env } from "@/lib/env";

export type SiteConfig = typeof siteConfig;

export const siteConfig = {
  name: "Q-Auto",
  description: "Q-Auto",
  url: env.NEXT_PUBLIC_URL,
  links: { any: "" },
  keywords: ["Q-Auto"],
};
