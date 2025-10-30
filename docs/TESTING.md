# Testing Guide

Comprehensive testing strategy for the RFP Mart Analyzer with Claude Code integration.

## 🧪 Testing Philosophy

### Test-Driven Development
- **Write tests first** before implementing new features
- **Red-Green-Refactor** cycle for reliable development
- **Comprehensive coverage** for all critical business logic
- **Fast feedback loops** for rapid iteration

### Testing Pyramid
```
    🔺 E2E Tests (Few)
   📊 Integration Tests (Some)  
  🧱 Unit Tests (Many)
```

## 🚀 Quick Start

### Setup Testing Environment
```bash
# Install test dependencies
npm install

# Run all tests
npm test

# Run tests with coverage
npm run test:coverage

# Run tests in watch mode
npm run test:watch

# Run specific test suite
npm test -- --testPathPattern=analyzers
```

### Claude Code Testing Commands
```bash
# Comprehensive test analysis
/test --coverage --validate --persona-qa

# Test specific components
/test @src/analyzers --type unit

# Performance testing
/test @src/scrapers --type performance --benchmark

# Integration testing with validation
/test @src --type integration --validate
```

## 📊 Test Structure

### Test Organization
```
tests/
├── unit/                   # Unit tests
│   ├── analyzers/         # Analyzer logic tests
│   ├── processors/        # Document processing tests
│   ├── scrapers/          # Scraping logic tests
│   └── utils/             # Utility function tests
├── integration/           # Integration tests
│   ├── workflows/         # End-to-end workflow tests
│   ├── database/          # Database integration tests
│   └── api/               # API integration tests
├── e2e/                   # End-to-end tests
│   ├── scraping/          # Full scraping workflows
│   └── analysis/          # Complete analysis pipelines
├── fixtures/              # Test data and mocks
│   ├── documents/         # Sample RFP documents
│   ├── responses/         # Mock API responses
│   └── data/              # Test datasets
└── helpers/               # Test utilities and setup
```

## 🎯 Unit Testing

### Analyzer Tests
```typescript
// tests/unit/analyzers/scoreCalculator.test.ts
import { ScoreCalculator } from '../../../src/analyzers/scoreCalculator';

describe('ScoreCalculator', () => {
  let calculator: ScoreCalculator;

  beforeEach(() => {
    calculator = new ScoreCalculator();
  });

  describe('calculateInstitutionScore', () => {
    it('should award full points for university', () => {
      const text = 'University of California system wide procurement';
      const score = calculator.calculateInstitutionScore(text);
      expect(score.score).toBe(30);
      expect(score.confidence).toBeGreaterThan(0.8);
    });

    it('should award partial points for community college', () => {
      const text = 'Metro Community College District';
      const score = calculator.calculateInstitutionScore(text);
      expect(score.score).toBe(25);
    });

    it('should award no points for private company', () => {
      const text = 'Acme Corporation website redesign';
      const score = calculator.calculateInstitutionScore(text);
      expect(score.score).toBe(0);
    });
  });

  describe('calculateBudgetScore', () => {
    it('should extract budget from various formats', () => {
      const testCases = [
        { text: 'Budget: $125,000', expected: 125000 },
        { text: 'Not to exceed $75K', expected: 75000 },
        { text: 'Range: 50-100K USD', expected: 100000 },
        { text: 'Two hundred thousand dollars', expected: 200000 }
      ];

      testCases.forEach(({ text, expected }) => {
        const result = calculator.extractBudgetAmount(text);
        expect(result).toBe(expected);
      });
    });

    it('should score budget ranges correctly', () => {
      const testCases = [
        { amount: 150000, expectedScore: 20 }, // High budget
        { amount: 80000, expectedScore: 15 },  // Medium budget
        { amount: 55000, expectedScore: 10 },  // Low acceptable
        { amount: 25000, expectedScore: 0 }    // Below threshold
      ];

      testCases.forEach(({ amount, expectedScore }) => {
        const score = calculator.calculateBudgetScore({ budgetAmount: amount });
        expect(score.score).toBe(expectedScore);
      });
    });
  });
});
```

### Document Processor Tests
```typescript
// tests/unit/processors/documentExtractor.test.ts
import { DocumentExtractor } from '../../../src/processors/documentExtractor';
import { readFileSync } from 'fs';
import path from 'path';

describe('DocumentExtractor', () => {
  let extractor: DocumentExtractor;

  beforeEach(() => {
    extractor = new DocumentExtractor();
  });

  describe('PDF Processing', () => {
    it('should extract text from PDF documents', async () => {
      const pdfPath = path.join(__dirname, '../../fixtures/documents/sample-rfp.pdf');
      const result = await extractor.extractFromPDF(pdfPath);
      
      expect(result.success).toBe(true);
      expect(result.extractedText).toContain('Request for Proposal');
      expect(result.metadata.pages).toBeGreaterThan(0);
    });

    it('should handle corrupted PDF files gracefully', async () => {
      const corruptPath = path.join(__dirname, '../../fixtures/documents/corrupted.pdf');
      const result = await extractor.extractFromPDF(corruptPath);
      
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('Word Document Processing', () => {
    it('should extract text from DOCX files', async () => {
      const docxPath = path.join(__dirname, '../../fixtures/documents/sample-rfp.docx');
      const result = await extractor.extractFromWord(docxPath);
      
      expect(result.success).toBe(true);
      expect(result.extractedText).toContain('scope of work');
    });
  });

  describe('ZIP Archive Processing', () => {
    it('should extract and process files from ZIP archives', async () => {
      const zipPath = path.join(__dirname, '../../fixtures/documents/rfp-package.zip');
      const result = await extractor.extractFromZip(zipPath);
      
      expect(result.success).toBe(true);
      expect(result.extractedFiles).toHaveLength(3);
      expect(result.extractedFiles.some(f => f.includes('.pdf'))).toBe(true);
    });
  });
});
```

### Scraper Tests (with Mocks)
```typescript
// tests/unit/scrapers/rfpMartScraper.test.ts
import { RFPMartScraper } from '../../../src/scrapers/rfpMartScraper';
import { Browser, Page } from 'playwright';

// Mock Playwright
jest.mock('playwright', () => ({
  chromium: {
    launch: jest.fn(),
  },
}));

describe('RFPMartScraper', () => {
  let scraper: RFPMartScraper;
  let mockBrowser: jest.Mocked<Browser>;
  let mockPage: jest.Mocked<Page>;

  beforeEach(() => {
    mockPage = {
      goto: jest.fn(),
      fill: jest.fn(),
      click: jest.fn(),
      waitForSelector: jest.fn(),
      evaluate: jest.fn(),
      locator: jest.fn(),
    } as any;

    mockBrowser = {
      newPage: jest.fn().mockResolvedValue(mockPage),
      close: jest.fn(),
    } as any;

    scraper = new RFPMartScraper();
  });

  describe('Authentication', () => {
    it('should login successfully with valid credentials', async () => {
      mockPage.evaluate.mockResolvedValueOnce(true); // Login success indicator
      
      const result = await scraper.authenticate('test@example.com', 'password');
      
      expect(result).toBe(true);
      expect(mockPage.fill).toHaveBeenCalledWith('[name="email"]', 'test@example.com');
      expect(mockPage.fill).toHaveBeenCalledWith('[name="password"]', 'password');
    });

    it('should handle login failures gracefully', async () => {
      mockPage.evaluate.mockResolvedValueOnce(false); // Login failure
      
      const result = await scraper.authenticate('invalid@example.com', 'wrong');
      
      expect(result).toBe(false);
    });
  });

  describe('RFP Discovery', () => {
    it('should extract RFP listings from search results', async () => {
      const mockRFPs = [
        {
          id: 'rfp-001',
          title: 'University Website Redesign',
          dueDate: '2024-03-15',
          institution: 'State University',
          downloadUrl: 'https://example.com/download/rfp-001'
        }
      ];

      mockPage.evaluate.mockResolvedValueOnce(mockRFPs);
      
      const result = await scraper.extractRFPListings();
      
      expect(result).toHaveLength(1);
      expect(result[0].title).toContain('University');
    });
  });
});
```

## 🔗 Integration Testing

### Database Integration
```typescript
// tests/integration/database/database.test.ts
import { DatabaseManager } from '../../../src/storage/database';
import { mkdtemp, rm } from 'fs/promises';
import { tmpdir } from 'os';
import path from 'path';

describe('Database Integration', () => {
  let db: DatabaseManager;
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await mkdtemp(path.join(tmpdir(), 'rfp-test-'));
    process.env.DATABASE_PATH = path.join(tempDir, 'test.sqlite');
    db = new DatabaseManager();
    await db.initialize();
  });

  afterEach(async () => {
    await db.close();
    await rm(tempDir, { recursive: true, force: true });
  });

  it('should store and retrieve RFP records', async () => {
    const rfp = {
      id: 'test-rfp-001',
      title: 'Test University RFP',
      dueDate: '2024-03-15',
      institution: 'Test University'
    };

    await db.saveRFP(rfp);
    const retrieved = await db.getRFPs({ limit: 1 });
    
    expect(retrieved).toHaveLength(1);
    expect(retrieved[0].title).toBe(rfp.title);
  });

  it('should track analysis results', async () => {
    const analysisResult = {
      rfpId: 'test-rfp-001',
      totalScore: 85,
      recommendation: 'HIGH',
      institutionScore: 30,
      budgetScore: 20
    };

    await db.updateRFPAnalysis('test-rfp-001', analysisResult);
    const results = await db.getAnalysisResults('test-rfp-001');
    
    expect(results).toHaveLength(4); // 4 analysis types
    expect(results.find(r => r.analysis_type === 'overall')?.score).toBe(85);
  });
});
```

### Workflow Integration
```typescript
// tests/integration/workflows/complete-workflow.test.ts
import { RFPMartAnalyzerApp } from '../../../src/index';

describe('Complete Workflow Integration', () => {
  let app: RFPMartAnalyzerApp;

  beforeEach(() => {
    // Setup test environment
    process.env.NODE_ENV = 'test';
    process.env.LOG_LEVEL = 'error';
    app = new RFPMartAnalyzerApp();
  });

  it('should complete end-to-end analysis workflow', async () => {
    // This test uses mock data to simulate complete workflow
    const mockRFPs = [
      {
        id: 'test-001',
        title: 'University of Test - Website Redesign',
        documents: ['test-rfp.pdf'],
        expectedScore: 85
      }
    ];

    await app.initialize();
    
    // Mock the scraping phase
    jest.spyOn(app.scraper, 'scrapeNewRFPs').mockResolvedValueOnce({
      rfpsFound: mockRFPs,
      rfpsDownloaded: 1,
      errors: []
    });

    // Run the workflow
    await app.runCompleteWorkflow();
    
    // Verify results
    const status = await app.getStatus();
    expect(status.database.totalRFPs).toBe(1);
    expect(status.database.analyzedRFPs).toBe(1);
  }, 30000); // 30 second timeout for complete workflow
});
```

## 🌐 End-to-End Testing

### Scraping E2E Tests
```typescript
// tests/e2e/scraping/full-scraping.test.ts
import { RFPMartScraper } from '../../../src/scrapers/rfpMartScraper';

describe('Full Scraping E2E', () => {
  let scraper: RFPMartScraper;

  beforeEach(() => {
    scraper = new RFPMartScraper();
  });

  afterEach(async () => {
    await scraper.cleanup();
  });

  // Only run in CI or when ENABLE_E2E_TESTS is set
  const runTest = process.env.CI || process.env.ENABLE_E2E_TESTS;

  (runTest ? it : it.skip)('should scrape real RFP Mart data', async () => {
    await scraper.initialize();
    
    // Use test credentials
    const loginSuccess = await scraper.authenticate(
      process.env.TEST_RFPMART_USERNAME!,
      process.env.TEST_RFPMART_PASSWORD!
    );
    
    expect(loginSuccess).toBe(true);
    
    const lastWeek = new Date();
    lastWeek.setDate(lastWeek.getDate() - 7);
    
    const result = await scraper.scrapeNewRFPs(lastWeek);
    
    expect(result.rfpsFound).toBeInstanceOf(Array);
    expect(result.errors).toHaveLength(0);
  }, 60000); // 60 second timeout for real scraping
});
```

## 🎭 Mock Data and Fixtures

### Sample RFP Documents
Create test fixtures that represent real-world scenarios:

```typescript
// tests/fixtures/rfp-samples.ts
export const sampleRFPs = {
  highScore: {
    title: 'University of California - Drupal Website Modernization',
    content: `
      The University of California system seeks proposals for a comprehensive
      website redesign using Drupal 10. Budget range: $150,000 - $200,000.
      Timeline: 6-8 months. Must comply with WCAG 2.1 AA accessibility standards.
    `,
    expectedScore: 90,
    expectedRecommendation: 'HIGH'
  },
  
  mediumScore: {
    title: 'Community College - WordPress Site Update',
    content: `
      Metro Community College District requests proposals for WordPress
      site improvements. Budget: $75,000. Timeline: 4 months.
      Focus on mobile responsiveness and performance.
    `,
    expectedScore: 65,
    expectedRecommendation: 'MEDIUM'
  },
  
  lowScore: {
    title: 'Private Company - Basic Website',
    content: `
      Acme Corporation needs a simple website. Budget: $15,000.
      Timeline: 2 weeks. Basic HTML/CSS requirements.
    `,
    expectedScore: 25,
    expectedRecommendation: 'LOW'
  }
};
```

## 📈 Performance Testing

### Benchmark Tests
```typescript
// tests/performance/analysis-benchmarks.test.ts
import { performance } from 'perf_hooks';
import { RFPAnalyzer } from '../../../src/analyzers/rfpAnalyzer';

describe('Performance Benchmarks', () => {
  let analyzer: RFPAnalyzer;

  beforeEach(() => {
    analyzer = new RFPAnalyzer();
  });

  it('should analyze RFP within performance budget', async () => {
    const largeRFPContent = 'A'.repeat(100000); // 100KB document
    
    const startTime = performance.now();
    
    const result = await analyzer.analyzeRFP({
      rfpId: 'perf-test',
      extractedText: largeRFPContent,
      processingSuccessful: true
    });
    
    const endTime = performance.now();
    const executionTime = endTime - startTime;
    
    expect(executionTime).toBeLessThan(5000); // Should complete within 5 seconds
    expect(result.processingSuccessful).toBe(true);
  });

  it('should handle batch analysis efficiently', async () => {
    const batchSize = 10;
    const rfps = Array.from({ length: batchSize }, (_, i) => ({
      rfpId: `batch-${i}`,
      extractedText: `Sample RFP content ${i}`,
      processingSuccessful: true
    }));
    
    const startTime = performance.now();
    
    const results = await analyzer.analyzeMultipleRFPs(rfps);
    
    const endTime = performance.now();
    const executionTime = endTime - startTime;
    const averageTime = executionTime / batchSize;
    
    expect(results).toHaveLength(batchSize);
    expect(averageTime).toBeLessThan(1000); // Average under 1 second per RFP
  });
});
```

## 🔍 Test Utilities

### Common Test Helpers
```typescript
// tests/helpers/test-utils.ts
import { DatabaseManager } from '../../src/storage/database';
import { mkdtemp, rm } from 'fs/promises';
import { tmpdir } from 'os';
import path from 'path';

export class TestEnvironment {
  private tempDir?: string;
  private db?: DatabaseManager;

  async setup(): Promise<void> {
    this.tempDir = await mkdtemp(path.join(tmpdir(), 'rfp-test-'));
    
    // Override environment for testing
    process.env.NODE_ENV = 'test';
    process.env.LOG_LEVEL = 'error';
    process.env.DATABASE_PATH = path.join(this.tempDir, 'test.sqlite');
    process.env.DATA_DIRECTORY = path.join(this.tempDir, 'data');
    
    this.db = new DatabaseManager();
    await this.db.initialize();
  }

  async teardown(): Promise<void> {
    if (this.db) {
      await this.db.close();
    }
    if (this.tempDir) {
      await rm(this.tempDir, { recursive: true, force: true });
    }
  }

  getDatabase(): DatabaseManager {
    if (!this.db) {
      throw new Error('Test environment not initialized');
    }
    return this.db;
  }
}

export function createMockRFP(overrides: Partial<any> = {}) {
  return {
    id: 'mock-rfp-001',
    title: 'Mock University RFP',
    dueDate: '2024-06-01',
    institution: 'Mock University',
    extractedText: 'Sample RFP content for testing',
    ...overrides
  };
}
```

## 🚀 Continuous Integration

### GitHub Actions Test Configuration
```yaml
# .github/workflows/test.yml
name: Test Suite

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    
    strategy:
      matrix:
        node-version: [18, 20]
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js ${{ matrix.node-version }}
        uses: actions/setup-node@v4
        with:
          node-version: ${{ matrix.node-version }}
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Install Playwright
        run: npx playwright install chromium
      
      - name: Run linting
        run: npm run lint
      
      - name: Run unit tests
        run: npm run test:unit
      
      - name: Run integration tests
        run: npm run test:integration
      
      - name: Run E2E tests
        run: npm run test:e2e
        env:
          ENABLE_E2E_TESTS: true
          TEST_RFPMART_USERNAME: ${{ secrets.TEST_RFPMART_USERNAME }}
          TEST_RFPMART_PASSWORD: ${{ secrets.TEST_RFPMART_PASSWORD }}
      
      - name: Upload coverage reports
        uses: codecov/codecov-action@v3
        with:
          file: ./coverage/lcov.info
```

## 📊 Coverage Requirements

### Coverage Targets
- **Overall Coverage**: Minimum 85%
- **Statement Coverage**: Minimum 90%
- **Branch Coverage**: Minimum 80%
- **Function Coverage**: Minimum 95%

### Critical Components (100% Coverage Required)
- Scoring algorithms (`src/analyzers/scoreCalculator.ts`)
- Database operations (`src/storage/database.ts`)
- Authentication logic (`src/scrapers/authManager.ts`)
- Configuration parsing (`src/config/environment.ts`)

## 🛠️ Test Development Workflow

### TDD Process with Claude Code
1. **Analyze Requirements**: Use `/analyze` to understand feature requirements
2. **Write Tests First**: Create failing tests that define expected behavior
3. **Implement Features**: Use `/implement` to create minimal passing implementation
4. **Refactor Code**: Use `/improve` to enhance code quality while keeping tests green
5. **Validate Coverage**: Use `/test --coverage` to ensure adequate test coverage

### Claude Code Testing Commands
```bash
# Test-driven development workflow
/analyze @src/analyzers/scoreCalculator.ts --focus testing
/test @tests/unit/analyzers --type unit --validate
/implement @src/analyzers/scoreCalculator.ts --test-driven
/improve @src/analyzers --focus quality --validate-tests

# Coverage analysis
/test --coverage --report --focus gaps
/analyze @coverage/lcov-report --focus uncovered

# Performance testing
/test @src --type performance --benchmark --report
```

---

**Comprehensive testing ensures reliable RFP analysis and confident deployments!**