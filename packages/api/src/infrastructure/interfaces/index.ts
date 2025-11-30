// Infrastructure service interfaces
// These abstractions allow for different implementations (S3/local, real/mock)

export type { CacheService } from "./cache.interface";
export type { GenerateContractParams, PdfService } from "./pdf.interface";
export type {
  FileMetadata,
  StorageService,
  UploadOptions,
} from "./storage.interface";
