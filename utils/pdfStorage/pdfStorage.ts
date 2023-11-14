// Define the abstract base class in StorageService.ts
export abstract class pdfStorageService {
    abstract listPdfFiles(): Promise<string[]>;
    abstract downloadPdfFile(key: string): Promise<Blob>;
  }