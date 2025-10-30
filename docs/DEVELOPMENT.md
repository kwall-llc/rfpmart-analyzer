# Development Guide

Complete development guide for the RFP Mart Analyzer with best practices and workflows.

## 🚀 Getting Started

### Prerequisites
- **Node.js 18+**: Latest LTS version recommended
- **npm 9+**: Package manager (included with Node.js)
- **Git**: Version control
- **VS Code**: Recommended IDE with extensions

### Development Environment Setup

1. **Clone and Install**
   ```bash
   git clone https://github.com/kwall1/rfpmart-analyzer.git
   cd rfpmart-analyzer
   npm install
   npx playwright install chromium
   ```

2. **Environment Configuration**
   ```bash
   cp .env.example .env
   # Edit .env with your development settings
   ```

3. **Development Build**
   ```bash
   npm run build
   npm run dev  # Watch mode for development
   ```

### Recommended VS Code Extensions
```json
{
  "recommendations": [
    "ms-vscode.vscode-typescript-next",
    "esbenp.prettier-vscode",
    "ms-playwright.playwright",
    "bradlc.vscode-tailwindcss",
    "christian-kohler.path-intellisense"
  ]
}
```

## 🏗️ Architecture Overview

### Core Principles
- **Modularity**: Separated concerns across distinct modules
- **Async/Await**: Modern JavaScript patterns throughout
- **Type Safety**: Comprehensive TypeScript usage
- **Error Handling**: Graceful degradation and logging
- **Testability**: Dependency injection and mockable interfaces

### Directory Structure
```
src/
├── analyzers/          # Business logic for RFP analysis
│   ├── criteriaChecker.ts    # Validation logic
│   ├── rfpAnalyzer.ts        # Main analysis orchestrator
│   ├── reportGenerator.ts    # Report creation
│   └── scoreCalculator.ts    # Scoring algorithms
├── config/             # Configuration management
│   ├── constants.ts          # Application constants
│   └── environment.ts        # Environment variables
├── processors/         # Document processing
│   ├── documentExtractor.ts  # Multi-format extraction
│   ├── rfpProcessor.ts       # Processing orchestrator
│   └── zipHandler.ts         # Archive handling
├── scrapers/           # Web automation
│   ├── authManager.ts        # Authentication
│   └── rfpMartScraper.ts     # Scraping logic
├── storage/            # Data persistence
│   ├── database.ts           # SQLite operations
│   └── fileManager.ts        # File organization
└── utils/              # Shared utilities
    ├── dateHelper.ts         # Date parsing/formatting
    └── logger.ts             # Structured logging
```

## 🔧 Development Workflow

### Git Workflow
```bash
# Feature development
git checkout -b feature/scoring-improvements
git add .
git commit -m "feat: improve budget detection accuracy"
git push origin feature/scoring-improvements

# Create pull request via GitHub CLI
gh pr create --title "Improve budget detection accuracy" --body "Enhanced regex patterns for budget extraction"
```

### Code Quality Checks
```bash
# Linting and formatting
npm run lint          # ESLint analysis
npm run lint:fix      # Auto-fix linting issues
npm run format        # Prettier formatting

# Type checking
npm run type-check    # TypeScript validation

# Testing
npm test              # Full test suite
npm run test:watch    # Watch mode
npm run test:coverage # Coverage report
```

### Build Process
```bash
# Development build (with source maps)
npm run build:dev

# Production build (optimized)
npm run build

# Clean build artifacts
npm run clean
```

## 🧪 Testing Strategy

### Test Types
1. **Unit Tests**: Individual function testing
2. **Integration Tests**: Component interaction testing
3. **E2E Tests**: Full workflow validation
4. **Performance Tests**: Benchmark and optimization

### Running Tests
```bash
# All tests
npm test

# Specific test suites
npm run test:unit
npm run test:integration
npm run test:e2e

# Watch mode for TDD
npm run test:watch

# Coverage analysis
npm run test:coverage
```

### Test File Patterns
- Unit tests: `*.test.ts` in same directory as source
- Integration tests: `tests/integration/**/*.test.ts`
- E2E tests: `tests/e2e/**/*.test.ts`
- Fixtures: `tests/fixtures/**/*`

## 📊 Code Quality Standards

### TypeScript Configuration
```typescript
// tsconfig.json highlights
{
  "compilerOptions": {
    "strict": true,                     // Strict type checking
    "noImplicitAny": true,             // No implicit any types
    "noImplicitReturns": true,         // All code paths return
    "noFallthroughCasesInSwitch": true, // Switch exhaustiveness
    "noUncheckedIndexedAccess": true    // Safe array/object access
  }
}
```

### ESLint Rules
```javascript
// .eslintrc.js highlights
module.exports = {
  extends: [
    '@typescript-eslint/recommended',
    'prettier'
  ],
  rules: {
    'no-console': 'warn',              // Use logger instead
    '@typescript-eslint/no-unused-vars': 'error',
    '@typescript-eslint/explicit-function-return-type': 'warn',
    'prefer-const': 'error'
  }
};
```

### Code Style Guidelines
- **Functions**: Pure functions when possible, clear single responsibility
- **Classes**: Minimal public interface, dependency injection ready
- **Error Handling**: Always use try-catch, structured error objects
- **Logging**: Use structured logging with appropriate levels
- **Comments**: JSDoc for public APIs, inline for complex logic

## 🔍 Debugging

### Debug Configuration
```json
// .vscode/launch.json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Debug RFP Analysis",
      "type": "node",
      "request": "launch",
      "program": "${workspaceFolder}/dist/index.js",
      "args": ["run", "--since", "2024-01-01"],
      "env": {
        "NODE_ENV": "development",
        "LOG_LEVEL": "debug"
      },
      "console": "integratedTerminal",
      "sourceMaps": true,
      "outFiles": ["${workspaceFolder}/dist/**/*.js"]
    }
  ]
}
```

### Logging Strategy
```typescript
// Structured logging example
import { systemLogger } from '../utils/logger';

systemLogger.info('Starting RFP analysis', {
  rfpId: 'rfp-001',
  timestamp: new Date().toISOString(),
  context: 'analysis-start'
});

try {
  // Process RFP
} catch (error) {
  systemLogger.error('Analysis failed', {
    rfpId: 'rfp-001',
    error: error.message,
    stack: error.stack,
    context: 'analysis-error'
  });
}
```

### Common Debug Scenarios
- **Authentication Issues**: Check credentials and network connectivity
- **Document Processing Errors**: Verify file formats and extraction logic
- **Scoring Inconsistencies**: Review keyword matching and scoring weights
- **Database Issues**: Check SQLite file permissions and schema

## 🚀 Performance Optimization

### Profiling Tools
```bash
# Node.js profiling
node --prof dist/index.js run
node --prof-process isolate-*.log > profile.txt

# Memory usage analysis
node --inspect dist/index.js run
# Open chrome://inspect in Chrome
```

### Optimization Strategies
1. **Async Operations**: Use Promise.all for independent operations
2. **Caching**: Cache extracted document text and analysis results
3. **Batch Processing**: Group database operations
4. **Memory Management**: Clean up large objects after processing

### Performance Monitoring
```typescript
// Performance measurement example
import { performance } from 'perf_hooks';

const startTime = performance.now();
await processRFP(rfp);
const endTime = performance.now();

systemLogger.info('RFP processing completed', {
  rfpId: rfp.id,
  processingTime: endTime - startTime,
  memoryUsage: process.memoryUsage()
});
```

## 🔒 Security Best Practices

### Credential Management
- **Environment Variables**: Never commit credentials
- **GitHub Secrets**: Use for CI/CD credentials
- **Local .env**: Add to .gitignore
- **Rotation**: Regular credential updates

### Input Validation
```typescript
// Example input validation
import { z } from 'zod';

const RFPSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  dueDate: z.string().datetime().optional(),
  budget: z.number().positive().optional()
});

function validateRFP(data: unknown) {
  return RFPSchema.parse(data);
}
```

### Data Sanitization
- **SQL Injection**: Use parameterized queries
- **XSS Prevention**: Sanitize extracted text
- **File Upload**: Validate file types and sizes
- **Path Traversal**: Validate file paths

## 📦 Dependency Management

### Update Strategy
```bash
# Check for outdated packages
npm outdated

# Update dependencies
npm update

# Security audit
npm audit
npm audit fix

# Major version updates (careful review required)
npx npm-check-updates -u
npm install
```

### Dependency Categories
- **Core Dependencies**: Essential for application function
- **Dev Dependencies**: Development and testing tools
- **Security Critical**: Playwright, database drivers, crypto
- **Optional**: Enhanced features, nice-to-have utilities

## 🌐 API Integration

### External APIs
- **RFP Mart**: Web scraping target (authentication required)
- **GitHub API**: Issue creation and repository management
- **Potential Future**: Email services, CRM integration

### Error Handling Pattern
```typescript
async function callExternalAPI(url: string, options: RequestInit) {
  try {
    const response = await fetch(url, {
      ...options,
      timeout: 10000, // 10 second timeout
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    return await response.json();
  } catch (error) {
    if (error instanceof TypeError) {
      // Network error
      throw new Error('Network connection failed');
    }
    throw error;
  }
}
```

## 📈 Monitoring and Observability

### Metrics Collection
```typescript
// Custom metrics example
class MetricsCollector {
  private metrics = new Map<string, number>();
  
  increment(metric: string, value = 1) {
    const current = this.metrics.get(metric) || 0;
    this.metrics.set(metric, current + value);
  }
  
  getMetrics() {
    return Object.fromEntries(this.metrics);
  }
}

const metrics = new MetricsCollector();
metrics.increment('rfps.processed');
metrics.increment('rfps.high_score');
```

### Health Checks
```typescript
// Health check endpoint
async function healthCheck() {
  const health = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version,
    database: await checkDatabaseHealth(),
    storage: await checkStorageHealth(),
    memory: process.memoryUsage()
  };
  
  return health;
}
```

## 🔄 Continuous Integration

### Pre-commit Hooks
```json
// package.json
{
  "husky": {
    "hooks": {
      "pre-commit": "lint-staged",
      "pre-push": "npm test"
    }
  },
  "lint-staged": {
    "*.{ts,js}": ["eslint --fix", "prettier --write"],
    "*.{json,md}": ["prettier --write"]
  }
}
```

### GitHub Actions Integration
- **Pull Request**: Lint, test, build validation
- **Main Branch**: Full test suite, deployment
- **Release**: Version tagging, changelog generation
- **Security**: Dependency scanning, SAST analysis

## 🐛 Troubleshooting

### Common Issues

#### Authentication Failures
```bash
# Check credentials
npm start status
# Verify RFP Mart website accessibility
curl -I https://www.rfpmart.com
```

#### Database Lock Issues
```bash
# Check for orphaned connections
lsof data/database.sqlite
# Reset database if needed
rm data/database.sqlite
npm start run
```

#### Memory Issues
```bash
# Monitor memory usage
node --max-old-space-size=4096 dist/index.js run
# Enable garbage collection logs
node --trace-gc dist/index.js run
```

#### Build Failures
```bash
# Clean rebuild
npm run clean
rm -rf node_modules package-lock.json
npm install
npm run build
```

### Debug Environment Variables
```env
# Enhanced debugging
NODE_ENV=development
LOG_LEVEL=debug
DEBUG=rfp:*
PLAYWRIGHT_DEBUG=1
```

## 📚 Learning Resources

### TypeScript Resources
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Effective TypeScript](https://effectivetypescript.com/)
- [TypeScript Deep Dive](https://basarat.gitbook.io/typescript/)

### Node.js Best Practices
- [Node.js Best Practices](https://github.com/goldbergyoni/nodebestpractices)
- [Clean Code JavaScript](https://github.com/ryanmcdermott/clean-code-javascript)

### Testing Resources
- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [Playwright Documentation](https://playwright.dev/)
- [Testing Best Practices](https://github.com/goldbergyoni/javascript-testing-best-practices)

---

**Happy coding! This guide ensures consistent, high-quality development practices.**