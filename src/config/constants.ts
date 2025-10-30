/**
 * Application constants for RFP Mart Analyzer
 */

// RFP Mart website selectors and URLs
export const RFP_MART = {
  BASE_URL: 'https://www.rfpmart.com',
  LOGIN_URL: 'https://www.rfpmart.com/userlogin.html',
  SELECTORS: {
    LOGIN: {
      USERNAME: 'input[type="email"]',
      PASSWORD: 'input[type="password"]',
      SUBMIT: 'input[type="submit"]',
      ERROR: '.error, .alert-danger, .invalid-feedback, .error-message',
    },
    RFP_LISTING: {
      CONTAINER: '.rfp-list, .contract-list, .opportunity-list',
      ITEM: '.rfp-item, .contract-item, .opportunity-item',
      TITLE: '.title, .rfp-title, h3, h4',
      DATE_POSTED: '.date-posted, .posted-date, .created-date',
      DUE_DATE: '.due-date, .closing-date, .deadline',
      DOWNLOAD_LINK: 'a[href*="download"], a[href*="document"], .download-btn',
      NEXT_PAGE: '.next, .pagination-next, a[rel="next"]',
      RFP_ID: '.rfp-id, .contract-id, .opportunity-id',
    },
    RFP_DETAIL: {
      DESCRIPTION: '.description, .rfp-description, .opportunity-description',
      REQUIREMENTS: '.requirements, .scope, .project-scope',
      BUDGET: '.budget, .value, .contract-value, .estimated-value',
      INSTITUTION: '.agency, .organization, .client, .issuer',
      ATTACHMENTS: '.attachments, .documents, .files',
    },
  },
  WAIT_TIMES: {
    NAVIGATION: 30000,     // Increased for slow site
    DOWNLOAD: 60000,       // Increased for large files
    PAGE_LOAD: 30000,      // Increased for slow loading
  },
} as const;

// File handling constants
export const FILE_HANDLING = {
  MAX_FILE_SIZE: 100 * 1024 * 1024, // 100MB
  ALLOWED_EXTENSIONS: ['.pdf', '.doc', '.docx', '.zip', '.rar', '.txt'],
  DOWNLOAD_TIMEOUT: 60000, // 60 seconds
  EXTRACTION_TIMEOUT: 30000, // 30 seconds
} as const;

// Scoring weights for RFP analysis
export const SCORING_WEIGHTS = {
  HIGHER_EDUCATION: 30,        // Institution is higher education
  CMS_PREFERRED: 20,          // Uses preferred CMS (Drupal, WordPress, etc.)
  CMS_ACCEPTABLE: 10,         // Uses acceptable CMS
  PROJECT_TYPE: 15,           // Redesign, migration, redevelopment
  BUDGET_HIGH: 20,            // Budget > $100k
  BUDGET_MEDIUM: 10,          // Budget $50k-$100k
  BUDGET_LOW: 5,              // Budget < $50k
  TECH_KEYWORDS: 5,           // Accessibility, responsive, etc.
  LARGE_INSTITUTION: 10,      // State university, research university, etc.
  PREFERRED_STATE: 5,         // Located in preferred states
  RED_FLAGS: -15,             // Maintenance only, minor updates, etc.
} as const;

// RFP recommendation levels
export const RECOMMENDATION_LEVELS = {
  HIGH: 'HIGH',
  MEDIUM: 'MEDIUM', 
  LOW: 'LOW',
  SKIP: 'SKIP',
} as const;

// Database schema constants
export const DATABASE = {
  TABLES: {
    RFP_RUNS: 'rfp_runs',
    RFPS: 'rfps',
    ANALYSIS_RESULTS: 'analysis_results',
  },
  SCHEMA: {
    RFP_RUNS: `
      CREATE TABLE IF NOT EXISTS rfp_runs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        run_date TEXT NOT NULL,
        rfps_found INTEGER DEFAULT 0,
        rfps_downloaded INTEGER DEFAULT 0,
        rfps_analyzed INTEGER DEFAULT 0,
        high_score_count INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `,
    RFPS: `
      CREATE TABLE IF NOT EXISTS rfps (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        due_date TEXT,
        posted_date TEXT,
        download_date TEXT,
        file_path TEXT,
        institution TEXT,
        score INTEGER DEFAULT 0,
        recommendation TEXT,
        analysis_complete BOOLEAN DEFAULT FALSE,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `,
    ANALYSIS_RESULTS: `
      CREATE TABLE IF NOT EXISTS analysis_results (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        rfp_id TEXT NOT NULL,
        analysis_type TEXT NOT NULL,
        score INTEGER NOT NULL,
        details TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (rfp_id) REFERENCES rfps (id)
      )
    `,
  },
} as const;

// Logging constants
export const LOGGING = {
  LEVELS: {
    ERROR: 'error',
    WARN: 'warn',
    INFO: 'info',
    DEBUG: 'debug',
  },
  CATEGORIES: {
    SCRAPER: 'scraper',
    PROCESSOR: 'processor',
    ANALYZER: 'analyzer',
    DATABASE: 'database',
    SYSTEM: 'system',
  },
} as const;

// Regular expressions for text analysis
export const REGEX_PATTERNS = {
  BUDGET: [
    /\$[\d,]+(?:\.\d{2})?/g,
    /(?:budget|cost|value|funding).*?\$[\d,]+/gi,
    /\$[\d,]+.*?(?:budget|cost|value|funding)/gi,
    /not to exceed.*?\$[\d,]+/gi,
    /NTE.*?\$[\d,]+/gi,
  ],
  EMAIL: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
  PHONE: /(?:\+?1[-.\s]?)?\(?[0-9]{3}\)?[-.\s]?[0-9]{3}[-.\s]?[0-9]{4}/g,
  DATE: [
    /\d{1,2}\/\d{1,2}\/\d{4}/g,
    /\d{1,2}-\d{1,2}-\d{4}/g,
    /\d{4}-\d{1,2}-\d{1,2}/g,
    /(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},?\s+\d{4}/gi,
  ],
} as const;

// Error messages
export const ERROR_MESSAGES = {
  LOGIN_FAILED: 'Failed to login to RFP Mart',
  NAVIGATION_FAILED: 'Failed to navigate to RFP listing page',
  DOWNLOAD_FAILED: 'Failed to download RFP document',
  EXTRACTION_FAILED: 'Failed to extract text from document',
  DATABASE_ERROR: 'Database operation failed',
  INVALID_CREDENTIALS: 'Invalid RFP Mart credentials',
  NETWORK_ERROR: 'Network connection error',
} as const;

// Success messages
export const SUCCESS_MESSAGES = {
  LOGIN_SUCCESS: 'Successfully logged into RFP Mart',
  DOWNLOAD_SUCCESS: 'Successfully downloaded RFP document',
  ANALYSIS_COMPLETE: 'RFP analysis completed',
  HIGH_SCORE_FOUND: 'High-scoring RFP found',
} as const;