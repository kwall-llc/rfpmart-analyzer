# GitHub Setup Guide

## Overview

This guide walks through setting up the RFP Mart Analyzer to work with GitHub Actions, GitHub Pages, and automated reporting. The system is designed to run entirely within GitHub's ecosystem for seamless team collaboration.

## Prerequisites

- GitHub repository with admin access
- RFP Mart account credentials
- OpenAI API key (or other AI provider)
- Basic understanding of GitHub Actions and Pages

## Step 1: Repository Setup

### 1.1 Clone or Fork Repository
```bash
git clone https://github.com/kwall1/rfpmart-analyzer.git
cd rfpmart-analyzer
```

### 1.2 Enable GitHub Pages
1. Go to repository **Settings** → **Pages**
2. Set **Source** to "GitHub Actions"
3. The workflow will automatically deploy to GitHub Pages

### 1.3 Configure Repository Permissions
1. Go to **Settings** → **Actions** → **General**
2. Set **Workflow permissions** to "Read and write permissions"
3. Check "Allow GitHub Actions to create and approve pull requests"

## Step 2: Configure Secrets

Navigate to **Settings** → **Secrets and variables** → **Actions** and add the following repository secrets:

### Required Secrets

#### `RFPMART_USERNAME`
- **Value**: Your RFP Mart login email
- **Description**: Used for automated login to RFP Mart

#### `RFPMART_PASSWORD`
- **Value**: Your RFP Mart password
- **Description**: Used for authenticated access to RFP listings

#### `AI_API_KEY`
- **Value**: Your OpenAI API key (e.g., `sk-proj-...`)
- **Description**: Required for AI-powered RFP analysis
- **How to get**: Visit [OpenAI Platform](https://platform.openai.com/api-keys)

### Optional Secrets (Advanced AI Providers)

#### `AI_ANTHROPIC_API_KEY`
- **Value**: Anthropic Claude API key
- **Description**: Alternative AI provider for analysis
- **How to get**: Visit [Anthropic Console](https://console.anthropic.com/)

#### `AI_AZURE_API_KEY`
- **Value**: Azure OpenAI API key
- **Description**: Enterprise AI provider option

#### `AI_AZURE_ENDPOINT`
- **Value**: Azure OpenAI endpoint URL
- **Description**: Required when using Azure OpenAI

## Step 3: Workflow Configuration

The GitHub Actions workflow is pre-configured in `.github/workflows/daily-rfp-analysis.yml`. Here's what it does:

### Daily Schedule
- **Automatic runs**: Every day at 9 AM EST (1 PM UTC)
- **Manual trigger**: Available in GitHub Actions tab
- **Date filtering**: Optional since-date parameter for manual runs

### Workflow Steps
1. **Environment Setup**: Node.js, dependencies, Playwright browsers
2. **Configuration**: Environment variables and directory structure
3. **RFP Analysis**: Complete scraping and AI analysis workflow
4. **Report Generation**: GitHub-friendly markdown reports
5. **Deployment**: Automatic commit and GitHub Pages deployment
6. **Notifications**: GitHub issues for high-priority RFPs

### Customizing the Schedule
Edit `.github/workflows/daily-rfp-analysis.yml`:

```yaml
on:
  schedule:
    # Change this cron expression for different timing
    # Currently: 9 AM EST (1 PM UTC) daily
    - cron: '0 13 * * *'
```

**Common schedules:**
- `0 9 * * *` - 9 AM UTC daily
- `0 13 * * 1-5` - 1 PM UTC weekdays only
- `0 */12 * * *` - Every 12 hours

## Step 4: Verify Setup

### 4.1 Manual Test Run
1. Go to **Actions** tab in GitHub
2. Select "Daily RFP Analysis" workflow
3. Click "Run workflow" → "Run workflow"
4. Monitor the workflow execution

### 4.2 Check Results
After successful run, verify:
- **Reports**: Check `/reports` directory in repository
- **GitHub Pages**: Visit `https://[username].github.io/[repo]/rfp-reports/`
- **Issues**: Look for automatically created high-priority RFP issues
- **Artifacts**: Download workflow artifacts for complete analysis

### 4.3 Common Issues and Solutions

#### Workflow Permission Errors
```
Error: Resource not accessible by integration
```
**Solution**: Ensure workflow permissions are set to "Read and write permissions"

#### Secret Not Found Errors
```
Error: Secret RFPMART_USERNAME not found
```
**Solution**: Double-check secret names and values in repository settings

#### GitHub Pages Not Updating
**Solution**: Check Pages settings and ensure "GitHub Actions" is selected as source

## Step 5: Team Access and Usage

### 5.1 Accessing Results

**For Technical Team Members:**
- Repository `/reports` directory for latest analysis
- GitHub Actions logs for detailed execution information
- Workflow artifacts for complete data downloads

**For Non-Technical Team Members:**
- GitHub Pages dashboard: `https://[username].github.io/[repo]/rfp-reports/`
- GitHub Issues for high-priority RFP notifications
- Email notifications if GitHub notifications are enabled

### 5.2 Understanding the Dashboard

The GitHub Pages dashboard provides:
- **Executive Summary**: Key metrics and trends
- **Excellent Fit RFPs**: Immediate action recommended
- **Good Fit RFPs**: Worth pursuing opportunities
- **Individual RFP Pages**: Detailed analysis for each opportunity

### 5.3 Managing Notifications

Configure GitHub notification preferences:
1. Go to repository **Settings** → **Notifications**
2. Set notification preferences for issues and workflow runs
3. Team members can "Watch" the repository for automatic notifications

## Step 6: Advanced Configuration

### 6.1 Custom Keywords
Edit environment variables in the workflow file to customize scoring:

```yaml
echo "HIGHER_ED_KEYWORDS=university,college,school,your-custom-keywords" >> .env
echo "CMS_KEYWORDS_PREFERRED=drupal,wordpress,your-preferred-cms" >> .env
```

### 6.2 Budget Thresholds
Adjust budget scoring thresholds:

```yaml
echo "MIN_BUDGET_ACCEPTABLE=75000" >> .env  # Increase minimum budget
echo "MIN_BUDGET_PREFERRED=150000" >> .env  # Increase preferred budget
```

### 6.3 Cleanup Configuration
Control automatic cleanup of poor-fit RFPs:

```yaml
echo "CLEANUP_ENABLED=true" >> .env                    # Enable cleanup
echo "CLEANUP_POOR_FIT_THRESHOLD=25" >> .env          # Lower threshold
echo "CLEANUP_REJECTED_THRESHOLD=40" >> .env          # Custom threshold
```

### 6.4 AI Provider Configuration
Switch or configure AI providers:

```yaml
# For Anthropic Claude
echo "AI_PROVIDER=anthropic" >> .env
echo "AI_ANTHROPIC_API_KEY=${{ secrets.AI_ANTHROPIC_API_KEY }}" >> .env

# For Azure OpenAI
echo "AI_PROVIDER=azure" >> .env
echo "AI_AZURE_API_KEY=${{ secrets.AI_AZURE_API_KEY }}" >> .env
echo "AI_AZURE_ENDPOINT=${{ secrets.AI_AZURE_ENDPOINT }}" >> .env
```

## Step 7: Monitoring and Maintenance

### 7.1 Workflow Monitoring
- **Actions Tab**: Monitor daily workflow executions
- **Workflow Status**: Check for failures and errors
- **Artifact Downloads**: Access complete analysis data
- **Log Review**: Investigate issues using workflow logs

### 7.2 Regular Maintenance Tasks
- **API Key Rotation**: Update API keys periodically for security
- **Keyword Updates**: Refresh keyword lists based on business focus
- **Budget Adjustments**: Update budget thresholds as needed
- **Performance Review**: Monitor analysis accuracy and effectiveness

### 7.3 Cost Management
- **API Usage**: Monitor OpenAI/AI provider costs
- **GitHub Actions**: Review workflow minute usage
- **Storage**: Manage artifact retention and repository size
- **Optimization**: Adjust frequency and scope based on needs

## Step 8: Troubleshooting

### 8.1 Common Workflow Failures

#### Authentication Issues
- Verify RFP Mart credentials are current and correct
- Check for account lockouts or CAPTCHA requirements
- Ensure credentials have proper access permissions

#### AI Analysis Failures
- Verify API key is valid and has sufficient credits
- Check AI provider service status and rate limits
- Review document quality and completeness

#### Report Generation Issues
- Check repository permissions for file operations
- Verify GitHub Pages configuration and settings
- Review template and formatting issues

### 8.2 Performance Issues

#### Slow Workflow Execution
- Monitor RFP Mart site performance and response times
- Consider adjusting timeouts and retry logic
- Review document processing efficiency

#### High API Costs
- Monitor token usage and optimize prompts
- Consider using smaller AI models for routine analysis
- Implement caching and batch processing optimizations

### 8.3 Data Quality Issues

#### Inaccurate Analysis
- Review and refine AI analysis prompts
- Validate document extraction and preprocessing
- Consider manual review samples for calibration

#### Missing RFPs
- Verify RFP Mart site structure and selectors
- Check authentication and access permissions
- Review date filtering and duplicate detection logic

## Support and Resources

### Documentation
- [AI Analysis Guide](ai-analysis.md)
- [Main README](../README.md)
- [Configuration Reference](configuration.md)

### GitHub Resources
- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [GitHub Pages Documentation](https://docs.github.com/en/pages)
- [Repository Secrets Management](https://docs.github.com/en/actions/security-guides/encrypted-secrets)

### Community Support
- [GitHub Issues](https://github.com/kwall1/rfpmart-analyzer/issues)
- [GitHub Discussions](https://github.com/kwall1/rfpmart-analyzer/discussions)

### Professional Support
For enterprise setup and customization:
- Create detailed GitHub issue with requirements
- Consider professional services engagement
- Review commercial support options