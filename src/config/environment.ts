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

  // AI Configuration
  ai: {
    provider: string;
    openai?: {
      apiKey: string;
      model: string;
    };
    anthropic?: {
      apiKey: string;
      model: string;
    };
    azure?: {
      endpoint: string;
      apiKey: string;
      model: string;
    };
    thresholds: {
      excellent: number;
      good: number;
      poor: number;
    };
    cleanup: {
      poorFits: boolean;
      rejected: boolean;
    };
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
  const value = process.env[key];
  if (value === undefined || value === null) {
    return defaultValue;
  }
  return String(value);
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

function parseKeywords(envValue: string | undefined | null): string[] {
  if (!envValue || typeof envValue !== 'string') {
    return [];
  }

  try {
    return envValue.split(',').map(k => k.trim().toLowerCase()).filter(k => k.length > 0);
  } catch (error) {
    console.warn(`Failed to parse keywords from value: ${envValue}`, error);
    return [];
  }
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
    dataDirectory: getOptionalEnv('DATA_DIRECTORY', process.env.GITHUB_ACTIONS ? path.resolve('./data') : './data'),
    reportsDirectory: getOptionalEnv('REPORTS_DIRECTORY', process.env.GITHUB_ACTIONS ? path.resolve('./data/reports') : './data/reports'),
    rfpsDirectory: getOptionalEnv('RFPS_DIRECTORY', process.env.GITHUB_ACTIONS ? path.resolve('./data/rfps') : './data/rfps'),
    databasePath: getOptionalEnv('DATABASE_PATH', process.env.GITHUB_ACTIONS ? path.resolve('./data/database.sqlite') : './data/database.sqlite'),
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

  ai: {
    provider: getOptionalEnv('AI_PROVIDER', 'openai'),
    openai: {
      apiKey: getOptionalEnv('AI_OPENAI_API_KEY', ''),
      model: getOptionalEnv('AI_OPENAI_MODEL', 'gpt-4'),
    },
    anthropic: {
      apiKey: getOptionalEnv('AI_ANTHROPIC_API_KEY', ''),
      model: getOptionalEnv('AI_ANTHROPIC_MODEL', 'claude-3-sonnet-20240229'),
    },
    azure: {
      endpoint: getOptionalEnv('AI_AZURE_ENDPOINT', ''),
      apiKey: getOptionalEnv('AI_AZURE_API_KEY', ''),
      model: getOptionalEnv('AI_AZURE_MODEL', 'gpt-4'),
    },
    thresholds: {
      excellent: getNumericEnv('AI_FIT_THRESHOLD_EXCELLENT', 80),
      good: getNumericEnv('AI_FIT_THRESHOLD_GOOD', 60),
      poor: getNumericEnv('AI_FIT_THRESHOLD_POOR', 25),
    },
    cleanup: {
      poorFits: getBooleanEnv('AI_CLEANUP_POOR_FITS', true),
      rejected: getBooleanEnv('AI_CLEANUP_REJECTED', true),
    },
  },

  nodeEnv: getOptionalEnv('NODE_ENV', 'development'),
};

// Validate configuration after loading
function validateConfig() {
  try {
    // Validate critical keyword arrays are properly loaded
    const keywordArrays = [
      { name: 'higherEd', value: config.keywords.higherEd },
      { name: 'cmsPreferred', value: config.keywords.cmsPreferred },
      { name: 'projectTypes', value: config.keywords.projectTypes },
    ];

    keywordArrays.forEach(({ name, value }) => {
      if (!Array.isArray(value)) {
        console.warn(`Warning: ${name} keywords not properly loaded, using empty array`);
      } else if (value.length === 0) {
        console.warn(`Warning: ${name} keywords array is empty, this may affect RFP analysis`);
      }
    });

    console.log('✅ Configuration validated successfully');
    console.log(`📊 Loaded ${config.keywords.higherEd.length} higher-ed keywords, ${config.keywords.cmsPreferred.length} preferred CMS keywords`);
  } catch (error) {
    console.error('❌ Configuration validation failed:', error);
  }
}

// Run validation if not in test environment
if (process.env.NODE_ENV !== 'test') {
  validateConfig();
}

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