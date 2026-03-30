"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

/**
 * A container whose horizontal scrollbar "sticks" to the bottom of the
 * viewport so it's always reachable even when the content is tall.
 *
 * When the user scrolls down far enough to see the real scrollbar, the
 * sticky fake bar auto-hides to avoid showing two scrollbars at once.
 */
export function StickyHorizontalScroll({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const contentRef = useRef<HTMLDivElement>(null);
  const fakeBarRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const [contentWidth, setContentWidth] = useState(0);
  const [realBarVisible, setRealBarVisible] = useState(false);
  const syncing = useRef(false);

  // Track actual content width so the fake bar matches
  useEffect(() => {
    const el = contentRef.current;
    if (!el) {
      return;
    }

    const ro = new ResizeObserver(() => {
      setContentWidth(el.scrollWidth);
    });
    ro.observe(el);
    const child = el.firstElementChild;
    if (child) {
      ro.observe(child);
    }

    return () => ro.disconnect();
  }, []);

  // Hide the fake bar when the real scrollbar (at the bottom of content) is visible
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) {
      return;
    }

    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry) {
          setRealBarVisible(entry.isIntersecting);
        }
      },
      { threshold: 0 },
    );
    io.observe(sentinel);

    return () => io.disconnect();
  }, []);

  const syncScroll = useCallback((source: "content" | "bar") => {
    if (syncing.current) {
      return;
    }
    syncing.current = true;

    const content = contentRef.current;
    const bar = fakeBarRef.current;
    if (content && bar) {
      if (source === "content") {
        bar.scrollLeft = content.scrollLeft;
      } else {
        content.scrollLeft = bar.scrollLeft;
      }
    }

    requestAnimationFrame(() => {
      syncing.current = false;
    });
  }, []);

  return (
    <div className={cn("relative w-full", className)}>
      {/* Real scrollable content */}
      <div
        className="w-full overflow-x-auto"
        onScroll={() => syncScroll("content")}
        ref={contentRef}
      >
        {children}
        {/* Sentinel — sits right at the bottom of the scrollable content */}
        <div aria-hidden className="h-px w-full" ref={sentinelRef} />
      </div>

      {/* Sticky fake scrollbar — hidden when real scrollbar is in viewport */}
      <div
        className={cn(
          "sticky bottom-0 w-full overflow-x-auto transition-opacity",
          realBarVisible ? "pointer-events-none opacity-0" : "opacity-100",
        )}
        onScroll={() => syncScroll("bar")}
        ref={fakeBarRef}
        style={{ height: 12 }}
      >
        <div style={{ width: contentWidth, height: 1 }} />
      </div>
    </div>
  );
}
