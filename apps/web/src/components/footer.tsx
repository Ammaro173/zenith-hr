import { Facebook, Instagram, Twitter } from "lucide-react";
import type { Route } from "next";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export function Footer({ id }: { id?: string }) {
  return (
    <footer
      className="border-zinc-800 border-t bg-zinc-950 px-6 py-16 lg:px-12"
      id={id}
    >
      <div className="mx-auto max-w-7xl">
        <div className="grid gap-12 md:grid-cols-2 lg:grid-cols-4">
          {/* Brand */}
          <div className="lg:col-span-2">
            <div className="mb-4 flex items-center gap-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-background">
                <span className="font-bold text-xl text-zinc-950">A</span>
              </div>
              <span className="font-semibold text-lg text-primary tracking-tight">
                Audi Club Qatar
              </span>
            </div>
            <p className="mb-6 max-w-md text-zinc-400 leading-relaxed">
              An exclusive community for Audi owners and enthusiasts. Join us to
              experience the best of the Audi lifestyle.
            </p>
            <div className="flex gap-4">
              <Button
                className="border-zinc-800 bg-zinc-900 text-primary hover:bg-zinc-800"
                size="icon"
                variant="outline"
              >
                <Instagram className="h-5 w-5" />
              </Button>
              <Button
                className="border-zinc-800 bg-zinc-900 text-primary hover:bg-zinc-800"
                size="icon"
                variant="outline"
              >
                <Facebook className="h-5 w-5" />
              </Button>
              <Button
                className="border-zinc-800 bg-zinc-900 text-primary hover:bg-zinc-800"
                size="icon"
                variant="outline"
              >
                <Twitter className="h-5 w-5" />
              </Button>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="mb-4 font-semibold text-primary text-sm uppercase tracking-wider">
              Quick Links
            </h3>
            <ul className="space-y-3">
              <li>
                <a
                  className="text-zinc-400 transition-colors hover:text-primary"
                  href="/about"
                >
                  About Us
                </a>
              </li>
              <li>
                <a
                  className="text-zinc-400 transition-colors hover:text-primary"
                  href="/membership"
                >
                  Membership
                </a>
              </li>
              <li>
                <a
                  className="text-zinc-400 transition-colors hover:text-primary"
                  href="/events"
                >
                  Events
                </a>
              </li>
              <li>
                <a
                  className="text-zinc-400 transition-colors hover:text-primary"
                  href="/partners"
                >
                  Partners
                </a>
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 className="mb-4 font-semibold text-primary text-sm uppercase tracking-wider">
              Contact
            </h3>
            <ul className="mb-6 space-y-3">
              <li className="text-zinc-400">Doha, Qatar</li>
              <li>
                <a
                  className="text-zinc-400 transition-colors hover:text-primary"
                  href="mailto:info@audiclubqatar.com"
                >
                  info@audiclubqatar.com
                </a>
              </li>
              <li>
                <a
                  className="text-zinc-400 transition-colors hover:text-primary"
                  href="tel:+97444455555"
                >
                  +974 4445 5555
                </a>
              </li>
            </ul>
            <div className="flex flex-col gap-2">
              <p className="text-xs text-zinc-500 uppercase tracking-wider">
                Scan to Join
              </p>
              <Link href={"/join" as Route}>
                <Image
                  alt="Scan QR code to join Audi Club Qatar"
                  className="transition-opacity hover:opacity-80"
                  height={120}
                  src="/images/qr-code.png"
                  width={120}
                />
              </Link>
            </div>
          </div>
        </div>

        <div className="mt-12 border-zinc-800 border-t pt-8 text-center text-sm text-zinc-500">
          <p>
            © {new Date().getFullYear()} Audi Club Qatar. All rights reserved.
            In partnership with Q-Auto.
          </p>
        </div>
      </div>
    </footer>
  );
}
