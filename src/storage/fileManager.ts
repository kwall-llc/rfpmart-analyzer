import fs from 'fs-extra';
import * as path from 'path';
import { config } from '../config/environment';
import { systemLogger } from '../utils/logger';
import { formatDateForFile, getTimestamp } from '../utils/dateHelper';

export interface FileOrganizationResult {
  success: boolean;
  originalPath: string;
  newPath?: string;
  error?: string;
}

export interface DirectoryCleanupResult {
  deletedFiles: number;
  deletedDirectories: number;
  freedSpace: number; // in bytes
  errors: string[];
}

export class FileManager {
  private dataDir: string;
  private rfpsDir: string;
  private reportsDir: string;

  constructor() {
    this.dataDir = config.storage.dataDirectory;
    this.rfpsDir = config.storage.rfpsDirectory;
    this.reportsDir = config.storage.reportsDirectory;
  }

  /**
   * Initialize file manager and ensure directories exist
   */
  async initialize(): Promise<void> {
    try {
      systemLogger.info('Initializing file manager');

      // Ensure all required directories exist
      await this.ensureDirectories();

      systemLogger.info('File manager initialized successfully');

    } catch (error) {
      systemLogger.error('Failed to initialize file manager', { 
        error: error instanceof Error ? error.message : String(error) 
      });
      throw error;
    }
  }

  /**
   * Ensure all required directories exist
   */
  private async ensureDirectories(): Promise<void> {
    const directories = [
      this.dataDir,
      this.rfpsDir,
      this.reportsDir,
      path.join(this.dataDir, 'backups'),
      path.join(this.dataDir, 'temp'),
      path.join(this.dataDir, 'exports'),
    ];

    for (const dir of directories) {
      await fs.ensureDir(dir);
      systemLogger.debug(`Ensured directory exists: ${dir}`);
    }
  }

  /**
   * Create a new RFP directory with proper naming
   */
  async createRFPDirectory(rfpId: string, title: string, dueDate?: string): Promise<string> {
    try {
      // Sanitize title for directory name
      const sanitizedTitle = title
        .replace(/[^a-zA-Z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .substring(0, 50);

      // Format due date
      const dueDateStr = dueDate ? formatDateForFile(new Date(dueDate)) : 'no-date';

      // Create directory name
      const dirName = `${rfpId}-${sanitizedTitle}-${dueDateStr}`;
      const rfpPath = path.join(this.rfpsDir, dirName);

      // Create directory
      await fs.ensureDir(rfpPath);

      // Create subdirectories
      await fs.ensureDir(path.join(rfpPath, 'documents'));
      await fs.ensureDir(path.join(rfpPath, 'analysis'));
      await fs.ensureDir(path.join(rfpPath, 'extracted'));

      systemLogger.info(`Created RFP directory: ${dirName}`);
      return rfpPath;

    } catch (error) {
      systemLogger.error('Failed to create RFP directory', { 
        error: error instanceof Error ? error.message : String(error),
        rfpId,
        title,
      });
      throw error;
    }
  }

  /**
   * Organize downloaded files into proper structure
   */
  async organizeDownloadedFiles(downloadPath: string, rfpDirectory: string): Promise<FileOrganizationResult[]> {
    const results: FileOrganizationResult[] = [];

    try {
      // Get all files in download path
      const files = await this.findFiles(downloadPath);

      for (const filePath of files) {
        try {
          const fileName = path.basename(filePath);
          const fileExt = path.extname(fileName).toLowerCase();
          
          // Determine target subdirectory based on file type
          let targetSubdir = 'documents';
          if (['.zip', '.rar'].includes(fileExt)) {
            targetSubdir = 'archives';
          } else if (['.pdf', '.doc', '.docx', '.txt'].includes(fileExt)) {
            targetSubdir = 'documents';
          } else if (['.jpg', '.jpeg', '.png', '.gif'].includes(fileExt)) {
            targetSubdir = 'images';
          }

          // Create target directory
          const targetDir = path.join(rfpDirectory, targetSubdir);
          await fs.ensureDir(targetDir);

          // Move file
          const targetPath = path.join(targetDir, fileName);
          await fs.move(filePath, targetPath, { overwrite: true });

          results.push({
            success: true,
            originalPath: filePath,
            newPath: targetPath,
          });

          systemLogger.debug(`Organized file: ${fileName} -> ${targetSubdir}`);

        } catch (error) {
          results.push({
            success: false,
            originalPath: filePath,
            error: error instanceof Error ? error.message : String(error),
          });

          systemLogger.warn(`Failed to organize file: ${filePath}`, { 
            error: error instanceof Error ? error.message : String(error) 
          });
        }
      }

      return results;

    } catch (error) {
      systemLogger.error('Failed to organize downloaded files', { 
        error: error instanceof Error ? error.message : String(error),
        downloadPath,
        rfpDirectory,
      });
      return [];
    }
  }

  /**
   * Save analysis results to file
   */
  async saveAnalysisResults(rfpDirectory: string, analysisData: any, format: 'json' | 'txt' = 'json'): Promise<string> {
    try {
      const analysisDir = path.join(rfpDirectory, 'analysis');
      await fs.ensureDir(analysisDir);

      const timestamp = getTimestamp();
      const fileName = `analysis-${timestamp}.${format}`;
      const filePath = path.join(analysisDir, fileName);

      if (format === 'json') {
        await fs.writeJson(filePath, analysisData, { spaces: 2 });
      } else {
        // Convert to readable text format
        const textContent = this.formatAnalysisAsText(analysisData);
        await fs.writeFile(filePath, textContent, 'utf-8');
      }

      systemLogger.info(`Saved analysis results: ${fileName}`);
      return filePath;

    } catch (error) {
      systemLogger.error('Failed to save analysis results', { 
        error: error instanceof Error ? error.message : String(error),
        rfpDirectory,
      });
      throw error;
    }
  }

  /**
   * Create a backup of important data
   */
  async createBackup(includeRFPFiles: boolean = false): Promise<string> {
    try {
      const backupDir = path.join(this.dataDir, 'backups');
      const timestamp = getTimestamp();
      const backupName = `backup-${timestamp}`;
      const backupPath = path.join(backupDir, backupName);

      await fs.ensureDir(backupPath);

      // Backup database
      const dbPath = config.storage.databasePath;
      if (await fs.pathExists(dbPath)) {
        await fs.copy(dbPath, path.join(backupPath, 'database.sqlite'));
      }

      // Backup reports
      if (await fs.pathExists(this.reportsDir)) {
        await fs.copy(this.reportsDir, path.join(backupPath, 'reports'));
      }

      // Optionally backup RFP files
      if (includeRFPFiles && await fs.pathExists(this.rfpsDir)) {
        // Only backup analysis results, not the large documents
        const rfpDirs = await fs.readdir(this.rfpsDir);
        const rfpBackupDir = path.join(backupPath, 'rfps');
        await fs.ensureDir(rfpBackupDir);

        for (const rfpDir of rfpDirs) {
          const rfpPath = path.join(this.rfpsDir, rfpDir);
          const rfpStat = await fs.stat(rfpPath);
          
          if (rfpStat.isDirectory()) {
            const analysisPath = path.join(rfpPath, 'analysis');
            if (await fs.pathExists(analysisPath)) {
              await fs.copy(analysisPath, path.join(rfpBackupDir, rfpDir, 'analysis'));
            }

            // Also backup metadata
            const metadataPath = path.join(rfpPath, 'metadata.json');
            if (await fs.pathExists(metadataPath)) {
              await fs.copy(metadataPath, path.join(rfpBackupDir, rfpDir, 'metadata.json'));
            }
          }
        }
      }

      systemLogger.info(`Created backup: ${backupName}`);
      return backupPath;

    } catch (error) {
      systemLogger.error('Failed to create backup', { 
        error: error instanceof Error ? error.message : String(error) 
      });
      throw error;
    }
  }

  /**
   * Clean up old files and directories
   */
  async cleanup(olderThanDays: number = 30): Promise<DirectoryCleanupResult> {
    const result: DirectoryCleanupResult = {
      deletedFiles: 0,
      deletedDirectories: 0,
      freedSpace: 0,
      errors: [],
    };

    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

      systemLogger.info(`Starting cleanup of files older than ${olderThanDays} days`);

      // Clean up temp directory
      await this.cleanupDirectory(path.join(this.dataDir, 'temp'), cutoffDate, result);

      // Clean up old backups
      await this.cleanupDirectory(path.join(this.dataDir, 'backups'), cutoffDate, result);

      // Clean up old RFP directories (only if they have low scores)
      await this.cleanupLowScoreRFPs(cutoffDate, result);

      systemLogger.info('Cleanup completed', { 
        deletedFiles: result.deletedFiles,
        deletedDirectories: result.deletedDirectories,
        freedSpace: Math.round(result.freedSpace / 1024 / 1024) + ' MB',
      });

      return result;

    } catch (error) {
      const errorMsg = `Cleanup failed: ${error instanceof Error ? error.message : String(error)}`;
      result.errors.push(errorMsg);
      systemLogger.error(errorMsg);
      return result;
    }
  }

  /**
   * Get directory size
   */
  async getDirectorySize(dirPath: string): Promise<number> {
    try {
      let totalSize = 0;
      const files = await this.findFiles(dirPath);

      for (const file of files) {
        try {
          const stats = await fs.stat(file);
          totalSize += stats.size;
        } catch {
          // Skip files that can't be accessed
        }
      }

      return totalSize;

    } catch (error) {
      systemLogger.warn(`Failed to calculate directory size: ${dirPath}`, { 
        error: error instanceof Error ? error.message : String(error) 
      });
      return 0;
    }
  }

  /**
   * Get storage statistics
   */
  async getStorageStats(): Promise<{
    totalSize: number;
    rfpsSize: number;
    reportsSize: number;
    backupsSize: number;
    rfpCount: number;
    reportCount: number;
    backupCount: number;
  }> {
    try {
      const [totalSize, rfpsSize, reportsSize, backupsSize] = await Promise.all([
        this.getDirectorySize(this.dataDir),
        this.getDirectorySize(this.rfpsDir),
        this.getDirectorySize(this.reportsDir),
        this.getDirectorySize(path.join(this.dataDir, 'backups')),
      ]);

      // Count items
      const rfpCount = await this.countDirectories(this.rfpsDir);
      const reportCount = await this.countFiles(this.reportsDir);
      const backupCount = await this.countDirectories(path.join(this.dataDir, 'backups'));

      return {
        totalSize,
        rfpsSize,
        reportsSize,
        backupsSize,
        rfpCount,
        reportCount,
        backupCount,
      };

    } catch (error) {
      systemLogger.error('Failed to get storage stats', { 
        error: error instanceof Error ? error.message : String(error) 
      });
      return {
        totalSize: 0,
        rfpsSize: 0,
        reportsSize: 0,
        backupsSize: 0,
        rfpCount: 0,
        reportCount: 0,
        backupCount: 0,
      };
    }
  }

  /**
   * Find all files in a directory recursively
   */
  private async findFiles(dirPath: string): Promise<string[]> {
    const files: string[] = [];

    if (!await fs.pathExists(dirPath)) {
      return files;
    }

    const items = await fs.readdir(dirPath, { withFileTypes: true });

    for (const item of items) {
      const fullPath = path.join(dirPath, item.name);
      if (item.isDirectory()) {
        files.push(...await this.findFiles(fullPath));
      } else {
        files.push(fullPath);
      }
    }

    return files;
  }

  /**
   * Clean up a directory
   */
  private async cleanupDirectory(dirPath: string, cutoffDate: Date, result: DirectoryCleanupResult): Promise<void> {
    if (!await fs.pathExists(dirPath)) {
      return;
    }

    const items = await fs.readdir(dirPath, { withFileTypes: true });

    for (const item of items) {
      const fullPath = path.join(dirPath, item.name);
      
      try {
        const stats = await fs.stat(fullPath);
        
        if (stats.mtime < cutoffDate) {
          if (item.isDirectory()) {
            const size = await this.getDirectorySize(fullPath);
            await fs.remove(fullPath);
            result.deletedDirectories++;
            result.freedSpace += size;
          } else {
            result.freedSpace += stats.size;
            await fs.remove(fullPath);
            result.deletedFiles++;
          }
        }
      } catch (error) {
        result.errors.push(`Failed to cleanup ${fullPath}: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
  }

  /**
   * Clean up low-score RFPs
   */
  private async cleanupLowScoreRFPs(cutoffDate: Date, result: DirectoryCleanupResult): Promise<void> {
    // This would integrate with the database to only clean up RFPs with low scores
    // For now, just clean up based on date
    await this.cleanupDirectory(this.rfpsDir, cutoffDate, result);
  }

  /**
   * Count directories in a path
   */
  private async countDirectories(dirPath: string): Promise<number> {
    if (!await fs.pathExists(dirPath)) {
      return 0;
    }

    const items = await fs.readdir(dirPath, { withFileTypes: true });
    return items.filter(item => item.isDirectory()).length;
  }

  /**
   * Count files in a path
   */
  private async countFiles(dirPath: string): Promise<number> {
    if (!await fs.pathExists(dirPath)) {
      return 0;
    }

    const files = await this.findFiles(dirPath);
    return files.length;
  }

  /**
   * Format analysis data as readable text
   */
  private formatAnalysisAsText(analysisData: any): string {
    let text = '# RFP Analysis Report\n\n';
    
    if (analysisData.rfpId) {
      text += `**RFP ID:** ${analysisData.rfpId}\n`;
    }
    
    if (analysisData.title) {
      text += `**Title:** ${analysisData.title}\n`;
    }
    
    text += `**Analysis Date:** ${new Date().toISOString()}\n\n`;
    
    if (analysisData.fitAnalysis) {
      text += `## Fit Analysis\n`;
      text += `**Score:** ${analysisData.fitAnalysis.totalScore}/${analysisData.fitAnalysis.maxPossibleScore}\n`;
      text += `**Percentage:** ${analysisData.fitAnalysis.percentage}%\n`;
      text += `**Recommendation:** ${analysisData.fitAnalysis.recommendation}\n\n`;
      text += `**Reasoning:** ${analysisData.fitAnalysis.reasoning}\n\n`;
    }
    
    return text;
  }
}