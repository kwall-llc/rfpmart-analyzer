import fs from 'fs-extra';
import * as path from 'path';
import StreamZip from 'node-stream-zip';
import { FILE_HANDLING } from '../config/constants';
import { processorLogger } from '../utils/logger';

export interface ZipExtractionResult {
  extractedFiles: string[];
  extractionPath: string;
  errors: string[];
  totalFiles: number;
  successfulExtractions: number;
}

export class ZipHandler {
  
  /**
   * Extract a ZIP file to a destination directory
   */
  async extractZipFile(zipFilePath: string, destinationDir?: string): Promise<ZipExtractionResult> {
    const result: ZipExtractionResult = {
      extractedFiles: [],
      extractionPath: '',
      errors: [],
      totalFiles: 0,
      successfulExtractions: 0,
    };

    try {
      // Verify ZIP file exists
      if (!await fs.pathExists(zipFilePath)) {
        throw new Error(`ZIP file not found: ${zipFilePath}`);
      }

      // Check file size
      const stats = await fs.stat(zipFilePath);
      if (stats.size > FILE_HANDLING.MAX_FILE_SIZE) {
        throw new Error(`ZIP file size ${stats.size} exceeds maximum allowed size ${FILE_HANDLING.MAX_FILE_SIZE}`);
      }

      // Set up extraction directory
      const extractDir = destinationDir || path.join(path.dirname(zipFilePath), 'extracted');
      await fs.ensureDir(extractDir);
      result.extractionPath = extractDir;

      processorLogger.info(`Extracting ZIP file: ${path.basename(zipFilePath)} to ${extractDir}`);

      // Open ZIP file
      const zip = new StreamZip.async({ file: zipFilePath });

      try {
        // Get entries count
        const entries = await zip.entries();
        const entryNames = Object.keys(entries);
        result.totalFiles = entryNames.length;

        processorLogger.debug(`ZIP contains ${result.totalFiles} entries`);

        // Extract each entry
        for (const entryName of entryNames) {
          const entry = entries[entryName];
          
          if (!entry) continue;
          
          try {
            await this.extractZipEntry(zip, entry, extractDir, result);
          } catch (error) {
            const errorMsg = `Failed to extract ${entryName}: ${error instanceof Error ? error.message : String(error)}`;
            result.errors.push(errorMsg);
            processorLogger.warn(errorMsg);
          }
        }

      } finally {
        await zip.close();
      }

      processorLogger.info(`ZIP extraction completed: ${result.successfulExtractions}/${result.totalFiles} files extracted successfully`);
      return result;

    } catch (error) {
      const errorMsg = `Failed to extract ZIP file ${zipFilePath}: ${error instanceof Error ? error.message : String(error)}`;
      result.errors.push(errorMsg);
      processorLogger.error(errorMsg);
      return result;
    }
  }

  /**
   * Extract a single entry from ZIP file
   */
  private async extractZipEntry(
    zip: StreamZip.StreamZipAsync, 
    entry: StreamZip.ZipEntry, 
    extractDir: string, 
    result: ZipExtractionResult
  ): Promise<void> {
    const entryName = entry.name;
    const outputPath = path.join(extractDir, entryName);

    // Skip directory entries
    if (entry.isDirectory) {
      await fs.ensureDir(outputPath);
      processorLogger.debug(`Created directory: ${entryName}`);
      return;
    }

    // Check if file type is allowed
    const extension = path.extname(entryName).toLowerCase();
    if (!this.isAllowedFileType(extension)) {
      processorLogger.debug(`Skipping unsupported file type: ${entryName}`);
      return;
    }

    // Check file size
    if (entry.size > FILE_HANDLING.MAX_FILE_SIZE) {
      const errorMsg = `File ${entryName} size ${entry.size} exceeds maximum allowed size`;
      result.errors.push(errorMsg);
      processorLogger.warn(errorMsg);
      return;
    }

    try {
      // Ensure parent directory exists
      await fs.ensureDir(path.dirname(outputPath));

      // Extract the file
      await zip.extract(entryName, outputPath);
      
      result.extractedFiles.push(outputPath);
      result.successfulExtractions++;
      
      processorLogger.debug(`Extracted: ${entryName} (${entry.size} bytes)`);

    } catch (error) {
      throw new Error(`Failed to extract ${entryName}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Check if file type is allowed for extraction
   */
  private isAllowedFileType(extension: string): boolean {
    const allowedExtensions = [
      ...FILE_HANDLING.ALLOWED_EXTENSIONS,
      '.rtf', '.odt', '.htm', '.html', '.xml', '.csv'
    ];
    
    return allowedExtensions.includes(extension.toLowerCase());
  }

  /**
   * Process all ZIP files in a directory
   */
  async processZipFilesInDirectory(directoryPath: string): Promise<ZipExtractionResult[]> {
    const results: ZipExtractionResult[] = [];

    try {
      const zipFiles = await this.findZipFiles(directoryPath);
      
      processorLogger.info(`Found ${zipFiles.length} ZIP files in ${directoryPath}`);

      for (const zipFile of zipFiles) {
        try {
          const result = await this.extractZipFile(zipFile);
          results.push(result);
        } catch (error) {
          processorLogger.error(`Failed to process ZIP file ${zipFile}`, { 
            error: error instanceof Error ? error.message : String(error) 
          });
          
          // Add error result
          results.push({
            extractedFiles: [],
            extractionPath: '',
            errors: [`Failed to process ${path.basename(zipFile)}: ${error instanceof Error ? error.message : String(error)}`],
            totalFiles: 0,
            successfulExtractions: 0,
          });
        }
      }

      return results;

    } catch (error) {
      processorLogger.error(`Failed to process ZIP files in directory ${directoryPath}`, { 
        error: error instanceof Error ? error.message : String(error) 
      });
      return [];
    }
  }

  /**
   * Find all ZIP files in a directory
   */
  private async findZipFiles(directoryPath: string): Promise<string[]> {
    const zipFiles: string[] = [];

    try {
      const items = await fs.readdir(directoryPath, { withFileTypes: true });

      for (const item of items) {
        if (item.isFile()) {
          const extension = path.extname(item.name).toLowerCase();
          if (extension === '.zip' || extension === '.rar') {
            zipFiles.push(path.join(directoryPath, item.name));
          }
        }
      }

      return zipFiles;

    } catch (error) {
      processorLogger.error(`Failed to scan directory for ZIP files: ${directoryPath}`, { 
        error: error instanceof Error ? error.message : String(error) 
      });
      return [];
    }
  }

  /**
   * Check if a file is a ZIP archive
   */
  static async isZipFile(filePath: string): Promise<boolean> {
    try {
      const extension = path.extname(filePath).toLowerCase();
      if (extension !== '.zip' && extension !== '.rar') {
        return false;
      }

      // Try to open as ZIP to verify it's a valid archive
      const zip = new StreamZip.async({ file: filePath });
      try {
        await zip.entries();
        return true;
      } finally {
        await zip.close();
      }

    } catch (error) {
      return false;
    }
  }

  /**
   * Get ZIP file information without extracting
   */
  async getZipInfo(zipFilePath: string): Promise<{
    entryCount: number;
    totalSize: number;
    fileTypes: { [extension: string]: number };
    entries: Array<{ name: string; size: number; isDirectory: boolean }>;
  }> {
    const info = {
      entryCount: 0,
      totalSize: 0,
      fileTypes: {} as { [extension: string]: number },
      entries: [] as Array<{ name: string; size: number; isDirectory: boolean }>,
    };

    try {
      const zip = new StreamZip.async({ file: zipFilePath });

      try {
        const entries = await zip.entries();
        const entryNames = Object.keys(entries);
        
        info.entryCount = entryNames.length;

        for (const entryName of entryNames) {
          const entry = entries[entryName];
          
          if (!entry) continue;
          
          info.entries.push({
            name: entryName,
            size: entry.size,
            isDirectory: entry.isDirectory,
          });

          if (!entry.isDirectory) {
            info.totalSize += entry.size;
            
            const extension = path.extname(entryName).toLowerCase();
            if (extension) {
              info.fileTypes[extension] = (info.fileTypes[extension] || 0) + 1;
            }
          }
        }

      } finally {
        await zip.close();
      }

      return info;

    } catch (error) {
      processorLogger.error(`Failed to get ZIP info for ${zipFilePath}`, { 
        error: error instanceof Error ? error.message : String(error) 
      });
      return info;
    }
  }
}