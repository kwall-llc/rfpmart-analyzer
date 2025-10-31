import { chromium, Browser, Page } from 'playwright';
import * as path from 'path';
import fs from 'fs-extra';
import yauzl from 'yauzl';
import { config } from '../config/environment';
import { RFP_MART, FILE_HANDLING, ERROR_MESSAGES } from '../config/constants';
import { scraperLogger } from '../utils/logger';
import { parseRFPDate, isRecentPosting } from '../utils/dateHelper';
import { AuthManager } from './authManager';
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

export interface DocumentBuffer {
  buffer: Buffer;
  filename: string;
  mimeType?: string;
  rfpId: string;
}

export class RFPMartScraper {
  private browser?: Browser;
  private page?: Page;
  private authManager?: AuthManager;
  private databaseManager: DatabaseManager;

  constructor() {
    this.databaseManager = new DatabaseManager();
  }

  /**
   * Initialize the scraper with browser and authentication
   */
  async initialize(): Promise<void> {
    try {
      scraperLogger.info('Initializing RFP Mart scraper');

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

      // Download and process each RFP in memory
      for (const rfp of filteredListings) {
        try {
          // Download documents to memory buffers
          const documents = await this.downloadRFPToMemory(rfp);
          
          if (documents.length > 0) {
            // Save RFP record to database first (required for foreign key constraint)
            scraperLogger.info(`Saving RFP record to database: ${rfp.title}`, { rfpId: rfp.id });
            await this.databaseManager.saveRFP(rfp);
            scraperLogger.info(`RFP record saved successfully: ${rfp.title}`, { rfpId: rfp.id });
            
            // Process documents in memory and store in database
            const processed = await this.processDocumentsInMemory(documents);
            
            if (processed) {
              result.rfpsDownloaded++;
              scraperLogger.info(`Successfully processed RFP in memory: ${rfp.title}`, {
                rfpId: rfp.id,
                documentsProcessed: documents.length
              });
            } else {
              scraperLogger.warn(`No content extracted from RFP: ${rfp.title}`, { rfpId: rfp.id });
            }
          } else {
            scraperLogger.warn(`No documents found for RFP: ${rfp.title}`, { rfpId: rfp.id });
          }
        } catch (error) {
          const errorMsg = `Failed to process RFP ${rfp.id}: ${error instanceof Error ? error.message : String(error)}`;
          result.errors.push(errorMsg);
          scraperLogger.error(errorMsg);
        }
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
   * Download and process RFP document in memory (no file storage)
   */
  private async downloadRFPToMemory(rfp: RFPListing): Promise<DocumentBuffer[]> {
    if (!this.page || !rfp.detailUrl) {
      scraperLogger.warn(`No detail URL for RFP: ${rfp.id}`);
      return [];
    }

    try {
      scraperLogger.info(`Processing RFP in memory: ${rfp.title}`, { rfpId: rfp.id, detailUrl: rfp.detailUrl });

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
        return [];
      }

      const downloadUrl = await downloadLinks[0].getAttribute('href');
      if (!downloadUrl) {
        scraperLogger.warn(`Download link has no href for RFP: ${rfp.id}`);
        return [];
      }

      scraperLogger.info(`Found download link: ${downloadUrl}`, { rfpId: rfp.id });

      // Set up download listener
      const downloadPromise = this.page.waitForEvent('download', { timeout: FILE_HANDLING.DOWNLOAD_TIMEOUT });

      // Click the download link
      await downloadLinks[0].click();

      // Wait for download to start
      const download = await downloadPromise;
      
      // Get suggested filename
      const suggestedFilename = download.suggestedFilename();
      
      scraperLogger.info(`Downloading to memory: ${suggestedFilename}`, { rfpId: rfp.id });

      // Download to memory buffer instead of file
      const buffer = await download.createReadStream().then(stream => {
        return new Promise<Buffer>((resolve, reject) => {
          const chunks: Buffer[] = [];
          stream.on('data', chunk => chunks.push(chunk));
          stream.on('end', () => resolve(Buffer.concat(chunks)));
          stream.on('error', reject);
        });
      });

      scraperLogger.info(`Downloaded to memory successfully`, {
        rfpId: rfp.id,
        filename: suggestedFilename,
        size: buffer.length
      });

      // Check if this is a ZIP file that needs extraction
      const fileExtension = path.extname(suggestedFilename).toLowerCase();
      if (fileExtension === '.zip') {
        return await this.extractZipFromBuffer(buffer, suggestedFilename, rfp.id);
      } else {
        // Single file
        return [{
          buffer,
          filename: suggestedFilename,
          rfpId: rfp.id,
          mimeType: this.getMimeTypeFromExtension(fileExtension)
        }];
      }

    } catch (error) {
      scraperLogger.error(`Failed to download RFP to memory: ${rfp.id}`, {
        error: error instanceof Error ? error.message : String(error)
      });
      return [];
    }
  }

  /**
   * Extract ZIP file contents from memory buffer
   */
  private async extractZipFromBuffer(zipBuffer: Buffer, zipFilename: string, rfpId: string): Promise<DocumentBuffer[]> {
    return new Promise((resolve, reject) => {
      const documents: DocumentBuffer[] = [];
      
      yauzl.fromBuffer(zipBuffer, { lazyEntries: true }, (err, zipfile) => {
        if (err) {
          scraperLogger.error(`Failed to open ZIP buffer for RFP: ${rfpId}`, { error: err.message });
          return reject(err);
        }

        if (!zipfile) {
          scraperLogger.error(`No zipfile object for RFP: ${rfpId}`);
          return reject(new Error('No zipfile object'));
        }

        zipfile.readEntry();

        zipfile.on('entry', (entry) => {
          const fileName = entry.fileName;
          
          // Skip directories and non-document files
          if (fileName.endsWith('/') || !this.isDocumentFile(fileName)) {
            zipfile.readEntry();
            return;
          }

          scraperLogger.info(`Extracting file from ZIP: ${fileName}`, { rfpId, zipFilename });

          zipfile.openReadStream(entry, (err, readStream) => {
            if (err) {
              scraperLogger.error(`Failed to open read stream for ${fileName}`, { error: err.message, rfpId });
              zipfile.readEntry();
              return;
            }

            if (!readStream) {
              scraperLogger.error(`No read stream for ${fileName}`, { rfpId });
              zipfile.readEntry();
              return;
            }

            const chunks: Buffer[] = [];
            readStream.on('data', chunk => chunks.push(chunk));
            readStream.on('end', () => {
              const fileBuffer = Buffer.concat(chunks);
              const fileExtension = path.extname(fileName).toLowerCase();
              
              documents.push({
                buffer: fileBuffer,
                filename: fileName,
                rfpId,
                mimeType: this.getMimeTypeFromExtension(fileExtension)
              });

              scraperLogger.info(`Extracted file to memory: ${fileName}`, {
                rfpId,
                size: fileBuffer.length
              });

              zipfile.readEntry();
            });
            readStream.on('error', (err) => {
              scraperLogger.error(`Error reading ${fileName} from ZIP`, { error: err.message, rfpId });
              zipfile.readEntry();
            });
          });
        });

        zipfile.on('end', () => {
          scraperLogger.info(`ZIP extraction complete for RFP: ${rfpId}`, {
            extractedFiles: documents.length,
            zipFilename
          });
          resolve(documents);
        });

        zipfile.on('error', (err) => {
          scraperLogger.error(`ZIP processing error for RFP: ${rfpId}`, { error: err.message });
          reject(err);
        });
      });
    });
  }

  /**
   * Check if file is a document we want to process
   */
  private isDocumentFile(filename: string): boolean {
    const ext = path.extname(filename).toLowerCase();
    return ['.pdf', '.doc', '.docx', '.txt', '.rtf'].includes(ext);
  }

  /**
   * Get MIME type from file extension
   */
  private getMimeTypeFromExtension(extension: string): string {
    const mimeTypes: { [key: string]: string } = {
      '.pdf': 'application/pdf',
      '.doc': 'application/msword',
      '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      '.txt': 'text/plain',
      '.rtf': 'application/rtf'
    };
    return mimeTypes[extension] || 'application/octet-stream';
  }

  /**
   * Process documents in memory and store results in database
   */
  private async processDocumentsInMemory(documents: DocumentBuffer[]): Promise<boolean> {
    let processedSuccessfully = false;

    for (const doc of documents) {
      try {
        scraperLogger.info(`Processing document in memory: ${doc.filename}`, { rfpId: doc.rfpId });

        // Extract text directly from buffer
        const extractedText = await this.extractTextFromBuffer(doc.buffer, doc.filename);

        if (extractedText && extractedText.trim().length > 0) {
          // Store extracted content in database with full text
          await this.databaseManager.addRFPDocument({
            rfpId: doc.rfpId,
            filename: doc.filename,
            mimeType: doc.mimeType || 'application/octet-stream',
            fullTextContent: extractedText,
            extractionMethod: 'in-memory',
            extractedAt: new Date().toISOString(),
            fileSize: doc.buffer.length
          });

          scraperLogger.info(`Document processed and stored in database: ${doc.filename}`, {
            rfpId: doc.rfpId,
            textLength: extractedText.length,
            fileSize: doc.buffer.length
          });

          processedSuccessfully = true;
        } else {
          scraperLogger.warn(`No text extracted from document: ${doc.filename}`, { rfpId: doc.rfpId });
        }

      } catch (error) {
        scraperLogger.error(`Failed to process document: ${doc.filename}`, {
          rfpId: doc.rfpId,
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }

    return processedSuccessfully;
  }

  /**
   * Extract text from buffer using appropriate method based on file type
   */
  private async extractTextFromBuffer(buffer: Buffer, filename: string): Promise<string> {
    const extension = path.extname(filename).toLowerCase();
    
    try {
      // For now, use a simple approach - we'll enhance this with actual extraction logic
      switch (extension) {
        case '.txt':
          return buffer.toString('utf-8');
        case '.pdf':
        case '.doc':
        case '.docx':
          // TODO: Implement proper document parsing for these types
          // For now, return a placeholder that indicates the file was processed
          return `[Document processed in-memory: ${filename}, size: ${buffer.length} bytes]`;
        default:
          return `[Unknown file type: ${filename}]`;
      }
    } catch (error) {
      scraperLogger.error(`Text extraction failed for ${filename}`, {
        error: error instanceof Error ? error.message : String(error)
      });
      return '';
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