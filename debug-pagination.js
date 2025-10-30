const { chromium } = require('playwright');
const dotenv = require('dotenv');

dotenv.config();

async function debugPagination() {
  console.log('🔍 Debugging RFP Mart pagination and date filtering...');
  
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
    
    console.log('🔐 Step 1: Logging in...');
    
    // Login
    await page.goto('https://www.rfpmart.com/userlogin.html');
    await page.fill('input[type="email"]', process.env.RFPMART_USERNAME);
    await page.fill('input[type="password"]', process.env.RFPMART_PASSWORD);
    
    await Promise.all([
      page.waitForNavigation({ waitUntil: 'domcontentloaded' }),
      page.click('input[type="submit"]'),
    ]);
    
    console.log('✅ Login completed');
    
    console.log('🎯 Step 2: Navigating to category page...');
    
    // Navigate to category page
    await page.goto('https://www.rfpmart.com/web-design-and-development-rfp-government-contract.html');
    
    console.log('🔍 Step 3: Analyzing pagination structure...');
    
    // Target date (October 23, 2024)
    const targetDate = new Date('2024-10-23');
    
    for (let pageNum = 1; pageNum <= 5; pageNum++) {
      console.log(`\n📄 === ANALYZING PAGE ${pageNum} ===`);
      
      // Check for captcha first
      const bodyText = await page.$eval('body', el => el.textContent.toLowerCase());
      if (bodyText.includes('captcha') || bodyText.includes('recaptcha')) {
        console.log('⚠️ CAPTCHA detected - waiting for manual intervention...');
        console.log('🕐 Please solve the captcha and press Enter to continue...');
        await page.waitForTimeout(15000); // Wait 15 seconds for manual solving
      }
      
      // Look for RFP elements and dates
      const rfpSelectors = [
        'a[href*="usa"]', // RFP links with USA in URL
        'a[href*=".html"]', // General HTML links
        '.listing',
        '.item',
        '.row',
        'tr',
        'li a',
        '[class*="rfp"]',
        '[class*="contract"]'
      ];
      
      let foundRfps = [];
      
      for (const selector of rfpSelectors) {
        try {
          const elements = await page.$$(selector);
          
          for (let i = 0; i < Math.min(10, elements.length); i++) {
            try {
              const text = await elements[i].textContent();
              const href = await elements[i].getAttribute('href');
              
              if (href && href.includes('usa') && text && text.trim().length > 20) {
                foundRfps.push({
                  text: text.trim().substring(0, 80),
                  href: href,
                  selector: selector
                });
              }
            } catch (e) {
              // Skip elements that can't be read
            }
          }
        } catch (e) {
          // Skip selectors that don't exist
        }
      }
      
      console.log(`🎯 Found ${foundRfps.length} potential RFPs on page ${pageNum}`);
      
      // Look for date patterns in the found RFPs
      const datePatterns = [
        /\\d{1,2}[\/\\-]\\d{1,2}[\/\\-]\\d{4}/g, // MM/DD/YYYY or MM-DD-YYYY
        /\\d{4}[\/\\-]\\d{1,2}[\/\\-]\\d{1,2}/g, // YYYY/MM/DD or YYYY-MM-DD
        /(january|february|march|april|may|june|july|august|september|october|november|december)\\s+\\d{1,2},?\\s+\\d{4}/gi,
        /\\d{1,2}\\s+(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\\s+\\d{4}/gi
      ];
      
      for (const rfp of foundRfps.slice(0, 5)) {
        console.log(`   📄 "${rfp.text}..."`);
        console.log(`      🔗 ${rfp.href}`);
        
        // Look for dates in the text
        for (const pattern of datePatterns) {
          const matches = rfp.text.match(pattern);
          if (matches) {
            console.log(`      📅 Found dates: ${matches.join(', ')}`);
          }
        }
      }
      
      // Look for pagination elements
      const paginationSelectors = [
        '.pagination',
        '.pager',
        'a[href*="page"]',
        'a[rel="next"]',
        '.next',
        'a:contains("Next")',
        'a:contains(">")',
        '[class*="page"]',
        '[class*="next"]'
      ];
      
      let nextPageFound = false;
      let nextPageUrl = null;
      
      for (const selector of paginationSelectors) {
        try {
          const elements = await page.$$(selector);
          if (elements.length > 0) {
            console.log(`✅ Found pagination element: ${selector} (${elements.length} elements)`);
            
            // Try to find next page link
            for (const element of elements) {
              const href = await element.getAttribute('href');
              const text = await element.textContent();
              
              if (href && (
                href.includes('page') || 
                text.toLowerCase().includes('next') || 
                text.includes('>') ||
                text.includes('»')
              )) {
                nextPageUrl = href;
                nextPageFound = true;
                console.log(`   🔗 Next page: ${href}`);
                break;
              }
            }
          }
        } catch (e) {
          // Skip selectors that don't work
        }
      }
      
      if (!nextPageFound) {
        console.log('❌ No next page found');
        break;
      }
      
      // Navigate to next page if we found one
      if (pageNum < 5 && nextPageUrl) {
        console.log(`🔄 Navigating to page ${pageNum + 1}...`);
        
        if (nextPageUrl.startsWith('/')) {
          nextPageUrl = 'https://www.rfpmart.com' + nextPageUrl;
        } else if (!nextPageUrl.startsWith('http')) {
          nextPageUrl = 'https://www.rfpmart.com/' + nextPageUrl;
        }
        
        try {
          await page.goto(nextPageUrl, { waitUntil: 'domcontentloaded' });
          await page.waitForTimeout(3000); // Wait for page to load
        } catch (error) {
          console.log(`❌ Failed to navigate to next page: ${error.message}`);
          break;
        }
      } else {
        break;
      }
    }
    
    await page.screenshot({ path: './debug-pagination-final.png', fullPage: true });
    console.log('📸 Final screenshot saved: debug-pagination-final.png');
    
    console.log('⏱️ Keeping browser open for 20 seconds for inspection...');
    await page.waitForTimeout(20000);
    
  } catch (error) {
    console.error('💥 Pagination debug failed:', error);
  } finally {
    await browser.close();
    console.log('🔚 Pagination debug completed');
  }
}

debugPagination().catch(console.error);