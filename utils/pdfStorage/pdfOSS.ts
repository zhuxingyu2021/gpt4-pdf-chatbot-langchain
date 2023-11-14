import OSS from 'ali-oss';
import { pdfStorageService } from './pdfStorage';  // Import the abstract base class

export class pdfOSSService extends pdfStorageService {
  private ossClient: OSS;

  constructor(bucketname: string) {
    super(); // Call the constructor of the base class
    const OSS_ACCESS_KEY_ID = process.env.OSS_ACCESS_KEY_ID ?? '';
    const OSS_ACCESS_KEY_SECRET = process.env.OSS_ACCESS_KEY_SECRET ?? '';
    const OSS_REGION = process.env.OSS_REGION ?? '';

    this.ossClient = new OSS({
      region: OSS_REGION,
      accessKeyId: OSS_ACCESS_KEY_ID,
      accessKeySecret: OSS_ACCESS_KEY_SECRET,
      bucket: bucketname
    });
  }

  // Implement the listPdfFiles method from the base class
  public async listPdfFiles(): Promise<string[]> {
    let result : OSS.ListObjectResult = {
        objects: [], 
        prefixes: [],
        isTruncated: true,
        nextMarker: "",
        res:{
            status: 200,
            headers: {},
            size: 0,
            rt: 0
        }
    };
    let pdfFiles: string[] = [];

    while (result.isTruncated) {
      result = await this.ossClient.list({
        prefix: '',
        marker: result.nextMarker,
        'max-keys': 1000
      }, {});

      // Filter and collect the PDF files
      const pdfKeys = result.objects
        ?.filter((item) => item.name.endsWith('.pdf'))
        .map((item) => item.name) || [];
      pdfFiles = pdfFiles.concat(pdfKeys);

      result.isTruncated = result.isTruncated;
      result.nextMarker = result.nextMarker;
    }

    return pdfFiles;
  }

  // Implement the downloadPdfFile method from the base class
  public async downloadPdfFile( key: string): Promise<Blob> {
    const result = await this.ossClient.get(key);
    const resultRaw = new Uint8Array(result.content);

    return new Blob([resultRaw], { type: 'application/pdf' });;
  }
}