const { chromium } = require('playwright');
const dotenv = require('dotenv');

dotenv.config();

async function debugRFPUrls() {
  console.log('🔍 Debugging RFP URLs and download links...');
  
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
    await page.waitForTimeout(35000); // Wait for login to complete
    
    // Navigate to category page
    console.log('📄 Navigating to category page...');
    await page.goto('https://www.rfpmart.com/web-design-and-development-rfp-government-contract.html');
    await page.waitForTimeout(5000);
    
    // Find all RFP elements
    console.log('🔍 Looking for RFP elements...');
    const rfpItems = await page.$$('h4, .rfp-item, .contract-item, .opportunity-item, tr');
    console.log(`📋 Found ${rfpItems.length} potential RFP elements`);
    
    for (let i = 0; i < Math.min(rfpItems.length, 10); i++) {
      console.log(`\n📄 Element ${i + 1}:`);
      
      try {
        // Try to get title directly from element
        let title = null;
        const tagName = await rfpItems[i].evaluate((el) => el.tagName?.toLowerCase());
        console.log(`   Tag: ${tagName}`);
        
        if (tagName === 'h4') {
          title = await rfpItems[i].textContent();
        }
        
        if (!title) {
          const linkElement = await rfpItems[i].$('a[href*="usa"][href*="rfp.html"]');
          if (linkElement) {
            title = await linkElement.textContent();
          }
        }
        
        console.log(`   Title: ${title ? title.trim().substring(0, 60) + '...' : 'NO TITLE'}`);
        
        // Look for download links
        const downloadPatterns = [
          'a[href*="files.rfpmart.com"]',
          'a[href*="download"]',
          'a[href*="document"]',
          'a[href*="usa"][href*="rfp.html"]'
        ];
        
        for (const pattern of downloadPatterns) {
          const links = await rfpItems[i].$$(pattern);
          if (links.length > 0) {
            for (let j = 0; j < links.length; j++) {
              const href = await links[j].getAttribute('href');
              console.log(`   ${pattern}: ${href}`);
            }
          }
        }
        
        // If we found a detail page link, let's check what's on that page
        const detailLink = await rfpItems[i].$('a[href*="usa"][href*="rfp.html"]');
        if (detailLink && i < 3) { // Only check first 3 to save time
          const detailHref = await detailLink.getAttribute('href');
          console.log(`   🔗 Detail page: ${detailHref}`);
          
          // Open detail page in new tab
          const detailPage = await context.newPage();
          try {
            await detailPage.goto(detailHref.startsWith('http') ? detailHref : `https://www.rfpmart.com/${detailHref}`);
            await detailPage.waitForTimeout(3000);
            
            // Look for download links on detail page
            const filesLinks = await detailPage.$$('a[href*="files.rfpmart.com"]');
            console.log(`   📎 Download links on detail page: ${filesLinks.length}`);
            
            for (let k = 0; k < filesLinks.length; k++) {
              const downloadHref = await filesLinks[k].getAttribute('href');
              console.log(`      Download ${k + 1}: ${downloadHref}`);
            }
            
            // Take screenshot of detail page
            await detailPage.screenshot({ path: `./detail-page-${i + 1}.png`, fullPage: true });
            console.log(`   📸 Screenshot: detail-page-${i + 1}.png`);
            
          } catch (error) {
            console.log(`   ❌ Error accessing detail page: ${error.message}`);
          } finally {
            await detailPage.close();
          }
        }
        
      } catch (error) {
        console.log(`   ❌ Error processing element ${i + 1}: ${error.message}`);
      }
    }
    
    console.log('\n⏱️ Keeping browser open for 30 seconds for inspection...');
    await page.waitForTimeout(30000);
    
  } catch (error) {
    console.error('💥 Debug failed:', error);
  } finally {
    await browser.close();
    console.log('🔚 Debug completed');
  }
}

debugRFPUrls().catch(console.error);