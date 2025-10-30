const { chromium } = require('playwright');
const dotenv = require('dotenv');

dotenv.config();

async function slowPatientLogin() {
  console.log('🔍 Patient login testing for slow site...');
  
  const browser = await chromium.launch({ 
    headless: false,
    slowMo: 2000  // Even slower automation
  });
  
  try {
    const context = await browser.newContext({
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    });
    
    const page = await context.newPage();
    page.setDefaultTimeout(60000); // 60 second timeouts
    
    console.log('🔐 Step 1: Navigating to login page...');
    await page.goto('https://www.rfpmart.com/userlogin.html');
    
    console.log('⏳ Waiting 10 seconds for page to fully load...');
    await page.waitForTimeout(10000);
    
    console.log('✏️ Step 2: Slowly filling login form...');
    await page.fill('input[type="email"]', process.env.RFPMART_USERNAME);
    await page.waitForTimeout(2000);
    
    await page.fill('input[type="password"]', process.env.RFPMART_PASSWORD);
    await page.waitForTimeout(2000);
    
    console.log('📸 Taking screenshot of filled form...');
    await page.screenshot({ path: './slow-login-filled.png', fullPage: true });
    
    console.log('🚀 Step 3: Clicking submit button...');
    await page.click('input[type="submit"]');
    console.log('✅ Submit button clicked');
    
    console.log('⏳ WAITING 30 SECONDS for slow site to process login...');
    console.log('   (Not checking anything yet, just letting it work)');
    await page.waitForTimeout(30000);
    
    console.log('📸 Taking screenshot after 30 second wait...');
    await page.screenshot({ path: './slow-login-30sec.png', fullPage: true });
    
    const url30 = page.url();
    console.log('🌐 URL after 30 seconds:', url30);
    
    // Check for Welcome message
    let bodyText = await page.$eval('body', el => el.textContent);
    let hasWelcome = bodyText.includes('Welcome') && bodyText.includes('KWALL');
    
    console.log('🔍 After 30 seconds:');
    console.log(`   Welcome KWALL found: ${hasWelcome ? '✅ YES' : '❌ NO'}`);
    
    if (!hasWelcome) {
      console.log('⏳ WAITING ANOTHER 30 SECONDS (60 total)...');
      await page.waitForTimeout(30000);
      
      console.log('📸 Taking screenshot after 60 seconds total...');
      await page.screenshot({ path: './slow-login-60sec.png', fullPage: true });
      
      const url60 = page.url();
      console.log('🌐 URL after 60 seconds:', url60);
      
      bodyText = await page.$eval('body', el => el.textContent);
      hasWelcome = bodyText.includes('Welcome') && bodyText.includes('KWALL');
      
      console.log('🔍 After 60 seconds:');
      console.log(`   Welcome KWALL found: ${hasWelcome ? '✅ YES' : '❌ NO'}`);
    }
    
    if (!hasWelcome) {
      console.log('⏳ FINAL WAIT: ANOTHER 60 SECONDS (120 total)...');
      await page.waitForTimeout(60000);
      
      console.log('📸 Final screenshot after 120 seconds...');
      await page.screenshot({ path: './slow-login-120sec.png', fullPage: true });
      
      const urlFinal = page.url();
      console.log('🌐 Final URL after 120 seconds:', urlFinal);
      
      bodyText = await page.$eval('body', el => el.textContent);
      hasWelcome = bodyText.includes('Welcome') && bodyText.includes('KWALL');
      
      console.log('🔍 After 120 seconds (2 minutes):');
      console.log(`   Welcome KWALL found: ${hasWelcome ? '✅ YES' : '❌ NO'}`);
    }
    
    if (hasWelcome) {
      console.log('🎉 SUCCESS! Login worked with patient waiting!');
      
      console.log('🎯 Testing navigation to category page...');
      await page.goto('https://www.rfpmart.com/web-design-and-development-rfp-government-contract.html');
      
      console.log('⏳ Waiting 15 seconds for category page to load...');
      await page.waitForTimeout(15000);
      
      console.log('📸 Taking category page screenshot...');
      await page.screenshot({ path: './slow-login-category.png', fullPage: true });
      
      // Check auth on category page
      const categoryBodyText = await page.$eval('body', el => el.textContent);
      const stillAuthenticated = categoryBodyText.includes('Welcome') && categoryBodyText.includes('KWALL');
      
      console.log(`🔍 Still authenticated on category page: ${stillAuthenticated ? '✅ YES' : '❌ NO'}`);
      
      if (stillAuthenticated) {
        console.log('🎯 Looking for RFPs on authenticated category page...');
        
        const rfpElements = await page.$$('a[href*="usa"][href*="rfp.html"]');
        console.log(`📋 Found ${rfpElements.length} RFP elements`);
        
        if (rfpElements.length > 0) {
          console.log('✅ RFP discovery successful!');
          
          // Show first few RFPs
          for (let i = 0; i < Math.min(5, rfpElements.length); i++) {
            try {
              const text = await rfpElements[i].textContent();
              const href = await rfpElements[i].getAttribute('href');
              console.log(`${i + 1}. "${text.trim().substring(0, 60)}..."`);
              console.log(`   🔗 ${href}`);
            } catch (e) {
              console.log(`${i + 1}. Could not read element`);
            }
          }
        } else {
          console.log('❌ No RFPs found even with successful authentication');
        }
      }
      
    } else {
      console.log('❌ Login failed even with 2 minutes of waiting');
      
      // Check for error messages
      console.log('🔍 Looking for error messages...');
      
      if (bodyText.toLowerCase().includes('invalid')) {
        console.log('❌ "Invalid" found in page content');
      }
      if (bodyText.toLowerCase().includes('error')) {
        console.log('❌ "Error" found in page content');
      }
      if (bodyText.toLowerCase().includes('incorrect')) {
        console.log('❌ "Incorrect" found in page content');
      }
      if (bodyText.toLowerCase().includes('captcha')) {
        console.log('⚠️ "Captcha" found in page content');
      }
      
      // Check if still on login page
      if (page.url().includes('userlogin.html')) {
        console.log('⚠️ Still on login page - form submission may not have worked');
      }
    }
    
    console.log('\n⏱️ Keeping browser open for 30 seconds for manual inspection...');
    await page.waitForTimeout(30000);
    
  } catch (error) {
    console.error('💥 Slow login test failed:', error);
  } finally {
    await browser.close();
    console.log('🔚 Slow login test completed');
  }
}

slowPatientLogin().catch(console.error);