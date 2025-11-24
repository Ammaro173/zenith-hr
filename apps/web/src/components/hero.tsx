"use client";

import { ChevronDown } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useLenis } from "./smooth-scroll-provider";

export function Hero() {
  const lenis = useLenis();

  const scrollTo = (targetId: string) => {
    const element = document.getElementById(targetId);
    if (element && lenis) {
      lenis.scrollTo(element, {
        offset: -50,
        duration: 2,
      });
    } else if (element) {
      //! Fallback to native smooth scroll if Lenis isn't available
      element.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  return (
    <section className="relative h-screen w-full overflow-hidden">
      {/* Background Image */}
      <div className="absolute inset-0">
        <Image
          alt="Audi driving experience"
          className="object-cover"
          fill
          priority
          src="/images/luxury-audi-sports-car-driving-on-scenic-road-at-s.jpg"
        />
        <div className="absolute inset-0 bg-linear-to-b from-black/70 via-black/50 to-zinc-950" />
      </div>

      {/* Navigation */}
      <nav className="relative z-10 flex items-center justify-between px-6 py-6 lg:px-12">
        <div className="flex items-center gap-2">
          <Image
            alt="Audi Club Qatar"
            height={88}
            priority
            src="/images/audi-club.svg"
            width={88}
          />
        </div>
        <Link href="/join">
          <Button
            className="border-white/20 bg-white/10 text-white backdrop-blur-sm hover:bg-white/20"
            type="button"
            variant="outline"
          >
            Join Now
          </Button>
        </Link>
      </nav>

      {/* Hero Content */}
      <div className="relative z-10 flex h-[calc(100vh-88px)] flex-col items-center justify-center px-6 text-center">
        <h1 className="mb-6 max-w-5xl text-balance font-light font-serif text-5xl text-white leading-tight tracking-tight md:text-7xl lg:text-8xl">
          Where Passion Meets Performance
        </h1>
        <p className="mb-8 max-w-2xl text-pretty text-lg text-zinc-200 leading-relaxed md:text-xl">
          Audi Club Qatar is an exclusive community built for Audi owners and
          enthusiasts who share a passion for innovation, luxury, and driving
          excellence.
        </p>
        <div className="flex flex-col gap-4 sm:flex-row">
          <Link href="/join">
            <Button
              className="bg-white text-zinc-950 hover:bg-zinc-100"
              size="lg"
              type="button"
            >
              Become a Member
            </Button>
          </Link>
          <Button
            className="border-white/20 bg-white/10 text-white backdrop-blur-sm hover:bg-white/20"
            onClick={() => scrollTo("benefits")}
            size="lg"
            type="button"
            variant="outline"
          >
            Explore Benefits
          </Button>
        </div>
      </div>

      {/* Bouncing Scroll Indicator */}
      <button
        aria-label="Scroll to next section"
        className="-translate-x-1/2 absolute bottom-8 left-1/2 z-10 animate-bounce"
        onClick={() => scrollTo("about")}
        type="button"
      >
        <ChevronDown className="h-8 w-8 text-white/60" />
      </button>

      {/* QR Code Card */}
      <div className="absolute right-6 bottom-8 z-10 hidden md:block lg:right-12">
        <Link href="/join">
          <div className="rounded-lg border border-white/20 bg-white/10 p-4 backdrop-blur-sm transition-all hover:scale-105 hover:bg-white/20">
            <p className="mb-2 text-center font-medium text-white text-xs uppercase tracking-wider">
              Scan to Join
            </p>
            <Image
              alt="Scan QR code to join Audi Club Qatar"
              className="rounded"
              height={180}
              src="/images/qr-code.png"
              width={180}
            />
          </div>
        </Link>
      </div>
    </section>
  );
}
