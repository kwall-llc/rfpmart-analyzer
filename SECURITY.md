# Security Guidelines

## Overview

This document outlines security practices for the RFP Mart Analyzer project to ensure credentials and sensitive data remain protected.

## Credential Management

### ✅ Secure Practices

1. **Environment Variables**: All credentials stored in `.env` file (never committed)
2. **GitHub Secrets**: Production credentials stored in repository secrets:
   - `RFPMART_USERNAME`
   - `RFPMART_PASSWORD`
   - `AI_API_KEY`
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
   AI_API_KEY=your_actual_api_key
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

**✅ RESOLVED**: Git history has been successfully sanitized on 2026-01-19.

**Current Status (2026-01-19 - SANITIZED)**:
- **Fixed**: All current files (.env.example) contain only placeholder values
- **Secured**: Real credentials are properly stored in GitHub Secrets for CI/CD
- **Documented**: Created comprehensive security documentation
- **Sanitized**: Git history cleaned using git-filter-repo (all credentials removed)
- **Verified**: Zero occurrences of exposed credentials in entire git history

**Exposed Credentials in History**:
- RFP Mart username: `***REMOVED***`
- RFP Mart password: `***REMOVED***`
- These were in comments in `.env.example` in the initial commit

**Risk Assessment**:
- **Current Risk**: ✅ MINIMAL (git history fully sanitized, credentials removed)
- **Public Repository Risk**: ✅ LOW (history is clean, but recommend credential rotation first)
- **Status**: ✅ Repository history is safe for public release after credential rotation

**Sanitization Results** (2026-01-19):
- ✅ Successfully sanitized using `git-filter-repo 2.47.0`
- ✅ Processed 143 commits in 1.59 seconds
- ✅ All credentials replaced with `***REMOVED***` in history
- ✅ Verified: 0 occurrences of exposed credentials in entire history
- ✅ Remote re-added after sanitization

**Post-Sanitization Actions Required**:
1. **URGENT: Rotate credentials** - Change RFP Mart password immediately
2. **Force push to GitHub** - Overwrite remote history with clean version
3. **Update GitHub Secrets** - Configure new credentials in repository settings
4. **Team notification** - Inform collaborators to re-clone repository
5. **Verify security** - Run final verification checks

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
- [x] Git history clean of credential references (✅ Sanitized 2026-01-19)
- [x] Test workflows use only safe credentials

**Note**: ✅ Git history successfully sanitized on 2026-01-19. Repository is ready for public release after credential rotation and force push.

## Contact

For security concerns or suspected credential exposure, contact the development team immediately.