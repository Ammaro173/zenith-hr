import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { env } from "../../env";
import { AppError } from "../../shared/errors";
import type {
  FileMetadata,
  StorageService,
  UploadOptions,
} from "../interfaces/storage.interface";

export interface S3StorageConfig {
  accessKeyId?: string;
  bucketName?: string;
  region?: string;
  secretAccessKey?: string;
}

/**
 * S3-based implementation of the StorageService interface
 * Uses validated environment variables from the API package's env.ts
 */
export class S3StorageService implements StorageService {
  private readonly s3Client: S3Client;
  private readonly bucketName: string;

  constructor(config?: S3StorageConfig) {
    const region = config?.region ?? env.AWS_REGION;
    const accessKeyId = config?.accessKeyId ?? env.AWS_ACCESS_KEY_ID;
    const secretAccessKey =
      config?.secretAccessKey ?? env.AWS_SECRET_ACCESS_KEY;
    const bucketName = config?.bucketName ?? env.S3_BUCKET_NAME;

    if (!(region && accessKeyId && secretAccessKey && bucketName)) {
      throw AppError.badRequest("Missing AWS S3 configuration");
    }

    this.s3Client = new S3Client({
      region,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
    });
    this.bucketName = bucketName;
  }

  async upload(
    key: string,
    data: Buffer,
    options?: UploadOptions,
  ): Promise<string> {
    const command = new PutObjectCommand({
      Bucket: this.bucketName,
      Key: key,
      Body: data,
      ContentType: options?.contentType || "application/pdf",
      Metadata: options?.metadata,
      ACL: options?.acl,
    });

    await this.s3Client.send(command);

    return `s3://${this.bucketName}/${key}`;
  }

  async getPresignedUrl(key: string, expiresIn = 3600): Promise<string> {
    const command = new GetObjectCommand({
      Bucket: this.bucketName,
      Key: key,
    });

    return await getSignedUrl(this.s3Client, command, { expiresIn });
  }

  async delete(key: string): Promise<void> {
    const command = new DeleteObjectCommand({
      Bucket: this.bucketName,
      Key: key,
    });

    await this.s3Client.send(command);
  }

  async exists(key: string): Promise<boolean> {
    try {
      const command = new HeadObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      });
      await this.s3Client.send(command);
      return true;
    } catch {
      return false;
    }
  }

  async getMetadata(key: string): Promise<FileMetadata> {
    const command = new HeadObjectCommand({
      Bucket: this.bucketName,
      Key: key,
    });

    const response = await this.s3Client.send(command);

    return {
      size: response.ContentLength || 0,
      contentType: response.ContentType || "application/octet-stream",
      lastModified: response.LastModified || new Date(),
      metadata: response.Metadata,
    };
  }
}
