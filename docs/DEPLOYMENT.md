# Deployment Guide

Production deployment guide for the RFP Mart Analyzer with automation and monitoring.

## 🚀 Deployment Overview

The RFP Mart Analyzer is designed for automated deployment via GitHub Actions with multiple environment support and comprehensive monitoring.

### Deployment Architecture
```
GitHub Repository
├── Development Branch → Dev Environment (Manual)
├── Main Branch → Production (Automated Daily)
└── Release Tags → Versioned Deployments
```

## 🏗️ Production Environment Setup

### GitHub Repository Configuration

#### Required Secrets
Configure these in your GitHub repository settings:

```env
# RFP Mart Authentication
RFPMART_USERNAME=your-email@company.com
RFPMART_PASSWORD=your-secure-password

# Optional: GitHub Token for enhanced API access
GITHUB_TOKEN=ghp_your-github-token

# Optional: Notification Integration
SLACK_WEBHOOK_URL=https://hooks.slack.com/your-webhook
EMAIL_SERVICE_API_KEY=your-email-service-key
```

#### Repository Settings
1. **Actions**: Enable GitHub Actions
2. **Security**: Enable Dependabot alerts
3. **Branches**: Protect main branch with required status checks
4. **Secrets**: Add required environment variables

### Environment Variables Configuration

Production `.env` configuration:
```env
# Production Environment
NODE_ENV=production

# RFP Mart Configuration
RFP_CATEGORY_URL=https://www.rfpmart.com/web-design-and-development-rfp-government-contract.html
MIN_BUDGET_ACCEPTABLE=50000
MIN_BUDGET_PREFERRED=100000

# File Paths (GitHub Actions)
DATA_DIRECTORY=./data
REPORTS_DIRECTORY=./data/reports
RFPS_DIRECTORY=./data/rfps
DATABASE_PATH=./data/database.sqlite

# Logging Configuration
LOG_LEVEL=info
LOG_FILE=./logs/rfpmart-analyzer.log

# Keywords for Production Scoring
HIGHER_ED_KEYWORDS=university,college,school,education,academic,campus,student,institution
CMS_KEYWORDS_PREFERRED=drupal,wordpress,modern campus
CMS_KEYWORDS_ACCEPTABLE=joomla,craft,contentful,strapi,sitecore
PROJECT_TYPE_KEYWORDS=redesign,migration,rebuild,modernize,refresh,overhaul
TECHNICAL_KEYWORDS=responsive,mobile,accessibility,wcag,ada,508,mobile-first
LOCATION_PREFERRED=united states,usa,america,north america
LOCATION_ACCEPTABLE=canada,remote,virtual,distributed
```

## 📅 Automated Deployment Schedule

### Daily Production Runs
The system runs automatically at **9:00 AM EST** daily via GitHub Actions:

```yaml
# .github/workflows/daily-rfp-analysis.yml
on:
  schedule:
    - cron: '0 13 * * *'  # 9 AM EST (1 PM UTC)
  workflow_dispatch:      # Manual trigger capability
```

### Manual Deployment Triggers
```bash
# Trigger via GitHub CLI
gh workflow run daily-rfp-analysis.yml

# Trigger with custom parameters
gh workflow run daily-rfp-analysis.yml \
  --field since_date=2024-01-01 \
  --field force_full_run=true
```

## 🔧 GitHub Actions Workflow

### Complete Workflow Steps

1. **Environment Setup**
   - Ubuntu latest runner
   - Node.js 18 installation
   - NPM dependency caching

2. **Dependency Installation**
   - `npm ci` for production dependencies
   - Playwright browser installation

3. **Build Process**
   - TypeScript compilation
   - Production build optimization

4. **Environment Configuration**
   - Secure credential injection
   - Environment variable setup
   - Directory structure creation

5. **RFP Analysis Execution**
   - Automated scraping with date filtering
   - Document processing and analysis
   - Report generation

6. **Results Processing**
   - Artifact upload (30-90 day retention)
   - Summary generation
   - High-priority detection

7. **Notification System**
   - GitHub issue creation for high-priority RFPs
   - Execution summary in GitHub Actions

8. **Cleanup Operations**
   - Error log capture
   - Resource cleanup
   - Failure recovery

### Artifact Management

#### Uploaded Artifacts
```yaml
# Standard Analysis Artifacts (30 days)
- name: rfp-analysis-${{ github.run_number }}
  path: |
    data/reports/
    logs/
    data/database.sqlite

# High-Priority RFPs (90 days)
- name: high-priority-rfps-${{ github.run_number }}
  path: data/reports/individual/
```

#### Artifact Access
```bash
# Download via GitHub CLI
gh run download [run-id]

# Access via web interface
https://github.com/kwall1/rfpmart-analyzer/actions
```

## 🚨 Issue Creation Automation

### Automatic GitHub Issues
High-priority RFPs trigger automatic issue creation:

```markdown
# 🎯 High-Priority RFPs Found - 2024-01-15

The automated RFP analysis has identified high-priority opportunities.

## Quick Actions Required:
1. Review the attached analysis reports
2. Evaluate RFPs for immediate pursuit
3. Assign team members for proposal development
4. Check due dates and plan accordingly

## Analysis Details:
[Detailed analysis from summary report]

## Artifacts:
- Check the workflow run artifacts for detailed reports
- Look for high-priority individual RFP reports

*This issue was automatically created by the RFP Mart Analyzer workflow.*
```

### Issue Labels
- `rfp`: All RFP-related issues
- `high-priority`: Immediate attention required
- `automated`: System-generated content

## 📊 Monitoring and Alerting

### Execution Monitoring

#### Success Metrics
- **Completion Rate**: Percentage of successful runs
- **Discovery Rate**: Number of new RFPs found per run
- **Analysis Accuracy**: Scoring consistency validation
- **Processing Time**: Execution duration tracking

#### Error Tracking
```yaml
# Common error scenarios and responses
authentication_failure:
  response: Check credentials, verify RFP Mart access
  severity: critical
  
document_processing_error:
  response: Review file formats, check extraction logic
  severity: medium
  
network_timeout:
  response: Retry mechanism, check connectivity
  severity: low
```

### Performance Monitoring
```bash
# Execution time tracking
Start: 2024-01-15 09:00:00 EST
End: 2024-01-15 09:15:30 EST
Duration: 15 minutes 30 seconds
Status: Success ✅

# Resource usage
Memory Peak: 512 MB
Network: 25 MB downloaded
Storage: 150 MB artifacts generated
```

## 🔐 Security Considerations

### Credential Security
- **Encrypted Secrets**: GitHub repository secrets encryption
- **Scope Limitation**: Minimal permission access
- **Rotation Schedule**: Quarterly credential updates
- **Audit Logging**: Access and usage tracking

### Data Protection
- **Temporary Storage**: Data cleaned after processing
- **Artifact Encryption**: Sensitive data protection
- **Access Control**: Repository-level permissions
- **Retention Policies**: Automated cleanup

### Network Security
- **HTTPS Only**: Encrypted communications
- **Rate Limiting**: Respectful scraping practices
- **Error Handling**: No sensitive data in logs
- **Failure Recovery**: Graceful degradation

## 🚀 Self-Hosted Deployment Options

### Docker Deployment
```dockerfile
# Dockerfile
FROM node:18-alpine

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci --only=production

# Install Playwright
RUN npx playwright install chromium

# Copy application
COPY dist ./dist
COPY .env ./

# Create data directories
RUN mkdir -p data/reports data/rfps logs

# Run application
CMD ["node", "dist/index.js", "run"]
```

#### Docker Compose
```yaml
# docker-compose.yml
version: '3.8'

services:
  rfp-analyzer:
    build: .
    environment:
      - NODE_ENV=production
    volumes:
      - ./data:/app/data
      - ./logs:/app/logs
    restart: unless-stopped
```

### Systemd Service
```ini
# /etc/systemd/system/rfp-analyzer.service
[Unit]
Description=RFP Mart Analyzer
After=network.target

[Service]
Type=simple
User=rfp-analyzer
WorkingDirectory=/opt/rfp-analyzer
Environment=NODE_ENV=production
ExecStart=/usr/bin/node dist/index.js run
Restart=on-failure
RestartSec=60

[Install]
WantedBy=multi-user.target
```

### Cron Job Setup
```bash
# /etc/cron.d/rfp-analyzer
0 9 * * * rfp-analyzer cd /opt/rfp-analyzer && node dist/index.js run >> /var/log/rfp-analyzer.log 2>&1
```

## 📈 Scaling Considerations

### Horizontal Scaling
- **Multiple Repositories**: Separate environments
- **Load Distribution**: Different RFP categories
- **Regional Deployment**: Geographic distribution
- **Backup Systems**: Redundancy planning

### Performance Optimization
- **Database Optimization**: SQLite → PostgreSQL for scale
- **Caching Strategy**: Redis for analysis results
- **CDN Integration**: Artifact distribution
- **Resource Monitoring**: Memory and CPU optimization

### High Availability
```yaml
# Multi-environment setup
environments:
  production:
    schedule: "0 9 * * *"  # 9 AM EST
    backup: "0 21 * * *"   # 9 PM EST
  
  development:
    trigger: manual
    retention: 7 days
```

## 🛠️ Maintenance Operations

### Regular Maintenance
```bash
# Weekly cleanup (automated)
npm start cleanup -- --days 30

# Dependency updates (monthly)
npm audit
npm update
npm run build
npm test

# Database optimization (quarterly)
VACUUM database.sqlite
ANALYZE database.sqlite
```

### Backup Strategy
```bash
# Database backup
cp data/database.sqlite backups/database-$(date +%Y%m%d).sqlite

# Full backup
tar -czf backups/rfp-analyzer-$(date +%Y%m%d).tar.gz \
  data/ logs/ .env

# Automated backup retention
find backups/ -name "*.tar.gz" -mtime +30 -delete
```

### Health Checks
```bash
# System health validation
npm start status

# Manual execution test
npm start run -- --since $(date -d "1 day ago" +%Y-%m-%d)

# Performance benchmark
time npm start run -- --since $(date -d "1 week ago" +%Y-%m-%d)
```

## 🚨 Troubleshooting

### Common Deployment Issues

#### Authentication Failures
```bash
# Verify credentials
npm start scrape -- --test-auth

# Check RFP Mart accessibility
curl -I https://www.rfpmart.com

# Validate GitHub secrets
gh secret list
```

#### Build Failures
```bash
# Clean environment
rm -rf node_modules dist
npm install
npm run build

# Validate TypeScript
npm run type-check

# Test compilation
npm run build:dev
```

#### Runtime Errors
```bash
# Check logs
tail -f logs/rfpmart-analyzer.log

# Validate environment
npm start status

# Test database
sqlite3 data/database.sqlite ".schema"
```

### Recovery Procedures

#### Failed Runs
1. **Check GitHub Actions logs** for error details
2. **Verify credentials** haven't expired
3. **Test manually** with reduced scope
4. **Review recent changes** for breaking changes
5. **Escalate** if infrastructure issues detected

#### Data Corruption
1. **Backup current state** before any recovery
2. **Restore from artifacts** from last successful run
3. **Reinitialize database** if corruption detected
4. **Replay analysis** from backup data
5. **Validate results** against known good state

## 📊 Success Metrics

### Key Performance Indicators
- **Uptime**: >99% successful daily runs
- **Discovery Rate**: Average 5-10 new RFPs per day
- **Processing Time**: <20 minutes per complete run
- **Accuracy**: >95% correct scoring classification
- **Response Time**: <2 hours from publication to analysis

### Reporting Dashboard
```markdown
## Weekly Summary
- Total Runs: 7/7 successful
- RFPs Discovered: 42 new opportunities
- High Priority: 8 immediate opportunities
- Average Processing: 12 minutes
- System Uptime: 100%
```

---

**Production deployment ensures reliable, automated RFP discovery and analysis for KWALL!**