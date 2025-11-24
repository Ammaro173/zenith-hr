import type { Metadata, Viewport } from "next";
import "../index.css";
import { BreakpointIndicator } from "@/components/breakpoint-indicator";
import Providers from "@/components/providers";
import { siteConfig } from "@/config/site";
import { fontMono, fontSans } from "@/lib/fonts";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url || ""),
  title: {
    default: siteConfig.name,
    template: `%s - ${siteConfig.name}`,
  },
  description: siteConfig.description,
  keywords: siteConfig.keywords,
  openGraph: {
    type: "website",
    locale: "en_US",
    url: siteConfig.url,
    title: siteConfig.name,
    description: siteConfig.description,
    siteName: siteConfig.name,
  },
  icons: {
    icon: "/favicon/favicon.svg",
  },
};

export const viewport: Viewport = {
  colorScheme: "light dark",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "white" },
    { media: "(prefers-color-scheme: dark)", color: "black" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head />
      <body
        className={cn(
          "min-h-screen font-sans antialiased",
          fontSans.variable,
          fontMono.variable
        )}
      >
        <Providers>
          <div className="grid h-svh grid-rows-[auto_1fr]">{children}</div>
          <BreakpointIndicator />
        </Providers>
      </body>
    </html>
  );
}
