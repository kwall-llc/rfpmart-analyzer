const { chromium } = require('playwright');
const dotenv = require('dotenv');

dotenv.config();

async function debugCategoryPage() {
  console.log('🔍 Debugging category page structure...');
  
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
    
    // Take full page screenshot
    await page.screenshot({ path: './category-page-structure.png', fullPage: true });
    console.log('📸 Screenshot: category-page-structure.png');
    
    // Look for actual RFP content patterns
    console.log('🔍 Looking for actual RFP patterns...');
    
    // Check for table rows that might contain RFPs
    const tableRows = await page.$$('table tr, tbody tr');
    console.log(`📋 Found ${tableRows.length} table rows`);
    
    let actualRFPs = 0;
    for (let i = 0; i < Math.min(tableRows.length, 15); i++) {
      try {
        const rowText = await tableRows[i].textContent();
        
        // Look for rows that contain dates (indicating actual RFPs)
        if (rowText && 
            (rowText.includes('2024') || rowText.includes('2025')) && 
            rowText.length > 30 && 
            !rowText.toLowerCase().includes('country') && 
            !rowText.toLowerCase().includes('category')) {
          
          actualRFPs++;
          console.log(`\n🎯 Actual RFP ${actualRFPs}:`);
          console.log(`   Text: "${rowText.trim().substring(0, 120)}..."`);
          
          // Look for download links
          const downloadLink = await tableRows[i].$('a[href*="files.rfpmart.com"]');
          if (downloadLink) {
            const href = await downloadLink.getAttribute('href');
            console.log(`   📎 Download: ${href}`);
          }
          
          // Look for detail page links
          const detailLink = await tableRows[i].$('a[href*="rfp.html"]');
          if (detailLink) {
            const href = await detailLink.getAttribute('href');
            console.log(`   🔗 Detail: ${href}`);
          }
          
          // Get the HTML structure of this row
          const rowHTML = await tableRows[i].innerHTML();
          console.log(`   🏗️  HTML structure: ${rowHTML.substring(0, 200)}...`);
        }
      } catch (e) {
        // Skip problematic rows
      }
    }
    
    // Also check for div-based structures with RFP content
    console.log(`\n🔍 Looking for div-based RFP content...`);
    const divs = await page.$$('div');
    let rfpDivs = 0;
    
    for (let i = 0; i < Math.min(divs.length, 30); i++) {
      try {
        const divText = await divs[i].textContent();
        
        // Look for divs that contain dates and download links
        if (divText && 
            (divText.includes('2024') || divText.includes('2025')) && 
            divText.length > 50 && divText.length < 1000) {
          
          const hasDownloadLink = await divs[i].$('a[href*="files.rfpmart.com"]');
          const hasDetailLink = await divs[i].$('a[href*="rfp.html"]');
          
          if (hasDownloadLink || hasDetailLink) {
            rfpDivs++;
            console.log(`\n📦 RFP Div ${rfpDivs}:`);
            console.log(`   Text: "${divText.trim().substring(0, 120)}..."`);
            
            if (hasDownloadLink) {
              const href = await hasDownloadLink.getAttribute('href');
              console.log(`   📎 Download: ${href}`);
            }
            
            if (hasDetailLink) {
              const href = await hasDetailLink.getAttribute('href');
              console.log(`   🔗 Detail: ${href}`);
            }
          }
        }
      } catch (e) {
        // Skip problematic divs
      }
    }
    
    console.log(`\n📊 Summary:`);
    console.log(`   Table-based RFPs: ${actualRFPs}`);
    console.log(`   Div-based RFPs: ${rfpDivs}`);
    console.log(`   Total actual RFPs found: ${actualRFPs + rfpDivs}`);
    
    console.log('\n⏱️ Keeping browser open for 60 seconds for inspection...');
    await page.waitForTimeout(60000);
    
  } catch (error) {
    console.error('💥 Debug failed:', error);
  } finally {
    await browser.close();
    console.log('🔚 Debug completed');
  }
}

debugCategoryPage().catch(console.error);