const { chromium } = require('playwright');
const dotenv = require('dotenv');

dotenv.config();

async function testLoginMethods() {
  console.log('🔍 Testing different login submission methods...');
  
  const browser = await chromium.launch({ 
    headless: false,
    slowMo: 1000
  });
  
  try {
    const context = await browser.newContext({
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    });
    
    const page = await context.newPage();
    page.setDefaultTimeout(30000);
    
    console.log('🌐 Step 1: Navigating to login page...');
    await page.goto('https://www.rfpmart.com/userlogin.html');
    
    console.log('📸 Taking screenshot before login...');
    await page.screenshot({ path: './login-before.png', fullPage: true });
    
    console.log('🔍 Step 2: Analyzing login form...');
    
    // Check what form elements exist
    const emailInput = await page.$('input[type="email"]');
    const passwordInput = await page.$('input[type="password"]');
    const submitButton = await page.$('input[type="submit"]');
    const submitButton2 = await page.$('button[type="submit"]');
    const loginButton = await page.$('input[value*="Login"], input[value*="login"], button:has-text("Login")');
    
    console.log('Form elements found:');
    console.log('  Email input:', !!emailInput);
    console.log('  Password input:', !!passwordInput);
    console.log('  Submit input:', !!submitButton);
    console.log('  Submit button:', !!submitButton2);
    console.log('  Login button:', !!loginButton);
    
    if (!emailInput || !passwordInput) {
      console.log('❌ Required form inputs not found');
      return;
    }
    
    console.log('✅ Step 3: Filling form...');
    await page.fill('input[type="email"]', process.env.RFPMART_USERNAME);
    await page.fill('input[type="password"]', process.env.RFPMART_PASSWORD);
    
    console.log('📸 Taking screenshot after filling...');
    await page.screenshot({ path: './login-filled.png', fullPage: true });
    
    // Try different submission methods
    const submissionMethods = [
      {
        name: 'Method 1: Click submit input + waitForNavigation',
        action: async () => {
          await Promise.all([
            page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 15000 }),
            page.click('input[type="submit"]')
          ]);
        }
      },
      {
        name: 'Method 2: Click submit input + waitForURL change',
        action: async () => {
          const currentUrl = page.url();
          await page.click('input[type="submit"]');
          await page.waitForFunction(
            (oldUrl) => window.location.href !== oldUrl,
            currentUrl,
            { timeout: 15000 }
          );
        }
      },
      {
        name: 'Method 3: Press Enter on password field',
        action: async () => {
          await page.press('input[type="password"]', 'Enter');
          await page.waitForTimeout(3000);
        }
      },
      {
        name: 'Method 4: Submit form directly',
        action: async () => {
          await page.evaluate(() => {
            const form = document.querySelector('form');
            if (form) form.submit();
          });
          await page.waitForTimeout(3000);
        }
      }
    ];
    
    for (let i = 0; i < submissionMethods.length; i++) {
      const method = submissionMethods[i];
      console.log(`\n🧪 Testing ${method.name}...`);
      
      try {
        // Refill form before each attempt
        await page.fill('input[type="email"]', process.env.RFPMART_USERNAME);
        await page.fill('input[type="password"]', process.env.RFPMART_PASSWORD);
        
        const beforeUrl = page.url();
        console.log(`   Before: ${beforeUrl}`);
        
        await method.action();
        
        const afterUrl = page.url();
        console.log(`   After: ${afterUrl}`);
        console.log(`   URL changed: ${beforeUrl !== afterUrl}`);
        
        // Check if login was successful
        const pageTitle = await page.title();
        console.log(`   Page title: ${pageTitle}`);
        
        // Look for login success indicators
        const authElements = await page.$$('a[href*="logout"], a[href*="profile"], a[href*="account"]');
        console.log(`   Auth indicators found: ${authElements.length}`);
        
        // Look for error messages
        const errorSelectors = [
          '.error',
          '.alert',
          '.message',
          '[class*="error"]',
          '[class*="alert"]'
        ];
        
        for (const selector of errorSelectors) {
          const errorElement = await page.$(selector);
          if (errorElement) {
            const errorText = await errorElement.textContent();
            if (errorText && errorText.trim()) {
              console.log(`   Error message: "${errorText.trim()}"`);
            }
          }
        }
        
        await page.screenshot({ path: `./login-method-${i+1}.png`, fullPage: true });
        
        if (beforeUrl !== afterUrl || authElements.length > 0) {
          console.log(`✅ ${method.name} appears successful!`);
          
          // Test navigation to category page
          console.log('🎯 Testing navigation to category page...');
          await page.goto('https://www.rfpmart.com/web-design-and-development-rfp-government-contract.html');
          
          const categoryTitle = await page.title();
          console.log(`   Category page title: ${categoryTitle}`);
          
          const categoryAuth = await page.$$('a[href*="logout"], a[href*="profile"]');
          console.log(`   Still authenticated: ${categoryAuth.length > 0}`);
          
          await page.screenshot({ path: `./category-after-method-${i+1}.png`, fullPage: true });
          
          break;
        } else {
          console.log(`❌ ${method.name} failed`);
        }
        
        // Wait before next attempt
        await page.waitForTimeout(2000);
        
      } catch (error) {
        console.log(`❌ ${method.name} error: ${error.message}`);
      }
    }
    
    console.log('⏱️ Keeping browser open for 15 seconds for inspection...');
    await page.waitForTimeout(15000);
    
  } catch (error) {
    console.error('💥 Login method test failed:', error);
  } finally {
    await browser.close();
    console.log('🔚 Login method testing completed');
  }
}

testLoginMethods().catch(console.error);