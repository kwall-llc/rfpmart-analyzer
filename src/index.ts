#!/usr/bin/env node

import { Command } from 'commander';
import { config, ensureDirectories } from './config/environment';
import { systemLogger, scraperLogger, analyzerLogger } from './utils/logger';
import { RFPMartScraper } from './scrapers/rfpMartScraper';
import { RFPProcessor } from './processors/rfpProcessor';
import { RFPAnalyzer } from './analyzers/rfpAnalyzer';
import { DatabaseManager } from './storage/database';
import { FileManager } from './storage/fileManager';
import { ReportGenerator } from './analyzers/reportGenerator';
import { SUCCESS_MESSAGES, RECOMMENDATION_LEVELS } from './config/constants';

class RFPMartAnalyzerApp {
  private db: DatabaseManager;
  private fileManager: FileManager;
  private scraper: RFPMartScraper;
  private processor: RFPProcessor;
  private analyzer: RFPAnalyzer;
  private reportGenerator: ReportGenerator;

  constructor() {
    this.db = new DatabaseManager();
    this.fileManager = new FileManager();
    this.scraper = new RFPMartScraper();
    this.processor = new RFPProcessor();
    this.analyzer = new RFPAnalyzer();
    this.reportGenerator = new ReportGenerator();
  }

  /**
   * Initialize all components
   */
  async initialize(): Promise<void> {
    try {
      systemLogger.info('🚀 Starting RFP Mart Analyzer initialization');

      // Ensure directories exist
      ensureDirectories();

      // Initialize components
      await this.db.initialize();
      await this.fileManager.initialize();

      systemLogger.info('✅ RFP Mart Analyzer initialized successfully');

    } catch (error) {
      systemLogger.error('❌ Failed to initialize RFP Mart Analyzer', { 
        error: error instanceof Error ? error.message : String(error) 
      });
      throw error;
    }
  }

  /**
   * Run the complete RFP analysis workflow
   */
  async runCompleteWorkflow(sinceDate?: Date): Promise<void> {
    try {
      systemLogger.info('🔄 Starting complete RFP analysis workflow');

      // Step 1: Scrape new RFPs
      const scrapingResult = await this.scrapeRFPs(sinceDate);
      
      if (scrapingResult.rfpsDownloaded === 0) {
        systemLogger.info('ℹ️  No new RFPs downloaded, workflow complete');
        return;
      }

      // Step 2: Process downloaded documents
      const processingResults = await this.processRFPs();

      // Step 3: Analyze RFPs
      const analysisResults = await this.analyzeRFPs(processingResults);

      // Step 4: Generate reports
      await this.generateReports(analysisResults);

      // Step 5: Record run in database
      await this.recordRun(scrapingResult, analysisResults);

      // Step 6: Cleanup old files
      await this.cleanup();

      systemLogger.info('🎉 Complete workflow finished successfully');

    } catch (error) {
      systemLogger.error('❌ Workflow failed', { 
        error: error instanceof Error ? error.message : String(error) 
      });
      throw error;
    }
  }

  /**
   * Scrape new RFPs from RFP Mart
   */
  async scrapeRFPs(sinceDate?: Date): Promise<any> {
    try {
      scraperLogger.info('🕷️  Starting RFP scraping');

      await this.scraper.initialize();
      
      // Get last run date if not provided
      if (!sinceDate) {
        sinceDate = await this.db.getLastRunDate() || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000); // 7 days ago
      }

      const result = await this.scraper.scrapeNewRFPs(sinceDate);

      scraperLogger.info('✅ Scraping completed', {
        found: result.rfpsFound.length,
        downloaded: result.rfpsDownloaded,
        errors: result.errors.length,
      });

      return result;

    } catch (error) {
      scraperLogger.error('❌ Scraping failed', { 
        error: error instanceof Error ? error.message : String(error) 
      });
      throw error;
    } finally {
      await this.scraper.cleanup();
    }
  }

  /**
   * Process downloaded RFP documents
   */
  async processRFPs(): Promise<any[]> {
    try {
      systemLogger.info('📄 Starting document processing');

      // Get list of RFP directories to process
      const rfpDirectories = await this.getRFPDirectories();
      
      if (rfpDirectories.length === 0) {
        systemLogger.info('ℹ️  No RFP directories found to process');
        return [];
      }

      const results = await this.processor.processMultipleRFPs(rfpDirectories);

      systemLogger.info('✅ Document processing completed', {
        processed: results.length,
        successful: results.filter(r => r.metadata.extractionSuccess).length,
      });

      return results;

    } catch (error) {
      systemLogger.error('❌ Document processing failed', { 
        error: error instanceof Error ? error.message : String(error) 
      });
      throw error;
    }
  }

  /**
   * Analyze processed RFPs
   */
  async analyzeRFPs(processingResults: any[]): Promise<any[]> {
    try {
      analyzerLogger.info('🔍 Starting RFP analysis');

      const analysisResults = await this.analyzer.analyzeMultipleRFPs(processingResults);

      // Update database with analysis results
      for (const result of analysisResults) {
        if (result.processingSuccessful) {
          await this.db.updateRFPAnalysis(result.rfpId, result);
        }
      }

      const stats = RFPAnalyzer.getSummaryStatistics(analysisResults);

      analyzerLogger.info('✅ Analysis completed', {
        analyzed: stats.totalAnalyzed,
        successful: stats.successfulAnalyses,
        averageScore: stats.averageScore,
        highRecommendations: stats.recommendationCounts[RECOMMENDATION_LEVELS.HIGH] || 0,
      });

      return analysisResults;

    } catch (error) {
      analyzerLogger.error('❌ Analysis failed', { 
        error: error instanceof Error ? error.message : String(error) 
      });
      throw error;
    }
  }

  /**
   * Generate reports
   */
  async generateReports(analysisResults: any[]): Promise<void> {
    try {
      systemLogger.info('📊 Starting report generation');

      // Generate summary report
      await this.reportGenerator.generateSummaryReport(analysisResults);

      // Generate individual RFP reports for high-scoring ones
      const highScoreRFPs = RFPAnalyzer.filterRFPs(analysisResults, {
        recommendation: RECOMMENDATION_LEVELS.HIGH,
      });

      for (const rfp of highScoreRFPs) {
        await this.reportGenerator.generateIndividualReport(rfp);
      }

      systemLogger.info('✅ Report generation completed');

    } catch (error) {
      systemLogger.error('❌ Report generation failed', { 
        error: error instanceof Error ? error.message : String(error) 
      });
    }
  }

  /**
   * Record run in database
   */
  async recordRun(scrapingResult: any, analysisResults: any[]): Promise<void> {
    try {
      const highScoreCount = analysisResults.filter(r => 
        r.fitAnalysis.recommendation === RECOMMENDATION_LEVELS.HIGH
      ).length;

      await this.db.recordRFPRun({
        runDate: new Date().toISOString(),
        rfpsFound: scrapingResult.rfpsFound.length,
        rfpsDownloaded: scrapingResult.rfpsDownloaded,
        rfpsAnalyzed: analysisResults.filter(r => r.processingSuccessful).length,
        highScoreCount,
      });

    } catch (error) {
      systemLogger.error('Failed to record run', { 
        error: error instanceof Error ? error.message : String(error) 
      });
    }
  }

  /**
   * Cleanup old files
   */
  async cleanup(): Promise<void> {
    try {
      systemLogger.info('🧹 Starting cleanup');

      const result = await this.fileManager.cleanup(30); // 30 days
      
      systemLogger.info('✅ Cleanup completed', {
        deletedFiles: result.deletedFiles,
        freedSpace: Math.round(result.freedSpace / 1024 / 1024) + ' MB',
      });

    } catch (error) {
      systemLogger.warn('Cleanup failed', { 
        error: error instanceof Error ? error.message : String(error) 
      });
    }
  }

  /**
   * Get RFP directories that need processing
   */
  private async getRFPDirectories(): Promise<string[]> {
    // This would scan the RFPs directory for unprocessed directories
    // For now, return empty array - this would be implemented based on actual file structure
    return [];
  }

  /**
   * Get status information
   */
  async getStatus(): Promise<any> {
    try {
      const [dbStats, storageStats] = await Promise.all([
        this.db.getSummaryStats(),
        this.fileManager.getStorageStats(),
      ]);

      return {
        database: dbStats,
        storage: {
          ...storageStats,
          totalSizeMB: Math.round(storageStats.totalSize / 1024 / 1024),
          rfpsSizeMB: Math.round(storageStats.rfpsSize / 1024 / 1024),
        },
        lastUpdate: new Date().toISOString(),
      };

    } catch (error) {
      systemLogger.error('Failed to get status', { 
        error: error instanceof Error ? error.message : String(error) 
      });
      return { error: 'Failed to get status' };
    }
  }

  /**
   * Cleanup resources
   */
  async cleanup_app(): Promise<void> {
    await this.db.close();
    await this.scraper.cleanup();
  }
}

// CLI Setup
const program = new Command();

program
  .name('rfpmart-analyzer')
  .description('Automated RFP discovery and analysis tool for KWALL')
  .version('1.0.0');

program
  .command('run')
  .description('Run the complete RFP analysis workflow')
  .option('--since <date>', 'Only process RFPs since this date (YYYY-MM-DD)')
  .action(async (options) => {
    const app = new RFPMartAnalyzerApp();
    try {
      await app.initialize();
      
      let sinceDate: Date | undefined;
      if (options.since) {
        sinceDate = new Date(options.since);
        if (isNaN(sinceDate.getTime())) {
          console.error('Invalid date format. Use YYYY-MM-DD');
          process.exit(1);
        }
      }

      await app.runCompleteWorkflow(sinceDate);
      console.log('✅ Workflow completed successfully');
      
    } catch (error) {
      console.error('❌ Workflow failed:', error instanceof Error ? error.message : error);
      process.exit(1);
    } finally {
      await app.cleanup_app();
    }
  });

program
  .command('scrape')
  .description('Only scrape new RFPs without processing')
  .option('--since <date>', 'Only scrape RFPs since this date (YYYY-MM-DD)')
  .action(async (options) => {
    const app = new RFPMartAnalyzerApp();
    try {
      await app.initialize();
      
      let sinceDate: Date | undefined;
      if (options.since) {
        sinceDate = new Date(options.since);
      }

      await app.scrapeRFPs(sinceDate);
      console.log('✅ Scraping completed');
      
    } catch (error) {
      console.error('❌ Scraping failed:', error instanceof Error ? error.message : error);
      process.exit(1);
    } finally {
      await app.cleanup_app();
    }
  });

program
  .command('status')
  .description('Show system status and statistics')
  .action(async () => {
    const app = new RFPMartAnalyzerApp();
    try {
      await app.initialize();
      const status = await app.getStatus();
      console.log(JSON.stringify(status, null, 2));
    } catch (error) {
      console.error('❌ Failed to get status:', error instanceof Error ? error.message : error);
      process.exit(1);
    } finally {
      await app.cleanup_app();
    }
  });

program
  .command('cleanup')
  .description('Clean up old files and data')
  .option('--days <number>', 'Clean files older than this many days', '30')
  .action(async (options) => {
    const app = new RFPMartAnalyzerApp();
    try {
      await app.initialize();
      await app.cleanup();
      console.log('✅ Cleanup completed');
    } catch (error) {
      console.error('❌ Cleanup failed:', error instanceof Error ? error.message : error);
      process.exit(1);
    } finally {
      await app.cleanup_app();
    }
  });

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  systemLogger.error('Uncaught exception', { error: error.message, stack: error.stack });
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  systemLogger.error('Unhandled rejection', { reason, promise });
  process.exit(1);
});

// Run CLI
if (require.main === module) {
  program.parse();
}