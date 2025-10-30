const { chromium } = require('playwright');
const dotenv = require('dotenv');
const readline = require('readline');

dotenv.config();

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function askQuestion(question) {
  return new Promise(resolve => {
    rl.question(question, resolve);
  });
}

async function debugManualLogin() {
  console.log('🔍 Manual login verification process...');
  
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
    
    console.log('✏️ Step 2: Filling login form...');
    await page.fill('input[type="email"]', process.env.RFPMART_USERNAME);
    await page.fill('input[type="password"]', process.env.RFPMART_PASSWORD);
    
    console.log('📸 Taking screenshot before submission...');
    await page.screenshot({ path: './manual-login-before.png', fullPage: true });
    
    console.log('🚀 Step 3: Submitting login form...');
    
    // Try the submission and wait for any navigation
    try {
      await Promise.all([
        page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 10000 }),
        page.click('input[type="submit"]')
      ]);
    } catch (error) {
      console.log('⚠️ Navigation timeout - login might have failed or no redirect occurred');
    }
    
    console.log('📸 Taking screenshot after submission...');
    await page.screenshot({ path: './manual-login-after.png', fullPage: true });
    
    console.log('🌐 Current URL after submission:', page.url());
    console.log('📄 Current page title:', await page.title());
    
    // Check for auth indicators
    const authElements = await page.$$('a[href*="logout"], a[href*="profile"], a[href*="account"]');
    console.log(`🔍 Auth indicators found: ${authElements.length}`);
    
    // Check for error messages
    const bodyText = await page.$eval('body', el => el.textContent.toLowerCase());
    if (bodyText.includes('invalid') || bodyText.includes('error') || bodyText.includes('incorrect')) {
      console.log('❌ Possible error messages detected in page content');
    }
    
    console.log('\n' + '='.repeat(60));
    console.log('👀 PLEASE LOOK AT THE BROWSER WINDOW');
    console.log('='.repeat(60));
    
    const answer = await askQuestion('Are you successfully logged in? (y/n): ');
    
    if (answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes') {
      console.log('✅ Great! Login confirmed by user. Proceeding with analysis...');
      
      console.log('🎯 Navigating to category page...');
      await page.goto('https://www.rfpmart.com/web-design-and-development-rfp-government-contract.html');
      
      await page.screenshot({ path: './manual-login-category.png', fullPage: true });
      
      console.log('🔍 Looking for RFPs on authenticated page...');
      
      // Use the best selector we found earlier
      const rfpElements = await page.$$('a[href*="usa"][href*="rfp.html"]');
      console.log(`📋 Found ${rfpElements.length} RFP elements`);
      
      // Show first few RFPs with dates
      for (let i = 0; i < Math.min(10, rfpElements.length); i++) {
        try {
          const text = await rfpElements[i].textContent();
          const href = await rfpElements[i].getAttribute('href');
          
          console.log(`${i + 1}. "${text.trim().substring(0, 80)}..."`);
          console.log(`   🔗 ${href}`);
          
          // Look for dates in the text
          const dateMatches = text.match(/\b(?:january|february|march|april|may|june|july|august|september|october|november|december)\s+\d{1,2},?\s+\d{4}\b/gi);
          if (dateMatches) {
            console.log(`   📅 Dates: ${dateMatches.join(', ')}`);
          }
        } catch (e) {
          console.log(`${i + 1}. Could not read element`);
        }
      }
      
      // Check pagination
      const nextPage = await page.$('a:has-text("Next")');
      if (nextPage) {
        const nextHref = await nextPage.getAttribute('href');
        console.log(`\n📄 Next page: ${nextHref}`);
        
        const goToNextPage = await askQuestion('Should I navigate to page 2 to look for older RFPs? (y/n): ');
        
        if (goToNextPage.toLowerCase() === 'y') {
          console.log('🔄 Navigating to page 2...');
          await page.click('a:has-text("Next")');
          await page.waitForTimeout(3000);
          
          const page2RfpElements = await page.$$('a[href*="usa"][href*="rfp.html"]');
          console.log(`📋 Page 2: Found ${page2RfpElements.length} RFP elements`);
          
          // Show first few from page 2
          for (let i = 0; i < Math.min(5, page2RfpElements.length); i++) {
            try {
              const text = await page2RfpElements[i].textContent();
              const href = await page2RfpElements[i].getAttribute('href');
              
              console.log(`P2-${i + 1}. "${text.trim().substring(0, 80)}..."`);
              console.log(`   🔗 ${href}`);
              
              // Look for October dates
              const dateMatches = text.match(/\b(?:october|oct)\s+\d{1,2},?\s+\d{4}\b/gi);
              if (dateMatches) {
                console.log(`   🎯 OCTOBER DATE: ${dateMatches.join(', ')}`);
              }
            } catch (e) {
              console.log(`P2-${i + 1}. Could not read element`);
            }
          }
        }
      }
      
    } else {
      console.log('❌ Login failed according to user observation');
      console.log('🔍 This suggests our login method needs adjustment');
      
      // Let's try a different approach
      const tryAgain = await askQuestion('Should I try a different login method? (y/n): ');
      
      if (tryAgain.toLowerCase() === 'y') {
        console.log('🔄 Trying manual form submission...');
        
        // Navigate back to login page
        await page.goto('https://www.rfpmart.com/userlogin.html');
        await page.fill('input[type="email"]', process.env.RFPMART_USERNAME);
        await page.fill('input[type="password"]', process.env.RFPMART_PASSWORD);
        
        // Try different approach - press Enter instead of click
        console.log('⌨️ Trying Enter key submission...');
        await page.press('input[type="password"]', 'Enter');
        await page.waitForTimeout(3000);
        
        console.log('📸 Taking screenshot after Enter key...');
        await page.screenshot({ path: './manual-login-enter.png', fullPage: true });
        
        console.log('🌐 URL after Enter:', page.url());
        
        const finalAnswer = await askQuestion('Did the Enter key method work? (y/n): ');
        
        if (finalAnswer.toLowerCase() === 'y') {
          console.log('✅ Enter key method successful!');
        } else {
          console.log('❌ Both methods failed - need to investigate form requirements');
        }
      }
    }
    
    console.log('\n⏱️ Keeping browser open for inspection...');
    await askQuestion('Press Enter when ready to close browser: ');
    
  } catch (error) {
    console.error('💥 Manual login debug failed:', error);
  } finally {
    rl.close();
    await browser.close();
    console.log('🔚 Manual login debug completed');
  }
}

debugManualLogin().catch(console.error);