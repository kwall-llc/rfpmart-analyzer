const { chromium } = require('playwright');
const dotenv = require('dotenv');

dotenv.config();

async function debugHomeStructure() {
  console.log('🔍 Debugging #home structure for RFP listings...');
  
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
    
    // Login first
    console.log('🔐 Logging in...');
    await page.goto('https://www.rfpmart.com/userlogin.html');
    await page.waitForTimeout(3000);
    await page.fill('input[type="email"]', process.env.RFPMART_USERNAME);
    await page.fill('input[type="password"]', process.env.RFPMART_PASSWORD);
    await page.click('input[name="submitlogin"]');
    
    console.log('⏳ Waiting for login...');
    await page.waitForTimeout(35000);
    
    // Navigate to category page
    console.log('📄 Navigating to category page...');
    await page.goto('https://www.rfpmart.com/web-design-and-development-rfp-government-contract.html');
    await page.waitForTimeout(5000);
    
    // Look for the #home element
    console.log('🔍 Looking for #home element...');
    const homeElement = await page.$('#home');
    
    if (homeElement) {
      console.log('✅ Found #home element');
      
      // Get all list items within #home
      const listItems = await homeElement.$$('li');
      console.log(`📋 Found ${listItems.length} list items in #home`);
      
      // Process each list item
      for (let i = 0; i < Math.min(listItems.length, 10); i++) {
        console.log(`\n📄 Processing list item ${i + 1}:`);
        
        try {
          // Get all divs in this list item
          const divs = await listItems[i].$$('div');
          console.log(`   Found ${divs.length} divs`);
          
          if (divs.length >= 2) {
            // First div should contain title and link
            const firstDivText = await divs[0].textContent();
            const titleLink = await divs[0].$('a');
            
            console.log(`   📝 Title div: "${firstDivText.trim()}"`);
            
            if (titleLink) {
              const href = await titleLink.getAttribute('href');
              console.log(`   🔗 Title link: ${href}`);
            }
            
            // Second div should contain dates
            const secondDivText = await divs[1].textContent();
            console.log(`   📅 Date div: "${secondDivText.trim()}"`);
            
            // Show full HTML structure of this list item
            const liHTML = await listItems[i].innerHTML();
            console.log(`   🏗️  HTML: ${liHTML.substring(0, 300)}...`);
          }
          
        } catch (error) {
          console.log(`   ❌ Error processing item ${i + 1}: ${error.message}`);
        }
      }
      
    } else {
      console.log('❌ #home element not found');
      
      // Let's see what elements are available
      console.log('🔍 Looking for alternative structures...');
      
      // Try different ID patterns
      const possibleIds = ['main', 'content', 'container', 'list', 'rfp-list'];
      for (const id of possibleIds) {
        const element = await page.$(`#${id}`);
        if (element) {
          console.log(`✅ Found #${id} element`);
          const listItems = await element.$$('li');
          console.log(`   Contains ${listItems.length} list items`);
        }
      }
      
      // Look for any list items on the page
      const allListItems = await page.$$('li');
      console.log(`📋 Total list items on page: ${allListItems.length}`);
      
      // Check a few list items to see their structure
      for (let i = 0; i < Math.min(allListItems.length, 5); i++) {
        const text = await allListItems[i].textContent();
        if (text && text.length > 20 && text.length < 500) {
          console.log(`   ${i + 1}. "${text.trim().substring(0, 100)}..."`);
        }
      }
    }
    
    console.log('\n⏱️ Keeping browser open for 60 seconds for inspection...');
    await page.waitForTimeout(60000);
    
  } catch (error) {
    console.error('💥 Debug failed:', error);
  } finally {
    await browser.close();
    console.log('🔚 Debug completed');
  }
}

debugHomeStructure().catch(console.error);