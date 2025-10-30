const { chromium } = require('playwright');
const dotenv = require('dotenv');

dotenv.config();

async function testDirectAccess() {
  console.log('🔍 Testing direct access to known RFP...');
  
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
    
    // Login first
    await page.goto('https://www.rfpmart.com/userlogin.html');
    await page.fill('input[type="email"]', process.env.RFPMART_USERNAME);
    await page.fill('input[type="password"]', process.env.RFPMART_PASSWORD);
    
    await Promise.all([
      page.waitForNavigation({ waitUntil: 'domcontentloaded' }),
      page.click('input[type="submit"]'),
    ]);
    
    console.log('✅ Login completed');
    
    console.log('🎯 Step 2: Testing direct RFP access...');
    
    // Test direct access to a known RFP (the California Drupal one mentioned earlier)
    const testRfpUrl = 'https://www.rfpmart.com/1037897-usa-california-drupal-system-maintenance-support-solution-rfp.html';
    
    console.log(`🌐 Accessing: ${testRfpUrl}`);
    await page.goto(testRfpUrl);
    
    console.log('📄 Page title:', await page.title());
    console.log('🌐 Current URL:', page.url());
    
    // Check if we can access the content
    const bodyText = await page.$eval('body', el => el.textContent);
    
    if (bodyText.includes('captcha') || bodyText.includes('recaptcha')) {
      console.log('⚠️ CAPTCHA detected on direct RFP access');
    } else if (bodyText.includes('login') || bodyText.includes('sign in')) {
      console.log('⚠️ Login required for direct RFP access');
    } else if (bodyText.length < 500) {
      console.log('⚠️ Very short content - may be blocked');
    } else {
      console.log('✅ Direct RFP access appears successful');
      console.log(`📊 Content length: ${bodyText.length} characters`);
      
      // Look for RFP-specific content
      const keywords = ['rfp', 'solicitation', 'contract', 'proposal', 'due date', 'requirements'];
      const foundKeywords = keywords.filter(keyword => 
        bodyText.toLowerCase().includes(keyword)
      );
      console.log('🔍 Found keywords:', foundKeywords);
    }
    
    await page.screenshot({ path: './test-direct-access.png', fullPage: true });
    console.log('📸 Screenshot saved: test-direct-access.png');
    
    console.log('⏱️ Waiting 10 seconds for inspection...');
    await page.waitForTimeout(10000);
    
  } catch (error) {
    console.error('💥 Direct access test failed:', error);
  } finally {
    await browser.close();
    console.log('🔚 Direct access test completed');
  }
}

testDirectAccess().catch(console.error);