const { chromium } = require('playwright');
const dotenv = require('dotenv');

dotenv.config();

async function enhancedDebug() {
  console.log('🔍 Enhanced RFP Mart debugging with captcha handling...');
  
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
    
    console.log('🔍 Step 3: Analyzing page structure...');
    
    // Check for captcha
    const captchaSelectors = [
      '.captcha',
      '.recaptcha',
      '#captcha',
      '[class*="captcha"]',
      '[id*="captcha"]',
      'iframe[src*="recaptcha"]',
      'iframe[src*="captcha"]'
    ];
    
    let hasCaptcha = false;
    for (const selector of captchaSelectors) {
      const element = await page.$(selector);
      if (element) {
        console.log(`⚠️ CAPTCHA found: ${selector}`);
        hasCaptcha = true;
      }
    }
    
    // Check page content
    const bodyText = await page.$eval('body', el => el.textContent.toLowerCase());
    if (bodyText.includes('captcha') || bodyText.includes('recaptcha')) {
      console.log('⚠️ CAPTCHA detected in page content');
      hasCaptcha = true;
    }
    
    if (hasCaptcha) {
      console.log('🛑 CAPTCHA protection detected - waiting for manual intervention');
      console.log('⏳ Please solve any captcha if present...');
      await page.waitForTimeout(15000); // Wait 15 seconds for manual captcha solving
    }
    
    console.log('🔍 Step 4: Looking for actual RFP content...');
    
    // Get page HTML structure for analysis
    const htmlContent = await page.content();
    require('fs').writeFileSync('./enhanced-debug-page.html', htmlContent);
    console.log('💾 Page HTML saved: enhanced-debug-page.html');
    
    // Look for more specific RFP selectors
    const rfpSelectors = [
      'a[href*="rfp"]',
      'a[href*="contract"]',
      'a[href*="opportunity"]',
      'a[href*=".html"][href*="usa"]',
      '.listing',
      '.result',
      '.item',
      '.row',
      'tr',
      'li',
      'div[class*="list"]',
      'div[class*="item"]',
      'span[class*="title"]',
      'p',
      '[data-*]'
    ];
    
    let potentialRfps = [];
    
    for (const selector of rfpSelectors) {
      const elements = await page.$$(selector);
      if (elements.length > 0) {
        console.log(`✅ Found ${elements.length} elements with selector: ${selector}`);
        
        // Analyze first few elements for RFP-like content
        for (let i = 0; i < Math.min(3, elements.length); i++) {
          try {
            const text = await elements[i].textContent();
            const href = await elements[i].getAttribute('href');
            
            if (text && text.trim().length > 20) {
              const textContent = text.trim().substring(0, 100);
              if (textContent.toLowerCase().includes('rfp') || 
                  textContent.toLowerCase().includes('contract') ||
                  textContent.toLowerCase().includes('solicitation') ||
                  (href && href.includes('usa'))) {
                console.log(`   🎯 POTENTIAL RFP: "${textContent}..."`);
                if (href) console.log(`      🔗 Link: ${href}`);
                potentialRfps.push({ text: textContent, href, selector });
              } else {
                console.log(`   📄 "${textContent}..."`);
              }
            }
          } catch (e) {
            // Skip elements that can't be read
          }
        }
      }
    }
    
    console.log(`\n🎯 Found ${potentialRfps.length} potential RFP elements`);
    
    if (potentialRfps.length === 0) {
      console.log('❌ No RFP content found - checking if login is required');
      
      // Check for login requirements
      const loginIndicators = [
        'please log in',
        'login required',
        'sign in',
        'member access',
        'subscription required'
      ];
      
      for (const indicator of loginIndicators) {
        if (bodyText.includes(indicator)) {
          console.log(`⚠️ Access restriction: "${indicator}"`);
        }
      }
    }
    
    await page.screenshot({ path: './enhanced-debug-final.png', fullPage: true });
    console.log('📸 Final screenshot saved: enhanced-debug-final.png');
    
    console.log('⏱️ Keeping browser open for 30 seconds for manual inspection...');
    await page.waitForTimeout(30000);
    
  } catch (error) {
    console.error('💥 Enhanced debug failed:', error);
  } finally {
    await browser.close();
    console.log('🔚 Enhanced debug completed');
  }
}

enhancedDebug().catch(console.error);