#!/bin/bash

# Script to sanitize .env.example file in git history

if [ -f .env.example ]; then
    echo "Sanitizing .env.example..."

    # Create a temporary clean version
    cat > .env.example << 'EOF'
# RFP Mart Credentials
# Replace with your actual RFP Mart credentials in your .env file
RFPMART_USERNAME=your_username_here
RFPMART_PASSWORD=your_password_here

# RFP Configuration
RFP_CATEGORY_URL=https://www.rfpmart.com/web-design-and-development-rfp-government-contract.html
MIN_BUDGET_ACCEPTABLE=50000
MIN_BUDGET_PREFERRED=100000

# Storage Configuration
DATA_DIRECTORY=./data
REPORTS_DIRECTORY=./data/reports
RFPS_DIRECTORY=./data/rfps
DATABASE_PATH=./data/database.sqlite

# Logging Configuration
LOG_LEVEL=info
LOG_FILE=./logs/rfpmart-analyzer.log

# Analysis Configuration
SCORE_THRESHOLD_HIGH=75
SCORE_THRESHOLD_MEDIUM=50
SCORE_THRESHOLD_LOW=25

# Keyword Configuration - Higher Education Institutions
HIGHER_ED_KEYWORDS=university,college,academic,education,campus,school,institute,polytechnic,community college,state university

# Platform Keywords (positive indicators)
CMS_KEYWORDS_PREFERRED=drupal,wordpress,modern campus,omni cms,cascade cms,sitecore,craft cms
CMS_KEYWORDS_ACCEPTABLE=joomla,squarespace,wix,webflow,contentful

# Project Type Keywords (positive indicators)
PROJECT_TYPE_KEYWORDS=redesign,redevelopment,migration,rebuild,overhaul,modernization,upgrade,transformation

# Budget Keywords
BUDGET_KEYWORDS=budget,cost,price,funding,appropriation,allocation,investment,contract value,not to exceed,NTE

# Technology Keywords (bonus points)
TECH_KEYWORDS_POSITIVE=responsive,mobile-first,accessibility,WCAG,ADA compliant,user experience,UX,UI,SEO,analytics,API integration

# Red Flag Keywords (negative indicators)
RED_FLAG_KEYWORDS=maintenance only,minor updates,hosting only,template customization only,logo design only,brochure website

# Geographic Preferences (bonus for certain regions)
PREFERRED_STATES=california,new york,texas,florida,virginia,north carolina,massachusetts,pennsylvania,ohio,illinois

# Institution Size Indicators (bonus for larger institutions)
LARGE_INSTITUTION_KEYWORDS=state university,flagship,research university,major university,large enrollment,10000+ students

# Email Notifications (optional)
ENABLE_EMAIL_NOTIFICATIONS=false
SMTP_HOST=
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=
NOTIFICATION_EMAIL=

# AI Analysis Configuration
AI_PROVIDER=openai
AI_OPENAI_API_KEY=your-openai-api-key-here
AI_OPENAI_MODEL=gpt-4
AI_ANTHROPIC_API_KEY=
AI_ANTHROPIC_MODEL=claude-3-sonnet-20240229
AI_AZURE_ENDPOINT=
AI_AZURE_API_KEY=
AI_AZURE_MODEL=gpt-4

# AI Analysis Thresholds
AI_FIT_THRESHOLD_EXCELLENT=80
AI_FIT_THRESHOLD_GOOD=60
AI_FIT_THRESHOLD_POOR=25
AI_CLEANUP_POOR_FITS=true
AI_CLEANUP_REJECTED=true

# Development
NODE_ENV=production
EOF

    echo "✅ Sanitized .env.example"
fi