const { chromium } = require('playwright');
const dotenv = require('dotenv');

dotenv.config();

async function testUSARFPPage() {
  console.log('🔍 Testing USA RFP page for actual listings...');
  
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
    
    // Navigate to main USA RFP page
    console.log('📄 Navigating to USA RFP page...');
    await page.goto('https://www.rfpmart.com/usa-rfp-bids.html');
    await page.waitForTimeout(5000);
    
    // Take screenshot
    await page.screenshot({ path: './usa-rfp-page.png', fullPage: true });
    console.log('📸 Screenshot: usa-rfp-page.png');
    
    // Look for actual RFP listings
    console.log('🔍 Looking for actual RFP listings...');
    
    // Check for table rows with RFP data
    const tableRows = await page.$$('table tr, tbody tr');
    console.log(`📋 Found ${tableRows.length} table rows`);
    
    let actualRFPs = 0;
    for (let i = 0; i < Math.min(tableRows.length, 10); i++) {
      try {
        const rowText = await tableRows[i].textContent();
        
        // Look for rows that might contain RFP data (not headers)
        if (rowText && rowText.length > 50 && !rowText.toLowerCase().includes('country') && !rowText.toLowerCase().includes('category')) {
          actualRFPs++;
          console.log(`RFP ${actualRFPs}: "${rowText.trim().substring(0, 100)}..."`);
          
          // Look for download link in this row
          const downloadLink = await tableRows[i].$('a[href*="files.rfpmart.com"]');
          if (downloadLink) {
            const href = await downloadLink.getAttribute('href');
            console.log(`   📎 Download: ${href}`);
          }
          
          // Look for detail page link
          const detailLink = await tableRows[i].$('a[href*="rfp.html"]');
          if (detailLink) {
            const href = await detailLink.getAttribute('href');
            console.log(`   🔗 Detail: ${href}`);
          }
        }
      } catch (e) {
        // Skip problematic rows
      }
    }
    
    // Also check for div-based listings
    console.log(`\n🔍 Looking for div-based RFP listings...`);
    const rfpDivs = await page.$$('div');
    let divRFPs = 0;
    
    for (let i = 0; i < Math.min(rfpDivs.length, 20); i++) {
      try {
        const divText = await rfpDivs[i].textContent();
        const hasRfpLink = await rfpDivs[i].$('a[href*="rfp.html"]');
        
        if (hasRfpLink && divText && divText.length > 100 && divText.length < 1000) {
          divRFPs++;
          console.log(`Div RFP ${divRFPs}: "${divText.trim().substring(0, 100)}..."`);
          
          const link = await rfpDivs[i].$('a[href*="rfp.html"]');
          if (link) {
            const href = await link.getAttribute('href');
            console.log(`   🔗 ${href}`);
          }
        }
      } catch (e) {
        // Skip problematic divs
      }
    }
    
    console.log(`\n📊 Summary:`);
    console.log(`   Table-based RFPs: ${actualRFPs}`);
    console.log(`   Div-based RFPs: ${divRFPs}`);
    
    if (actualRFPs === 0 && divRFPs === 0) {
      console.log('\n🔍 No RFPs found - checking if this page has sub-categories...');
      
      // Look for category or state links
      const categoryLinks = await page.$$('a[href*="rfp"]');
      console.log(`📋 Found ${categoryLinks.length} category/sub-links`);
      
      for (let i = 0; i < Math.min(categoryLinks.length, 10); i++) {
        const href = await categoryLinks[i].getAttribute('href');
        const text = await categoryLinks[i].textContent();
        if (text && text.trim() && href) {
          console.log(`   ${i + 1}. "${text.trim()}" → ${href}`);
        }
      }
    }
    
    console.log('\n⏱️ Keeping browser open for 30 seconds for inspection...');
    await page.waitForTimeout(30000);
    
  } catch (error) {
    console.error('💥 Test failed:', error);
  } finally {
    await browser.close();
    console.log('🔚 Test completed');
  }
}

testUSARFPPage().catch(console.error);