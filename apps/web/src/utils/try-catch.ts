// Types for the result object with discriminated union
type Success<T> = {
  data: T;
  error: null;
  isSuccess: true;
};

type Failure<E> = {
  data: null;
  error: E;
  isSuccess: false;
};

export type Result<T, E = Error> = Success<T> | Failure<E>;

// Main wrapper function
export async function tryCatch<T, E = Error>(
  promise: Promise<T>
): Promise<Result<T, E>> {
  try {
    const data = await promise;
    return { data, error: null, isSuccess: true };
  } catch (error) {
    return { data: null, error: error as E, isSuccess: false };
  }
}

// Synchronous version
export function tryCatchSync<T, E = Error>(fn: () => T): Result<T, E> {
  try {
    const data = fn();
    return { data, error: null, isSuccess: true };
  } catch (error) {
    return { data: null, error: error as E, isSuccess: false };
  }
}
