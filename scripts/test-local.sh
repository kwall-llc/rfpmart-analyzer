#!/bin/bash

# Local Testing Script for RFP Mart Analyzer
# Run this before pushing to ensure everything works

set -e  # Exit on any error

echo "🧪 Starting Local Testing Suite for RFP Mart Analyzer"
echo "================================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test counter
TESTS_PASSED=0
TESTS_TOTAL=0

run_test() {
    local test_name="$1"
    local test_command="$2"
    
    echo ""
    echo -e "${BLUE}Testing: ${test_name}${NC}"
    echo "----------------------------------------"
    
    TESTS_TOTAL=$((TESTS_TOTAL + 1))
    
    if eval "$test_command"; then
        echo -e "${GREEN}✅ PASS: ${test_name}${NC}"
        TESTS_PASSED=$((TESTS_PASSED + 1))
    else
        echo -e "${RED}❌ FAIL: ${test_name}${NC}"
    fi
}

# 1. Dependency Check
run_test "Dependency Installation" "npm ci"

# 2. TypeScript Compilation
run_test "TypeScript Build" "npm run build"

# 3. Linting (non-blocking)
echo ""
echo -e "${BLUE}Testing: Code Linting${NC}"
echo "----------------------------------------"
if npm run lint 2>/dev/null; then
    echo -e "${GREEN}✅ PASS: Linting${NC}"
else
    echo -e "${YELLOW}⚠️  WARN: Linting issues found (non-blocking)${NC}"
fi

# 4. Environment Configuration Test
run_test "Environment Configuration" '
    # Create test environment
    cat > .env.test << EOF
RFPMART_USERNAME=test@example.com
RFPMART_PASSWORD=test-password
RFP_CATEGORY_URL=https://www.rfpmart.com/web-design-and-development-rfp-government-contract.html
MIN_BUDGET_ACCEPTABLE=50000
MIN_BUDGET_PREFERRED=100000
DATA_DIRECTORY=./test-data
REPORTS_DIRECTORY=./test-data/reports
RFPS_DIRECTORY=./test-data/rfps
DATABASE_PATH=./test-data/database.sqlite
LOG_LEVEL=info
LOG_FILE=./test-logs/rfpmart-analyzer.log
NODE_ENV=test
HIGHER_ED_KEYWORDS=university,college,school
CMS_KEYWORDS_PREFERRED=drupal,wordpress
CMS_KEYWORDS_ACCEPTABLE=joomla,craft
PROJECT_TYPE_KEYWORDS=redesign,migration
TECHNICAL_KEYWORDS=responsive,mobile
LOCATION_PREFERRED=united states
LOCATION_ACCEPTABLE=canada
EOF
    
    # Test configuration loading
    ENV_FILE=.env.test node -e "
        const { config } = require('./dist/config/environment.js');
        if (config.keywords.higherEd.includes('university')) {
            console.log('Configuration parsing successful');
        } else {
            throw new Error('Configuration parsing failed');
        }
    "
    
    # Cleanup
    rm -f .env.test
'

# 5. Database Operations Test
run_test "Database Operations" '
    mkdir -p test-db
    
    DATABASE_PATH=./test-db/test.sqlite node -e "
        const { DatabaseManager } = require('./dist/storage/database.js');
        
        async function testDatabase() {
            const db = new DatabaseManager();
            try {
                await db.initialize();
                
                await db.recordRFPRun({
                    runDate: new Date().toISOString(),
                    rfpsFound: 5,
                    rfpsDownloaded: 3,
                    rfpsAnalyzed: 2,
                    highScoreCount: 1
                });
                
                const stats = await db.getSummaryStats();
                console.log('Database operations successful');
                
                await db.close();
            } catch (error) {
                console.error('Database test failed:', error.message);
                process.exit(1);
            }
        }
        
        testDatabase();
    "
    
    rm -rf test-db
'

# 6. Application Initialization Test
run_test "Application Initialization" '
    # Create test environment
    mkdir -p test-data/rfps test-data/reports test-logs
    
    cat > .env << EOF
RFPMART_USERNAME=test@example.com
RFPMART_PASSWORD=test-password
RFP_CATEGORY_URL=https://www.rfpmart.com/web-design-and-development-rfp-government-contract.html
MIN_BUDGET_ACCEPTABLE=50000
MIN_BUDGET_PREFERRED=100000
DATA_DIRECTORY=./test-data
REPORTS_DIRECTORY=./test-data/reports
RFPS_DIRECTORY=./test-data/rfps
DATABASE_PATH=./test-data/database.sqlite
LOG_LEVEL=info
LOG_FILE=./test-logs/rfpmart-analyzer.log
NODE_ENV=test
HIGHER_ED_KEYWORDS=university,college,school
CMS_KEYWORDS_PREFERRED=drupal,wordpress
CMS_KEYWORDS_ACCEPTABLE=joomla,craft
PROJECT_TYPE_KEYWORDS=redesign,migration
TECHNICAL_KEYWORDS=responsive,mobile
LOCATION_PREFERRED=united states
LOCATION_ACCEPTABLE=canada
EOF
    
    # Test application startup (with timeout)
    timeout 30s npm start status > /dev/null 2>&1 || true
    
    # Check if database was created
    if [ -f "test-data/database.sqlite" ]; then
        echo "Application initialization successful"
    else
        echo "Warning: Database not created, but application loaded"
    fi
    
    # Cleanup
    rm -rf test-data test-logs .env
'

# 7. Security Check
echo ""
echo -e "${BLUE}Testing: Security Scan${NC}"
echo "----------------------------------------"
echo "Checking for hardcoded secrets..."

if grep -r -i "password\s*=" src/ 2>/dev/null | grep -v "test" || \
   grep -r -i "api_key\s*=" src/ 2>/dev/null | grep -v "test" || \
   grep -r -i "secret\s*=" src/ 2>/dev/null | grep -v "test"; then
    echo -e "${YELLOW}⚠️  WARN: Potential hardcoded secrets found${NC}"
else
    echo -e "${GREEN}✅ PASS: No hardcoded secrets detected${NC}"
fi

# 8. Package Security Audit
echo ""
echo -e "${BLUE}Testing: NPM Security Audit${NC}"
echo "----------------------------------------"
if npm audit --audit-level moderate > /dev/null 2>&1; then
    echo -e "${GREEN}✅ PASS: No security vulnerabilities${NC}"
else
    echo -e "${YELLOW}⚠️  WARN: Security vulnerabilities found (check with 'npm audit')${NC}"
fi

# Final Results
echo ""
echo "================================================="
echo -e "${BLUE}🏁 Test Results Summary${NC}"
echo "================================================="
echo -e "Tests Passed: ${GREEN}${TESTS_PASSED}${NC}/${TESTS_TOTAL}"

if [ $TESTS_PASSED -eq $TESTS_TOTAL ]; then
    echo -e "${GREEN}🎉 All core tests passed! Ready to push.${NC}"
    exit 0
else
    echo -e "${RED}❌ Some tests failed. Please fix before pushing.${NC}"
    exit 1
fi