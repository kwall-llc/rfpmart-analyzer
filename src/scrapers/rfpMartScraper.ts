import { chromium, Browser, Page } from 'playwright';
import * as path from 'path';
import fs from 'fs-extra';
import { config } from '../config/environment';
import { RFP_MART, FILE_HANDLING, ERROR_MESSAGES } from '../config/constants';
import { scraperLogger } from '../utils/logger';
import { parseRFPDate, isRecentPosting, formatDateForFile } from '../utils/dateHelper';
import { AuthManager } from './authManager';

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
  errors: string[];
  lastRunDate: Date;
}

export class RFPMartScraper {
  private browser?: Browser;
  private page?: Page;
  private authManager?: AuthManager;
  private downloadPath: string;

  constructor() {
    this.downloadPath = config.storage.rfpsDirectory;
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

      scraperLogger.info('RFP scraping completed', {
        found: result.rfpsFound.length,
        downloaded: result.rfpsDownloaded,
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

      // Wait for RFP listings to load
      await this.page.waitForSelector(RFP_MART.SELECTORS.RFP_LISTING.CONTAINER, {
        timeout: RFP_MART.WAIT_TIMES.PAGE_LOAD,
      });

      scraperLogger.info('Successfully navigated to RFP listing page');

    } catch (error) {
      scraperLogger.error(ERROR_MESSAGES.NAVIGATION_FAILED, { error: error instanceof Error ? error.message : String(error) });
      throw error;
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
      // Extract title - try multiple approaches
      let title = null;
      
      // First, try to find a title element within the current element
      const titleElement = await element.$(RFP_MART.SELECTORS.RFP_LISTING.TITLE);
      if (titleElement) {
        title = await titleElement.textContent();
      }
      
      // If that didn't work, check if the element itself is a title element (h4)
      if (!title) {
        const tagName = await element.evaluate((el: any) => el.tagName?.toLowerCase());
        if (tagName === 'h4') {
          title = await element.textContent();
        }
      }
      
      // If still no title, try to get text from a link within the element
      if (!title) {
        const linkElement = await element.$('a[href*="usa"][href*="rfp.html"]');
        if (linkElement) {
          title = await linkElement.textContent();
        }
      }

      if (!title) {
        scraperLogger.warn(`No title found for RFP item ${index}`);
        return null;
      }

      // Extract dates
      const postedDateElement = await element.$(RFP_MART.SELECTORS.RFP_LISTING.DATE_POSTED);
      const postedDate = postedDateElement ? await postedDateElement.textContent() : null;

      const dueDateElement = await element.$(RFP_MART.SELECTORS.RFP_LISTING.DUE_DATE);
      const dueDate = dueDateElement ? await dueDateElement.textContent() : null;

      // Extract download link - try multiple approaches
      let downloadUrl = null;
      
      // First, try the generic download link selector
      const downloadElement = await element.$(RFP_MART.SELECTORS.RFP_LISTING.DOWNLOAD_LINK);
      if (downloadElement) {
        downloadUrl = await downloadElement.getAttribute('href');
      }
      
      // If no download link found, try specific patterns
      if (!downloadUrl) {
        // Try files.rfpmart.com download links
        const filesLinkElement = await element.$('a[href*="files.rfpmart.com"]');
        if (filesLinkElement) {
          downloadUrl = await filesLinkElement.getAttribute('href');
        }
      }
      
      // If still no download link, try the RFP detail page link
      if (!downloadUrl) {
        const rfpLinkElement = await element.$('a[href*="usa"][href*="rfp.html"]');
        if (rfpLinkElement) {
          downloadUrl = await rfpLinkElement.getAttribute('href');
        }
      }

      // Extract RFP ID (try multiple approaches)
      let id = '';
      const idElement = await element.$(RFP_MART.SELECTORS.RFP_LISTING.RFP_ID);
      if (idElement) {
        id = await idElement.textContent() || '';
      } else {
        // Generate ID from title and date
        id = this.generateRFPId(title, postedDate);
      }

      // Create detail URL if download URL exists
      const detailUrl = downloadUrl ? new URL(downloadUrl, RFP_MART.BASE_URL).href : undefined;

      const rfp: RFPListing = {
        id: id.trim(),
        title: title.trim(),
        postedDate: postedDate?.trim(),
        dueDate: dueDate?.trim(),
        downloadUrl: downloadUrl ? new URL(downloadUrl, RFP_MART.BASE_URL).href : undefined,
        detailUrl,
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
    if (!this.page || !rfp.downloadUrl) {
      return false;
    }

    try {
      scraperLogger.info(`Downloading RFP: ${rfp.title}`, { rfpId: rfp.id, downloadUrl: rfp.downloadUrl });

      // Create directory for this RFP
      const rfpDir = this.createRFPDirectory(rfp);
      await fs.ensureDir(rfpDir);

      // Set up download listener
      const downloadPromise = this.page.waitForEvent('download', { timeout: FILE_HANDLING.DOWNLOAD_TIMEOUT });

      // Navigate to download URL or click download link
      if (rfp.downloadUrl.startsWith('http')) {
        await this.page.goto(rfp.downloadUrl);
      } else {
        // If it's a relative URL, try to click it
        await this.page.click(`a[href="${rfp.downloadUrl}"]`);
      }

      // Wait for download to start
      const download = await downloadPromise;
      
      // Get suggested filename
      const suggestedFilename = download.suggestedFilename();
      const downloadPath = path.join(rfpDir, suggestedFilename);

      // Save the download
      await download.saveAs(downloadPath);

      scraperLogger.info(`Successfully downloaded RFP to ${downloadPath}`);

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

      scraperLogger.info('Scraper cleanup completed');

    } catch (error) {
      scraperLogger.warn('Error during cleanup', { error: error instanceof Error ? error.message : String(error) });
    }
  }
}