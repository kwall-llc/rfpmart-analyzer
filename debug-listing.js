const { chromium } = require('playwright');
const dotenv = require('dotenv');

dotenv.config();

async function debugListingPage() {
  console.log('🔍 Debugging RFP Mart listing page authentication...');
  
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
    page.setDefaultNavigationTimeout(30000);
    
    console.log('🔐 Step 1: Logging in...');
    
    // Login
    await page.goto('https://www.rfpmart.com/userlogin.html', { 
      waitUntil: 'domcontentloaded',
      timeout: 30000 
    });
    
    await page.fill('input[type="email"]', process.env.RFPMART_USERNAME);
    await page.fill('input[type="password"]', process.env.RFPMART_PASSWORD);
    
    await page.screenshot({ path: './debug-before-login.png', fullPage: true });
    console.log('📸 Screenshot saved: debug-before-login.png');
    
    await Promise.all([
      page.waitForNavigation({ waitUntil: 'domcontentloaded' }),
      page.click('input[type="submit"]'),
    ]);
    
    await page.screenshot({ path: './debug-after-login.png', fullPage: true });
    console.log('📸 Screenshot saved: debug-after-login.png');
    
    console.log('✅ Login completed');
    console.log('🌐 Current URL after login:', page.url());
    console.log('📄 Page title after login:', await page.title());
    
    // Check authentication status
    const authIndicators = [
      'a[href*="logout"]',
      'a[href*="profile"]',
      'a[href*="account"]',
      '.user-menu',
      '.logout'
    ];
    
    let isLoggedIn = false;
    for (const selector of authIndicators) {
      const element = await page.$(selector);
      if (element) {
        console.log(`✅ Found auth indicator: ${selector}`);
        isLoggedIn = true;
      }
    }
    
    if (!isLoggedIn) {
      console.log('⚠️ No authentication indicators found');
    }
    
    console.log('🎯 Step 2: Navigating to web design RFP category...');
    
    // Navigate to the category page
    const categoryUrl = 'https://www.rfpmart.com/web-design-and-development-rfp-government-contract.html';
    await page.goto(categoryUrl, { 
      waitUntil: 'domcontentloaded',
      timeout: 30000 
    });
    
    await page.screenshot({ path: './debug-category-page.png', fullPage: true });
    console.log('📸 Screenshot saved: debug-category-page.png');
    
    console.log('🌐 Current URL on category page:', page.url());
    console.log('📄 Page title on category page:', await page.title());
    
    // Check if we're still logged in
    console.log('🔍 Step 3: Checking authentication on category page...');
    
    isLoggedIn = false;
    for (const selector of authIndicators) {
      const element = await page.$(selector);
      if (element) {
        console.log(`✅ Still authenticated: ${selector}`);
        isLoggedIn = true;
      }
    }
    
    if (!isLoggedIn) {
      console.log('❌ Not authenticated on category page!');
      
      // Check for login prompts
      const loginPrompts = [
        'a[href*="login"]',
        'a[href*="signin"]',
        '.login',
        '.sign-in',
        'input[type="email"]',
        'input[type="password"]'
      ];
      
      for (const selector of loginPrompts) {
        const element = await page.$(selector);
        if (element) {
          console.log(`⚠️ Found login prompt: ${selector}`);
        }
      }
    }
    
    // Check page content for authentication restrictions
    const bodyText = await page.$eval('body', el => el.textContent.toLowerCase());
    
    if (bodyText.includes('login') || bodyText.includes('sign in') || bodyText.includes('member')) {
      console.log('⚠️ Page content suggests login required');
    }
    
    if (bodyText.includes('captcha') || bodyText.includes('recaptcha')) {
      console.log('⚠️ Captcha detected on page');
    }
    
    // Look for the expected RFP list selectors
    console.log('🔍 Step 4: Looking for RFP list elements...');
    
    const listSelectors = [
      '.rfp-list',
      '.contract-list', 
      '.opportunity-list',
      '.rfp-item',
      '.contract-item',
      '.opportunity-item',
      'h3',
      'h4',
      '.title',
      '.rfp-title',
      'tr', // table rows
      '.listing',
      '.item',
      '[class*="rfp"]',
      '[class*="contract"]',
      '[class*="opportunity"]'
    ];
    
    let foundElements = [];
    for (const selector of listSelectors) {
      const elements = await page.$$(selector);
      if (elements.length > 0) {
        foundElements.push({ selector, count: elements.length });
        console.log(`✅ Found ${elements.length} elements with selector: ${selector}`);
        
        // Get text from first few elements
        for (let i = 0; i < Math.min(3, elements.length); i++) {
          const text = await elements[i].textContent();
          if (text && text.trim().length > 10) {
            console.log(`   📄 "${text.trim().substring(0, 60)}..."`);
          }
        }
      }
    }
    
    if (foundElements.length === 0) {
      console.log('❌ No RFP list elements found');
      
      // Save page HTML for analysis
      const html = await page.content();
      require('fs').writeFileSync('./debug-category-page.html', html);
      console.log('💾 Page HTML saved: debug-category-page.html');
      
      // Get page structure
      const headings = await page.$$eval('h1, h2, h3, h4, h5, h6', els => 
        els.map(el => ({ tag: el.tagName, text: el.textContent.trim() }))
      );
      console.log('📋 Page headings:', headings.slice(0, 10));
    }
    
    console.log('⏱️ Waiting 10 seconds for inspection...');
    await page.waitForTimeout(10000);
    
  } catch (error) {
    console.error('💥 Debug failed:', error);
  } finally {
    await browser.close();
    console.log('🔚 Debug completed');
  }
}

debugListingPage().catch(console.error);