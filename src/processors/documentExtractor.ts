import fs from 'fs-extra';
import path from 'path';
import pdfParse from 'pdf-parse';
import mammoth from 'mammoth';
import { FILE_HANDLING } from '../config/constants';
import { processorLogger } from '../utils/logger';

export interface ExtractedDocument {
  filename: string;
  type: 'pdf' | 'doc' | 'docx' | 'txt' | 'unknown';
  text: string;
  metadata?: {
    pages?: number;
    author?: string;
    title?: string;
    subject?: string;
    creator?: string;
    producer?: string;
    creationDate?: Date;
    modificationDate?: Date;
  };
  extractionDate: Date;
  wordCount: number;
  characterCount: number;
}

export interface ExtractionResult {
  documents: ExtractedDocument[];
  errors: string[];
  totalFiles: number;
  successfulExtractions: number;
}

export class DocumentExtractor {
  
  /**
   * Extract text from a single file
   */
  async extractFromFile(filePath: string): Promise<ExtractedDocument> {
    const filename = path.basename(filePath);
    const extension = path.extname(filePath).toLowerCase();
    
    processorLogger.info(`Extracting text from ${filename}`);

    try {
      // Check file size
      const stats = await fs.stat(filePath);
      if (stats.size > FILE_HANDLING.MAX_FILE_SIZE) {
        throw new Error(`File size ${stats.size} exceeds maximum allowed size ${FILE_HANDLING.MAX_FILE_SIZE}`);
      }

      let extractedDoc: ExtractedDocument;

      switch (extension) {
        case '.pdf':
          extractedDoc = await this.extractFromPDF(filePath);
          break;
        case '.doc':
        case '.docx':
          extractedDoc = await this.extractFromWord(filePath);
          break;
        case '.txt':
          extractedDoc = await this.extractFromText(filePath);
          break;
        default:
          throw new Error(`Unsupported file type: ${extension}`);
      }

      processorLogger.info(`Successfully extracted ${extractedDoc.wordCount} words from ${filename}`);
      return extractedDoc;

    } catch (error) {
      processorLogger.error(`Failed to extract text from ${filename}`, { 
        error: error instanceof Error ? error.message : String(error) 
      });
      
      // Return empty document with error info
      return {
        filename,
        type: 'unknown',
        text: '',
        extractionDate: new Date(),
        wordCount: 0,
        characterCount: 0,
      };
    }
  }

  /**
   * Extract text from multiple files in a directory
   */
  async extractFromDirectory(directoryPath: string): Promise<ExtractionResult> {
    const result: ExtractionResult = {
      documents: [],
      errors: [],
      totalFiles: 0,
      successfulExtractions: 0,
    };

    try {
      const files = await this.findDocumentFiles(directoryPath);
      result.totalFiles = files.length;

      processorLogger.info(`Found ${files.length} document files in ${directoryPath}`);

      for (const filePath of files) {
        try {
          const extracted = await this.extractFromFile(filePath);
          
          if (extracted.text.length > 0) {
            result.documents.push(extracted);
            result.successfulExtractions++;
          } else {
            result.errors.push(`No text extracted from ${path.basename(filePath)}`);
          }

        } catch (error) {
          const errorMsg = `Failed to process ${path.basename(filePath)}: ${error instanceof Error ? error.message : String(error)}`;
          result.errors.push(errorMsg);
          processorLogger.error(errorMsg);
        }
      }

      processorLogger.info(`Extraction completed: ${result.successfulExtractions}/${result.totalFiles} files processed successfully`);
      return result;

    } catch (error) {
      const errorMsg = `Failed to process directory ${directoryPath}: ${error instanceof Error ? error.message : String(error)}`;
      result.errors.push(errorMsg);
      processorLogger.error(errorMsg);
      return result;
    }
  }

  /**
   * Extract text from PDF file
   */
  private async extractFromPDF(filePath: string): Promise<ExtractedDocument> {
    const filename = path.basename(filePath);
    
    try {
      const dataBuffer = await fs.readFile(filePath);
      const data = await pdfParse(dataBuffer);

      const extractedDoc: ExtractedDocument = {
        filename,
        type: 'pdf',
        text: data.text,
        metadata: {
          pages: data.numpages,
          title: data.info?.Title,
          author: data.info?.Author,
          subject: data.info?.Subject,
          creator: data.info?.Creator,
          producer: data.info?.Producer,
          creationDate: data.info?.CreationDate ? new Date(data.info.CreationDate) : undefined,
          modificationDate: data.info?.ModDate ? new Date(data.info.ModDate) : undefined,
        },
        extractionDate: new Date(),
        wordCount: this.countWords(data.text),
        characterCount: data.text.length,
      };

      return extractedDoc;

    } catch (error) {
      processorLogger.error(`PDF extraction failed for ${filename}`, { 
        error: error instanceof Error ? error.message : String(error) 
      });
      throw error;
    }
  }

  /**
   * Extract text from Word document
   */
  private async extractFromWord(filePath: string): Promise<ExtractedDocument> {
    const filename = path.basename(filePath);
    const extension = path.extname(filePath).toLowerCase();
    
    try {
      const dataBuffer = await fs.readFile(filePath);
      const result = await mammoth.extractRawText({ buffer: dataBuffer });

      // Check for warnings
      if (result.messages && result.messages.length > 0) {
        processorLogger.warn(`Word document extraction warnings for ${filename}`, { 
          warnings: result.messages.map(m => m.message) 
        });
      }

      const extractedDoc: ExtractedDocument = {
        filename,
        type: extension === '.doc' ? 'doc' : 'docx',
        text: result.value,
        extractionDate: new Date(),
        wordCount: this.countWords(result.value),
        characterCount: result.value.length,
      };

      return extractedDoc;

    } catch (error) {
      processorLogger.error(`Word document extraction failed for ${filename}`, { 
        error: error instanceof Error ? error.message : String(error) 
      });
      throw error;
    }
  }

  /**
   * Extract text from plain text file
   */
  private async extractFromText(filePath: string): Promise<ExtractedDocument> {
    const filename = path.basename(filePath);
    
    try {
      const text = await fs.readFile(filePath, 'utf-8');

      const extractedDoc: ExtractedDocument = {
        filename,
        type: 'txt',
        text,
        extractionDate: new Date(),
        wordCount: this.countWords(text),
        characterCount: text.length,
      };

      return extractedDoc;

    } catch (error) {
      processorLogger.error(`Text file extraction failed for ${filename}`, { 
        error: error instanceof Error ? error.message : String(error) 
      });
      throw error;
    }
  }

  /**
   * Find all document files in a directory (recursive)
   */
  private async findDocumentFiles(directoryPath: string): Promise<string[]> {
    const documentFiles: string[] = [];

    async function scanDirectory(dirPath: string): Promise<void> {
      const items = await fs.readdir(dirPath, { withFileTypes: true });

      for (const item of items) {
        const fullPath = path.join(dirPath, item.name);

        if (item.isDirectory()) {
          // Recursively scan subdirectories
          await scanDirectory(fullPath);
        } else if (item.isFile()) {
          const extension = path.extname(item.name).toLowerCase();
          if (FILE_HANDLING.ALLOWED_EXTENSIONS.includes(extension as any)) {
            documentFiles.push(fullPath);
          }
        }
      }
    }

    await scanDirectory(directoryPath);
    return documentFiles;
  }

  /**
   * Count words in text
   */
  private countWords(text: string): number {
    if (!text || text.trim().length === 0) {
      return 0;
    }

    // Split by whitespace and filter out empty strings
    const words = text.trim().split(/\s+/).filter(word => word.length > 0);
    return words.length;
  }

  /**
   * Combine multiple extracted documents into a single text
   */
  static combineDocuments(documents: ExtractedDocument[]): string {
    const combinedText = documents
      .map(doc => {
        const header = `\n\n=== ${doc.filename} ===\n`;
        return header + doc.text;
      })
      .join('\n');

    return combinedText;
  }

  /**
   * Get summary statistics for extraction result
   */
  static getSummaryStats(result: ExtractionResult): {
    totalWords: number;
    totalCharacters: number;
    averageWordsPerDocument: number;
    successRate: number;
  } {
    const totalWords = result.documents.reduce((sum, doc) => sum + doc.wordCount, 0);
    const totalCharacters = result.documents.reduce((sum, doc) => sum + doc.characterCount, 0);
    const averageWordsPerDocument = result.documents.length > 0 ? totalWords / result.documents.length : 0;
    const successRate = result.totalFiles > 0 ? (result.successfulExtractions / result.totalFiles) * 100 : 0;

    return {
      totalWords,
      totalCharacters,
      averageWordsPerDocument: Math.round(averageWordsPerDocument),
      successRate: Math.round(successRate * 100) / 100,
    };
  }
}