import type { Metadata } from "next";
import "./landing.css";
import {
  Geist,
  Geist_Mono,
  Playfair_Display,
  Source_Serif_4,
} from "next/font/google";
import type React from "react";
import { SmoothScrollProvider } from "@/components/smooth-scroll-provider";

//! Initialize fonts
const _geist = Geist({
  subsets: ["latin"],
  weight: ["100", "200", "300", "400", "500", "600", "700", "800", "900"],
});
const _geistMono = Geist_Mono({
  subsets: ["latin"],
  weight: ["100", "200", "300", "400", "500", "600", "700", "800", "900"],
});
const _sourceSerif_4 = Source_Serif_4({
  subsets: ["latin"],
  weight: ["200", "300", "400", "500", "600", "700", "800", "900"],
});

const _playfair = Playfair_Display({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Audi Club Qatar - Where Passion Meets Performance",
  description:
    "An exclusive community for Audi owners and enthusiasts. Experience luxury, innovation, and driving excellence.",
};

export default function LandingLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <SmoothScrollProvider>
      <main className={"font-sans antialiased"}>{children}</main>
    </SmoothScrollProvider>
  );
}
