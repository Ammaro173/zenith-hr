/**
 * Storage Service Type
 * Abstraction for file storage operations (S3, local filesystem, etc.)
 */
export type StorageService = {
  /**
   * Upload a file to storage
   * @param key - The storage key/path for the file
   * @param data - The file data as a Buffer
   * @param options - Optional upload configuration
   * @returns The storage URL or key of the uploaded file
   */
  upload: (
    key: string,
    data: Buffer,
    options?: UploadOptions,
  ) => Promise<string>;

  /**
   * Generate a presigned URL for temporary file access
   * @param key - The storage key/path of the file
   * @param expiresIn - URL expiration time in seconds (default: 3600)
   * @returns A presigned URL for accessing the file
   */
  getPresignedUrl: (key: string, expiresIn?: number) => Promise<string>;

  /**
   * Delete a file from storage
   * @param key - The storage key/path of the file to delete
   */
  delete?: (key: string) => Promise<void>;

  /**
   * Check if a file exists in storage
   * @param key - The storage key/path to check
   * @returns True if the file exists
   */
  exists?: (key: string) => Promise<boolean>;

  /**
   * Get file metadata without downloading the file
   * @param key - The storage key/path of the file
   */
  getMetadata?: (key: string) => Promise<FileMetadata>;
};

export type UploadOptions = {
  contentType?: string;
  metadata?: Record<string, string>;
  acl?: "private" | "public-read";
};

export type FileMetadata = {
  size: number;
  contentType: string;
  lastModified: Date;
  metadata?: Record<string, string>;
};
