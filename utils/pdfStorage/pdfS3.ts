import { S3Client, ListObjectsV2Command, GetObjectCommand } from "@aws-sdk/client-s3";
import { Readable } from 'stream';
import { pdfStorageService } from './pdfStorage'; // Import the abstract base class

export class pdfS3Service extends pdfStorageService {
  private s3Client: S3Client;
  private bucketName: string;

  constructor(bucketname: string) {
    super(); // Call the constructor of the base class
    const AWS_ACCESS_KEY_ID = process.env.AWS_ACCESS_KEY_ID ?? '';
    const AWS_SECRET_ACCESS_KEY = process.env.AWS_SECRET_ACCESS_KEY ?? '';
    const AWS_REGION = process.env.AWS_REGION ?? '';

    this.s3Client = new S3Client({
      region: AWS_REGION,
      credentials: {
        accessKeyId: AWS_ACCESS_KEY_ID,
        secretAccessKey: AWS_SECRET_ACCESS_KEY
      }
    });

    this.bucketName = bucketname;
  }

  // Implement the listPdfFiles method from the base class
  public async listPdfFiles(): Promise<string[]> {
    const params = {
      Bucket: this.bucketName,
    };

    let isTruncated = true;
    let continuationToken: string | undefined;
    let pdfFiles: string[] = [];

    while (isTruncated) {
      const { Contents, IsTruncated, NextContinuationToken } = await this.s3Client.send(
        new ListObjectsV2Command({ ...params, ContinuationToken: continuationToken })
      );

      // Filter and collect the PDF files
      const pdfKeys = Contents?.filter((item) => item.Key?.endsWith('.pdf')).map((item) => item.Key!) || [];
      pdfFiles = pdfFiles.concat(pdfKeys);

      isTruncated = IsTruncated || false;
      continuationToken = NextContinuationToken;
    }

    return pdfFiles;
  }

  // Implement the downloadPdfFile method from the base class
  public async downloadPdfFile(key: string): Promise<Blob> {
    const command = new GetObjectCommand({
      Bucket: this.bucketName,
      Key: key,
    });

    const { Body } = await this.s3Client.send(command);

    if (Body instanceof Readable) {
      // Convert the Node stream to a Blob
      return new Promise((resolve, reject) => {
        const chunks: Uint8Array[] = [];
        Body.on("data", (chunk) => chunks.push(chunk));
        Body.on("end", () => {
          const blob = new Blob(chunks, { type: 'application/pdf' });
          resolve(blob);
        });
        Body.on("error", reject);
      });
    } else {
      // Handle non-stream body types here, if necessary
      throw new Error("Expected a stream for the S3 object body.");
    }
  }
}