/**
 * Password Generator Utility
 *
 * Generates secure temporary passwords for imported users.
 * This is a client-side utility for preview purposes.
 * The actual password generation for imports happens on the backend.
 *
 * Requirements: 10.1
 */

/**
 * Character sets for password generation
 */
const UPPERCASE_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const LOWERCASE_CHARS = "abcdefghijklmnopqrstuvwxyz";
const NUMBER_CHARS = "0123456789";
const SYMBOL_CHARS = "!@#$%^&*()_+-=[]{}|;:,.<>?";

/**
 * All characters combined for random selection
 */
const ALL_CHARS =
  UPPERCASE_CHARS + LOWERCASE_CHARS + NUMBER_CHARS + SYMBOL_CHARS;

/**
 * Default password length (minimum 12 characters as per requirements)
 */
const DEFAULT_PASSWORD_LENGTH = 16;

/**
 * Regex patterns for password validation (top-level for performance)
 */
const UPPERCASE_REGEX = /[A-Z]/;
const LOWERCASE_REGEX = /[a-z]/;
const NUMBER_REGEX = /[0-9]/;
const SYMBOL_REGEX = /[!@#$%^&*()_+\-=[\]{}|;:,.<>?]/;

/**
 * Generates a cryptographically secure random index within a range.
 * Uses Web Crypto API for secure randomness.
 *
 * @param max - Maximum value (exclusive)
 * @returns Random integer from 0 to max-1
 */
function getSecureRandomIndex(max: number): number {
  const randomArray = new Uint32Array(1);
  crypto.getRandomValues(randomArray);
  return randomArray[0] % max;
}

/**
 * Shuffles an array in place using Fisher-Yates algorithm with secure randomness.
 *
 * @param array - Array to shuffle
 * @returns The shuffled array (same reference)
 */
function secureShuffleArray<T>(array: T[]): T[] {
  for (let i = array.length - 1; i > 0; i--) {
    const j = getSecureRandomIndex(i + 1);
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

/**
 * Generates a secure password with guaranteed character diversity.
 *
 * The generated password will contain:
 * - At least one uppercase letter
 * - At least one lowercase letter
 * - At least one number
 * - At least one symbol
 * - Minimum 12 characters (default 16)
 *
 * @param length - Password length (minimum 12, default 16)
 * @returns A secure random password string
 *
 * @example
 * generateSecurePassword()
 * // Returns something like: "Kx9#mP2$nL5@qR8!"
 *
 * generateSecurePassword(20)
 * // Returns a 20-character password
 */
export function generateSecurePassword(
  length: number = DEFAULT_PASSWORD_LENGTH,
): string {
  // Ensure minimum length of 12 characters
  const passwordLength = Math.max(length, 12);

  // Start with one character from each required set to guarantee diversity
  const requiredChars: string[] = [
    UPPERCASE_CHARS[getSecureRandomIndex(UPPERCASE_CHARS.length)],
    LOWERCASE_CHARS[getSecureRandomIndex(LOWERCASE_CHARS.length)],
    NUMBER_CHARS[getSecureRandomIndex(NUMBER_CHARS.length)],
    SYMBOL_CHARS[getSecureRandomIndex(SYMBOL_CHARS.length)],
  ];

  // Fill remaining length with random characters from all sets
  const remainingLength = passwordLength - requiredChars.length;
  const additionalChars: string[] = [];

  for (let i = 0; i < remainingLength; i++) {
    additionalChars.push(ALL_CHARS[getSecureRandomIndex(ALL_CHARS.length)]);
  }

  // Combine and shuffle to randomize positions
  const allChars = [...requiredChars, ...additionalChars];
  secureShuffleArray(allChars);

  return allChars.join("");
}

/**
 * Validates that a password meets the security requirements.
 *
 * @param password - Password to validate
 * @returns True if password meets all requirements
 */
export function isValidPassword(password: string): boolean {
  if (password.length < 12) {
    return false;
  }

  const hasUppercase = UPPERCASE_REGEX.test(password);
  const hasLowercase = LOWERCASE_REGEX.test(password);
  const hasNumber = NUMBER_REGEX.test(password);
  const hasSymbol = SYMBOL_REGEX.test(password);

  return hasUppercase && hasLowercase && hasNumber && hasSymbol;
}

/**
 * Generates multiple secure passwords at once.
 * Useful for batch user imports.
 *
 * @param count - Number of passwords to generate
 * @param length - Password length (minimum 12, default 16)
 * @returns Array of secure random passwords
 *
 * @example
 * generateBatchPasswords(5)
 * // Returns array of 5 unique passwords
 */
export function generateBatchPasswords(
  count: number,
  length: number = DEFAULT_PASSWORD_LENGTH,
): string[] {
  const passwords: string[] = [];

  for (let i = 0; i < count; i++) {
    passwords.push(generateSecurePassword(length));
  }

  return passwords;
}
