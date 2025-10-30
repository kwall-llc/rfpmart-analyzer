import fs from 'fs-extra';
import * as path from 'path';
import { DocumentExtractor, ExtractedDocument, ExtractionResult } from './documentExtractor';
import { ZipHandler, ZipExtractionResult } from './zipHandler';
import { processorLogger } from '../utils/logger';

export interface RFPProcessingResult {
  rfpId: string;
  rfpDirectory: string;
  extractedDocuments: ExtractedDocument[];
  combinedText: string;
  zipExtractions: ZipExtractionResult[];
  errors: string[];
  totalFiles: number;
  successfulExtractions: number;
  processingDate: Date;
  metadata: {
    totalWords: number;
    totalCharacters: number;
    documentTypes: { [type: string]: number };
    hasZipFiles: boolean;
    extractionSuccess: boolean;
  };
}

export class RFPProcessor {
  private documentExtractor: DocumentExtractor;
  private zipHandler: ZipHandler;

  constructor() {
    this.documentExtractor = new DocumentExtractor();
    this.zipHandler = new ZipHandler();
  }

  /**
   * Process all documents in an RFP directory
   */
  async processRFPDirectory(rfpDirectory: string): Promise<RFPProcessingResult> {
    const rfpId = path.basename(rfpDirectory);
    
    const result: RFPProcessingResult = {
      rfpId,
      rfpDirectory,
      extractedDocuments: [],
      combinedText: '',
      zipExtractions: [],
      errors: [],
      totalFiles: 0,
      successfulExtractions: 0,
      processingDate: new Date(),
      metadata: {
        totalWords: 0,
        totalCharacters: 0,
        documentTypes: {},
        hasZipFiles: false,
        extractionSuccess: false,
      },
    };

    try {
      processorLogger.info(`Processing RFP directory: ${rfpDirectory}`);

      // Check if directory exists
      if (!await fs.pathExists(rfpDirectory)) {
        throw new Error(`RFP directory not found: ${rfpDirectory}`);
      }

      // Step 1: Extract any ZIP files first
      await this.processZipFiles(rfpDirectory, result);

      // Step 2: Extract text from all document files
      await this.extractDocuments(rfpDirectory, result);

      // Step 3: Combine all extracted text
      result.combinedText = DocumentExtractor.combineDocuments(result.extractedDocuments);

      // Step 4: Calculate metadata
      this.calculateMetadata(result);

      // Step 5: Save processing results
      await this.saveProcessingResults(result);

      processorLogger.info(`RFP processing completed for ${rfpId}`, {
        totalFiles: result.totalFiles,
        successfulExtractions: result.successfulExtractions,
        totalWords: result.metadata.totalWords,
        extractionSuccess: result.metadata.extractionSuccess,
      });

      return result;

    } catch (error) {
      const errorMsg = `Failed to process RFP directory ${rfpDirectory}: ${error instanceof Error ? error.message : String(error)}`;
      result.errors.push(errorMsg);
      processorLogger.error(errorMsg);
      return result;
    }
  }

  /**
   * Process ZIP files in the directory
   */
  private async processZipFiles(rfpDirectory: string, result: RFPProcessingResult): Promise<void> {
    try {
      const zipResults = await this.zipHandler.processZipFilesInDirectory(rfpDirectory);
      result.zipExtractions = zipResults;

      if (zipResults.length > 0) {
        result.metadata.hasZipFiles = true;
        processorLogger.info(`Processed ${zipResults.length} ZIP files in ${rfpDirectory}`);

        // Add ZIP extraction errors to main result
        for (const zipResult of zipResults) {
          result.errors.push(...zipResult.errors);
        }
      }

    } catch (error) {
      const errorMsg = `Failed to process ZIP files: ${error instanceof Error ? error.message : String(error)}`;
      result.errors.push(errorMsg);
      processorLogger.error(errorMsg);
    }
  }

  /**
   * Extract text from all documents in the directory
   */
  private async extractDocuments(rfpDirectory: string, result: RFPProcessingResult): Promise<void> {
    try {
      const extractionResult = await this.documentExtractor.extractFromDirectory(rfpDirectory);
      
      result.extractedDocuments = extractionResult.documents;
      result.totalFiles += extractionResult.totalFiles;
      result.successfulExtractions += extractionResult.successfulExtractions;
      result.errors.push(...extractionResult.errors);

      processorLogger.info(`Extracted text from ${extractionResult.successfulExtractions}/${extractionResult.totalFiles} documents`);

    } catch (error) {
      const errorMsg = `Failed to extract documents: ${error instanceof Error ? error.message : String(error)}`;
      result.errors.push(errorMsg);
      processorLogger.error(errorMsg);
    }
  }

  /**
   * Calculate metadata for the processing result
   */
  private calculateMetadata(result: RFPProcessingResult): void {
    // Calculate total words and characters
    result.metadata.totalWords = result.extractedDocuments.reduce((sum, doc) => sum + doc.wordCount, 0);
    result.metadata.totalCharacters = result.extractedDocuments.reduce((sum, doc) => sum + doc.characterCount, 0);

    // Count document types
    result.metadata.documentTypes = {};
    for (const doc of result.extractedDocuments) {
      result.metadata.documentTypes[doc.type] = (result.metadata.documentTypes[doc.type] || 0) + 1;
    }

    // Determine if extraction was successful
    result.metadata.extractionSuccess = result.successfulExtractions > 0 && result.metadata.totalWords > 100;

    processorLogger.debug('Calculated metadata', { metadata: result.metadata });
  }

  /**
   * Save processing results to files
   */
  private async saveProcessingResults(result: RFPProcessingResult): Promise<void> {
    try {
      const resultsDir = path.join(result.rfpDirectory, 'processing-results');
      await fs.ensureDir(resultsDir);

      // Save combined text
      if (result.combinedText.length > 0) {
        const textPath = path.join(resultsDir, 'combined-text.txt');
        await fs.writeFile(textPath, result.combinedText, 'utf-8');
        processorLogger.debug(`Saved combined text to ${textPath}`);
      }

      // Save extraction results as JSON
      const resultsPath = path.join(resultsDir, 'extraction-results.json');
      const saveableResult = {
        ...result,
        // Remove circular references and large text content
        extractedDocuments: result.extractedDocuments.map(doc => ({
          ...doc,
          text: doc.text.substring(0, 1000) + (doc.text.length > 1000 ? '...[truncated]' : ''),
        })),
        combinedText: result.combinedText.substring(0, 1000) + (result.combinedText.length > 1000 ? '...[truncated]' : ''),
      };

      await fs.writeJson(resultsPath, saveableResult, { spaces: 2 });
      processorLogger.debug(`Saved extraction results to ${resultsPath}`);

      // Save individual document extractions
      for (const doc of result.extractedDocuments) {
        if (doc.text.length > 0) {
          const docPath = path.join(resultsDir, `${doc.filename}.txt`);
          await fs.writeFile(docPath, doc.text, 'utf-8');
        }
      }

    } catch (error) {
      const errorMsg = `Failed to save processing results: ${error instanceof Error ? error.message : String(error)}`;
      result.errors.push(errorMsg);
      processorLogger.error(errorMsg);
    }
  }

  /**
   * Process multiple RFP directories
   */
  async processMultipleRFPs(rfpDirectories: string[]): Promise<RFPProcessingResult[]> {
    const results: RFPProcessingResult[] = [];

    processorLogger.info(`Processing ${rfpDirectories.length} RFP directories`);

    for (const directory of rfpDirectories) {
      try {
        const result = await this.processRFPDirectory(directory);
        results.push(result);
      } catch (error) {
        processorLogger.error(`Failed to process RFP directory ${directory}`, { 
          error: error instanceof Error ? error.message : String(error) 
        });
        
        // Add error result
        results.push({
          rfpId: path.basename(directory),
          rfpDirectory: directory,
          extractedDocuments: [],
          combinedText: '',
          zipExtractions: [],
          errors: [`Failed to process: ${error instanceof Error ? error.message : String(error)}`],
          totalFiles: 0,
          successfulExtractions: 0,
          processingDate: new Date(),
          metadata: {
            totalWords: 0,
            totalCharacters: 0,
            documentTypes: {},
            hasZipFiles: false,
            extractionSuccess: false,
          },
        });
      }
    }

    processorLogger.info(`Completed processing ${results.length} RFP directories`);
    return results;
  }

  /**
   * Get summary statistics for multiple processing results
   */
  static getSummaryStatistics(results: RFPProcessingResult[]): {
    totalRFPs: number;
    successfulProcessing: number;
    totalFiles: number;
    totalExtractions: number;
    totalWords: number;
    averageWordsPerRFP: number;
    documentTypes: { [type: string]: number };
    successRate: number;
  } {
    const stats = {
      totalRFPs: results.length,
      successfulProcessing: results.filter(r => r.metadata.extractionSuccess).length,
      totalFiles: results.reduce((sum, r) => sum + r.totalFiles, 0),
      totalExtractions: results.reduce((sum, r) => sum + r.successfulExtractions, 0),
      totalWords: results.reduce((sum, r) => sum + r.metadata.totalWords, 0),
      averageWordsPerRFP: 0,
      documentTypes: {} as { [type: string]: number },
      successRate: 0,
    };

    // Calculate averages
    stats.averageWordsPerRFP = stats.totalRFPs > 0 ? Math.round(stats.totalWords / stats.totalRFPs) : 0;
    stats.successRate = stats.totalRFPs > 0 ? Math.round((stats.successfulProcessing / stats.totalRFPs) * 100) : 0;

    // Aggregate document types
    for (const result of results) {
      for (const [type, count] of Object.entries(result.metadata.documentTypes)) {
        stats.documentTypes[type] = (stats.documentTypes[type] || 0) + count;
      }
    }

    return stats;
  }
}