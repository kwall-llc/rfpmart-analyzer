#!/usr/bin/env node

import { Command } from 'commander';
import { config, ensureDirectories } from './config/environment';
import { systemLogger, scraperLogger, analyzerLogger } from './utils/logger';
import { RFPMartScraper } from './scrapers/rfpMartScraper';
import { RFPProcessor } from './processors/rfpProcessor';
import { RFPAnalyzer } from './analyzers/rfpAnalyzer';
import { DatabaseManager } from './storage/database';
import { FileManager } from './storage/fileManager';
import { DataPersistenceManager } from './storage/dataPersistence';
import { ReportGenerator } from './analyzers/reportGenerator';
import { rssParser } from './services/rssFeedParser';
import { aiPreFilter } from './services/aiPreFilter';
import { SUCCESS_MESSAGES, RECOMMENDATION_LEVELS } from './config/constants';
import fs from 'fs-extra';
import * as path from 'path';

class RFPMartAnalyzerApp {
  private db: DatabaseManager;
  private fileManager: FileManager;
  private persistenceManager: DataPersistenceManager;
  private scraper: RFPMartScraper;
  private processor: RFPProcessor;
  private analyzer: RFPAnalyzer;
  private reportGenerator: ReportGenerator;

  constructor() {
    this.db = new DatabaseManager();
    this.fileManager = new FileManager();
    this.persistenceManager = new DataPersistenceManager();
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

      // Initialize persistence manager first
      await this.persistenceManager.initialize();

      // Check for persistent data and merge if available
      const persistentState = await this.persistenceManager.checkPersistentDataState();
      if (persistentState) {
        systemLogger.info('📥 Found persistent database', {
          records: persistentState.recordCount,
          size: persistentState.fileSize,
          lastModified: persistentState.lastModified
        });

        // Download and merge persistent data
        const downloadResult = await this.persistenceManager.downloadPersistentData();
        if (downloadResult.success) {
          systemLogger.info('✅ Downloaded persistent database', { message: downloadResult.message });
        } else {
          systemLogger.warn('⚠️ Failed to download persistent database', { 
            error: downloadResult.error 
          });
        }
      } else {
        systemLogger.info('ℹ️ No persistent database found - starting fresh');
      }

      // Initialize components
      await this.db.initialize();
      await this.fileManager.initialize();

      // Merge persistent data if we have it
      if (persistentState) {
        const mergeResult = await this.persistenceManager.mergePersistentData();
        if (mergeResult.success) {
          systemLogger.info('🔄 Merged persistent data', { message: mergeResult.message });
        } else {
          systemLogger.warn('⚠️ Failed to merge persistent data', { 
            error: mergeResult.error 
          });
        }
      }

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
      systemLogger.info('🔄 Starting complete RFP analysis workflow with RSS optimization');

      // Step 1: Scrape new RFPs using optimized workflow
      const scrapingResult = await this.scrapeRFPsOptimized(sinceDate);
      
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

      // Step 6: Upload updated database to persistent storage
      const uploadResult = await this.persistenceManager.uploadPersistentData();
      if (uploadResult.success) {
        systemLogger.info('📤 Uploaded updated database to persistent storage', { 
          message: uploadResult.message 
        });
      } else {
        systemLogger.warn('⚠️ Failed to upload database to persistent storage', { 
          error: uploadResult.error 
        });
      }

      // Step 7: Cleanup old files
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
   * Optimized RSS-guided RFP scraping workflow
   */
  async scrapeRFPsOptimized(sinceDate?: Date): Promise<any> {
    try {
      scraperLogger.info('🚀 Starting optimized RSS-guided RFP scraping');

      // Get last run date if not provided
      if (!sinceDate) {
        sinceDate = await this.db.getLastRunDate() || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000); // 7 days ago
      }

      // Step 1: Parse RSS feed for recent RFPs
      scraperLogger.info(`📡 Fetching RSS feed entries since ${sinceDate.toISOString()}`);
      const rssItems = await rssParser.getLatestRFPs(sinceDate, 50);
      
      if (rssItems.length === 0) {
        scraperLogger.info('No new RFP entries found in RSS feed');
        return {
          rfpsFound: [],
          rfpsDownloaded: 0,
          rfpsAnalyzed: 0,
          goodFitRFPs: 0,
          cleanedUpRFPs: 0,
          errors: [],
          lastRunDate: new Date(),
          optimizedWorkflow: true,
          rssItemsFound: 0,
          aiFiltered: 0
        };
      }

      scraperLogger.info(`📰 Found ${rssItems.length} RSS entries to evaluate`);

      // Step 2: AI pre-filter to identify promising RFPs
      scraperLogger.info('🤖 Running AI pre-filter on RSS entries');
      const promisingUrls = await aiPreFilter.getPromisingRFPUrls(rssItems, 15);
      
      scraperLogger.info(`🎯 AI identified ${promisingUrls.length} promising RFPs from ${rssItems.length} entries`);
      
      if (promisingUrls.length === 0) {
        scraperLogger.info('No promising RFPs identified by AI filter');
        return {
          rfpsFound: [],
          rfpsDownloaded: 0,
          rfpsAnalyzed: 0,
          goodFitRFPs: 0,
          cleanedUpRFPs: 0,
          errors: [],
          lastRunDate: new Date(),
          optimizedWorkflow: true,
          rssItemsFound: rssItems.length,
          aiFiltered: 0
        };
      }

      // Step 3: Targeted scraping of promising URLs
      scraperLogger.info(`🕷️  Starting targeted scraping of ${promisingUrls.length} promising URLs`);
      
      // Log the specific URLs being scraped for transparency
      if (promisingUrls.length > 0) {
        scraperLogger.info(`🎯 Targeting these promising RFPs:`);
        promisingUrls.forEach((url, index) => {
          scraperLogger.info(`  ${index + 1}. ${url}`);
        });
      }
      
      await this.scraper.initialize();
      
      const result = await this.scraper.scrapeSpecificRFPs(promisingUrls);

      // Add optimization metrics to result
      const optimizedResult = {
        ...result,
        optimizedWorkflow: true,
        rssItemsFound: rssItems.length,
        aiFiltered: promisingUrls.length,
        efficiency: rssItems.length > 0 ? Math.round((promisingUrls.length / rssItems.length) * 100) : 0
      };

      scraperLogger.info('✅ Optimized scraping completed', {
        rssItemsFound: rssItems.length,
        aiFiltered: promisingUrls.length,
        efficiency: `${optimizedResult.efficiency}%`,
        found: result.rfpsFound.length,
        downloaded: result.rfpsDownloaded,
        errors: result.errors.length,
      });

      return optimizedResult;

    } catch (error) {
      scraperLogger.error('❌ Optimized scraping failed', { error: error instanceof Error ? error.message : String(error) });
      throw error;
    }
  }

  /**
   * Traditional RFP scraping (fallback method)
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

      // Get RFPs with documents from database (in-memory processing already completed during scraping)
      const rfpsWithDocuments = await this.db.getRFPsWithDocuments();

      if (rfpsWithDocuments.length === 0) {
        systemLogger.info('ℹ️  No RFPs with documents found to process');
        return [];
      }

      systemLogger.info(`🔍 Processing ${rfpsWithDocuments.length} RFPs with documents`);

      // Convert database records to format expected by analyzer
      const results = rfpsWithDocuments.map(rfp => {
        try {
          // Validate documents before processing
          const validDocuments = (rfp.documents || []).filter(doc => {
            if (!doc.fullTextContent) {
              systemLogger.warn('⚠️ Document has no content', {
                rfpId: rfp.id,
                filename: doc.filename,
                hasFilename: !!doc.filename,
                contentType: typeof doc.fullTextContent
              });
              return false;
            }
            return true;
          });

          if (validDocuments.length !== (rfp.documents?.length || 0)) {
            systemLogger.info(`📄 RFP ${rfp.id}: Using ${validDocuments.length} valid documents out of ${rfp.documents?.length || 0} total`);
          }

          return {
            rfpId: rfp.id,
            extractedDocuments: validDocuments.map(doc => {
              const safeContent = doc.fullTextContent || '';
              return {
                filename: doc.filename,
                text: safeContent,
                wordCount: safeContent.split(/\s+/).filter(word => word.length > 0).length,
                characterCount: safeContent.length,
                type: doc.mimeType || 'unknown'
              };
            }),
            combinedText: validDocuments.map(doc => doc.fullTextContent || '').join('\n\n'),
            metadata: {
              extractionSuccess: validDocuments.length > 0,
              totalWords: validDocuments.reduce((sum, doc) => {
                const safeContent = doc.fullTextContent || '';
                return sum + safeContent.split(/\s+/).filter(word => word.length > 0).length;
              }, 0),
              hasDocuments: validDocuments.length > 0
            }
          };
        } catch (docError) {
          systemLogger.error('❌ Error processing RFP documents', {
            rfpId: rfp.id,
            error: docError instanceof Error ? docError.message : String(docError)
          });

          // Return a safe fallback object
          return {
            rfpId: rfp.id,
            extractedDocuments: [],
            combinedText: '',
            metadata: {
              extractionSuccess: false,
              totalWords: 0,
              hasDocuments: false
            }
          };
        }
      });

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
    try {
      // Check if RFPs directory exists
      if (!await fs.pathExists(config.storage.rfpsDirectory)) {
        systemLogger.info('RFPs directory does not exist yet');
        return [];
      }

      // Get all directories in the RFPs folder
      const items = await fs.readdir(config.storage.rfpsDirectory, { withFileTypes: true });
      const directories = items
        .filter(item => item.isDirectory())
        .map(item => path.join(config.storage.rfpsDirectory, item.name));

      systemLogger.info(`Found ${directories.length} RFP directories for processing`);
      return directories;

    } catch (error) {
      systemLogger.error('Failed to get RFP directories', { 
        error: error instanceof Error ? error.message : String(error) 
      });
      return [];
    }
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
  .description('Scrape new RFPs using optimized RSS-guided workflow')
  .option('--since <date>', 'Only scrape RFPs since this date (YYYY-MM-DD)')
  .option('--traditional', 'Use traditional scraping instead of RSS-guided workflow')
  .action(async (options) => {
    const app = new RFPMartAnalyzerApp();
    try {
      await app.initialize();
      
      let sinceDate: Date | undefined;
      if (options.since) {
        sinceDate = new Date(options.since);
      }

      // Use optimized workflow by default, traditional if requested
      const scrapingResult = options.traditional 
        ? await app.scrapeRFPs(sinceDate)
        : await app.scrapeRFPsOptimized(sinceDate);
        
      console.log('✅ Scraping completed:', scrapingResult);
      
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