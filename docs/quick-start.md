# Quick Start Guide

## 🚀 Get Started in 5 Minutes

This guide gets you up and running with the RFP Mart Analyzer quickly. For detailed configuration, see the [full documentation](../README.md).

## Step 1: Setup Repository Secrets

Go to your GitHub repository **Settings** → **Secrets and variables** → **Actions** and add:

### Required Secrets
```
RFPMART_USERNAME: your-rfpmart-email@company.com
RFPMART_PASSWORD: your-rfpmart-password
AI_API_KEY: sk-proj-your-openai-key-here
```

**Need an OpenAI API key?** Visit [OpenAI Platform](https://platform.openai.com/api-keys)

## Step 2: Enable GitHub Pages

1. Go to **Settings** → **Pages**
2. Set **Source** to "GitHub Actions"
3. Done! The workflow will automatically deploy your dashboard

## Step 3: Set Repository Permissions

1. Go to **Settings** → **Actions** → **General**
2. Set **Workflow permissions** to "Read and write permissions"
3. Check "Allow GitHub Actions to create and approve pull requests"

## Step 4: Run Your First Analysis

1. Go to **Actions** tab
2. Select "Daily RFP Analysis"
3. Click "Run workflow" → "Run workflow"
4. Wait 5-10 minutes for completion

## Step 5: View Results

After the workflow completes:

### 📊 Dashboard
Visit: `https://[your-username].github.io/[repo-name]/rfp-reports/`

### 📁 Reports
Check the `/reports` directory in your repository

### 🎯 High-Priority RFPs
Look for automatically created GitHub Issues

## What Happens Next?

- **Daily Analysis**: Runs automatically at 9 AM EST
- **AI Analysis**: Each RFP gets scored 0-100 with detailed reasoning
- **Smart Cleanup**: Poor-fit RFPs are automatically removed
- **GitHub Issues**: High-value opportunities create action items
- **Professional Reports**: Markdown reports perfect for team sharing

## Common Issues

### "Secret not found" error
- Double-check secret names are exactly: `RFPMART_USERNAME`, `RFPMART_PASSWORD`, `AI_API_KEY`
- Verify you have admin access to the repository

### Workflow permission errors
- Ensure workflow permissions are set to "Read and write permissions"
- Check that Actions are enabled for your repository

### No RFPs found
- Verify your RFP Mart credentials work by logging in manually
- Check that your account has access to the web design/development category

## Next Steps

### Customize Keywords
Edit keywords in `.github/workflows/daily-rfp-analysis.yml`:
```yaml
echo "HIGHER_ED_KEYWORDS=university,college,school,your-custom-terms" >> .env
```

### Adjust Budget Thresholds
```yaml
echo "MIN_BUDGET_ACCEPTABLE=75000" >> .env
echo "MIN_BUDGET_PREFERRED=150000" >> .env
```

### Team Access
- Share the GitHub Pages URL with your team
- Enable repository notifications for high-priority RFP alerts
- Review individual RFP reports for detailed analysis

## Need Help?

- 📖 [Full Documentation](../README.md)
- 🤖 [AI Analysis Guide](ai-analysis.md)
- ⚙️ [GitHub Setup Guide](github-setup.md)
- 🐛 [Create an Issue](https://github.com/kwall1/rfpmart-analyzer/issues)

---

**You're all set!** The system will now automatically discover, analyze, and report on RFPs that match KWALL's criteria. Check your GitHub Pages dashboard tomorrow to see the results of your first automated analysis.