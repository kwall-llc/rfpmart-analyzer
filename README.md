# RFP Mart Analyzer

Intelligent RFP discovery and analysis system for KWALL - automatically identifies, analyzes, and scores relevant Request for Proposals from RFP Mart using AI-powered analysis and KWALL's business criteria.

## 🎯 Overview

The RFP Mart Analyzer automatically:
- **Scrapes** rfpmart.com daily for new web design/development RFPs
- **Downloads** and organizes RFP documents (PDFs, Word docs, ZIP archives) in structured directories
- **Analyzes** content using AI-powered analysis with OpenAI GPT-4 integration
- **Scores** RFPs using KWALL's comprehensive business criteria (0-100 point scale)
- **Generates** professional markdown and HTML reports for each analyzed RFP
- **Creates** GitHub-native dashboards and individual RFP pages for easy review
- **Deploys** reports to GitHub Pages for non-technical team member access
- **Automatically cleans up** poor-fit RFPs while preserving analysis reports
- **Creates** GitHub issues for high-priority opportunities requiring immediate action

## 🚀 Features

### 🤖 AI-Powered Analysis
- **OpenAI GPT-4 Integration**: Intelligent analysis of RFP content with KWALL-specific prompts
- **Multi-Provider Support**: OpenAI, Anthropic Claude, and Azure OpenAI compatibility
- **Smart Text Extraction**: PDF and Word document processing with context preservation
- **Fit Scoring Algorithm**: 0-100 point scoring with confidence levels and detailed reasoning
- **Institution Classification**: Automatic detection of higher education, government, and private sector
- **Technology Stack Analysis**: Identification of CMS preferences and technical requirements

### 🔄 Automated Discovery & Processing
- **RSS-Optimized Workflow**: Pre-filters opportunities via public RSS feed before authenticated scraping
- **AI-Powered Pre-Filtering**: Conservative keyword-based analysis identifies promising RFPs
- **Daily GitHub Actions**: Scheduled runs at 9 AM EST with manual trigger support
- **Targeted Scraping**: Only scrapes pre-filtered promising RFPs, reducing server load
- **Organized File Storage**: RFP-specific directories with structured document organization
- **Smart Date Filtering**: Avoids reprocessing with configurable date range support
- **Multi-Format Support**: PDF, DOC, DOCX, ZIP, RAR, TXT extraction and analysis
- **Robust Error Handling**: Retry logic with graceful degradation and detailed logging
- **Intelligent Cleanup**: Automatic removal of poor-fit RFPs while preserving analysis reports

### 📊 GitHub-Native Reporting
- **Markdown Dashboards**: GitHub-friendly main dashboard with executive summary
- **Individual RFP Pages**: Detailed analysis pages for each RFP with scoring breakdown
- **GitHub Pages Deployment**: Automatic deployment for non-technical team access
- **Repository Integration**: Reports committed directly to repository for version control
- **GitHub Issues**: Automatic issue creation for excellent and good fit RFPs
- **Artifact Management**: 30-90 day retention with organized download packages

### 🎯 Intelligent Scoring (100-point scale)
- **Higher Education Focus** (30 points): Universities, colleges, community colleges, K-12
- **CMS Technology Match** (25 points): Drupal (25), WordPress (20), Modern Campus (25), Others (10)
- **Budget Analysis** (20 points): $100K+ (20), $75K-100K (15), $50K-75K (10), <$50K (0)
- **Project Type Alignment** (15 points): Redesign (15), Migration (12), New site (8), Maintenance (5)
- **Timeline Feasibility** (10 points): 3+ months (10), 2-3 months (8), 1-2 months (5), <1 month (0)

### 🧠 Comprehensive Analysis
- **AI-Powered Content Analysis**: Deep understanding of RFP requirements and context
- **Institution Profile Building**: Detailed analysis of client type, size, and needs
- **Budget Intelligence**: Smart extraction and validation from various document formats
- **Technology Requirements**: Identification of technical specifications and preferences
- **Geographic Feasibility**: Location analysis with preference scoring
- **Red Flag Detection**: Automatic identification of problematic requirements or timelines
- **Opportunity Identification**: Highlighting of competitive advantages and strategic fits

### 📈 Professional Reporting
- **Executive Dashboard**: High-level overview with key metrics and trend analysis
- **Individual RFP Reports**: Comprehensive analysis with scoring breakdown and recommendations
- **GitHub Integration**: Native GitHub workflow with issues, pages, and artifact management
- **Multiple Output Formats**: Markdown, HTML, and structured data formats
- **Historical Tracking**: Trend analysis and performance metrics over time
- **Action-Oriented Recommendations**: Clear next steps and pursuit recommendations

## 📁 Project Structure

```
rfpmart-analyzer/
├── src/
│   ├── analyzers/          # RFP analysis and scoring logic
│   │   ├── criteriaChecker.ts    # Business criteria validation
│   │   ├── rfpAnalyzer.ts        # Main analysis orchestrator
│   │   ├── reportGenerator.ts    # Report creation
│   │   └── scoreCalculator.ts    # Scoring algorithm
│   ├── commands/           # CLI command implementations
│   │   └── generateReports.ts    # GitHub report generation command
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
│   ├── services/           # AI and reporting services
│   │   ├── aiAnalyzer.ts         # AI-powered RFP analysis
│   │   ├── aiPreFilter.ts        # RSS pre-filtering service
│   │   ├── fitReportGenerator.ts # Professional report generation
│   │   ├── githubReporter.ts     # GitHub-native reporting
│   │   ├── rfpCleanupManager.ts  # Intelligent RFP cleanup
│   │   └── rssFeedParser.ts      # RSS feed parsing service
│   ├── storage/            # Data persistence
│   │   ├── database.ts           # SQLite database with AI analysis
│   │   └── fileManager.ts        # File organization
│   ├── utils/              # Utilities
│   │   ├── dateHelper.ts         # Date parsing and formatting
│   │   ├── fileExtractor.ts      # PDF/Word text extraction
│   │   └── logger.ts             # Structured logging
│   └── web/                # Web interface components
│       └── dashboard.html        # Local dashboard template
├── .github/workflows/      # GitHub Actions automation
│   └── daily-rfp-analysis.yml   # Daily analysis workflow
├── data/                   # Generated data (gitignored)
│   ├── rfps/              # Individual RFP directories
│   ├── reports/           # Generated analysis reports
│   └── database.sqlite    # Analysis tracking database
├── logs/                   # Application logs (gitignored)
└── reports/                # GitHub-committed reports (generated)
    ├── docs/              # GitHub Pages deployment
    └── rfps/              # Individual RFP analysis pages
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

# AI Analysis Configuration
AI_PROVIDER=openai                    # openai, anthropic, or azure
AI_API_KEY=your-openai-key           # OpenAI API key
AI_OPENAI_MODEL=gpt-4                # gpt-4, gpt-4-turbo, gpt-3.5-turbo
AI_ANTHROPIC_API_KEY=your-claude-key # Anthropic Claude API key (optional)
AI_AZURE_API_KEY=your-azure-key      # Azure OpenAI API key (optional)
AI_AZURE_ENDPOINT=your-azure-endpoint # Azure OpenAI endpoint (optional)

# Cleanup Configuration
CLEANUP_ENABLED=true                  # Enable automatic cleanup of poor-fit RFPs
CLEANUP_POOR_FIT_THRESHOLD=30        # Score threshold for poor fit cleanup
CLEANUP_REJECTED_THRESHOLD=50        # Score threshold for rejected RFP cleanup
CLEANUP_DRY_RUN=false                # Set to true to preview cleanup without deletion

# Keywords for Scoring (comma-separated)
HIGHER_ED_KEYWORDS=university,college,school,education,academic,campus,student,institution,district,system
CMS_KEYWORDS_PREFERRED=drupal,wordpress,modern campus
CMS_KEYWORDS_ACCEPTABLE=joomla,craft,contentful,strapi,sitecore,umbraco
PROJECT_TYPE_KEYWORDS=redesign,migration,rebuild,modernize,refresh,overhaul,revamp
TECHNICAL_KEYWORDS=responsive,mobile,accessibility,wcag,ada,508,mobile-first,progressive
LOCATION_PREFERRED=united states,usa,america,north america
LOCATION_ACCEPTABLE=canada,remote,virtual,distributed,online
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
# Run complete optimized workflow (RSS → AI pre-filter → targeted scrape)
npm start run

# Run analysis for RFPs since specific date
npm start run -- --since 2024-01-01

# Use traditional full scraping (bypasses RSS optimization)
npm start run -- --traditional

# Scrape only (no AI analysis or processing)
npm start scrape

# Generate GitHub-friendly reports from existing analysis
npm start generate-reports

# Generate reports with GitHub Pages support
npm start generate-reports -- --github-pages --action-summary

# Show system status and statistics  
npm start status

# Clean up old files (30+ days)
npm start cleanup

# Clean up poor-fit RFPs (dry run to preview)
npm start cleanup -- --type rfps --dry-run
```

### GitHub Actions (Automated)

The system runs automatically via GitHub Actions with comprehensive workflow features:

- **Daily Schedule**: 9 AM EST every day with manual trigger support
- **AI Analysis**: Complete AI-powered analysis of all discovered RFPs
- **Report Generation**: Automatic creation of markdown dashboards and individual RFP pages
- **GitHub Pages**: Automatic deployment to GitHub Pages for easy team access
- **Repository Integration**: Reports committed directly to repository for version control
- **Artifact Storage**: Analysis results, reports, and high-priority RFPs saved for 30-90 days
- **Issue Creation**: Automatic GitHub issue creation for excellent and good fit RFPs
- **Workflow Summaries**: Detailed GitHub Action summaries with analysis metrics
- **Error Handling**: Comprehensive error recovery with detailed logging

### Viewing Results

The system provides multiple ways to access analysis results:

1. **GitHub Pages Dashboard**: Automatic deployment to `https://[username].github.io/[repo]/rfp-reports/`
2. **Repository Reports**: Committed reports in the `/reports` directory
3. **GitHub Issues**: Automatic issues for high-priority RFPs requiring immediate attention
4. **Workflow Artifacts**: Downloadable packages with complete analysis results
5. **Action Summaries**: Inline summaries in GitHub Actions with key metrics

### Repository Secrets

Configure these secrets in your GitHub repository settings:

- `RFPMART_USERNAME`: Your RFP Mart login email
- `RFPMART_PASSWORD`: Your RFP Mart password
- `AI_API_KEY`: Your OpenAI API key for AI analysis (e.g., sk-proj-...)

Optional secrets for advanced AI providers:
- `AI_ANTHROPIC_API_KEY`: Anthropic Claude API key (if using Claude)
- `AI_AZURE_API_KEY`: Azure OpenAI API key (if using Azure)
- `AI_AZURE_ENDPOINT`: Azure OpenAI endpoint URL (if using Azure)

## 📊 AI-Powered Scoring Methodology

### AI Analysis Framework

The system uses advanced AI analysis (OpenAI GPT-4) with KWALL-specific prompts to provide:

- **Intelligent Content Analysis**: Deep understanding of RFP requirements, context, and technical needs
- **Institution Profiling**: Detailed analysis of client type, organizational structure, and decision-making processes  
- **Budget Intelligence**: Smart extraction and validation from various document formats with feasibility assessment
- **Technology Mapping**: Identification of technical specifications, preferred platforms, and integration requirements
- **Strategic Fit Assessment**: Analysis of competitive positioning and KWALL's unique value proposition
- **Risk & Opportunity Analysis**: Identification of potential challenges and strategic advantages

### AI Scoring Breakdown (100 points total)

| Criteria | Weight | AI Analysis Focus |
|----------|--------|-------------------|
| **Higher Education Focus** | 30 points | Institution type detection, educational sector validation, academic mission alignment |
| **CMS Technology Match** | 25 points | Drupal (25), WordPress (20), Modern Campus (25), Other CMS (10), Custom (5) |
| **Budget Alignment** | 20 points | $100K+ (20), $75K-100K (15), $50K-75K (10), <$50K (0), Budget realism assessment |
| **Project Type Fit** | 15 points | Redesign (15), Migration (12), New Development (8), Maintenance (5), Scope complexity |
| **Timeline Feasibility** | 10 points | 3+ months (10), 2-3 months (8), 1-2 months (5), <1 month (0), Deadline realism |

### AI Recommendation Levels

- **🎯 Excellent Fit** (80+ points): Immediate pursuit strongly recommended with detailed opportunity analysis
- **✅ Good Fit** (60-79 points): Worth pursuing with strategic assessment and proposal development
- **⚠️ Poor Fit** (40-59 points): Consider carefully, may have specific challenges or limited alignment
- **❌ Rejected** (<40 points): Skip or monitor only, significant barriers to success

### AI-Powered Quality Indicators

**Confidence Scoring**: Each analysis includes confidence levels (0-100%) indicating AI certainty in assessment

**Automated Red Flag Detection**:
- Unrealistic budgets relative to scope and timeline
- Impossible or problematic delivery timelines
- Technical requirements outside KWALL expertise
- Geographic or contractual restrictions
- Overly complex procurement processes
- Budget-scope misalignment indicators

**Opportunity Identification**:
- Strategic advantages and competitive differentiators
- Potential for long-term client relationships
- Technology expertise alignment opportunities
- Geographic and cultural fit indicators
- Revenue and growth potential assessment

## 📋 AI-Enhanced Output & Reports

### 📊 GitHub Dashboard
Automatically generated main dashboard with:
- Executive summary with key metrics and trends
- Statistics overview (total analyzed, excellent fit, good fit, average scores)
- High-priority RFP spotlight with detailed summaries  
- Quick links to all analysis reports and GitHub Pages
- Real-time updates via GitHub Actions

### 📄 Individual RFP Analysis Reports
Professional reports generated for each analyzed RFP:
- **AI Fit Analysis**: Comprehensive scoring breakdown with confidence levels
- **Executive Summary**: AI-generated analysis reasoning and key insights
- **Institution Profile**: Detailed client analysis and organizational context
- **Technical Requirements**: Technology stack and platform requirements
- **Budget & Timeline**: Financial feasibility and project timeline assessment
- **Opportunities & Red Flags**: Strategic advantages and potential challenges
- **Actionable Recommendations**: Clear next steps and pursuit strategies

### 🌐 GitHub Pages Integration
Automatically deployed GitHub Pages site featuring:
- Professional dashboard accessible to non-technical team members
- Individual RFP pages with full analysis details
- Responsive design optimized for desktop and mobile
- Search and filtering capabilities for large RFP datasets
- Jekyll-based static site with custom themes

### 🎯 GitHub Issues & Notifications
Automated issue creation for high-value opportunities:
- **Excellent Fit RFPs**: Immediate action required with detailed analysis
- **Good Fit RFPs**: Strategic assessment recommended with key insights
- **Issue Templates**: Standardized format with analysis summary and action items
- **Labels & Tracking**: Automated labeling for easy project management
- **Artifact Links**: Direct links to detailed reports and supporting documents

### 📦 Comprehensive Artifacts
Organized artifact packages with 30-90 day retention:
- **Analysis Reports**: Complete markdown and HTML reports
- **High-Priority Packages**: Focused packages for excellent and good fit RFPs  
- **Database Exports**: SQLite database with complete analysis history
- **Log Files**: Detailed operational logs for debugging and auditing
- **Source Documents**: Original RFP files organized by opportunity

## 🗄️ Enhanced Database Schema

SQLite database with comprehensive AI analysis tracking:

### `rfp_runs`
- Analysis run tracking with AI provider details
- Success metrics, statistics, and performance data
- Error logging and debugging information
- AI usage tracking and cost management

### `rfps` 
- Individual RFP records with enhanced metadata
- File organization tracking and document inventory
- Processing status and workflow state management
- Geographic and institutional classification data

### `ai_analysis`
- **Core AI Analysis**: Complete AI analysis results with scoring breakdown
- **Provider Tracking**: AI provider, model, and configuration used
- **Confidence Metrics**: AI confidence levels and uncertainty indicators
- **Analysis Metadata**: Timestamp, processing time, and version tracking
- **Content Analysis**: Extracted text, identified technologies, and requirements
- **Strategic Assessment**: Opportunities, red flags, and competitive analysis

### `analysis_results` (Legacy)
- Historical analysis data for trend tracking
- Component scoring by category for comparison
- Performance metrics and accuracy tracking

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

## 🆘 Support & Documentation

### 📚 Quick Start
- [⚡ Quick Start Guide](docs/quick-start.md) - Get running in 5 minutes
- [⚙️ GitHub Setup Guide](docs/github-setup.md) - Complete GitHub integration setup
- [🤖 AI Analysis Guide](docs/ai-analysis.md) - AI-powered analysis configuration

### 📖 Detailed Documentation
- [Configuration Reference](docs/configuration.md) - Environment variables and settings
- [API Reference](docs/api.md) - CLI commands and programmatic usage
- [Troubleshooting Guide](docs/troubleshooting.md) - Common issues and solutions

### 🎯 Getting Started
1. **New Users**: Start with the [Quick Start Guide](docs/quick-start.md)
2. **GitHub Integration**: Follow the [GitHub Setup Guide](docs/github-setup.md)
3. **AI Configuration**: Review the [AI Analysis Guide](docs/ai-analysis.md)
4. **Advanced Setup**: Check the [Configuration Reference](docs/configuration.md)

### 🤝 Getting Help
- 📋 [Create an issue](https://github.com/kwall1/rfpmart-analyzer/issues) for bug reports
- 💬 [GitHub Discussions](https://github.com/kwall1/rfpmart-analyzer/discussions) for questions
- 🔍 Check existing issues before creating new ones
- 📝 Provide detailed reproduction steps and logs

### 👥 Contact & Community
- **Project Maintainer**: KWALL Development Team
- **Repository**: [github.com/kwall1/rfpmart-analyzer](https://github.com/kwall1/rfpmart-analyzer)
- **GitHub**: [@kwall1](https://github.com/kwall1)
- **Issues**: [Bug Reports & Feature Requests](https://github.com/kwall1/rfpmart-analyzer/issues)

---

**Built with ❤️ by KWALL for automated RFP discovery and analysis**