const { chromium } = require('playwright');
const dotenv = require('dotenv');

dotenv.config();

async function debugHTMLStructure() {
  console.log('🔍 Debugging HTML structure for actual RFPs...');
  
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
    
    // Get the HTML content of the main content area
    console.log('🔍 Getting page HTML structure...');
    
    // Look for different possible container patterns
    const possibleContainers = [
      'table',
      '.rfp-list',
      '.content',
      '.main-content',
      'tbody',
      '.container',
      '#content',
      '#main'
    ];
    
    for (const selector of possibleContainers) {
      try {
        const element = await page.$(selector);
        if (element) {
          console.log(`\n📦 Found container: ${selector}`);
          const html = await element.innerHTML();
          
          // Look for text that contains dates (indicating RFPs)
          if (html.includes('2024') || html.includes('2025')) {
            console.log(`   ✅ Contains date information - likely RFP container`);
            
            // Save a snippet of this HTML
            const snippet = html.substring(0, 2000);
            console.log(`   📝 HTML snippet (first 2000 chars):`);
            console.log(snippet);
            console.log(`   ... (truncated, total length: ${html.length})`);
          }
        }
      } catch (e) {
        // Skip if selector doesn't exist
      }
    }
    
    // Look for all elements containing dates
    console.log('\n🔍 Looking for elements containing 2024/2025...');
    const dateElements = await page.$$('*');
    let foundElements = 0;
    
    for (let i = 0; i < Math.min(dateElements.length, 50); i++) {
      try {
        const text = await dateElements[i].textContent();
        if (text && (text.includes('Oct') || text.includes('Nov') || text.includes('Dec')) && 
            (text.includes('2024') || text.includes('2025')) && 
            text.length > 10 && text.length < 500) {
          
          foundElements++;
          const tagName = await dateElements[i].evaluate(el => el.tagName);
          const className = await dateElements[i].evaluate(el => el.className);
          
          console.log(`\n📅 Date Element ${foundElements}:`);
          console.log(`   Tag: ${tagName}, Class: "${className}"`);
          console.log(`   Text: "${text.trim()}"`);
          
          // Check if this element or its parent has download links
          const downloadLink = await dateElements[i].$('a[href*="files.rfpmart.com"]');
          const parentDownloadLink = await dateElements[i].$('..//a[href*="files.rfpmart.com"]');
          
          if (downloadLink || parentDownloadLink) {
            const link = downloadLink || parentDownloadLink;
            const href = await link.getAttribute('href');
            console.log(`   📎 Download link found: ${href}`);
          }
          
          // Get the outer HTML of this element
          const outerHTML = await dateElements[i].evaluate(el => el.outerHTML);
          console.log(`   🏗️  HTML: ${outerHTML.substring(0, 300)}...`);
          
          if (foundElements >= 5) break; // Limit output
        }
      } catch (e) {
        // Skip problematic elements
      }
    }
    
    console.log(`\n📊 Found ${foundElements} elements with date information`);
    
    console.log('\n⏱️ Keeping browser open for 30 seconds for inspection...');
    await page.waitForTimeout(30000);
    
  } catch (error) {
    console.error('💥 Debug failed:', error);
  } finally {
    await browser.close();
    console.log('🔚 Debug completed');
  }
}

debugHTMLStructure().catch(console.error);