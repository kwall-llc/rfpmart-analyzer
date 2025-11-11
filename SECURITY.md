# Security Guidelines

## Overview

This document outlines security practices for the RFP Mart Analyzer project to ensure credentials and sensitive data remain protected.

## Credential Management

### ✅ Secure Practices

1. **Environment Variables**: All credentials stored in `.env` file (never committed)
2. **GitHub Secrets**: Production credentials stored in repository secrets:
   - `RFPMART_USERNAME`
   - `RFPMART_PASSWORD`
   - `AI_OPENAI_API_KEY`
3. **Example Files**: `.env.example` contains only placeholder values
4. **Git Ignore**: `.env` file properly ignored in `.gitignore`

### ❌ What NOT to Do

1. **Never commit** actual credentials to git history
2. **Never include** real credentials in `.env.example`
3. **Never hardcode** API keys or passwords in source code
4. **Never share** credential files via email, chat, or other channels

## File Security Status

### Protected Files (Not in Git)
- `.env` - Local environment file with actual credentials
- `logs/` - Application logs may contain sensitive data
- `data/` - Database and processed RFP data

### Public Files (Safe for Git)
- `.env.example` - Template with placeholder values only
- Source code - Uses environment variables, no hardcoded secrets
- Documentation - No credential references

## For Contributors

### Setting Up Local Environment

1. Copy environment template:
   ```bash
   cp .env.example .env
   ```

2. Replace placeholder values in `.env` with actual credentials:
   ```env
   RFPMART_USERNAME=your_actual_username
   RFPMART_PASSWORD=your_actual_password
   AI_OPENAI_API_KEY=your_actual_api_key
   ```

3. **Never commit the `.env` file** - it's automatically ignored

### Before Making Changes

1. **Check for credentials** before committing:
   ```bash
   git diff --cached | grep -i "password\|key\|secret\|credential"
   ```

2. **Verify .gitignore** is working:
   ```bash
   git status --ignored
   ```

3. **Review example files** to ensure they contain only placeholders

## GitHub Actions Security

### Production Deployment
- Credentials injected via `${{ secrets.SECRET_NAME }}`
- Environment file created dynamically during workflow
- No secrets stored in workflow files

### Testing
- Uses safe test credentials only
- No real API keys or passwords in test workflows

## Incident Response

If credentials are accidentally exposed:

1. **Immediate Actions**:
   - Rotate/change all exposed credentials immediately
   - Update GitHub repository secrets
   - Check git history for credential contamination

2. **If Already Committed**:
   - Use `git filter-branch` or BFG to remove from history
   - Force push to overwrite history (if repository is private)
   - Consider repository recreation for complete cleanup

3. **Notification**:
   - Inform team members of credential rotation
   - Update all deployed instances with new credentials

## Historical Credential Exposure Status

**⚠️ IMPORTANT**: This repository's git history contains exposed credentials in commit `8e1f756` (initial implementation).

**Current Status (2025-11-11)**:
- **Fixed**: All current files (.env.example) contain only placeholder values
- **Secured**: Real credentials are properly stored in GitHub Secrets for CI/CD
- **Documented**: Created comprehensive security documentation
- **Attempted**: Git history sanitization using git filter-branch (blocked by technical issues)

**Exposed Credentials in History**:
- RFP Mart username: `***REMOVED***`
- RFP Mart password: `***REMOVED***`
- These were in comments in `.env.example` in the initial commit

**Risk Assessment**:
- **Current Risk**: LOW (repository is private, credentials are in history comments only)
- **Public Repository Risk**: HIGH (credentials would be visible in git history)
- **Mitigation**: Repository must remain private unless history is fully sanitized

**Sanitization Attempts**:
- Created sanitization scripts (`sanitize-env.sh`, `sanitize-env-index.sh`)
- Attempted git filter-branch with tree-filter and index-filter approaches
- Attempted BFG Repo-Cleaner installation (timeout due to dependencies)
- All attempts blocked by technical constraints

**Recommendations**:
1. **Keep repository private** until git history is sanitized
2. **Rotate exposed credentials** as a precautionary measure
3. **Use git-filter-repo or BFG** for complete history sanitization if going public
4. **Consider fresh repository** with clean history for public release

## Repository Visibility

This project contains business logic but **should remain PRIVATE** due to:
- Integration with proprietary RFP data sources
- Business intelligence and competitive analysis capabilities
- Potential for credential exposure in git history

If repository must be made public:
1. Complete git history audit and cleanup
2. Remove all business-specific configurations
3. Ensure all `.env.example` files contain only generic placeholders
4. Review all documentation for sensitive information

## Security Checklist

Before any major release or repository changes:

- [x] No credentials in source code
- [x] No credentials in `.env.example`
- [x] All secrets using environment variables
- [x] `.gitignore` properly excludes sensitive files
- [x] GitHub secrets properly configured
- [❌] Git history clean of credential references (see Historical Status above)
- [x] Test workflows use only safe credentials

**Note**: Git history sanitization is required before making repository public.

## Contact

For security concerns or suspected credential exposure, contact the development team immediately.