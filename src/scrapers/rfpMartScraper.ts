import { chromium, Browser, Page } from 'playwright';
import * as path from 'path';
import fs from 'fs-extra';
import { config } from '../config/environment';
import { RFP_MART, FILE_HANDLING, ERROR_MESSAGES } from '../config/constants';
import { scraperLogger } from '../utils/logger';
import { parseRFPDate, isRecentPosting, formatDateForFile } from '../utils/dateHelper';
import { AuthManager } from './authManager';
import { FileExtractor } from '../utils/fileExtractor';
import { AIAnalyzer } from '../services/aiAnalyzer';
import { FitReportGenerator } from '../services/fitReportGenerator';
import { RFPCleanupManager } from '../services/rfpCleanupManager';
import { DatabaseManager } from '../storage/database';

export interface RFPListing {
  id: string;
  title: string;
  postedDate?: string;
  dueDate?: string;
  downloadUrl?: string;
  detailUrl?: string;
  institution?: string;
  description?: string;
}

export interface ScrapingResult {
  rfpsFound: RFPListing[];
  rfpsDownloaded: number;
  rfpsAnalyzed: number;
  goodFitRFPs: number;
  cleanedUpRFPs: number;
  errors: string[];
  lastRunDate: Date;
}

export class RFPMartScraper {
  private browser?: Browser;
  private page?: Page;
  private authManager?: AuthManager;
  private downloadPath: string;
  private aiAnalyzer: AIAnalyzer;
  private reportGenerator: FitReportGenerator;
  private cleanupManager: RFPCleanupManager;
  private databaseManager: DatabaseManager;

  constructor() {
    this.downloadPath = config.storage.rfpsDirectory;
    this.aiAnalyzer = new AIAnalyzer();
    this.reportGenerator = new FitReportGenerator();
    this.cleanupManager = new RFPCleanupManager();
    this.databaseManager = new DatabaseManager();
  }

  /**
   * Initialize the scraper with browser and authentication
   */
  async initialize(): Promise<void> {
    try {
      scraperLogger.info('Initializing RFP Mart scraper');

      // Ensure download directory exists
      await fs.ensureDir(this.downloadPath);

      // Launch browser with appropriate settings
      this.browser = await chromium.launch({
        headless: config.nodeEnv === 'production',
        slowMo: config.nodeEnv === 'development' ? 100 : 0,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-web-security',
        ],
      });

      // Create new page with download handling
      this.page = await this.browser.newPage();
      
      // Set up download handling
      await this.page.route('**/*', async (route) => {
        const request = route.request();
        const url = request.url();
        
        // Check if this is a file download
        if (this.isDownloadableFile(url)) {
          scraperLogger.debug('Intercepted potential download', { url });
        }
        
        await route.continue();
      });

      // Set up download behavior
      const client = await this.page.context().newCDPSession(this.page);
      await client.send('Page.setDownloadBehavior', {
        behavior: 'allow',
        downloadPath: this.downloadPath,
      });

      // Initialize authentication manager
      this.authManager = new AuthManager(this.page);

      // Initialize database
      await this.databaseManager.initialize();

      scraperLogger.info('RFP Mart scraper initialized successfully');

    } catch (error) {
      scraperLogger.error('Failed to initialize scraper', { error: error instanceof Error ? error.message : String(error) });
      throw error;
    }
  }

  /**
   * Main scraping method to find and download new RFPs
   */
  async scrapeNewRFPs(sinceDate?: Date): Promise<ScrapingResult> {
    if (!this.page || !this.authManager) {
      throw new Error('Scraper not initialized');
    }

    const result: ScrapingResult = {
      rfpsFound: [],
      rfpsDownloaded: 0,
      rfpsAnalyzed: 0,
      goodFitRFPs: 0,
      cleanedUpRFPs: 0,
      errors: [],
      lastRunDate: new Date(),
    };

    try {
      scraperLogger.info('Starting RFP scraping process', { sinceDate });

      // Ensure we are authenticated
      const authenticated = await this.authManager.ensureAuthenticated();
      if (!authenticated) {
        throw new Error(ERROR_MESSAGES.LOGIN_FAILED);
      }

      // Navigate to RFP listing page
      await this.navigateToRFPListing();

      // Extract RFP listings
      const listings = await this.extractRFPListings();
      scraperLogger.info(`Found ${listings.length} RFPs on listing page`);

      // Filter for new RFPs if sinceDate provided
      const filteredListings = sinceDate 
        ? listings.filter(rfp => this.isNewRFP(rfp, sinceDate))
        : listings;

      scraperLogger.info(`${filteredListings.length} RFPs match criteria for download`);
      result.rfpsFound = filteredListings;

      // Download each RFP
      for (const rfp of filteredListings) {
        try {
          const downloaded = await this.downloadRFP(rfp);
          if (downloaded) {
            result.rfpsDownloaded++;
            scraperLogger.info(`Successfully downloaded RFP: ${rfp.title}`);
          }
        } catch (error) {
          const errorMsg = `Failed to download RFP ${rfp.id}: ${error instanceof Error ? error.message : String(error)}`;
          result.errors.push(errorMsg);
          scraperLogger.error(errorMsg);
        }
      }

      // Perform AI analysis on downloaded RFPs if downloads were successful
      if (result.rfpsDownloaded > 0) {
        await this.performAIAnalysis(filteredListings, result);
      }

      scraperLogger.info('RFP scraping completed', {
        found: result.rfpsFound.length,
        downloaded: result.rfpsDownloaded,
        analyzed: result.rfpsAnalyzed,
        goodFit: result.goodFitRFPs,
        cleanedUp: result.cleanedUpRFPs,
        errors: result.errors.length,
      });

      return result;

    } catch (error) {
      const errorMsg = `Scraping failed: ${error instanceof Error ? error.message : String(error)}`;
      result.errors.push(errorMsg);
      scraperLogger.error(errorMsg);
      throw error;
    }
  }

  /**
   * Navigate to the RFP listing page
   */
  private async navigateToRFPListing(): Promise<void> {
    if (!this.page) throw new Error('Page not initialized');

    try {
      scraperLogger.info('Navigating to RFP listing page', { url: config.rfpMart.categoryUrl });

      await this.page.goto(config.rfpMart.categoryUrl, {
        waitUntil: 'networkidle',
        timeout: RFP_MART.WAIT_TIMES.NAVIGATION,
      });

      // Wait for RFP listings to load - try multiple possible selectors
      try {
        await this.page.waitForSelector(RFP_MART.SELECTORS.RFP_LISTING.CONTAINER, {
          timeout: RFP_MART.WAIT_TIMES.PAGE_LOAD,
        });
      } catch (error) {
        // Fallback to alternative selectors if the primary fails
        scraperLogger.warn('Primary selector failed, trying fallback selectors');
        await this.page.waitForSelector('.rfp-list, .contract-list, .opportunity-list, #home, .content, body', {
          timeout: RFP_MART.WAIT_TIMES.PAGE_LOAD,
        });
      }

      scraperLogger.info('Successfully navigated to RFP listing page');

    } catch (error) {
      scraperLogger.error(ERROR_MESSAGES.NAVIGATION_FAILED, { error: error instanceof Error ? error.message : String(error) });
      throw error;
    }
  }

  /**
   * Get geographic RFP page URLs from category page
   */
  private async getGeographicRFPPages(): Promise<string[]> {
    if (!this.page) throw new Error('Page not initialized');

    try {
      scraperLogger.info('Extracting geographic RFP page URLs');
      
      // Look for geographic links (USA, state-specific pages)
      const geographicLinks = await this.page.$$('a[href*="usa"][href*="rfp"]');
      const urls: string[] = [];
      
      for (const link of geographicLinks) {
        const href = await link.getAttribute('href');
        if (href && !href.includes('state-name') && !href.includes('usa-usa')) {
          const fullUrl = href.startsWith('http') ? href : `${RFP_MART.BASE_URL}${href.startsWith('/') ? '' : '/'}${href}`;
          urls.push(fullUrl);
        }
      }
      
      // Prioritize USA main page and larger states
      const priorityUrls = urls.filter(url => 
        url.includes('usa-rfp-bids.html') || 
        url.includes('california') || 
        url.includes('texas') || 
        url.includes('florida') || 
        url.includes('new-york')
      );
      
      const finalUrls = priorityUrls.length > 0 ? priorityUrls.slice(0, 3) : urls.slice(0, 5);
      
      scraperLogger.info(`Found ${urls.length} geographic pages, using ${finalUrls.length} priority pages`);
      return finalUrls;
      
    } catch (error) {
      scraperLogger.error('Failed to extract geographic RFP pages', { error: error instanceof Error ? error.message : String(error) });
      return [];
    }
  }

  /**
   * Extract RFP listings from the current page
   */
  private async extractRFPListings(): Promise<RFPListing[]> {
    if (!this.page) throw new Error('Page not initialized');

    const listings: RFPListing[] = [];

    try {
      // Get all RFP items on the page
      const rfpItems = await this.page.$$(RFP_MART.SELECTORS.RFP_LISTING.ITEM);
      
      scraperLogger.debug(`Found ${rfpItems.length} RFP items to process`);

      for (let i = 0; i < rfpItems.length; i++) {
        const item = rfpItems[i];
        
        try {
          const rfp = await this.extractRFPData(item, i);
          if (rfp) {
            listings.push(rfp);
          }
        } catch (error) {
          scraperLogger.warn(`Failed to extract data from RFP item ${i}`, { error: error instanceof Error ? error.message : String(error) });
        }
      }

      // Check if there are more pages and handle pagination if needed
      const hasNextPage = await this.page.$(RFP_MART.SELECTORS.RFP_LISTING.NEXT_PAGE);
      if (hasNextPage) {
        scraperLogger.info('Multiple pages detected, pagination handling needed');
        // TODO: Implement pagination handling if required
      }

      return listings;

    } catch (error) {
      scraperLogger.error('Failed to extract RFP listings', { error: error instanceof Error ? error.message : String(error) });
      return [];
    }
  }

  /**
   * Extract data from a single RFP item
   */
  private async extractRFPData(element: any, index: number): Promise<RFPListing | null> {
    try {
      // Extract title and detail link from the first div (.rfpmartIN-descriptionCategory)
      const titleElement = await element.$(RFP_MART.SELECTORS.RFP_LISTING.TITLE);
      if (!titleElement) {
        scraperLogger.warn(`No title element found for RFP item ${index}`);
        return null;
      }

      const title = await titleElement.textContent();
      const detailUrl = await titleElement.getAttribute('href');

      if (!title || !detailUrl) {
        scraperLogger.warn(`Missing title or detail URL for RFP item ${index}`);
        return null;
      }

      // Extract dates from the second div
      const dateElement = await element.$(RFP_MART.SELECTORS.RFP_LISTING.DATE_POSTED);
      const dateText = dateElement ? await dateElement.textContent() : '';

      // Parse the date text to extract posted date and expiry date
      let postedDate = null;
      let dueDate = null;

      if (dateText) {
        // The date text contains both "Posted Date" and "Expiry Date"
        // Example: "Posted Date Thursday, 30 October, 2025 Expiry Date Friday, 5 December, 2025"
        
        const postedMatch = dateText.match(/Posted Date\s+(.+?)\s+Expiry Date/);
        if (postedMatch) {
          postedDate = postedMatch[1].trim();
        }

        const expiryMatch = dateText.match(/Expiry Date\s+(.+?)$/);
        if (expiryMatch) {
          dueDate = expiryMatch[1].trim();
        }
      }

      // Generate RFP ID from title and date
      const id = this.generateRFPId(title, postedDate);

      // Create full detail URL
      const fullDetailUrl = detailUrl.startsWith('http') ? detailUrl : `${RFP_MART.BASE_URL}/${detailUrl}`;

      const rfp: RFPListing = {
        id: id.trim(),
        title: title.trim(),
        postedDate: postedDate?.trim(),
        dueDate: dueDate?.trim(),
        downloadUrl: undefined, // Will be populated when we navigate to detail page
        detailUrl: fullDetailUrl,
      };

      scraperLogger.debug('Extracted RFP data', { rfp });
      return rfp;

    } catch (error) {
      scraperLogger.warn(`Failed to extract RFP data for item ${index}`, { error: error instanceof Error ? error.message : String(error) });
      return null;
    }
  }

  /**
   * Download an RFP document
   */
  private async downloadRFP(rfp: RFPListing): Promise<boolean> {
    if (!this.page || !rfp.detailUrl) {
      scraperLogger.warn(`No detail URL for RFP: ${rfp.id}`);
      return false;
    }

    try {
      scraperLogger.info(`Processing RFP: ${rfp.title}`, { rfpId: rfp.id, detailUrl: rfp.detailUrl });

      // Navigate to the RFP detail page
      await this.page.goto(rfp.detailUrl, {
        waitUntil: 'networkidle',
        timeout: RFP_MART.WAIT_TIMES.NAVIGATION,
      });

      // Wait a moment for the page to load
      await this.page.waitForTimeout(3000);

      // Look for download links on the detail page
      const downloadLinks = await this.page.$$('a[href*="files.rfpmart.com"]');
      
      if (downloadLinks.length === 0) {
        scraperLogger.warn(`No download links found on detail page for RFP: ${rfp.id}`);
        return false;
      }

      const downloadUrl = await downloadLinks[0].getAttribute('href');
      if (!downloadUrl) {
        scraperLogger.warn(`Download link has no href for RFP: ${rfp.id}`);
        return false;
      }

      scraperLogger.info(`Found download link: ${downloadUrl}`, { rfpId: rfp.id });

      // Create directory for this RFP with absolute path resolution
      const rfpDir = this.createRFPDirectory(rfp);
      const absoluteRfpDir = path.resolve(rfpDir);
      
      // Ensure directory creation with proper permissions
      await fs.ensureDir(absoluteRfpDir, { mode: 0o755 });
      
      // Verify directory was created
      const dirExists = await fs.pathExists(absoluteRfpDir);
      if (!dirExists) {
        scraperLogger.error(`Failed to create RFP directory: ${absoluteRfpDir}`, {
          originalPath: rfpDir,
          workingDirectory: process.cwd(),
          nodeEnv: process.env.NODE_ENV
        });
        return false;
      }
      
      scraperLogger.info(`Created RFP directory: ${absoluteRfpDir}`, { 
        rfpId: rfp.id,
        relativePath: rfpDir,
        permissions: '0o755'
      });

      // Set up download listener
      const downloadPromise = this.page.waitForEvent('download', { timeout: FILE_HANDLING.DOWNLOAD_TIMEOUT });

      // Click the download link
      await downloadLinks[0].click();

      // Wait for download to start
      const download = await downloadPromise;
      
      // Get suggested filename and create absolute download path
      const suggestedFilename = download.suggestedFilename();
      const downloadPath = path.resolve(absoluteRfpDir, suggestedFilename);
      
      // Ensure the directory still exists just before saving
      await fs.ensureDir(path.dirname(downloadPath), { mode: 0o755 });
      
      scraperLogger.info(`Attempting to save download to: ${downloadPath}`, { 
        rfpId: rfp.id,
        suggestedFilename,
        absoluteDir: absoluteRfpDir,
        workingDir: process.cwd(),
        isGitHubActions: !!process.env.GITHUB_ACTIONS
      });

      // Save the download to the RFP directory with enhanced error handling
      try {
        await download.saveAs(downloadPath);
        
        // Verify the file was actually saved
        const fileExists = await fs.pathExists(downloadPath);
        if (!fileExists) {
          throw new Error(`File was not created at expected location: ${downloadPath}`);
        }
        
        const stats = await fs.stat(downloadPath);
        scraperLogger.info(`File saved successfully`, {
          rfpId: rfp.id,
          path: downloadPath,
          size: stats.size,
          mode: `0o${(stats.mode & parseInt('777', 8)).toString(8)}`
        });
        
      } catch (error) {
        const errorContext = {
          rfpId: rfp.id,
          downloadPath,
          absoluteRfpDir,
          suggestedFilename,
          dirExists: await fs.pathExists(absoluteRfpDir),
          parentDirExists: await fs.pathExists(path.dirname(downloadPath)),
          workingDirectory: process.cwd(),
          userId: process.getuid?.(),
          groupId: process.getgid?.(),
          nodeEnv: process.env.NODE_ENV,
          githubActions: process.env.GITHUB_ACTIONS,
          runnerWorkspace: process.env.GITHUB_WORKSPACE,
          error: error instanceof Error ? error.message : String(error)
        };
        
        scraperLogger.error(`Failed to save download with enhanced diagnostics`, errorContext);
        
        // Try alternative download strategy for GitHub Actions
        if (process.env.GITHUB_ACTIONS) {
          try {
            scraperLogger.info(`Attempting GitHub Actions fallback download strategy`, { rfpId: rfp.id });
            
            // Create a temporary file first, then move it
            const tempPath = path.join('/tmp', `rfp-${rfp.id}-${Date.now()}-${suggestedFilename}`);
            await download.saveAs(tempPath);
            
            // Verify temp file exists
            if (await fs.pathExists(tempPath)) {
              await fs.move(tempPath, downloadPath);
              scraperLogger.info(`Successfully used fallback download strategy`, { 
                rfpId: rfp.id,
                tempPath,
                finalPath: downloadPath 
              });
            } else {
              throw new Error(`Fallback temp file creation failed: ${tempPath}`);
            }
          } catch (fallbackError) {
            scraperLogger.error(`Fallback download strategy also failed`, {
              rfpId: rfp.id,
              originalError: error instanceof Error ? error.message : String(error),
              fallbackError: fallbackError instanceof Error ? fallbackError.message : String(fallbackError)
            });
            throw error; // Re-throw original error
          }
        } else {
          throw error;
        }
      }

      scraperLogger.info(`Successfully downloaded RFP to ${downloadPath}`);

      // Extract ZIP files if any were downloaded
      const extractionResult = await FileExtractor.extractZipFiles(rfpDir);
      if (extractionResult.extractedFiles.length > 0) {
        scraperLogger.info(`Extracted ${extractionResult.extractedFiles.length} files from downloaded archives`);
      }
      if (extractionResult.errors.length > 0) {
        scraperLogger.warn(`Extraction errors: ${extractionResult.errors.join(', ')}`);
      }

      // Update RFP object with download URL for metadata
      rfp.downloadUrl = downloadUrl;

      // Save RFP metadata
      await this.saveRFPMetadata(rfp, rfpDir);

      return true;

    } catch (error) {
      scraperLogger.error(`Failed to download RFP ${rfp.id}`, { error: error instanceof Error ? error.message : String(error) });
      return false;
    }
  }

  /**
   * Create directory name for RFP
   */
  private createRFPDirectory(rfp: RFPListing): string {
    const sanitizedTitle = rfp.title.replace(/[^a-zA-Z0-9\s-]/g, '').replace(/\s+/g, '-').substring(0, 50);
    const dueDate = rfp.dueDate ? formatDateForFile(parseRFPDate(rfp.dueDate) || new Date()) : 'no-date';
    const dirName = `${rfp.id}-${sanitizedTitle}-${dueDate}`;
    
    return path.join(this.downloadPath, dirName);
  }

  /**
   * Save RFP metadata to JSON file
   */
  private async saveRFPMetadata(rfp: RFPListing, directory: string): Promise<void> {
    const metadataPath = path.join(directory, 'metadata.json');
    const metadata = {
      ...rfp,
      downloadDate: new Date().toISOString(),
      directory,
    };

    await fs.writeJson(metadataPath, metadata, { spaces: 2 });
  }

  /**
   * Check if RFP is new based on posted date
   */
  private isNewRFP(rfp: RFPListing, sinceDate: Date): boolean {
    if (!rfp.postedDate) {
      return true; // If no date, consider it new
    }

    const postedDate = parseRFPDate(rfp.postedDate);
    if (!postedDate) {
      return true; // If can't parse date, consider it new
    }

    return postedDate >= sinceDate;
  }

  /**
   * Generate RFP ID from title and date
   */
  private generateRFPId(title: string, postedDate?: string | null): string {
    const titlePart = title.replace(/[^a-zA-Z0-9]/g, '').substring(0, 10).toUpperCase();
    const datePart = postedDate ? parseRFPDate(postedDate)?.getTime().toString().slice(-6) : 'NODATE';
    return `RFP-${titlePart}-${datePart}`;
  }

  /**
   * Check if URL points to a downloadable file
   */
  private isDownloadableFile(url: string): boolean {
    const lowercaseUrl = url.toLowerCase();
    return FILE_HANDLING.ALLOWED_EXTENSIONS.some(ext => lowercaseUrl.includes(ext));
  }

  /**
   * Perform AI analysis on downloaded RFPs
   */
  private async performAIAnalysis(rfps: RFPListing[], result: ScrapingResult): Promise<void> {
    try {
      scraperLogger.info('Starting AI analysis of downloaded RFPs', { count: rfps.length });

      const analysisResults = new Map();
      const fitReports = [];

      // Analyze each RFP
      for (const rfp of rfps) {
        try {
          const rfpDir = this.createRFPDirectory(rfp);
          
          // Check if RFP directory exists (was downloaded)
          if (!await fs.pathExists(rfpDir)) {
            continue;
          }

          // Perform AI analysis
          const analysis = await this.aiAnalyzer.analyzeRFPFit(rfp, rfpDir);
          analysisResults.set(rfp.id, analysis);
          result.rfpsAnalyzed++;

          // Save analysis to database
          await this.databaseManager.saveAIAnalysis(
            rfp.id, 
            analysis, 
            config.ai.provider, 
            config.ai.openai?.model || 'gpt-4'
          );

          // Generate fit report for good fits
          if (analysis.fitRating === 'excellent' || analysis.fitRating === 'good') {
            const fitReport = await this.reportGenerator.generateFitReport(rfp, analysis, rfpDir);
            fitReports.push(fitReport);
            result.goodFitRFPs++;
            
            scraperLogger.info(`Generated fit report for good RFP: ${rfp.id}`, {
              fitScore: analysis.fitScore,
              fitRating: analysis.fitRating
            });
          }

        } catch (error) {
          const errorMsg = `Failed to analyze RFP ${rfp.id}: ${error instanceof Error ? error.message : String(error)}`;
          result.errors.push(errorMsg);
          scraperLogger.error(errorMsg);
        }
      }

      // Generate summary report
      if (fitReports.length > 0) {
        await this.reportGenerator.generateSummaryReport(fitReports, config.storage.reportsDirectory);
      }

      // Cleanup poor-fit RFPs if enabled
      if (config.ai.cleanup.poorFits || config.ai.cleanup.rejected) {
        const cleanupResult = await this.cleanupManager.cleanupRFPs(
          analysisResults, 
          this.downloadPath,
          {
            cleanupPoorFits: config.ai.cleanup.poorFits,
            cleanupRejected: config.ai.cleanup.rejected,
            preserveReports: true,
            preserveMetadata: true
          }
        );

        result.cleanedUpRFPs = cleanupResult.cleaned;

        // Generate cleanup report
        await this.cleanupManager.generateCleanupReport(cleanupResult, config.storage.reportsDirectory);

        scraperLogger.info('RFP cleanup completed', {
          cleaned: cleanupResult.cleaned,
          preserved: cleanupResult.preserved,
          errors: cleanupResult.errors.length
        });
      }

      scraperLogger.info('AI analysis completed', {
        analyzed: result.rfpsAnalyzed,
        goodFit: result.goodFitRFPs,
        cleanedUp: result.cleanedUpRFPs
      });

    } catch (error) {
      const errorMsg = `AI analysis failed: ${error instanceof Error ? error.message : String(error)}`;
      result.errors.push(errorMsg);
      scraperLogger.error(errorMsg);
    }
  }

  /**
   * Clean up browser resources
   */
  async cleanup(): Promise<void> {
    try {
      if (this.authManager) {
        await this.authManager.logout();
      }

      if (this.page) {
        await this.page.close();
      }

      if (this.browser) {
        await this.browser.close();
      }

      if (this.databaseManager) {
        await this.databaseManager.close();
      }

      scraperLogger.info('Scraper cleanup completed');

    } catch (error) {
      scraperLogger.warn('Error during cleanup', { error: error instanceof Error ? error.message : String(error) });
    }
  }
}