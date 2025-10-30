const { chromium } = require('playwright');
const dotenv = require('dotenv');

dotenv.config();

async function findActualRFPs() {
  console.log('🔍 Finding actual RFPs on the page...');
  
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
    
    // Take full page screenshot first
    await page.screenshot({ path: './category-page-full.png', fullPage: true });
    console.log('📸 Full page screenshot: category-page-full.png');
    
    // Look for different patterns that might contain RFPs
    console.log('🔍 Looking for RFP patterns...');
    
    // Check for any links that contain "usa" and "rfp"
    const rfpLinks = await page.$$('a[href*="usa"][href*="rfp"]');
    console.log(`📋 Found ${rfpLinks.length} links with "usa" and "rfp"`);
    
    for (let i = 0; i < Math.min(rfpLinks.length, 5); i++) {
      const href = await rfpLinks[i].getAttribute('href');
      const text = await rfpLinks[i].textContent();
      console.log(`${i + 1}. "${text.trim().substring(0, 80)}..."`);
      console.log(`   🔗 ${href}`);
    }
    
    // Check for table rows
    console.log('\n🔍 Looking for table structure...');
    const tableRows = await page.$$('table tr, tbody tr');
    console.log(`📋 Found ${tableRows.length} table rows`);
    
    for (let i = 0; i < Math.min(tableRows.length, 5); i++) {
      try {
        const rowText = await tableRows[i].textContent();
        const rfpLink = await tableRows[i].$('a[href*="usa"][href*="rfp"]');
        if (rfpLink) {
          const href = await rfpLink.getAttribute('href');
          console.log(`Row ${i + 1}: "${rowText.trim().substring(0, 80)}..."`);
          console.log(`   🔗 ${href}`);
        }
      } catch (e) {
        console.log(`Row ${i + 1}: Error reading row`);
      }
    }
    
    // Check for divs with RFP content
    console.log('\n🔍 Looking for div structure...');
    const divs = await page.$$('div');
    let rfpDivs = 0;
    
    for (let i = 0; i < Math.min(divs.length, 20); i++) {
      try {
        const divText = await divs[i].textContent();
        const hasRfpLink = await divs[i].$('a[href*="usa"][href*="rfp"]');
        
        if (hasRfpLink && divText.length > 50 && divText.length < 500) {
          rfpDivs++;
          console.log(`Div ${rfpDivs}: "${divText.trim().substring(0, 80)}..."`);
          
          const link = await divs[i].$('a[href*="usa"][href*="rfp"]');
          if (link) {
            const href = await link.getAttribute('href');
            console.log(`   🔗 ${href}`);
          }
        }
      } catch (e) {
        // Skip problematic divs
      }
    }
    
    // Look for specific RFP content indicators
    console.log('\n🔍 Looking for RFP content indicators...');
    
    // Check for text that contains common RFP terms
    const rfpTerms = ['Request for Proposal', 'RFP', 'Contract', 'Proposal', 'Website', 'Web Development', 'Design'];
    
    for (const term of rfpTerms) {
      const elements = await page.$$(`text="${term}"`);
      if (elements.length > 0) {
        console.log(`📝 Found ${elements.length} elements containing "${term}"`);
      }
    }
    
    // Check for any download images or buttons
    console.log('\n🔍 Looking for download elements...');
    const downloadImages = await page.$$('img[src*="download"], img[alt*="download"], img[alt*="Download"]');
    console.log(`📎 Found ${downloadImages.length} download images`);
    
    // Get page source to analyze structure
    console.log('\n🔍 Analyzing page structure...');
    const html = await page.content();
    
    // Look for patterns in the HTML
    const rfpMatches = html.match(/href="[^"]*usa[^"]*rfp[^"]*"/g);
    console.log(`📋 Found ${rfpMatches ? rfpMatches.length : 0} RFP links in HTML`);
    
    if (rfpMatches) {
      for (let i = 0; i < Math.min(rfpMatches.length, 5); i++) {
        console.log(`   ${i + 1}. ${rfpMatches[i]}`);
      }
    }
    
    console.log('\n⏱️ Keeping browser open for 60 seconds for manual inspection...');
    await page.waitForTimeout(60000);
    
  } catch (error) {
    console.error('💥 Debug failed:', error);
  } finally {
    await browser.close();
    console.log('🔚 Debug completed');
  }
}

findActualRFPs().catch(console.error);