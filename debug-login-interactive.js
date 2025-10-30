const { chromium } = require('playwright');
const dotenv = require('dotenv');

dotenv.config();

async function interactiveLogin() {
  console.log('🔍 Interactive login testing...');
  
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
    
    console.log('🔐 Step 1: Navigating to login page...');
    await page.goto('https://www.rfpmart.com/userlogin.html');
    
    // Wait for page to fully load
    await page.waitForTimeout(3000);
    
    console.log('✏️ Step 2: Filling login form...');
    await page.fill('input[type="email"]', process.env.RFPMART_USERNAME);
    await page.waitForTimeout(1000);
    await page.fill('input[type="password"]', process.env.RFPMART_PASSWORD);
    await page.waitForTimeout(1000);
    
    console.log('📸 Taking screenshot of filled form...');
    await page.screenshot({ path: './login-filled-form.png', fullPage: true });
    
    // Method 1: Try clicking submit button
    console.log('\n🧪 Method 1: Clicking submit button...');
    try {
      await page.click('input[type="submit"]');
      console.log('✅ Submit button clicked');
      await page.waitForTimeout(5000); // Wait 5 seconds for any processing
      
      await page.screenshot({ path: './login-method1-result.png', fullPage: true });
      console.log('📸 Screenshot saved: login-method1-result.png');
      
      const currentUrl = page.url();
      console.log('🌐 Current URL:', currentUrl);
      
      // Check for Welcome message
      const bodyText = await page.$eval('body', el => el.textContent);
      if (bodyText.includes('Welcome') && bodyText.includes('KWALL')) {
        console.log('🎉 SUCCESS! Found "Welcome, KWALL" - login worked!');
        return true;
      } else {
        console.log('❌ No "Welcome, KWALL" found');
      }
      
    } catch (error) {
      console.log('❌ Method 1 failed:', error.message);
    }
    
    // Method 2: Try pressing Enter on password field
    console.log('\n🧪 Method 2: Pressing Enter on password field...');
    
    // Refill form first
    await page.goto('https://www.rfpmart.com/userlogin.html');
    await page.waitForTimeout(2000);
    await page.fill('input[type="email"]', process.env.RFPMART_USERNAME);
    await page.fill('input[type="password"]', process.env.RFPMART_PASSWORD);
    
    try {
      await page.press('input[type="password"]', 'Enter');
      console.log('✅ Enter key pressed');
      await page.waitForTimeout(5000);
      
      await page.screenshot({ path: './login-method2-result.png', fullPage: true });
      console.log('📸 Screenshot saved: login-method2-result.png');
      
      const currentUrl = page.url();
      console.log('🌐 Current URL:', currentUrl);
      
      // Check for Welcome message
      const bodyText = await page.$eval('body', el => el.textContent);
      if (bodyText.includes('Welcome') && bodyText.includes('KWALL')) {
        console.log('🎉 SUCCESS! Found "Welcome, KWALL" - login worked!');
        return true;
      } else {
        console.log('❌ No "Welcome, KWALL" found');
      }
      
    } catch (error) {
      console.log('❌ Method 2 failed:', error.message);
    }
    
    // Method 3: Try JavaScript form submission
    console.log('\n🧪 Method 3: JavaScript form submission...');
    
    // Refill form first
    await page.goto('https://www.rfpmart.com/userlogin.html');
    await page.waitForTimeout(2000);
    await page.fill('input[type="email"]', process.env.RFPMART_USERNAME);
    await page.fill('input[type="password"]', process.env.RFPMART_PASSWORD);
    
    try {
      await page.evaluate(() => {
        const form = document.querySelector('form');
        if (form) {
          form.submit();
        }
      });
      console.log('✅ JavaScript form.submit() called');
      await page.waitForTimeout(5000);
      
      await page.screenshot({ path: './login-method3-result.png', fullPage: true });
      console.log('📸 Screenshot saved: login-method3-result.png');
      
      const currentUrl = page.url();
      console.log('🌐 Current URL:', currentUrl);
      
      // Check for Welcome message
      const bodyText = await page.$eval('body', el => el.textContent);
      if (bodyText.includes('Welcome') && bodyText.includes('KWALL')) {
        console.log('🎉 SUCCESS! Found "Welcome, KWALL" - login worked!');
        return true;
      } else {
        console.log('❌ No "Welcome, KWALL" found');
      }
      
    } catch (error) {
      console.log('❌ Method 3 failed:', error.message);
    }
    
    // Method 4: Manual intervention
    console.log('\n🧪 Method 4: Manual intervention...');
    console.log('🔍 Please manually login in the browser window if possible');
    console.log('⏳ Waiting 60 seconds for manual login...');
    
    await page.goto('https://www.rfpmart.com/userlogin.html');
    await page.fill('input[type="email"]', process.env.RFPMART_USERNAME);
    await page.fill('input[type="password"]', process.env.RFPMART_PASSWORD);
    
    console.log('👆 Please try to login manually in the browser window');
    console.log('   - The form is already filled');
    console.log('   - Try clicking the submit button yourself');
    console.log('   - Look for any error messages or captcha');
    
    await page.waitForTimeout(60000); // Wait 60 seconds
    
    const finalUrl = page.url();
    const bodyText = await page.$eval('body', el => el.textContent);
    
    await page.screenshot({ path: './login-final-manual.png', fullPage: true });
    console.log('📸 Final screenshot saved: login-final-manual.png');
    console.log('🌐 Final URL:', finalUrl);
    
    if (bodyText.includes('Welcome') && bodyText.includes('KWALL')) {
      console.log('🎉 SUCCESS! Manual login worked!');
      return true;
    } else {
      console.log('❌ Manual login also failed');
      
      // Check what's actually on the page
      console.log('\n🔍 Page analysis:');
      
      // Look for error messages
      const errorSelectors = ['.error', '.alert', '.message', '[class*="error"]', '[class*="alert"]'];
      for (const selector of errorSelectors) {
        try {
          const errorElement = await page.$(selector);
          if (errorElement) {
            const errorText = await errorElement.textContent();
            console.log(`❌ Error found: "${errorText}"`);
          }
        } catch (e) {
          // Skip
        }
      }
      
      // Check if we're still on login page
      if (finalUrl.includes('userlogin.html')) {
        console.log('⚠️ Still on login page - submission not working');
      }
      
      // Check for any special requirements
      const hasRecaptcha = bodyText.toLowerCase().includes('recaptcha');
      const hasCaptcha = bodyText.toLowerCase().includes('captcha');
      
      if (hasRecaptcha || hasCaptcha) {
        console.log('⚠️ Captcha/reCAPTCHA detected on login page');
      }
      
      return false;
    }
    
  } catch (error) {
    console.error('💥 Interactive login failed:', error);
    return false;
  } finally {
    console.log('\n⏱️ Keeping browser open for 30 seconds for inspection...');
    await page.waitForTimeout(30000);
    await browser.close();
    console.log('🔚 Interactive login completed');
  }
}

interactiveLogin().catch(console.error);