"use client";

import { useMemo } from "react";
import { cn } from "@/lib/utils";

interface HighlightPart {
  highlight: boolean;
  id: string;
  text: string;
}

interface HighlightProps {
  className?: string;
  exactMatch?: boolean;
  ignoreCase?: boolean;
  markClassName?: string;
  matchAll?: boolean;
  query: string | string[];
  text: string;
}

function buildPattern(queries: string[], exactMatch: boolean): string {
  const safeQueries = queries
    .filter((q) => q.trim())
    .map((q) => {
      const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      return exactMatch ? `\\b${escaped}\\b` : escaped;
    });

  return safeQueries.join("|");
}

function highlightFirstMatch(
  text: string,
  regex: RegExp,
): HighlightPart[] | string {
  const match = regex.exec(text);
  if (!match) {
    return text;
  }

  const matchText = match[0];
  const matchIndex = match.index ?? 0;
  const parts: HighlightPart[] = [];

  if (matchIndex > 0) {
    parts.push({
      text: text.slice(0, matchIndex),
      highlight: false,
      id: `before-${matchIndex}`,
    });
  }

  parts.push({
    text: matchText,
    highlight: true,
    id: `match-${matchIndex}`,
  });

  const afterIndex = matchIndex + matchText.length;
  if (afterIndex < text.length) {
    parts.push({
      text: text.slice(afterIndex),
      highlight: false,
      id: `after-${afterIndex}`,
    });
  }

  return parts;
}

function highlightAllMatches(
  text: string,
  regex: RegExp,
): HighlightPart[] | string {
  const matches = Array.from(text.matchAll(regex));
  if (matches.length === 0) {
    return text;
  }

  const parts: HighlightPart[] = [];
  let lastIndex = 0;

  for (let matchIndex = 0; matchIndex < matches.length; matchIndex += 1) {
    const match = matches[matchIndex];
    if (!match) {
      continue;
    }

    const currentIndex = match.index ?? 0;
    const matchText = match[0];

    if (currentIndex > lastIndex) {
      parts.push({
        text: text.slice(lastIndex, currentIndex),
        highlight: false,
        id: `text-${matchIndex}-before`,
      });
    }

    parts.push({
      text: matchText,
      highlight: true,
      id: `match-${matchIndex}-${currentIndex}`,
    });

    lastIndex = currentIndex + matchText.length;
  }

  if (lastIndex < text.length) {
    parts.push({
      text: text.slice(lastIndex),
      highlight: false,
      id: `text-${matches.length}-after`,
    });
  }

  return parts.length > 0
    ? parts
    : [{ text, highlight: false, id: "no-match" }];
}

export function Highlight({
  text,
  query,
  exactMatch = false,
  ignoreCase = false,
  matchAll = true,
  className,
  markClassName,
}: HighlightProps) {
  const highlightedText = useMemo(() => {
    const queries = Array.isArray(query) ? query : [query];
    if (queries.length === 0 || queries.every((q) => !q.trim())) {
      return text;
    }

    const pattern = buildPattern(queries, exactMatch);
    if (!pattern) {
      return text;
    }

    const flags = ignoreCase ? "gi" : "g";
    const regex = new RegExp(`(${pattern})`, flags);

    return matchAll
      ? highlightAllMatches(text, regex)
      : highlightFirstMatch(text, regex);
  }, [text, query, exactMatch, ignoreCase, matchAll]);

  if (typeof highlightedText === "string") {
    return <span className={className}>{highlightedText}</span>;
  }

  return (
    <span className={className}>
      {highlightedText.map((part) => {
        if (part.highlight) {
          return (
            <mark
              className={cn(
                "bg-yellow-200 text-yellow-900 dark:bg-yellow-900/30 dark:text-yellow-200",
                markClassName,
              )}
              key={part.id}
            >
              {part.text}
            </mark>
          );
        }
        return <span key={part.id}>{part.text}</span>;
      })}
    </span>
  );
}
