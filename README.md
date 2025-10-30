# RFP Mart Analyzer

Automated RFP discovery and analysis system for KWALL - intelligently identifies and scores relevant Request for Proposals from RFP Mart based on business criteria.

## 🎯 Overview

The RFP Mart Analyzer automatically:
- **Scrapes** rfpmart.com daily for new web design/development RFPs
- **Downloads** and processes RFP documents (PDFs, Word docs, ZIP archives)
- **Analyzes** content using KWALL's scoring criteria
- **Generates** detailed reports for high-priority opportunities
- **Creates** GitHub issues for immediate follow-up on promising RFPs

## 🚀 Features

### Automated Discovery
- Daily scheduled runs via GitHub Actions at 9 AM EST
- Smart date-based filtering to avoid reprocessing
- Multi-format document extraction (PDF, DOC, DOCX, ZIP, RAR, TXT)
- Robust error handling and retry logic

### Intelligent Scoring (100-point scale)
- **Higher Education Focus** (30 points): Universities, colleges, community colleges
- **CMS Preferences** (20 points): Drupal, WordPress, Modern Campus
- **Budget Analysis** (20 points): $50K minimum, $100K+ preferred
- **Project Types** (15 points): Website redesigns, CMS migrations
- **Timeline & Location** (15 points): Reasonable deadlines, preferred regions

### Comprehensive Analysis
- Institution type detection and verification
- Budget extraction from various document formats
- Technology stack identification
- Geographic and timeline feasibility assessment
- Red flag detection (unrealistic budgets, tight deadlines)

### Report Generation
- Executive summary reports with key insights
- Individual detailed reports for high-scoring RFPs
- Automated GitHub issue creation for immediate action
- Historical tracking and trend analysis

## 📁 Project Structure

```
rfpmart-analyzer/
├── src/
│   ├── analyzers/          # RFP analysis and scoring logic
│   │   ├── criteriaChecker.ts    # Business criteria validation
│   │   ├── rfpAnalyzer.ts        # Main analysis orchestrator
│   │   ├── reportGenerator.ts    # Report creation
│   │   └── scoreCalculator.ts    # Scoring algorithm
│   ├── config/             # Configuration and constants
│   │   ├── constants.ts          # Application constants
│   │   └── environment.ts        # Environment configuration
│   ├── processors/         # Document processing
│   │   ├── documentExtractor.ts  # Multi-format extraction
│   │   ├── rfpProcessor.ts       # RFP processing orchestrator
│   │   └── zipHandler.ts         # ZIP/RAR archive handling
│   ├── scrapers/           # Web scraping
│   │   ├── authManager.ts        # Authentication handling
│   │   └── rfpMartScraper.ts     # Main scraping logic
│   ├── storage/            # Data persistence
│   │   ├── database.ts           # SQLite database management
│   │   └── fileManager.ts        # File organization
│   └── utils/              # Utilities
│       ├── dateHelper.ts         # Date parsing and formatting
│       └── logger.ts             # Structured logging
├── .github/workflows/      # GitHub Actions automation
├── data/                   # Generated data (gitignored)
└── logs/                   # Application logs (gitignored)
```

## ⚙️ Installation

### Prerequisites
- Node.js 18+ 
- npm or yarn
- Git

### Local Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/kwall1/rfpmart-analyzer.git
   cd rfpmart-analyzer
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Install Playwright browsers**
   ```bash
   npx playwright install chromium
   ```

4. **Configure environment**
   ```bash
   cp .env.example .env
   # Edit .env with your RFP Mart credentials
   ```

5. **Build the project**
   ```bash
   npm run build
   ```

## 🔧 Configuration

### Environment Variables

Create a `.env` file with the following configuration:

```env
# RFP Mart Authentication
RFPMART_USERNAME=your-email@company.com
RFPMART_PASSWORD=your-password

# Target RFP Category
RFP_CATEGORY_URL=https://www.rfpmart.com/web-design-and-development-rfp-government-contract.html

# Budget Thresholds
MIN_BUDGET_ACCEPTABLE=50000
MIN_BUDGET_PREFERRED=100000

# File Paths
DATA_DIRECTORY=./data
REPORTS_DIRECTORY=./data/reports
RFPS_DIRECTORY=./data/rfps
DATABASE_PATH=./data/database.sqlite

# Logging
LOG_LEVEL=info
LOG_FILE=./logs/rfpmart-analyzer.log
NODE_ENV=development

# Keywords for Scoring (comma-separated)
HIGHER_ED_KEYWORDS=university,college,school,education,academic,campus,student
CMS_KEYWORDS_PREFERRED=drupal,wordpress,modern campus
CMS_KEYWORDS_ACCEPTABLE=joomla,craft,contentful,strapi
PROJECT_TYPE_KEYWORDS=redesign,migration,rebuild,modernize,refresh
TECHNICAL_KEYWORDS=responsive,mobile,accessibility,wcag,ada
LOCATION_PREFERRED=united states,usa,america,north america
LOCATION_ACCEPTABLE=canada,remote,virtual
```

### Keyword Configuration

The system uses configurable keyword lists for intelligent scoring:

- **Higher Education**: university, college, school, education, academic
- **Preferred CMS**: drupal, wordpress, modern campus  
- **Acceptable CMS**: joomla, craft, contentful, strapi
- **Project Types**: redesign, migration, rebuild, modernize
- **Technical Requirements**: responsive, mobile, accessibility, wcag
- **Geographic Preferences**: Configurable by location

## 🚀 Usage

### Command Line Interface

```bash
# Run complete analysis workflow
npm start run

# Run analysis for RFPs since specific date
npm start run -- --since 2024-01-01

# Scrape only (no processing)
npm start scrape

# Show system status and statistics  
npm start status

# Clean up old files (30+ days)
npm start cleanup
```

### GitHub Actions (Automated)

The system runs automatically via GitHub Actions:

- **Daily Schedule**: 9 AM EST every day
- **Manual Trigger**: Run with custom date ranges
- **Artifact Storage**: Reports and analysis results saved for 30-90 days
- **Issue Creation**: High-priority RFPs automatically create GitHub issues

### Repository Secrets

Configure these secrets in your GitHub repository:

- `RFPMART_USERNAME`: Your RFP Mart login email
- `RFPMART_PASSWORD`: Your RFP Mart password

## 📊 Scoring Methodology

### Scoring Breakdown (100 points total)

| Criteria | Points | Description |
|----------|--------|-------------|
| **Higher Education** | 30 | Universities, colleges, K-12 schools |
| **CMS Match** | 20 | Drupal (20), WordPress (15), Modern Campus (20), Others (10) |
| **Budget Range** | 20 | $100K+ (20), $75K-100K (15), $50K-75K (10), <$50K (0) |
| **Project Type** | 15 | Redesign (15), Migration (12), New site (8), Maintenance (5) |
| **Timeline** | 15 | 3+ months (15), 2-3 months (10), 1-2 months (5), <1 month (0) |

### Recommendation Levels

- **HIGH** (70+ points): Immediate pursuit recommended
- **MEDIUM** (50-69 points): Worth investigating  
- **LOW** (<50 points): Monitor or skip

### Red Flags

Automatic score reductions for:
- Unrealistic budgets (<$25K for full redesign)
- Impossible timelines (<30 days)
- Overly broad scope without adequate budget
- Geographic restrictions outside target areas

## 📋 Output & Reports

### Summary Reports
- Executive overview with key metrics
- Trend analysis and insights
- High-priority opportunity alerts
- Historical performance tracking

### Individual RFP Reports
Generated for high-scoring RFPs:
- Detailed scoring breakdown
- Institution analysis
- Budget and timeline assessment  
- Technology requirements
- Competitive landscape
- Recommended next steps

### GitHub Integration
- Automated issue creation for high-priority RFPs
- Links to detailed analysis reports
- Action items and follow-up reminders
- Artifact downloads for complete documentation

## 🗄️ Database Schema

SQLite database with three main tables:

### `rfp_runs`
- Tracks each analysis run
- Success metrics and statistics
- Error logging and debugging info

### `rfps` 
- Individual RFP records
- Metadata and scoring results
- Processing status tracking

### `analysis_results`
- Detailed analysis breakdown
- Component scoring by category
- Historical score tracking

## 🔍 Monitoring & Debugging

### Logging
- Structured JSON logging with Winston
- Separate loggers for different components
- Configurable log levels (debug, info, warn, error)
- Automatic log rotation and cleanup

### Error Handling
- Comprehensive try-catch blocks
- Graceful degradation for non-critical failures
- Detailed error context for debugging
- Automatic retry logic for transient failures

### Performance Monitoring
- Execution time tracking
- Memory usage monitoring  
- Success/failure rate statistics
- Document processing metrics

## 🛠️ Development

### Available Scripts

```bash
npm run build          # Compile TypeScript
npm run dev           # Development mode with watch
npm run lint          # ESLint code analysis
npm run test          # Run test suite
npm start <command>   # Run CLI commands
```

### Code Style
- TypeScript with strict mode enabled
- ESLint with recommended rules
- Prettier for consistent formatting
- Conventional commit messages

### Testing Strategy
- Unit tests for core logic components
- Integration tests for scraping workflows  
- End-to-end tests for complete analysis pipeline
- Mock data for reliable testing

## 🔒 Security Considerations

### Credential Management
- Environment variables for sensitive data
- GitHub Secrets for automation credentials
- No hardcoded passwords or API keys
- Secure credential rotation procedures

### Data Privacy
- Local-only data storage by default
- Configurable data retention policies
- Automatic cleanup of old files
- No sensitive data in logs or reports

### Access Control
- Repository-level access controls
- Separate environments for development/production
- Audit logging for all operations
- Regular security dependency updates

## 🚀 Deployment

### GitHub Actions (Recommended)
Fully automated deployment with:
- Scheduled daily runs
- Manual trigger capability
- Artifact storage and management
- Issue creation and notifications

### Self-Hosted Options
- Docker containerization support
- Systemd service configuration
- Cron job scheduling
- Manual deployment scripts

### Scaling Considerations
- SQLite suitable for single-instance deployment
- PostgreSQL/MySQL for multi-instance scaling
- Horizontal scaling via multiple repositories
- Load balancing for high-volume processing

## 📈 Roadmap

### Short Term
- [ ] Enhanced budget detection algorithms
- [ ] Additional document format support
- [ ] Improved institution classification
- [ ] Performance optimizations

### Medium Term  
- [ ] Multi-site RFP source integration
- [ ] Machine learning score optimization
- [ ] Advanced competitive analysis
- [ ] Real-time notification system

### Long Term
- [ ] Predictive RFP identification
- [ ] Automated proposal generation assistance
- [ ] Integration with CRM systems
- [ ] Advanced analytics dashboard

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines
- Follow TypeScript best practices
- Write comprehensive tests
- Update documentation for new features
- Use conventional commit messages
- Ensure all CI checks pass

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

### Documentation
- [Configuration Guide](docs/configuration.md)
- [API Reference](docs/api.md)
- [Troubleshooting](docs/troubleshooting.md)

### Getting Help
- Create an issue for bug reports
- Use discussions for questions
- Check existing issues before creating new ones
- Provide detailed reproduction steps

### Contact
- **Project Maintainer**: KWALL Development Team
- **Email**: [Add contact email]
- **GitHub**: [@kwall1](https://github.com/kwall1)

---

**Built with ❤️ by KWALL for automated RFP discovery and analysis**