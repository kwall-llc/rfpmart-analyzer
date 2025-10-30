import dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config();

export interface EnvironmentConfig {
  // RFP Mart Credentials
  rfpMart: {
    username: string;
    password: string;
    categoryUrl: string;
  };

  // Budget Configuration
  budget: {
    minAcceptable: number;
    minPreferred: number;
  };

  // Storage Configuration
  storage: {
    dataDirectory: string;
    reportsDirectory: string;
    rfpsDirectory: string;
    databasePath: string;
  };

  // Logging Configuration
  logging: {
    level: string;
    file: string;
  };

  // Analysis Configuration
  analysis: {
    scoreThresholds: {
      high: number;
      medium: number;
      low: number;
    };
  };

  // Keywords Configuration
  keywords: {
    higherEd: string[];
    cmsPreferred: string[];
    cmsAcceptable: string[];
    projectTypes: string[];
    budget: string[];
    techPositive: string[];
    redFlags: string[];
    preferredStates: string[];
    largeInstitution: string[];
  };

  // Email Configuration
  email: {
    enabled: boolean;
    smtp: {
      host?: string;
      port?: number;
      user?: string;
      pass?: string;
    };
    notificationEmail?: string;
  };

  // Development
  nodeEnv: string;
}

function getRequiredEnv(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Required environment variable ${key} is not set`);
  }
  return value;
}

function getOptionalEnv(key: string, defaultValue: string = ''): string {
  return process.env[key] || defaultValue;
}

function getNumericEnv(key: string, defaultValue: number): number {
  const value = process.env[key];
  if (!value) return defaultValue;
  const parsed = parseInt(value, 10);
  if (isNaN(parsed)) {
    throw new Error(`Environment variable ${key} must be a valid number`);
  }
  return parsed;
}

function getBooleanEnv(key: string, defaultValue: boolean = false): boolean {
  const value = process.env[key];
  if (!value) return defaultValue;
  return value.toLowerCase() === 'true';
}

function parseKeywords(envValue: string): string[] {
  return envValue ? envValue.split(',').map(k => k.trim().toLowerCase()) : [];
}

export const config: EnvironmentConfig = {
  rfpMart: {
    username: getRequiredEnv('RFPMART_USERNAME'),
    password: getRequiredEnv('RFPMART_PASSWORD'),
    categoryUrl: getOptionalEnv('RFP_CATEGORY_URL', 'https://www.rfpmart.com/web-design-and-development-rfp-government-contract.html'),
  },

  budget: {
    minAcceptable: getNumericEnv('MIN_BUDGET_ACCEPTABLE', 50000),
    minPreferred: getNumericEnv('MIN_BUDGET_PREFERRED', 100000),
  },

  storage: {
    dataDirectory: getOptionalEnv('DATA_DIRECTORY', './data'),
    reportsDirectory: getOptionalEnv('REPORTS_DIRECTORY', './data/reports'),
    rfpsDirectory: getOptionalEnv('RFPS_DIRECTORY', './data/rfps'),
    databasePath: getOptionalEnv('DATABASE_PATH', './data/database.sqlite'),
  },

  logging: {
    level: getOptionalEnv('LOG_LEVEL', 'info'),
    file: getOptionalEnv('LOG_FILE', './logs/rfpmart-analyzer.log'),
  },

  analysis: {
    scoreThresholds: {
      high: getNumericEnv('SCORE_THRESHOLD_HIGH', 75),
      medium: getNumericEnv('SCORE_THRESHOLD_MEDIUM', 50),
      low: getNumericEnv('SCORE_THRESHOLD_LOW', 25),
    },
  },

  keywords: {
    higherEd: parseKeywords(getOptionalEnv('HIGHER_ED_KEYWORDS', 'university,college,academic,education,campus,school,institute')),
    cmsPreferred: parseKeywords(getOptionalEnv('CMS_KEYWORDS_PREFERRED', 'drupal,wordpress,modern campus')),
    cmsAcceptable: parseKeywords(getOptionalEnv('CMS_KEYWORDS_ACCEPTABLE', 'joomla,squarespace,wix')),
    projectTypes: parseKeywords(getOptionalEnv('PROJECT_TYPE_KEYWORDS', 'redesign,redevelopment,migration,rebuild')),
    budget: parseKeywords(getOptionalEnv('BUDGET_KEYWORDS', 'budget,cost,price,funding,appropriation')),
    techPositive: parseKeywords(getOptionalEnv('TECH_KEYWORDS_POSITIVE', 'responsive,accessibility,WCAG,UX,UI')),
    redFlags: parseKeywords(getOptionalEnv('RED_FLAG_KEYWORDS', 'maintenance only,minor updates,hosting only')),
    preferredStates: parseKeywords(getOptionalEnv('PREFERRED_STATES', 'california,new york,texas,florida')),
    largeInstitution: parseKeywords(getOptionalEnv('LARGE_INSTITUTION_KEYWORDS', 'state university,research university')),
  },

  email: {
    enabled: getBooleanEnv('ENABLE_EMAIL_NOTIFICATIONS', false),
    smtp: {
      host: getOptionalEnv('SMTP_HOST'),
      port: getNumericEnv('SMTP_PORT', 587),
      user: getOptionalEnv('SMTP_USER'),
      pass: getOptionalEnv('SMTP_PASS'),
    },
    notificationEmail: getOptionalEnv('NOTIFICATION_EMAIL'),
  },

  nodeEnv: getOptionalEnv('NODE_ENV', 'development'),
};

// Ensure directories exist
export function ensureDirectories(): void {
  const fs = require('fs-extra');
  
  // Create all required directories
  const directories = [
    config.storage.dataDirectory,
    config.storage.reportsDirectory,
    config.storage.rfpsDirectory,
    path.dirname(config.storage.databasePath),
    path.dirname(config.logging.file),
  ];

  directories.forEach(dir => {
    if (dir && !fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  });
}