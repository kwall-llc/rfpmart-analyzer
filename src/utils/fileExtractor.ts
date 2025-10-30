import fs from 'fs-extra';
import path from 'path';
import StreamZip from 'node-stream-zip';
import { analyzerLogger } from './logger';

export interface ExtractionResult {
  success: boolean;
  extractedFiles: string[];
  errors: string[];
}

export class FileExtractor {
  
  /**
   * Extract ZIP files in a directory
   */
  static async extractZipFiles(directory: string): Promise<ExtractionResult> {
    const result: ExtractionResult = {
      success: true,
      extractedFiles: [],
      errors: []
    };

    try {
      analyzerLogger.info(`Checking for ZIP files in: ${directory}`);
      
      const files = await fs.readdir(directory);
      const zipFiles = files.filter(file => 
        file.toLowerCase().endsWith('.zip') || 
        file.toLowerCase().endsWith('.rar')
      );

      if (zipFiles.length === 0) {
        analyzerLogger.debug('No ZIP files found to extract');
        return result;
      }

      for (const zipFile of zipFiles) {
        const zipPath = path.join(directory, zipFile);
        
        try {
          const extractedFiles = await this.extractSingleZip(zipPath, directory);
          result.extractedFiles.push(...extractedFiles);
          
          analyzerLogger.info(`Extracted ${extractedFiles.length} files from ${zipFile}`);
          
          // Optional: Remove the ZIP file after extraction
          // await fs.remove(zipPath);
          
        } catch (error) {
          const errorMsg = `Failed to extract ${zipFile}: ${error instanceof Error ? error.message : String(error)}`;
          result.errors.push(errorMsg);
          analyzerLogger.error(errorMsg);
          result.success = false;
        }
      }

      return result;

    } catch (error) {
      const errorMsg = `Failed to process ZIP extraction: ${error instanceof Error ? error.message : String(error)}`;
      result.errors.push(errorMsg);
      result.success = false;
      analyzerLogger.error(errorMsg);
      return result;
    }
  }

  /**
   * Extract a single ZIP file
   */
  private static async extractSingleZip(zipPath: string, extractDir: string): Promise<string[]> {
    return new Promise((resolve, reject) => {
      const extractedFiles: string[] = [];
      
      const zip = new StreamZip.async({ file: zipPath });
      
      zip.extract(null, extractDir)
        .then(() => {
          return zip.entries();
        })
        .then((entries) => {
          for (const entry of Object.values(entries)) {
            if (!entry.isDirectory) {
              const extractedPath = path.join(extractDir, entry.name);
              extractedFiles.push(extractedPath);
            }
          }
          return zip.close();
        })
        .then(() => {
          resolve(extractedFiles);
        })
        .catch((error) => {
          reject(error);
        });
    });
  }

  /**
   * Get all document files in a directory (including extracted)
   */
  static async getDocumentFiles(directory: string): Promise<string[]> {
    try {
      const files = await fs.readdir(directory, { withFileTypes: true });
      const documentFiles: string[] = [];

      for (const file of files) {
        if (file.isFile()) {
          const ext = path.extname(file.name).toLowerCase();
          if (['.pdf', '.doc', '.docx', '.txt', '.rtf'].includes(ext)) {
            documentFiles.push(path.join(directory, file.name));
          }
        }
      }

      return documentFiles;

    } catch (error) {
      analyzerLogger.error(`Failed to get document files from ${directory}`, { 
        error: error instanceof Error ? error.message : String(error) 
      });
      return [];
    }
  }

  /**
   * Get file statistics for a directory
   */
  static async getDirectoryStats(directory: string): Promise<{
    totalFiles: number;
    zipFiles: number;
    documentFiles: number;
    otherFiles: number;
  }> {
    try {
      const files = await fs.readdir(directory, { withFileTypes: true });
      
      let zipFiles = 0;
      let documentFiles = 0;
      let otherFiles = 0;

      for (const file of files) {
        if (file.isFile()) {
          const ext = path.extname(file.name).toLowerCase();
          
          if (['.zip', '.rar'].includes(ext)) {
            zipFiles++;
          } else if (['.pdf', '.doc', '.docx', '.txt', '.rtf'].includes(ext)) {
            documentFiles++;
          } else {
            otherFiles++;
          }
        }
      }

      return {
        totalFiles: files.length,
        zipFiles,
        documentFiles,
        otherFiles
      };

    } catch (error) {
      analyzerLogger.error(`Failed to get directory stats for ${directory}`, { 
        error: error instanceof Error ? error.message : String(error) 
      });
      return {
        totalFiles: 0,
        zipFiles: 0,
        documentFiles: 0,
        otherFiles: 0
      };
    }
  }
}