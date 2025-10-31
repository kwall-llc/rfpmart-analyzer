import { AIAnalyzer } from './aiAnalyzer';
import { config } from '../config/environment';
import { analyzerLogger } from '../utils/logger';
import { RSSRFPItem } from './rssFeedParser';

export interface PreFilterResult {
  rfpItem: RSSRFPItem;
  isPromising: boolean;
  confidence: number;
  reasoning: string;
  categories: string[];
  estimatedBudget?: number;
  redFlags?: string[];
}

export interface PreFilterCriteria {
  minConfidence: number;
  requireHigherEd: boolean;
  minBudgetThreshold?: number;
  excludeRedFlags: boolean;
  maxResults?: number;
}

export class AIPreFilterService {
  private aiAnalyzer: AIAnalyzer;

  constructor() {
    this.aiAnalyzer = new AIAnalyzer();
  }

  async filterRSSItems(
    rssItems: RSSRFPItem[], 
    criteria: Partial<PreFilterCriteria> = {}
  ): Promise<PreFilterResult[]> {
    const {
      minConfidence = 0.6,
      requireHigherEd = true,
      minBudgetThreshold = config.budget.minAcceptable,
      excludeRedFlags = true,
      maxResults = 20
    } = criteria;

    analyzerLogger.info(`Starting AI pre-filter of ${rssItems.length} RSS items`);
    analyzerLogger.info(`Criteria: confidence≥${minConfidence}, higherEd=${requireHigherEd}, budget≥${minBudgetThreshold}`);

    const results: PreFilterResult[] = [];

    for (const rfpItem of rssItems) {
      try {
        const filterResult = await this.analyzeRSSItem(rfpItem);
        
        // Apply filtering criteria
        if (this.meetsFilterCriteria(filterResult, {
          minConfidence,
          requireHigherEd,
          minBudgetThreshold,
          excludeRedFlags
        })) {
          results.push(filterResult);
          
          // Stop if we've reached max results
          if (results.length >= maxResults) {
            analyzerLogger.info(`Reached maximum results limit: ${maxResults}`);
            break;
          }
        }
      } catch (error) {
        analyzerLogger.warn(`Failed to analyze RSS item "${rfpItem.title}": ${error instanceof Error ? error.message : 'Unknown error'}`);
        continue;
      }
    }

    analyzerLogger.info(`Pre-filter completed: ${results.length} promising RFPs identified from ${rssItems.length} items`);
    
    // Sort by confidence score
    results.sort((a, b) => b.confidence - a.confidence);
    
    return results;
  }

  private async analyzeRSSItem(rfpItem: RSSRFPItem): Promise<PreFilterResult> {
    const analysisText = this.buildAnalysisText(rfpItem);
    
    const prompt = this.buildFilterPrompt(analysisText);
    
    try {
      // For now, use keyword-based analysis as the primary method
      // Future enhancement: integrate with actual AI service
      analyzerLogger.debug(`Using keyword-based analysis for "${rfpItem.title}"`);
      return this.fallbackKeywordAnalysis(rfpItem);
    } catch (error) {
      analyzerLogger.error(`Analysis failed for "${rfpItem.title}": ${error instanceof Error ? error.message : 'Unknown error'}`);
      
      // Return a conservative result
      return {
        rfpItem,
        isPromising: false,
        confidence: 0,
        reasoning: 'Analysis failed',
        categories: [],
        redFlags: ['analysis_failed']
      };
    }
  }

  private buildAnalysisText(rfpItem: RSSRFPItem): string {
    let text = `Title: ${rfpItem.title}\n`;
    
    if (rfpItem.description) {
      text += `Description: ${rfpItem.description}\n`;
    }
    
    text += `Link: ${rfpItem.link}\n`;
    text += `Published: ${rfpItem.pubDate.toISOString()}\n`;
    
    if (rfpItem.category) {
      text += `Category: ${rfpItem.category}\n`;
    }
    
    if (rfpItem.author) {
      text += `Author: ${rfpItem.author}\n`;
    }

    return text;
  }

  private buildFilterPrompt(analysisText: string): string {
    return `You are analyzing RFP listings from an RSS feed to determine if they are good potential matches for KWALL, a web development company specializing in higher education websites using Drupal and WordPress.

KWALL CRITERIA:
- Higher education institutions (universities, colleges, K-12 schools)
- Web design, development, or redesign projects
- Preferred CMS: Drupal, WordPress, Modern Campus
- Minimum budget: $${config.budget.minAcceptable.toLocaleString()}
- Preferred budget: $${config.budget.minPreferred.toLocaleString()}+
- Technologies: Responsive design, accessibility (WCAG), UX/UI
- Locations: Nationwide, but prefer ${config.keywords.preferredStates.join(', ')}

RED FLAGS TO AVOID:
- Maintenance only contracts
- Minor updates or hosting only
- Non-education sectors (unless major project)
- Very small budgets under $25,000

ANALYZE THIS RFP LISTING:
${analysisText}

Provide your analysis in this JSON format:
{
  "isPromising": boolean,
  "confidence": number (0.0-1.0),
  "reasoning": "Brief explanation of why this is/isn't a good match",
  "categories": ["higher_ed", "web_development", "redesign", "cms", "accessibility", etc.],
  "estimatedBudget": number or null,
  "redFlags": ["list", "of", "concerns"] or []
}

Be conservative - only flag as promising if there are clear indicators this matches KWALL's specialty in higher education web development.`;
  }

  private parseFilterResponse(rfpItem: RSSRFPItem, response: string): PreFilterResult {
    try {
      // Extract JSON from response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in AI response');
      }
      
      const parsed = JSON.parse(jsonMatch[0]);
      
      return {
        rfpItem,
        isPromising: Boolean(parsed.isPromising),
        confidence: Math.max(0, Math.min(1, Number(parsed.confidence) || 0)),
        reasoning: String(parsed.reasoning || 'No reasoning provided'),
        categories: Array.isArray(parsed.categories) ? parsed.categories : [],
        estimatedBudget: parsed.estimatedBudget ? Number(parsed.estimatedBudget) : undefined,
        redFlags: Array.isArray(parsed.redFlags) ? parsed.redFlags : []
      };
    } catch (error) {
      analyzerLogger.warn(`Failed to parse AI response for "${rfpItem.title}": ${error instanceof Error ? error.message : 'Unknown error'}`);
      
      // Fallback to keyword analysis
      return this.fallbackKeywordAnalysis(rfpItem);
    }
  }

  private fallbackKeywordAnalysis(rfpItem: RSSRFPItem): PreFilterResult {
    const text = `${rfpItem.title} ${rfpItem.description || ''}`.toLowerCase();
    
    // Check for higher education keywords
    const higherEdMatch = config.keywords.higherEd.some(keyword => 
      text.includes(keyword.toLowerCase())
    );
    
    // Check for project type keywords
    const projectTypeMatch = config.keywords.projectTypes.some(keyword => 
      text.includes(keyword.toLowerCase())
    );
    
    // Check for CMS keywords
    const cmsMatch = [
      ...config.keywords.cmsPreferred,
      ...config.keywords.cmsAcceptable
    ].some(keyword => text.includes(keyword.toLowerCase()));
    
    // Check for red flags
    const redFlags = config.keywords.redFlags.filter(flag => 
      text.includes(flag.toLowerCase())
    );
    
    // Calculate confidence
    let confidence = 0;
    const categories: string[] = [];
    
    if (higherEdMatch) {
      confidence += 0.4;
      categories.push('higher_ed');
    }
    
    if (projectTypeMatch) {
      confidence += 0.3;
      categories.push('web_development');
    }
    
    if (cmsMatch) {
      confidence += 0.2;
      categories.push('cms');
    }
    
    // Reduce confidence for red flags
    confidence -= redFlags.length * 0.2;
    confidence = Math.max(0, Math.min(1, confidence));
    
    const isPromising = confidence >= 0.5 && higherEdMatch && redFlags.length === 0;
    
    const reasoning = this.generateFallbackReasoning(higherEdMatch, projectTypeMatch, cmsMatch, redFlags);
    
    return {
      rfpItem,
      isPromising,
      confidence,
      reasoning,
      categories,
      redFlags: redFlags.length > 0 ? redFlags : undefined
    };
  }

  private generateFallbackReasoning(
    higherEdMatch: boolean,
    projectTypeMatch: boolean, 
    cmsMatch: boolean,
    redFlags: string[]
  ): string {
    const reasons: string[] = [];
    
    if (higherEdMatch) {
      reasons.push('matches higher education sector');
    }
    
    if (projectTypeMatch) {
      reasons.push('indicates web development project');
    }
    
    if (cmsMatch) {
      reasons.push('mentions relevant CMS technology');
    }
    
    if (redFlags.length > 0) {
      reasons.push(`has red flags: ${redFlags.join(', ')}`);
    }
    
    if (reasons.length === 0) {
      return 'No clear indicators for KWALL specialization';
    }
    
    return `Keyword analysis: ${reasons.join(', ')}`;
  }

  private meetsFilterCriteria(
    result: PreFilterResult, 
    criteria: Required<Omit<PreFilterCriteria, 'maxResults'>>
  ): boolean {
    // Must be flagged as promising
    if (!result.isPromising) {
      return false;
    }
    
    // Must meet minimum confidence
    if (result.confidence < criteria.minConfidence) {
      return false;
    }
    
    // Must match higher education if required
    if (criteria.requireHigherEd && !result.categories.includes('higher_ed')) {
      return false;
    }
    
    // Must meet budget threshold if specified and budget is estimated
    if (criteria.minBudgetThreshold && result.estimatedBudget && 
        result.estimatedBudget < criteria.minBudgetThreshold) {
      return false;
    }
    
    // Must not have red flags if exclusion is enabled
    if (criteria.excludeRedFlags && result.redFlags && result.redFlags.length > 0) {
      return false;
    }
    
    return true;
  }

  async getPromisingRFPUrls(rssItems: RSSRFPItem[], maxResults: number = 15): Promise<string[]> {
    const filterResults = await this.filterRSSItems(rssItems, {
      minConfidence: 0.7,
      requireHigherEd: true,
      excludeRedFlags: true,
      maxResults
    });
    
    return filterResults.map(result => result.rfpItem.link);
  }
}

// Export singleton instance
export const aiPreFilter = new AIPreFilterService();