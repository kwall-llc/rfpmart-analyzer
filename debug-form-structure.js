const { chromium } = require('playwright');
const dotenv = require('dotenv');

dotenv.config();

async function debugFormStructure() {
  console.log('🔍 Analyzing login form structure...');
  
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
    
    console.log('🔐 Navigating to login page...');
    await page.goto('https://www.rfpmart.com/userlogin.html');
    
    await page.waitForTimeout(3000);
    
    console.log('🔍 Analyzing all forms on the page...');
    
    // Get all forms
    const forms = await page.$$('form');
    console.log(`📋 Found ${forms.length} forms on the page`);
    
    for (let i = 0; i < forms.length; i++) {
      console.log(`\n📄 Form ${i + 1}:`);
      
      try {
        const formHtml = await forms[i].innerHTML();
        console.log('HTML:', formHtml.substring(0, 200) + '...');
        
        // Get submit buttons in this form
        const submitButtons = await forms[i].$$('input[type="submit"], button[type="submit"], button:not([type])');
        console.log(`🔘 Submit buttons in form ${i + 1}: ${submitButtons.length}`);
        
        for (let j = 0; j < submitButtons.length; j++) {
          const value = await submitButtons[j].getAttribute('value');
          const text = await submitButtons[j].textContent();
          const id = await submitButtons[j].getAttribute('id');
          const name = await submitButtons[j].getAttribute('name');
          
          console.log(`  Button ${j + 1}: value="${value}", text="${text}", id="${id}", name="${name}"`);
        }
        
        // Check for email and password fields in this form
        const emailField = await forms[i].$('input[type="email"]');
        const passwordField = await forms[i].$('input[type="password"]');
        
        if (emailField && passwordField) {
          console.log(`✅ Form ${i + 1} contains both email and password fields - this is likely the login form`);
        }
        
      } catch (e) {
        console.log(`❌ Error analyzing form ${i + 1}:`, e.message);
      }
    }
    
    // Also check for any submit buttons not in forms
    console.log('\n🔍 Checking for submit buttons outside forms...');
    const allSubmitButtons = await page.$$('input[type="submit"], button[type="submit"]');
    console.log(`🔘 Total submit buttons on page: ${allSubmitButtons.length}`);
    
    // Take a screenshot for visual inspection
    await page.screenshot({ path: './form-structure-analysis.png', fullPage: true });
    console.log('📸 Screenshot saved: form-structure-analysis.png');
    
    console.log('\n⏱️ Keeping browser open for 30 seconds for manual inspection...');
    await page.waitForTimeout(30000);
    
  } catch (error) {
    console.error('💥 Form structure analysis failed:', error);
  } finally {
    await browser.close();
    console.log('🔚 Form structure analysis completed');
  }
}

debugFormStructure().catch(console.error);