import { AIAnalysisResult } from './aiAnalyzer';
import { FitReport } from './fitReportGenerator';
import { analyzerLogger } from '../utils/logger';
import { config } from '../config/environment';
import fs from 'fs-extra';
import path from 'path';

export interface CleanupResult {
  totalProcessed: number;
  cleaned: number;
  preserved: number;
  errors: string[];
  cleanedRFPs: string[];
  preservedRFPs: string[];
}

export interface CleanupOptions {
  dryRun?: boolean;
  cleanupPoorFits?: boolean;
  cleanupRejected?: boolean;
  preserveReports?: boolean;
  preserveMetadata?: boolean;
  customThreshold?: number;
}

export class RFPCleanupManager {
  
  /**
   * Cleanup RFPs based on their fit analysis results
   */
  async cleanupRFPs(
    analysisResults: Map<string, AIAnalysisResult>,
    rfpsDirectory: string,
    options: CleanupOptions = {}
  ): Promise<CleanupResult> {
    const {
      dryRun = false,
      cleanupPoorFits = config.ai.cleanup.poorFits,
      cleanupRejected = config.ai.cleanup.rejected,
      preserveReports = true,
      preserveMetadata = true,
      customThreshold = null
    } = options;

    const result: CleanupResult = {
      totalProcessed: 0,
      cleaned: 0,
      preserved: 0,
      errors: [],
      cleanedRFPs: [],
      preservedRFPs: []
    };

    try {
      analyzerLogger.info(`Starting RFP cleanup process`, {
        dryRun,
        cleanupPoorFits,
        cleanupRejected,
        totalRFPs: analysisResults.size
      });

      for (const [rfpId, analysis] of analysisResults.entries()) {
        result.totalProcessed++;

        try {
          const shouldCleanup = this.shouldCleanupRFP(analysis, {
            cleanupPoorFits,
            cleanupRejected,
            customThreshold
          });

          if (shouldCleanup) {
            const cleaned = await this.cleanupSingleRFP(
              rfpId, 
              analysis, 
              rfpsDirectory, 
              { dryRun, preserveReports, preserveMetadata }
            );

            if (cleaned) {
              result.cleaned++;
              result.cleanedRFPs.push(rfpId);
              
              if (!dryRun) {
                analyzerLogger.info(`Cleaned up RFP: ${rfpId}`, {
                  fitScore: analysis.fitScore,
                  fitRating: analysis.fitRating
                });
              }
            }
          } else {
            result.preserved++;
            result.preservedRFPs.push(rfpId);
          }

        } catch (error) {
          const errorMsg = `Failed to process RFP ${rfpId}: ${error instanceof Error ? error.message : String(error)}`;
          result.errors.push(errorMsg);
          analyzerLogger.error(errorMsg);
        }
      }

      if (dryRun) {
        analyzerLogger.info(`DRY RUN: Cleanup simulation completed`, result);
      } else {
        analyzerLogger.info(`RFP cleanup completed`, result);
      }

      return result;

    } catch (error) {
      analyzerLogger.error('RFP cleanup process failed', { 
        error: error instanceof Error ? error.message : String(error) 
      });
      throw error;
    }
  }

  /**
   * Determine if an RFP should be cleaned up based on analysis
   */
  private shouldCleanupRFP(
    analysis: AIAnalysisResult, 
    options: { cleanupPoorFits: boolean; cleanupRejected: boolean; customThreshold?: number | null }
  ): boolean {
    const { cleanupPoorFits, cleanupRejected, customThreshold } = options;

    // Use custom threshold if provided
    if (customThreshold !== null && customThreshold !== undefined) {
      return analysis.fitScore < customThreshold;
    }

    // Check fit rating
    if (analysis.fitRating === 'rejected' && cleanupRejected) {
      return true;
    }

    if (analysis.fitRating === 'poor' && cleanupPoorFits) {
      return true;
    }

    // Additional score-based check
    if (analysis.fitScore < config.ai.thresholds.poor && cleanupPoorFits) {
      return true;
    }

    return false;
  }

  /**
   * Cleanup a single RFP directory
   */
  private async cleanupSingleRFP(
    rfpId: string,
    analysis: AIAnalysisResult,
    rfpsDirectory: string,
    options: { dryRun: boolean; preserveReports: boolean; preserveMetadata: boolean }
  ): Promise<boolean> {
    const { dryRun, preserveReports, preserveMetadata } = options;
    
    try {
      // Find RFP directory
      const rfpDirectory = await this.findRFPDirectory(rfpId, rfpsDirectory);
      if (!rfpDirectory) {
        analyzerLogger.warn(`RFP directory not found for ID: ${rfpId}`);
        return false;
      }

      if (dryRun) {
        analyzerLogger.info(`DRY RUN: Would cleanup ${rfpDirectory}`, {
          preserveReports,
          preserveMetadata
        });
        return true;
      }

      // Get list of files to clean
      const filesToClean = await this.getFilesToClean(rfpDirectory, {
        preserveReports,
        preserveMetadata
      });

      // Remove files
      for (const filePath of filesToClean) {
        try {
          await fs.remove(filePath);
          analyzerLogger.debug(`Removed file: ${filePath}`);
        } catch (error) {
          analyzerLogger.warn(`Failed to remove file: ${filePath}`, { 
            error: error instanceof Error ? error.message : String(error) 
          });
        }
      }

      // Check if directory is empty (except for preserved files)
      const remainingFiles = await fs.readdir(rfpDirectory);
      const preservedFiles = this.getPreservedFileNames(preserveReports, preserveMetadata);
      const nonPreservedFiles = remainingFiles.filter(file => 
        !preservedFiles.some(preserved => file.includes(preserved))
      );

      // If no non-preserved files remain, we can remove the entire directory
      // (unless we're preserving reports/metadata)
      if (nonPreservedFiles.length === 0 && !preserveReports && !preserveMetadata) {
        await fs.remove(rfpDirectory);
        analyzerLogger.info(`Removed entire RFP directory: ${rfpDirectory}`);
      }

      return true;

    } catch (error) {
      analyzerLogger.error(`Failed to cleanup RFP ${rfpId}`, { 
        error: error instanceof Error ? error.message : String(error) 
      });
      return false;
    }
  }

  /**
   * Find RFP directory by ID
   */
  private async findRFPDirectory(rfpId: string, rfpsDirectory: string): Promise<string | null> {
    try {
      const entries = await fs.readdir(rfpsDirectory, { withFileTypes: true });
      
      for (const entry of entries) {
        if (entry.isDirectory() && entry.name.includes(rfpId)) {
          return path.join(rfpsDirectory, entry.name);
        }
      }

      return null;

    } catch (error) {
      analyzerLogger.error('Failed to find RFP directory', { 
        rfpId,
        error: error instanceof Error ? error.message : String(error) 
      });
      return null;
    }
  }

  /**
   * Get list of files to clean from RFP directory
   */
  private async getFilesToClean(
    rfpDirectory: string,
    options: { preserveReports: boolean; preserveMetadata: boolean }
  ): Promise<string[]> {
    const { preserveReports, preserveMetadata } = options;
    const filesToClean: string[] = [];

    try {
      const files = await fs.readdir(rfpDirectory);
      const preservedFiles = this.getPreservedFileNames(preserveReports, preserveMetadata);

      for (const file of files) {
        const filePath = path.join(rfpDirectory, file);
        const stat = await fs.stat(filePath);

        // Skip directories
        if (stat.isDirectory()) {
          continue;
        }

        // Check if file should be preserved
        const shouldPreserve = preservedFiles.some(preserved => 
          file.includes(preserved) || file.endsWith(preserved)
        );

        if (!shouldPreserve) {
          filesToClean.push(filePath);
        }
      }

      return filesToClean;

    } catch (error) {
      analyzerLogger.error('Failed to get files to clean', { 
        rfpDirectory,
        error: error instanceof Error ? error.message : String(error) 
      });
      return [];
    }
  }

  /**
   * Get list of file names/patterns to preserve
   */
  private getPreservedFileNames(preserveReports: boolean, preserveMetadata: boolean): string[] {
    const preserved: string[] = [];

    if (preserveReports) {
      preserved.push(
        'fit-report.html',
        'fit-report.md',
        'fit-analysis.json'
      );
    }

    if (preserveMetadata) {
      preserved.push(
        'metadata.json'
      );
    }

    return preserved;
  }

  /**
   * Generate cleanup report
   */
  async generateCleanupReport(
    cleanupResult: CleanupResult,
    outputDirectory: string
  ): Promise<void> {
    try {
      const reportContent = `# RFP Cleanup Report

Generated on: ${new Date().toLocaleString()}

## Summary

- **Total RFPs Processed:** ${cleanupResult.totalProcessed}
- **RFPs Cleaned:** ${cleanupResult.cleaned}
- **RFPs Preserved:** ${cleanupResult.preserved}
- **Errors:** ${cleanupResult.errors.length}

## Cleaned RFPs (${cleanupResult.cleaned})

${cleanupResult.cleanedRFPs.length > 0 
  ? cleanupResult.cleanedRFPs.map(rfpId => `- ${rfpId}`).join('\n')
  : '_No RFPs were cleaned_'
}

## Preserved RFPs (${cleanupResult.preserved})

${cleanupResult.preservedRFPs.length > 0 
  ? cleanupResult.preservedRFPs.map(rfpId => `- ${rfpId}`).join('\n')
  : '_No RFPs were preserved_'
}

${cleanupResult.errors.length > 0 ? `
## Errors (${cleanupResult.errors.length})

${cleanupResult.errors.map(error => `- ${error}`).join('\n')}
` : ''}

---

*Generated by KWALL RFP Analyzer v1.0*
`;

      const reportPath = path.join(outputDirectory, `cleanup-report-${Date.now()}.md`);
      await fs.writeFile(reportPath, reportContent, 'utf8');

      analyzerLogger.info(`Cleanup report saved to ${reportPath}`);

    } catch (error) {
      analyzerLogger.error('Failed to generate cleanup report', { 
        error: error instanceof Error ? error.message : String(error) 
      });
      throw error;
    }
  }

  /**
   * Validate cleanup configuration
   */
  validateCleanupConfig(): { valid: boolean; issues: string[] } {
    const issues: string[] = [];

    // Check if cleanup is enabled
    if (!config.ai.cleanup.poorFits && !config.ai.cleanup.rejected) {
      issues.push('No cleanup options are enabled in configuration');
    }

    // Check thresholds
    if (config.ai.thresholds.poor >= config.ai.thresholds.good) {
      issues.push('Poor fit threshold should be lower than good fit threshold');
    }

    if (config.ai.thresholds.good >= config.ai.thresholds.excellent) {
      issues.push('Good fit threshold should be lower than excellent fit threshold');
    }

    // Check directories
    if (!config.storage.rfpsDirectory) {
      issues.push('RFPs directory not configured');
    }

    return {
      valid: issues.length === 0,
      issues
    };
  }
}