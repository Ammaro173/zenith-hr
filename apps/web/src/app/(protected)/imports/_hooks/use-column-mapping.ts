import { useCallback, useEffect, useMemo, useState } from "react";
import type { ColumnMapping } from "@/types/imports";
import {
  detectDepartmentColumns,
  detectUserColumns,
  getUnmappedDepartmentRequiredFields,
  getUnmappedUserRequiredFields,
} from "../_utils/column-detector";

/**
 * LocalStorage keys for persisting column mappings
 */
const STORAGE_KEYS = {
  users: "zenith-hr-import-mapping-users",
  departments: "zenith-hr-import-mapping-departments",
} as const;

/**
 * Return type for the useColumnMapping hook
 */
export interface UseColumnMappingReturn {
  mapping: ColumnMapping;
  setMapping: (mapping: ColumnMapping) => void;
  updateMapping: (csvColumn: string, field: string | null) => void;
  autoDetect: (headers: string[], type: "users" | "departments") => void;
  unmappedRequiredFields: string[];
  isValid: boolean;
  reset: () => void;
}

/**
 * Safely retrieves a column mapping from localStorage.
 * Returns null if the stored value is invalid or doesn't exist.
 */
function getStoredMapping(key: string): ColumnMapping | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const stored = localStorage.getItem(key);
    if (!stored) {
      return null;
    }

    const parsed: unknown = JSON.parse(stored);

    // Validate that parsed value is a valid ColumnMapping object
    if (
      typeof parsed !== "object" ||
      parsed === null ||
      Array.isArray(parsed)
    ) {
      return null;
    }

    // Ensure all values are strings
    for (const value of Object.values(parsed)) {
      if (typeof value !== "string") {
        return null;
      }
    }

    return parsed as ColumnMapping;
  } catch {
    return null;
  }
}

/**
 * Safely stores a column mapping to localStorage.
 */
function setStoredMapping(key: string, mapping: ColumnMapping): void {
  if (typeof window === "undefined") {
    return;
  }

  try {
    localStorage.setItem(key, JSON.stringify(mapping));
  } catch {
    // Silently fail if localStorage is unavailable
  }
}

/**
 * Clears a column mapping from localStorage.
 */
function clearStoredMapping(key: string): void {
  if (typeof window === "undefined") {
    return;
  }

  try {
    localStorage.removeItem(key);
  } catch {
    // Silently fail if localStorage is unavailable
  }
}

/**
 * Hook for managing column mappings between CSV columns and expected fields.
 *
 * Features:
 * - Auto-detect columns on data load
 * - Persist mappings to localStorage
 * - Validate required fields are mapped
 *
 * Requirements: 4.1, 4.4, 4.5
 *
 * @param type - The type of import ('users' or 'departments')
 * @returns Column mapping state and functions
 */
export function useColumnMapping(
  type: "users" | "departments",
): UseColumnMappingReturn {
  const [mapping, setMappingState] = useState<ColumnMapping>({});

  const storageKey = STORAGE_KEYS[type];

  // Load mapping from localStorage on mount
  useEffect(() => {
    const storedMapping = getStoredMapping(storageKey);
    if (storedMapping) {
      setMappingState(storedMapping);
    }
  }, [storageKey]);

  /**
   * Sets the entire mapping and persists to localStorage.
   */
  const setMapping = useCallback(
    (newMapping: ColumnMapping): void => {
      setMappingState(newMapping);
      setStoredMapping(storageKey, newMapping);
    },
    [storageKey],
  );

  /**
   * Updates a single column mapping.
   * If field is null, removes the mapping for that CSV column.
   */
  const updateMapping = useCallback(
    (csvColumn: string, field: string | null): void => {
      setMappingState((prev) => {
        const newMapping = { ...prev };

        if (field === null) {
          // Remove the mapping for this CSV column
          delete newMapping[csvColumn];
        } else {
          // Remove any existing mapping to this field (prevent duplicates)
          for (const [key, value] of Object.entries(newMapping)) {
            if (value === field && key !== csvColumn) {
              delete newMapping[key];
            }
          }
          // Set the new mapping
          newMapping[csvColumn] = field;
        }

        // Persist to localStorage
        setStoredMapping(storageKey, newMapping);

        return newMapping;
      });
    },
    [storageKey],
  );

  /**
   * Auto-detects column mappings from CSV headers.
   * Merges with any stored mappings, preferring auto-detected values.
   */
  const autoDetect = useCallback(
    (headers: string[], importType: "users" | "departments"): void => {
      const detectedMapping =
        importType === "users"
          ? detectUserColumns(headers)
          : detectDepartmentColumns(headers);

      // Merge with stored mapping, preferring detected values for matching headers
      const storedMapping = getStoredMapping(storageKey);
      const mergedMapping: ColumnMapping = {};

      // First, add detected mappings
      for (const [csvColumn, field] of Object.entries(detectedMapping)) {
        mergedMapping[csvColumn] = field;
      }

      // Then, add stored mappings for headers that weren't auto-detected
      // but only if the header exists in the current CSV
      if (storedMapping) {
        for (const [csvColumn, field] of Object.entries(storedMapping)) {
          if (headers.includes(csvColumn) && !(csvColumn in mergedMapping)) {
            // Check if this field is already mapped by auto-detection
            const fieldAlreadyMapped =
              Object.values(mergedMapping).includes(field);
            if (!fieldAlreadyMapped) {
              mergedMapping[csvColumn] = field;
            }
          }
        }
      }

      setMappingState(mergedMapping);
      setStoredMapping(storageKey, mergedMapping);
    },
    [storageKey],
  );

  /**
   * Computes the list of required fields that are not yet mapped.
   */
  const unmappedRequiredFields = useMemo((): string[] => {
    return type === "users"
      ? getUnmappedUserRequiredFields(mapping)
      : getUnmappedDepartmentRequiredFields(mapping);
  }, [mapping, type]);

  /**
   * Indicates whether all required fields are mapped.
   */
  const isValid = useMemo((): boolean => {
    return unmappedRequiredFields.length === 0;
  }, [unmappedRequiredFields]);

  /**
   * Resets the mapping state and clears localStorage.
   */
  const reset = useCallback((): void => {
    setMappingState({});
    clearStoredMapping(storageKey);
  }, [storageKey]);

  return {
    mapping,
    setMapping,
    updateMapping,
    autoDetect,
    unmappedRequiredFields,
    isValid,
    reset,
  };
}
