import { config } from '../config/environment';
import { REGEX_PATTERNS } from '../config/constants';
import { analyzerLogger } from '../utils/logger';

export interface CriteriaMatch {
  found: boolean;
  matches: string[];
  confidence: number;
  context?: string[];
}

export interface BudgetAnalysis {
  budgetFound: boolean;
  amounts: number[];
  highestAmount: number;
  budgetText: string[];
  inRange: boolean;
  score: number;
}

export interface InstitutionAnalysis {
  isHigherEducation: boolean;
  institutionName?: string;
  institutionType?: string;
  matchedKeywords: string[];
  confidence: number;
  isLargeInstitution: boolean;
  stateLocation?: string;
  isPreferredState: boolean;
}

export interface TechnologyAnalysis {
  preferredCMS: CriteriaMatch;
  acceptableCMS: CriteriaMatch;
  projectTypes: CriteriaMatch;
  techKeywords: CriteriaMatch;
  redFlags: CriteriaMatch;
}

export class CriteriaChecker {

  /**
   * Analyze if institution is higher education
   */
  analyzeInstitution(text: string): InstitutionAnalysis {
    const lowerText = text.toLowerCase();
    
    const analysis: InstitutionAnalysis = {
      isHigherEducation: false,
      matchedKeywords: [],
      confidence: 0,
      isLargeInstitution: false,
      isPreferredState: false,
    };

    try {
      // Check for higher education keywords
      const higherEdMatches = this.findKeywordMatches(lowerText, config.keywords.higherEd);
      analysis.matchedKeywords = higherEdMatches.matches;
      analysis.isHigherEducation = higherEdMatches.found;
      analysis.confidence = higherEdMatches.confidence;

      // Extract institution name (look for common patterns)
      const institutionPatterns = [
        /(?:university of|college of|state university|community college)\s+([a-zA-Z\s]+)/gi,
        /([a-zA-Z\s]+)\s+(?:university|college|institute|polytechnic)/gi,
      ];

      for (const pattern of institutionPatterns) {
        const matches = text.match(pattern);
        if (matches && matches.length > 0) {
          analysis.institutionName = matches[0].trim();
          break;
        }
      }

      // Check if it's a large institution
      const largeInstMatches = this.findKeywordMatches(lowerText, config.keywords.largeInstitution);
      analysis.isLargeInstitution = largeInstMatches.found;

      // Check for state location
      const stateMatch = this.findStateLocation(text);
      if (stateMatch) {
        analysis.stateLocation = stateMatch;
        analysis.isPreferredState = config.keywords.preferredStates.includes(stateMatch.toLowerCase());
      }

      // Determine institution type
      if (lowerText.includes('community college')) {
        analysis.institutionType = 'Community College';
      } else if (lowerText.includes('state university')) {
        analysis.institutionType = 'State University';
      } else if (lowerText.includes('university')) {
        analysis.institutionType = 'University';
      } else if (lowerText.includes('college')) {
        analysis.institutionType = 'College';
      }

      analyzerLogger.debug('Institution analysis completed', { analysis });
      return analysis;

    } catch (error) {
      analyzerLogger.error('Failed to analyze institution', { error: error instanceof Error ? error.message : String(error) });
      return analysis;
    }
  }

  /**
   * Analyze budget information
   */
  analyzeBudget(text: string): BudgetAnalysis {
    const analysis: BudgetAnalysis = {
      budgetFound: false,
      amounts: [],
      highestAmount: 0,
      budgetText: [],
      inRange: false,
      score: 0,
    };

    try {
      // Find budget-related text sections
      const budgetSections = this.findBudgetSections(text);
      analysis.budgetText = budgetSections;

      // Extract monetary amounts
      const amounts = this.extractMonetaryAmounts(text);
      analysis.amounts = amounts;
      analysis.budgetFound = amounts.length > 0;

      if (amounts.length > 0) {
        analysis.highestAmount = Math.max(...amounts);

        // Determine if budget is in acceptable range
        if (analysis.highestAmount >= config.budget.minPreferred) {
          analysis.inRange = true;
          analysis.score = 20; // High budget score
        } else if (analysis.highestAmount >= config.budget.minAcceptable) {
          analysis.inRange = true;
          analysis.score = 10; // Medium budget score
        } else if (analysis.highestAmount > 0) {
          analysis.score = 5; // Low budget score
        }
      }

      analyzerLogger.debug('Budget analysis completed', { analysis });
      return analysis;

    } catch (error) {
      analyzerLogger.error('Failed to analyze budget', { error: error instanceof Error ? error.message : String(error) });
      return analysis;
    }
  }

  /**
   * Analyze technology requirements
   */
  analyzeTechnology(text: string): TechnologyAnalysis {
    const lowerText = text.toLowerCase();

    const analysis: TechnologyAnalysis = {
      preferredCMS: this.findKeywordMatches(lowerText, config.keywords.cmsPreferred),
      acceptableCMS: this.findKeywordMatches(lowerText, config.keywords.cmsAcceptable),
      projectTypes: this.findKeywordMatches(lowerText, config.keywords.projectTypes),
      techKeywords: this.findKeywordMatches(lowerText, config.keywords.techPositive),
      redFlags: this.findKeywordMatches(lowerText, config.keywords.redFlags),
    };

    analyzerLogger.debug('Technology analysis completed', { analysis });
    return analysis;
  }

  /**
   * Find keyword matches in text
   */
  private findKeywordMatches(text: string, keywords: string[]): CriteriaMatch {
    const matches: string[] = [];
    const context: string[] = [];

    for (const keyword of keywords) {
      const escapedKeyword = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(`\\b${escapedKeyword}\\b`, 'gi');
      const keywordMatches = text.match(regex);

      if (keywordMatches) {
        matches.push(...keywordMatches);

        // Get context around the match
        const contextRegex = new RegExp(`.{0,50}\\b${escapedKeyword}\\b.{0,50}`, 'gi');
        const contextMatches = text.match(contextRegex);
        if (contextMatches) {
          context.push(...contextMatches);
        }
      }
    }

    // Calculate confidence based on number of matches and uniqueness
    const uniqueMatches = [...new Set(matches.map(m => m.toLowerCase()))];
    const confidence = Math.min(100, (uniqueMatches.length / Math.max(keywords.length, 1)) * 100);

    return {
      found: matches.length > 0,
      matches: uniqueMatches,
      confidence: Math.round(confidence),
      context: context.slice(0, 5), // Limit context entries
    };
  }

  /**
   * Extract monetary amounts from text
   */
  private extractMonetaryAmounts(text: string): number[] {
    const amounts: number[] = [];

    for (const pattern of REGEX_PATTERNS.BUDGET) {
      const matches = text.match(pattern);
      if (matches) {
        for (const match of matches) {
          const amount = this.parseMonetaryAmount(match);
          if (amount > 0) {
            amounts.push(amount);
          }
        }
      }
    }

    // Remove duplicates and sort
    const uniqueAmounts = [...new Set(amounts)].sort((a, b) => b - a);
    
    // Filter out unrealistic amounts (too small or too large)
    return uniqueAmounts.filter(amount => amount >= 1000 && amount <= 50000000);
  }

  /**
   * Parse monetary amount from string
   */
  private parseMonetaryAmount(amountStr: string): number {
    // Remove currency symbols and spaces
    const cleaned = amountStr.replace(/[$,\s]/g, '');
    
    // Handle various formats
    let multiplier = 1;
    
    if (cleaned.toLowerCase().includes('million') || cleaned.toLowerCase().includes('m')) {
      multiplier = 1000000;
    } else if (cleaned.toLowerCase().includes('thousand') || cleaned.toLowerCase().includes('k')) {
      multiplier = 1000;
    }

    // Extract numeric part
    const numericMatch = cleaned.match(/(\d+(?:\.\d+)?)/);
    if (numericMatch) {
      const number = parseFloat(numericMatch[1] || '0');
      return number * multiplier;
    }

    return 0;
  }

  /**
   * Find budget-related sections in text
   */
  private findBudgetSections(text: string): string[] {
    const sections: string[] = [];
    const budgetKeywords = config.keywords.budget;

    for (const keyword of budgetKeywords) {
      const escapedKeyword = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(`.{0,200}\\b${escapedKeyword}\\b.{0,200}`, 'gi');
      const matches = text.match(regex);
      
      if (matches) {
        sections.push(...matches);
      }
    }

    return sections.slice(0, 10); // Limit to first 10 sections
  }

  /**
   * Find state location in text
   */
  private findStateLocation(text: string): string | null {
    const statePatterns = [
      // Full state names
      /\b(?:Alabama|Alaska|Arizona|Arkansas|California|Colorado|Connecticut|Delaware|Florida|Georgia|Hawaii|Idaho|Illinois|Indiana|Iowa|Kansas|Kentucky|Louisiana|Maine|Maryland|Massachusetts|Michigan|Minnesota|Mississippi|Missouri|Montana|Nebraska|Nevada|New Hampshire|New Jersey|New Mexico|New York|North Carolina|North Dakota|Ohio|Oklahoma|Oregon|Pennsylvania|Rhode Island|South Carolina|South Dakota|Tennessee|Texas|Utah|Vermont|Virginia|Washington|West Virginia|Wisconsin|Wyoming)\b/gi,
      
      // State abbreviations
      /\b(?:AL|AK|AZ|AR|CA|CO|CT|DE|FL|GA|HI|ID|IL|IN|IA|KS|KY|LA|ME|MD|MA|MI|MN|MS|MO|MT|NE|NV|NH|NJ|NM|NY|NC|ND|OH|OK|OR|PA|RI|SC|SD|TN|TX|UT|VT|VA|WA|WV|WI|WY)\b/g,
    ];

    for (const pattern of statePatterns) {
      const match = text.match(pattern);
      if (match) {
        return match[0];
      }
    }

    return null;
  }

  /**
   * Check for specific project characteristics
   */
  analyzeProjectCharacteristics(text: string): {
    isRedesign: boolean;
    isMigration: boolean;
    isRedevelopment: boolean;
    isAccessibilityFocused: boolean;
    isResponsiveRequired: boolean;
    hasAPIIntegration: boolean;
  } {
    const lowerText = text.toLowerCase();

    return {
      isRedesign: /\b(?:redesign|re-design|design refresh|visual overhaul)\b/gi.test(lowerText),
      isMigration: /\b(?:migration|migrate|move|transfer|convert)\b/gi.test(lowerText),
      isRedevelopment: /\b(?:redevelopment|re-development|rebuild|new development)\b/gi.test(lowerText),
      isAccessibilityFocused: /\b(?:accessibility|wcag|ada|508|inclusive|disability)\b/gi.test(lowerText),
      isResponsiveRequired: /\b(?:responsive|mobile|tablet|device|breakpoint)\b/gi.test(lowerText),
      hasAPIIntegration: /\b(?:api|integration|web service|rest|json|xml)\b/gi.test(lowerText),
    };
  }
}