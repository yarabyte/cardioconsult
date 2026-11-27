import {
  GetObjectCommand,
  HeadBucketCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { env } from "@/env";

export type ObjectStorage = {
  isAvailable(): Promise<boolean>;
  putObject(key: string, body: Uint8Array, contentType: string): Promise<void>;
  getObject(key: string): Promise<Uint8Array | null>;
};

let override: ObjectStorage | null = null;

export function setObjectStorage(storage: ObjectStorage | null): void {
  override = storage;
}

function createS3Storage(): ObjectStorage {
  const client = new S3Client({
    endpoint: env.S3_ENDPOINT,
    region: env.S3_REGION,
    credentials: {
      accessKeyId: env.S3_ACCESS_KEY,
      secretAccessKey: env.S3_SECRET_KEY,
    },
    forcePathStyle: env.S3_FORCE_PATH_STYLE,
  });

  return {
    async isAvailable() {
      try {
        await client.send(new HeadBucketCommand({ Bucket: env.S3_BUCKET }));
        return true;
      } catch {
        return false;
      }
    },
    async putObject(key, body, contentType) {
      await client.send(
        new PutObjectCommand({
          Bucket: env.S3_BUCKET,
          Key: key,
          Body: body,
          ContentType: contentType,
        }),
      );
    },
    async getObject(key) {
      try {
        const res = await client.send(new GetObjectCommand({ Bucket: env.S3_BUCKET, Key: key }));
        if (!res.Body) return null;
        const bytes = await res.Body.transformToByteArray();
        return new Uint8Array(bytes);
      } catch {
        return null;
      }
    },
  };
}

export function getObjectStorage(): ObjectStorage {
  return override ?? createS3Storage();
}
