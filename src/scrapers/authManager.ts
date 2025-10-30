import { Page, Browser } from 'playwright';
import { config } from '../config/environment';
import { RFP_MART, ERROR_MESSAGES, SUCCESS_MESSAGES } from '../config/constants';
import { scraperLogger } from '../utils/logger';

export interface AuthState {
  isAuthenticated: boolean;
  loginTime?: Date;
  sessionDuration?: number;
}

export class AuthManager {
  private page: Page;
  private authState: AuthState = { isAuthenticated: false };

  constructor(page: Page) {
    this.page = page;
  }

  /**
   * Login to RFP Mart with credentials
   */
  async login(): Promise<boolean> {
    try {
      scraperLogger.info('Attempting to login to RFP Mart');

      // Navigate to login page
      await this.page.goto(RFP_MART.LOGIN_URL, { 
        waitUntil: 'networkidle',
        timeout: RFP_MART.WAIT_TIMES.PAGE_LOAD 
      });

      // Wait for login form to be visible
      await this.page.waitForSelector(RFP_MART.SELECTORS.LOGIN.USERNAME, { 
        timeout: RFP_MART.WAIT_TIMES.PAGE_LOAD 
      });

      // Fill in credentials
      await this.page.fill(RFP_MART.SELECTORS.LOGIN.USERNAME, config.rfpMart.username);
      await this.page.fill(RFP_MART.SELECTORS.LOGIN.PASSWORD, config.rfpMart.password);

      // Screenshot before login attempt (for debugging)
      if (config.nodeEnv === 'development') {
        await this.page.screenshot({ 
          path: `./logs/login-attempt-${Date.now()}.png`,
          fullPage: true 
        });
      }

      // Submit login form
      await Promise.all([
        this.page.waitForNavigation({ waitUntil: 'networkidle' }),
        this.page.click(RFP_MART.SELECTORS.LOGIN.SUBMIT),
      ]);

      // Check for login errors
      const errorElement = await this.page.$(RFP_MART.SELECTORS.LOGIN.ERROR);
      if (errorElement) {
        const errorText = await errorElement.textContent();
        scraperLogger.error(`Login failed with error: ${errorText}`);
        return false;
      }

      // Verify successful login by checking for user-specific content
      const isLoggedIn = await this.verifyAuthentication();
      
      if (isLoggedIn) {
        this.authState = {
          isAuthenticated: true,
          loginTime: new Date(),
        };
        scraperLogger.info(SUCCESS_MESSAGES.LOGIN_SUCCESS);
        return true;
      } else {
        scraperLogger.error(ERROR_MESSAGES.LOGIN_FAILED);
        return false;
      }

    } catch (error) {
      scraperLogger.error('Login attempt failed with exception', { error: error instanceof Error ? error.message : String(error) });
      
      // Take screenshot on error for debugging
      if (config.nodeEnv === 'development') {
        try {
          await this.page.screenshot({ 
            path: `./logs/login-error-${Date.now()}.png`,
            fullPage: true 
          });
        } catch (screenshotError) {
          scraperLogger.warn('Failed to take error screenshot', { error: screenshotError });
        }
      }
      
      return false;
    }
  }

  /**
   * Verify that we are still authenticated
   */
  async verifyAuthentication(): Promise<boolean> {
    try {
      // Check for user-specific elements that indicate we're logged in
      const authIndicators = [
        'a[href*="logout"]',
        'a[href*="profile"]',
        'a[href*="account"]',
        '.user-menu',
        '.logout',
        '.dashboard',
      ];

      for (const selector of authIndicators) {
        const element = await this.page.$(selector);
        if (element) {
          this.authState.isAuthenticated = true;
          return true;
        }
      }

      // Check if we're redirected to login page
      const currentUrl = this.page.url();
      if (currentUrl.includes('login') || currentUrl.includes('signin')) {
        this.authState.isAuthenticated = false;
        return false;
      }

      // Check page title for login indicators
      const title = await this.page.title();
      if (title.toLowerCase().includes('login') || title.toLowerCase().includes('sign in')) {
        this.authState.isAuthenticated = false;
        return false;
      }

      // If no clear indicators, assume we're authenticated
      // (some sites don't have obvious auth indicators)
      this.authState.isAuthenticated = true;
      return true;

    } catch (error) {
      scraperLogger.warn('Failed to verify authentication status', { error: error instanceof Error ? error.message : String(error) });
      return false;
    }
  }

  /**
   * Check if session is still valid (not expired)
   */
  isSessionValid(): boolean {
    if (!this.authState.isAuthenticated || !this.authState.loginTime) {
      return false;
    }

    // Assume session expires after 4 hours (typical for many sites)
    const SESSION_TIMEOUT = 4 * 60 * 60 * 1000; // 4 hours in milliseconds
    const sessionAge = Date.now() - this.authState.loginTime.getTime();
    
    return sessionAge < SESSION_TIMEOUT;
  }

  /**
   * Ensure we are authenticated, login if necessary
   */
  async ensureAuthenticated(): Promise<boolean> {
    // If we think we're authenticated, verify it
    if (this.authState.isAuthenticated) {
      if (!this.isSessionValid()) {
        scraperLogger.info('Session expired, attempting re-login');
        this.authState.isAuthenticated = false;
        return await this.login();
      }

      // Double-check with the page
      const verified = await this.verifyAuthentication();
      if (!verified) {
        scraperLogger.info('Authentication verification failed, attempting re-login');
        return await this.login();
      }

      return true;
    }

    // Not authenticated, attempt login
    return await this.login();
  }

  /**
   * Logout from RFP Mart
   */
  async logout(): Promise<boolean> {
    try {
      if (!this.authState.isAuthenticated) {
        return true;
      }

      // Try to find and click logout link
      const logoutSelectors = [
        'a[href*="logout"]',
        'button[onclick*="logout"]',
        '.logout',
        'a:has-text("Logout")',
        'a:has-text("Sign Out")',
      ];

      for (const selector of logoutSelectors) {
        const element = await this.page.$(selector);
        if (element) {
          await element.click();
          await this.page.waitForTimeout(2000); // Wait for logout to complete
          break;
        }
      }

      this.authState = { isAuthenticated: false };
      scraperLogger.info('Successfully logged out from RFP Mart');
      return true;

    } catch (error) {
      scraperLogger.warn('Failed to logout properly', { error: error instanceof Error ? error.message : String(error) });
      this.authState = { isAuthenticated: false };
      return false;
    }
  }

  /**
   * Get current authentication state
   */
  getAuthState(): AuthState {
    return { ...this.authState };
  }
}