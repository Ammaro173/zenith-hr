import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { QAT_PHONE_LOCAL_LENGTH, QAT_PHONE_PREFIX } from "./constants";

/**
 * Merges Tailwind class names, resolving any conflicts.
 *
 * @param inputs - An array of class names to merge.
 * @returns A string of merged and optimized class names.
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

//TODO reloacte this
const STRIP_PREFIX_REGEX = /^\+?974/;
const NON_DIGIT_REGEX = /\D/g;

export const normalizePhoneInput = (value: string): string => {
  const trimmed = value.replace(/\s+/g, "");
  if (trimmed.length === 0) {
    return QAT_PHONE_PREFIX;
  }

  //! Strip any +974 or 974 prefix if present
  const cleaned = trimmed.replace(STRIP_PREFIX_REGEX, "");

  //! Remove all non-digits
  const localDigits = cleaned
    .replace(NON_DIGIT_REGEX, "")
    .slice(0, QAT_PHONE_LOCAL_LENGTH);

  return `${QAT_PHONE_PREFIX}${localDigits}`;
};
