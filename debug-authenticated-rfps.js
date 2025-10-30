const { chromium } = require('playwright');
const dotenv = require('dotenv');

dotenv.config();

async function debugAuthenticatedRFPs() {
  console.log('🔍 Debugging RFP discovery on authenticated page...');
  
  const browser = await chromium.launch({ 
    headless: false,
    slowMo: 500
  });
  
  try {
    const context = await browser.newContext({
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    });
    
    const page = await context.newPage();
    page.setDefaultTimeout(30000);
    
    console.log('🔐 Step 1: Logging in...');
    
    // Login using confirmed working method
    await page.goto('https://www.rfpmart.com/userlogin.html');
    await page.fill('input[type="email"]', process.env.RFPMART_USERNAME);
    await page.fill('input[type="password"]', process.env.RFPMART_PASSWORD);
    
    await Promise.all([
      page.waitForNavigation({ waitUntil: 'domcontentloaded' }),
      page.click('input[type="submit"]')
    ]);
    
    console.log('✅ Login completed');
    console.log('🌐 Post-login URL:', page.url());
    
    console.log('🎯 Step 2: Navigating to category page...');
    
    // Navigate to category page
    await page.goto('https://www.rfpmart.com/web-design-and-development-rfp-government-contract.html');
    
    console.log('📸 Taking screenshot of authenticated page...');
    await page.screenshot({ path: './debug-auth-category.png', fullPage: true });
    
    console.log('🔍 Step 3: Analyzing authenticated page structure...');
    
    // Check authentication status
    const authElements = await page.$$('a[href*="logout"], a[href*="profile"]');
    console.log(`✅ Authentication indicators: ${authElements.length}`);
    
    // Save full page HTML for analysis
    const pageContent = await page.content();
    require('fs').writeFileSync('./debug-auth-page.html', pageContent);
    console.log('💾 Authenticated page HTML saved: debug-auth-page.html');
    
    console.log('🔍 Step 4: Looking for RFP elements...');
    
    // Test various RFP selectors on the authenticated page
    const rfpSelectors = [
      // Based on the Virgin Islands RFP URL pattern we saw
      'a[href*="usa"][href*="rfp.html"]',           // RFP links with USA and ending in rfp.html
      'a[href*="-usa-"][href*=".html"]',            // Links with -usa- pattern
      'a[href*="1031990"]',                         // Specific ID we saw earlier
      
      // General RFP patterns
      'a[href*="rfp"]',
      'a[href*="contract"]', 
      'a[href*="solicitation"]',
      'a[href*="opportunity"]',
      
      // Content structure patterns
      '.listing',
      '.item',
      '.row',
      '.entry',
      'article',
      'tr',
      'li',
      
      // Link patterns
      'a[href$=".html"]',                          // All HTML links
      'a[title*="rfp"]',                           // Links with RFP in title
      'a[title*="contract"]',                      // Links with contract in title
      
      // Date-based patterns
      '[class*="date"]',
      '[id*="date"]',
      'time',
      '.posted',
      '.deadline',
      
      // List patterns
      'ul li a',
      'ol li a',
      'div[class*="list"] a',
    ];
    
    let foundRfps = [];
    
    for (const selector of rfpSelectors) {
      try {
        const elements = await page.$$(selector);
        
        if (elements.length > 0) {
          console.log(`\n✅ Selector "${selector}" found ${elements.length} elements:`);
          
          for (let i = 0; i < Math.min(5, elements.length); i++) {
            try {
              const text = await elements[i].textContent();
              const href = await elements[i].getAttribute('href');
              const title = await elements[i].getAttribute('title');
              
              const elementInfo = {
                text: text ? text.trim().substring(0, 100) : 'No text',
                href: href || 'No href',
                title: title || 'No title',
                selector: selector
              };
              
              // Check if this looks like an RFP
              const isRfpLike = 
                (href && (href.includes('usa') || href.includes('rfp') || href.includes('contract'))) ||
                (text && (text.toLowerCase().includes('rfp') || text.toLowerCase().includes('contract') || text.toLowerCase().includes('solicitation')));
              
              if (isRfpLike) {
                console.log(`   🎯 RFP-LIKE: "${elementInfo.text}"`);
                console.log(`      🔗 ${elementInfo.href}`);
                if (title) console.log(`      📋 Title: ${title}`);
                foundRfps.push(elementInfo);
              } else {
                console.log(`   📄 "${elementInfo.text}"`);
                if (href && href !== 'No href') console.log(`      🔗 ${elementInfo.href}`);
              }
            } catch (e) {
              console.log(`   ❌ Could not read element ${i}: ${e.message}`);
            }
          }
        }
      } catch (e) {
        // Selector doesn't exist or failed
      }
    }
    
    console.log(`\n🎯 Summary: Found ${foundRfps.length} RFP-like elements`);
    
    if (foundRfps.length > 0) {
      console.log('\n📋 Best RFP candidates:');
      foundRfps.slice(0, 10).forEach((rfp, i) => {
        console.log(`${i + 1}. "${rfp.text}" (${rfp.selector})`);
        console.log(`   🔗 ${rfp.href}`);
      });
    } else {
      console.log('❌ No RFP-like elements found');
      
      // Look for any patterns that might indicate the page structure
      console.log('\n🔍 General page analysis:');
      
      const allLinks = await page.$$('a[href]');
      console.log(`📎 Total links found: ${allLinks.length}`);
      
      const allHeadings = await page.$$('h1, h2, h3, h4, h5, h6');
      console.log(`📑 Total headings: ${allHeadings.length}`);
      
      // Show first few headings
      for (let i = 0; i < Math.min(5, allHeadings.length); i++) {
        try {
          const tagName = await allHeadings[i].evaluate(el => el.tagName);
          const text = await allHeadings[i].textContent();
          console.log(`   ${tagName}: "${text.trim().substring(0, 60)}"`);
        } catch (e) {
          // Skip
        }
      }
    }
    
    console.log('\n🔍 Step 5: Looking for pagination on authenticated page...');
    
    const paginationSelectors = [
      '.pagination',
      '.pager', 
      'a[rel="next"]',
      'a:has-text("Next")',
      'a:has-text(">")',
      'a:has-text("»")',
      'a[href*="page"]',
      '[class*="page"]',
      '[class*="next"]',
      'nav a'
    ];
    
    for (const selector of paginationSelectors) {
      try {
        const elements = await page.$$(selector);
        if (elements.length > 0) {
          console.log(`✅ Pagination "${selector}": ${elements.length} elements`);
          
          for (let i = 0; i < Math.min(3, elements.length); i++) {
            try {
              const text = await elements[i].textContent();
              const href = await elements[i].getAttribute('href');
              console.log(`   📄 "${text?.trim() || 'No text'}" → ${href || 'No href'}`);
            } catch (e) {
              // Skip
            }
          }
        }
      } catch (e) {
        // Selector doesn't work
      }
    }
    
    console.log('\n⏱️ Keeping browser open for 30 seconds for manual inspection...');
    await page.waitForTimeout(30000);
    
  } catch (error) {
    console.error('💥 Authenticated RFP debug failed:', error);
  } finally {
    await browser.close();
    console.log('🔚 Authenticated RFP debug completed');
  }
}

debugAuthenticatedRFPs().catch(console.error);