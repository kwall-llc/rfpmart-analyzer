const { chromium } = require('playwright');
const dotenv = require('dotenv');

dotenv.config();

async function testLogoutLoginCycle() {
  console.log('🔍 Testing logout → login cycle...');
  
  const browser = await chromium.launch({ 
    headless: false,
    slowMo: 1500
  });
  
  try {
    const context = await browser.newContext({
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    });
    
    const page = await context.newPage();
    page.setDefaultTimeout(60000);
    
    console.log('🌐 Step 1: Navigating to RFP Mart...');
    await page.goto('https://www.rfpmart.com');
    
    console.log('⏳ Waiting for page to load...');
    await page.waitForTimeout(5000);
    
    // Check current authentication state
    const bodyText = await page.$eval('body', el => el.textContent);
    const isCurrentlyLoggedIn = bodyText.includes('Welcome') && bodyText.includes('KWALL');
    
    console.log(`🔍 Current authentication state: ${isCurrentlyLoggedIn ? '✅ LOGGED IN' : '❌ LOGGED OUT'}`);
    
    if (isCurrentlyLoggedIn) {
      console.log('🔓 Step 2: Logging out...');
      
      // Look for logout button/link
      const logoutSelectors = [
        'a[href*="logout"]',
        'a:has-text("Logout")',
        'a:has-text("Log out")',
        'button:has-text("Logout")',
        'button:has-text("Log out")',
        '.logout',
        '#logout'
      ];
      
      let logoutFound = false;
      for (const selector of logoutSelectors) {
        try {
          const logoutElement = await page.$(selector);
          if (logoutElement) {
            console.log(`✅ Found logout element: ${selector}`);
            await logoutElement.click();
            logoutFound = true;
            break;
          }
        } catch (e) {
          // Try next selector
        }
      }
      
      if (!logoutFound) {
        console.log('⚠️ Could not find logout button - proceeding anyway');
      } else {
        console.log('⏳ Waiting 10 seconds after logout...');
        await page.waitForTimeout(10000);
        
        await page.screenshot({ path: './logout-complete.png', fullPage: true });
        console.log('📸 Screenshot after logout: logout-complete.png');
      }
    } else {
      console.log('ℹ️ Already logged out, proceeding to login');
    }
    
    console.log('\n🔐 Step 3: Starting fresh login process...');
    
    // Navigate to login page
    await page.goto('https://www.rfpmart.com/userlogin.html');
    
    console.log('⏳ Waiting 10 seconds for login page to fully load...');
    await page.waitForTimeout(10000);
    
    console.log('✏️ Filling login form...');
    await page.fill('input[type="email"]', process.env.RFPMART_USERNAME);
    await page.waitForTimeout(2000);
    
    await page.fill('input[type="password"]', process.env.RFPMART_PASSWORD);
    await page.waitForTimeout(2000);
    
    await page.screenshot({ path: './login-ready.png', fullPage: true });
    console.log('📸 Login form ready: login-ready.png');
    
    console.log('🚀 Clicking correct login submit button...');
    await page.click('input[name="submitlogin"]');
    console.log('✅ Login submit clicked');
    
    // Progressive checking with longer waits
    const checkTimes = [30, 60, 90, 120]; // seconds
    let loginSuccessful = false;
    
    for (const waitTime of checkTimes) {
      console.log(`⏳ Waiting ${waitTime} seconds for login to process...`);
      await page.waitForTimeout(waitTime * 1000);
      
      await page.screenshot({ path: `./login-check-${waitTime}sec.png`, fullPage: true });
      console.log(`📸 Screenshot at ${waitTime}s: login-check-${waitTime}sec.png`);
      
      const currentUrl = page.url();
      console.log(`🌐 URL at ${waitTime}s: ${currentUrl}`);
      
      const currentBodyText = await page.$eval('body', el => el.textContent);
      const hasWelcome = currentBodyText.includes('Welcome') && currentBodyText.includes('KWALL');
      
      console.log(`🔍 At ${waitTime} seconds:`);
      console.log(`   Welcome KWALL found: ${hasWelcome ? '✅ YES' : '❌ NO'}`);
      
      if (hasWelcome) {
        console.log(`🎉 LOGIN SUCCESSFUL after ${waitTime} seconds!`);
        loginSuccessful = true;
        break;
      }
      
      // If still on login page after 60+ seconds, something's wrong
      if (waitTime >= 60 && currentUrl.includes('userlogin.html')) {
        console.log('⚠️ Still on login page after 60+ seconds - may have failed');
      }
    }
    
    if (loginSuccessful) {
      console.log('\n🎯 Testing authenticated navigation...');
      
      // Test navigation to category page
      console.log('📄 Navigating to category page...');
      await page.goto('https://www.rfpmart.com/web-design-and-development-rfp-government-contract.html');
      
      console.log('⏳ Waiting 15 seconds for category page...');
      await page.waitForTimeout(15000);
      
      await page.screenshot({ path: './category-authenticated.png', fullPage: true });
      console.log('📸 Category page: category-authenticated.png');
      
      const categoryBodyText = await page.$eval('body', el => el.textContent);
      const stillAuth = categoryBodyText.includes('Welcome') && categoryBodyText.includes('KWALL');
      
      console.log(`🔍 Still authenticated on category page: ${stillAuth ? '✅ YES' : '❌ NO'}`);
      
      if (stillAuth) {
        // Check for RFPs
        console.log('🎯 Checking for RFPs...');
        const rfpElements = await page.$$('a[href*="usa"][href*="rfp.html"]');
        console.log(`📋 Found ${rfpElements.length} RFP elements`);
        
        if (rfpElements.length > 0) {
          console.log('✅ COMPLETE SUCCESS - Full login cycle working!');
          
          // Show sample RFPs
          console.log('\n📋 Sample RFPs found:');
          for (let i = 0; i < Math.min(3, rfpElements.length); i++) {
            try {
              const text = await rfpElements[i].textContent();
              const href = await rfpElements[i].getAttribute('href');
              console.log(`${i + 1}. "${text.trim().substring(0, 50)}..."`);
              console.log(`   🔗 ${href}`);
            } catch (e) {
              console.log(`${i + 1}. Could not read element`);
            }
          }
        } else {
          console.log('⚠️ No RFPs found despite successful authentication');
        }
      }
      
    } else {
      console.log('❌ Login failed after 120 seconds of waiting');
    }
    
    console.log('\n⏱️ Keeping browser open for 30 seconds for final inspection...');
    await page.waitForTimeout(30000);
    
  } catch (error) {
    console.error('💥 Logout-login cycle test failed:', error);
  } finally {
    await browser.close();
    console.log('🔚 Logout-login cycle test completed');
  }
}

testLogoutLoginCycle().catch(console.error);