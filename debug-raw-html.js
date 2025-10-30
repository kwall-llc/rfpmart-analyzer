const { chromium } = require('playwright');
const fs = require('fs');
const dotenv = require('dotenv');

dotenv.config();

async function debugRawHTML() {
  console.log('🔍 Debugging raw HTML content...');
  
  const browser = await chromium.launch({ 
    headless: false,
    slowMo: 1000
  });
  
  try {
    const context = await browser.newContext({
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    });
    
    const page = await context.newPage();
    page.setDefaultTimeout(45000);
    
    // Login first
    console.log('🔐 Logging in...');
    await page.goto('https://www.rfpmart.com/userlogin.html');
    await page.waitForTimeout(3000);
    await page.fill('input[type="email"]', process.env.RFPMART_USERNAME);
    await page.fill('input[type="password"]', process.env.RFPMART_PASSWORD);
    await page.click('input[name="submitlogin"]');
    
    console.log('⏳ Waiting for login...');
    await page.waitForTimeout(35000);
    
    // Navigate to category page
    console.log('📄 Navigating to category page...');
    await page.goto('https://www.rfpmart.com/web-design-and-development-rfp-government-contract.html');
    await page.waitForTimeout(5000);
    
    // Get the full HTML content
    console.log('📄 Getting full page HTML...');
    const html = await page.content();
    
    // Save the HTML to a file for inspection
    fs.writeFileSync('./category-page-source.html', html);
    console.log('💾 Saved HTML to category-page-source.html');
    
    // Look for common patterns
    console.log('🔍 Analyzing HTML patterns...');
    
    // Check for any text containing dates
    const dateMatches = html.match(/\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{1,2},?\s+20\d{2}\b/g);
    console.log(`📅 Found ${dateMatches ? dateMatches.length : 0} date patterns`);
    if (dateMatches) {
      dateMatches.slice(0, 10).forEach((match, i) => {
        console.log(`   ${i + 1}. "${match}"`);
      });
    }
    
    // Check for download links
    const downloadMatches = html.match(/files\.rfpmart\.com[^"']*/g);
    console.log(`📎 Found ${downloadMatches ? downloadMatches.length : 0} download links`);
    if (downloadMatches) {
      downloadMatches.slice(0, 5).forEach((match, i) => {
        console.log(`   ${i + 1}. "${match}"`);
      });
    }
    
    // Check for RFP detail links
    const rfpMatches = html.match(/href="[^"]*rfp\.html[^"]*"/g);
    console.log(`🔗 Found ${rfpMatches ? rfpMatches.length : 0} RFP detail links`);
    if (rfpMatches) {
      rfpMatches.slice(0, 5).forEach((match, i) => {
        console.log(`   ${i + 1}. ${match}`);
      });
    }
    
    // Check for table structure
    const tableCount = (html.match(/<table/g) || []).length;
    console.log(`📋 Found ${tableCount} table elements`);
    
    // Check for tr elements
    const trCount = (html.match(/<tr/g) || []).length;
    console.log(`📋 Found ${trCount} table row elements`);
    
    // Check if there might be JavaScript-loaded content
    console.log('⚡ Checking for dynamic content...');
    await page.waitForTimeout(5000); // Wait a bit more for any JS to load
    
    // Try to find any elements that might have loaded dynamically
    const allElements = await page.$$('*');
    console.log(`🌐 Total elements found: ${allElements.length}`);
    
    // Look for any element containing the word "RFP"
    const rfpElements = await page.$$('text=/RFP/i');
    console.log(`📝 Elements containing "RFP": ${rfpElements.length}`);
    
    // Get text content from a few elements to see what's actually on the page
    console.log('\n📄 Sample page content:');
    const bodyText = await page.$eval('body', el => el.textContent);
    const lines = bodyText.split('\n').filter(line => line.trim().length > 20);
    lines.slice(0, 20).forEach((line, i) => {
      console.log(`   ${i + 1}. "${line.trim().substring(0, 100)}..."`);
    });
    
    console.log('\n⏱️ Keeping browser open for 30 seconds...');
    await page.waitForTimeout(30000);
    
  } catch (error) {
    console.error('💥 Debug failed:', error);
  } finally {
    await browser.close();
    console.log('🔚 Debug completed');
  }
}

debugRawHTML().catch(console.error);