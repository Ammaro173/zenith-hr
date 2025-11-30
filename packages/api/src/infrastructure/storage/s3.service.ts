import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import type {
  FileMetadata,
  StorageService,
  UploadOptions,
} from "../interfaces/storage.interface";

export type S3StorageConfig = {
  region?: string;
  accessKeyId?: string;
  secretAccessKey?: string;
  bucketName?: string;
};

/**
 * S3-based implementation of the StorageService interface
 */
export class S3StorageService implements StorageService {
  private readonly s3Client: S3Client;
  private readonly bucketName: string;

  constructor(config?: S3StorageConfig) {
    this.s3Client = new S3Client({
      region: config?.region || process.env.AWS_REGION || "us-east-1",
      credentials: {
        accessKeyId: config?.accessKeyId || process.env.AWS_ACCESS_KEY_ID || "",
        secretAccessKey:
          config?.secretAccessKey || process.env.AWS_SECRET_ACCESS_KEY || "",
      },
    });
    this.bucketName =
      config?.bucketName || process.env.S3_BUCKET_NAME || "zenith-hr-contracts";
  }

  async upload(
    key: string,
    data: Buffer,
    options?: UploadOptions
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
