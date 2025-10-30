import { SCORING_WEIGHTS, RECOMMENDATION_LEVELS } from '../config/constants';
import { config } from '../config/environment';
import { analyzerLogger } from '../utils/logger';
import { InstitutionAnalysis, BudgetAnalysis, TechnologyAnalysis, CriteriaChecker } from './criteriaChecker';

export interface ScoreBreakdown {
  category: string;
  score: number;
  maxScore: number;
  details: string;
  impact: 'positive' | 'negative' | 'neutral';
}

export interface FitAnalysis {
  totalScore: number;
  maxPossibleScore: number;
  percentage: number;
  recommendation: string;
  scoreBreakdown: ScoreBreakdown[];
  keyFindings: string[];
  redFlags: string[];
  advantages: string[];
  reasoning: string;
}

export class ScoreCalculator {
  private criteriaChecker: CriteriaChecker;

  constructor() {
    this.criteriaChecker = new CriteriaChecker();
  }

  /**
   * Calculate comprehensive fit score for an RFP
   */
  calculateFitScore(
    rfpText: string,
    institutionAnalysis: InstitutionAnalysis,
    budgetAnalysis: BudgetAnalysis,
    technologyAnalysis: TechnologyAnalysis
  ): FitAnalysis {
    try {
      analyzerLogger.info('Calculating fit score for RFP');

      const scoreBreakdown: ScoreBreakdown[] = [];
      let totalScore = 0;

      // 1. Higher Education Institution Score
      const institutionScore = this.calculateInstitutionScore(institutionAnalysis, scoreBreakdown);
      totalScore += institutionScore;

      // 2. Platform/CMS Score
      const platformScore = this.calculatePlatformScore(technologyAnalysis, scoreBreakdown);
      totalScore += platformScore;

      // 3. Project Type Score
      const projectScore = this.calculateProjectTypeScore(technologyAnalysis, scoreBreakdown);
      totalScore += projectScore;

      // 4. Budget Score
      const budgetScore = this.calculateBudgetScore(budgetAnalysis, scoreBreakdown);
      totalScore += budgetScore;

      // 5. Technology Keywords Score
      const techScore = this.calculateTechnologyScore(technologyAnalysis, scoreBreakdown);
      totalScore += techScore;

      // 6. Institution Size Score
      const sizeScore = this.calculateInstitutionSizeScore(institutionAnalysis, scoreBreakdown);
      totalScore += sizeScore;

      // 7. Geographic Preference Score
      const geoScore = this.calculateGeographicScore(institutionAnalysis, scoreBreakdown);
      totalScore += geoScore;

      // 8. Red Flags (Negative Score)
      const redFlagScore = this.calculateRedFlagScore(technologyAnalysis, scoreBreakdown);
      totalScore += redFlagScore;

      // 9. Additional Project Characteristics
      const projectCharScore = this.calculateProjectCharacteristicsScore(rfpText, scoreBreakdown);
      totalScore += projectCharScore;

      // Calculate max possible score
      const maxPossibleScore = this.calculateMaxPossibleScore();

      // Generate analysis
      const analysis = this.generateFitAnalysis(
        totalScore,
        maxPossibleScore,
        scoreBreakdown,
        institutionAnalysis,
        budgetAnalysis,
        technologyAnalysis
      );

      analyzerLogger.info('Fit score calculation completed', {
        totalScore,
        maxPossibleScore,
        percentage: analysis.percentage,
        recommendation: analysis.recommendation,
      });

      return analysis;

    } catch (error) {
      analyzerLogger.error('Failed to calculate fit score', { error: error instanceof Error ? error.message : String(error) });
      
      // Return default analysis on error
      return {
        totalScore: 0,
        maxPossibleScore: 100,
        percentage: 0,
        recommendation: RECOMMENDATION_LEVELS.SKIP,
        scoreBreakdown: [],
        keyFindings: ['Error occurred during analysis'],
        redFlags: ['Analysis failed'],
        advantages: [],
        reasoning: 'Unable to complete analysis due to error',
      };
    }
  }

  /**
   * Calculate institution score
   */
  private calculateInstitutionScore(analysis: InstitutionAnalysis, breakdown: ScoreBreakdown[]): number {
    const score = analysis.isHigherEducation ? SCORING_WEIGHTS.HIGHER_EDUCATION : 0;
    
    breakdown.push({
      category: 'Higher Education Institution',
      score,
      maxScore: SCORING_WEIGHTS.HIGHER_EDUCATION,
      details: analysis.isHigherEducation 
        ? `Confirmed higher education: ${analysis.institutionType || 'Institution'} (${analysis.confidence}% confidence)`
        : 'Not identified as higher education institution',
      impact: analysis.isHigherEducation ? 'positive' : 'negative',
    });

    return score;
  }

  /**
   * Calculate platform/CMS score
   */
  private calculatePlatformScore(analysis: TechnologyAnalysis, breakdown: ScoreBreakdown[]): number {
    let score = 0;
    let details = '';

    if (analysis.preferredCMS.found) {
      score = SCORING_WEIGHTS.CMS_PREFERRED;
      details = `Preferred CMS mentioned: ${analysis.preferredCMS.matches.join(', ')}`;
    } else if (analysis.acceptableCMS.found) {
      score = SCORING_WEIGHTS.CMS_ACCEPTABLE;
      details = `Acceptable CMS mentioned: ${analysis.acceptableCMS.matches.join(', ')}`;
    } else {
      details = 'No specific CMS platform mentioned';
    }

    breakdown.push({
      category: 'CMS Platform',
      score,
      maxScore: SCORING_WEIGHTS.CMS_PREFERRED,
      details,
      impact: score > 0 ? 'positive' : 'neutral',
    });

    return score;
  }

  /**
   * Calculate project type score
   */
  private calculateProjectTypeScore(analysis: TechnologyAnalysis, breakdown: ScoreBreakdown[]): number {
    const score = analysis.projectTypes.found ? SCORING_WEIGHTS.PROJECT_TYPE : 0;

    breakdown.push({
      category: 'Project Type',
      score,
      maxScore: SCORING_WEIGHTS.PROJECT_TYPE,
      details: analysis.projectTypes.found
        ? `Project type keywords found: ${analysis.projectTypes.matches.join(', ')}`
        : 'No major project type keywords found',
      impact: analysis.projectTypes.found ? 'positive' : 'neutral',
    });

    return score;
  }

  /**
   * Calculate budget score
   */
  private calculateBudgetScore(analysis: BudgetAnalysis, breakdown: ScoreBreakdown[]): number {
    let score = 0;
    let details = '';

    if (analysis.budgetFound) {
      if (analysis.highestAmount >= config.budget.minPreferred) {
        score = SCORING_WEIGHTS.BUDGET_HIGH;
        details = `High budget: $${analysis.highestAmount.toLocaleString()}`;
      } else if (analysis.highestAmount >= config.budget.minAcceptable) {
        score = SCORING_WEIGHTS.BUDGET_MEDIUM;
        details = `Medium budget: $${analysis.highestAmount.toLocaleString()}`;
      } else {
        score = SCORING_WEIGHTS.BUDGET_LOW;
        details = `Low budget: $${analysis.highestAmount.toLocaleString()}`;
      }
    } else {
      details = 'No budget information found';
    }

    breakdown.push({
      category: 'Budget',
      score,
      maxScore: SCORING_WEIGHTS.BUDGET_HIGH,
      details,
      impact: score > 0 ? 'positive' : 'neutral',
    });

    return score;
  }

  /**
   * Calculate technology keywords score
   */
  private calculateTechnologyScore(analysis: TechnologyAnalysis, breakdown: ScoreBreakdown[]): number {
    const score = analysis.techKeywords.found ? SCORING_WEIGHTS.TECH_KEYWORDS : 0;

    breakdown.push({
      category: 'Technology Keywords',
      score,
      maxScore: SCORING_WEIGHTS.TECH_KEYWORDS,
      details: analysis.techKeywords.found
        ? `Technology keywords found: ${analysis.techKeywords.matches.join(', ')}`
        : 'No positive technology keywords found',
      impact: analysis.techKeywords.found ? 'positive' : 'neutral',
    });

    return score;
  }

  /**
   * Calculate institution size score
   */
  private calculateInstitutionSizeScore(analysis: InstitutionAnalysis, breakdown: ScoreBreakdown[]): number {
    const score = analysis.isLargeInstitution ? SCORING_WEIGHTS.LARGE_INSTITUTION : 0;

    breakdown.push({
      category: 'Institution Size',
      score,
      maxScore: SCORING_WEIGHTS.LARGE_INSTITUTION,
      details: analysis.isLargeInstitution
        ? `Large institution indicators found: ${analysis.matchedKeywords.join(', ')}`
        : 'No large institution indicators found',
      impact: analysis.isLargeInstitution ? 'positive' : 'neutral',
    });

    return score;
  }

  /**
   * Calculate geographic preference score
   */
  private calculateGeographicScore(analysis: InstitutionAnalysis, breakdown: ScoreBreakdown[]): number {
    const score = analysis.isPreferredState ? SCORING_WEIGHTS.PREFERRED_STATE : 0;

    breakdown.push({
      category: 'Geographic Location',
      score,
      maxScore: SCORING_WEIGHTS.PREFERRED_STATE,
      details: analysis.stateLocation
        ? `Located in ${analysis.stateLocation}${analysis.isPreferredState ? ' (preferred state)' : ''}`
        : 'Location not identified',
      impact: analysis.isPreferredState ? 'positive' : 'neutral',
    });

    return score;
  }

  /**
   * Calculate red flags score (negative)
   */
  private calculateRedFlagScore(analysis: TechnologyAnalysis, breakdown: ScoreBreakdown[]): number {
    const score = analysis.redFlags.found ? SCORING_WEIGHTS.RED_FLAGS : 0;

    breakdown.push({
      category: 'Red Flags',
      score,
      maxScore: 0,
      details: analysis.redFlags.found
        ? `Red flags identified: ${analysis.redFlags.matches.join(', ')}`
        : 'No red flags identified',
      impact: analysis.redFlags.found ? 'negative' : 'positive',
    });

    return score;
  }

  /**
   * Calculate additional project characteristics score
   */
  private calculateProjectCharacteristicsScore(rfpText: string, breakdown: ScoreBreakdown[]): number {
    const characteristics = this.criteriaChecker.analyzeProjectCharacteristics(rfpText);
    let score = 0;
    const details: string[] = [];

    if (characteristics.isAccessibilityFocused) {
      score += 3;
      details.push('accessibility focus');
    }
    if (characteristics.isResponsiveRequired) {
      score += 2;
      details.push('responsive design');
    }
    if (characteristics.hasAPIIntegration) {
      score += 2;
      details.push('API integration');
    }

    breakdown.push({
      category: 'Project Characteristics',
      score,
      maxScore: 7,
      details: details.length > 0 ? `Additional characteristics: ${details.join(', ')}` : 'No additional characteristics identified',
      impact: score > 0 ? 'positive' : 'neutral',
    });

    return score;
  }

  /**
   * Calculate maximum possible score
   */
  private calculateMaxPossibleScore(): number {
    return SCORING_WEIGHTS.HIGHER_EDUCATION +
           SCORING_WEIGHTS.CMS_PREFERRED +
           SCORING_WEIGHTS.PROJECT_TYPE +
           SCORING_WEIGHTS.BUDGET_HIGH +
           SCORING_WEIGHTS.TECH_KEYWORDS +
           SCORING_WEIGHTS.LARGE_INSTITUTION +
           SCORING_WEIGHTS.PREFERRED_STATE +
           7; // Project characteristics max score
  }

  /**
   * Generate comprehensive fit analysis
   */
  private generateFitAnalysis(
    totalScore: number,
    maxPossibleScore: number,
    scoreBreakdown: ScoreBreakdown[],
    institutionAnalysis: InstitutionAnalysis,
    budgetAnalysis: BudgetAnalysis,
    technologyAnalysis: TechnologyAnalysis
  ): FitAnalysis {
    const percentage = Math.round((totalScore / maxPossibleScore) * 100);
    
    // Determine recommendation
    let recommendation: string;
    if (percentage >= config.analysis.scoreThresholds.high) {
      recommendation = RECOMMENDATION_LEVELS.HIGH;
    } else if (percentage >= config.analysis.scoreThresholds.medium) {
      recommendation = RECOMMENDATION_LEVELS.MEDIUM;
    } else if (percentage >= config.analysis.scoreThresholds.low) {
      recommendation = RECOMMENDATION_LEVELS.LOW;
    } else {
      recommendation = RECOMMENDATION_LEVELS.SKIP;
    }

    // Generate key findings
    const keyFindings: string[] = [];
    const advantages: string[] = [];
    const redFlags: string[] = [];

    // Analyze breakdown for key findings
    for (const item of scoreBreakdown) {
      if (item.score > 0 && item.impact === 'positive') {
        advantages.push(`${item.category}: ${item.details}`);
      } else if (item.impact === 'negative') {
        redFlags.push(`${item.category}: ${item.details}`);
      }
      
      if (item.score >= item.maxScore * 0.8) {
        keyFindings.push(`Strong ${item.category.toLowerCase()} alignment`);
      }
    }

    // Generate reasoning
    const reasoning = this.generateReasoning(
      recommendation,
      institutionAnalysis,
      budgetAnalysis,
      technologyAnalysis,
      percentage
    );

    return {
      totalScore,
      maxPossibleScore,
      percentage,
      recommendation,
      scoreBreakdown,
      keyFindings,
      redFlags,
      advantages,
      reasoning,
    };
  }

  /**
   * Generate reasoning text for the recommendation
   */
  private generateReasoning(
    recommendation: string,
    institutionAnalysis: InstitutionAnalysis,
    budgetAnalysis: BudgetAnalysis,
    technologyAnalysis: TechnologyAnalysis,
    percentage: number
  ): string {
    const reasons: string[] = [];

    // Institution reasons
    if (institutionAnalysis.isHigherEducation) {
      reasons.push(`confirmed higher education institution (${institutionAnalysis.institutionType})`);
    } else {
      reasons.push('not identified as higher education institution');
    }

    // Budget reasons
    if (budgetAnalysis.budgetFound) {
      if (budgetAnalysis.highestAmount >= config.budget.minPreferred) {
        reasons.push(`excellent budget range ($${budgetAnalysis.highestAmount.toLocaleString()})`);
      } else if (budgetAnalysis.highestAmount >= config.budget.minAcceptable) {
        reasons.push(`acceptable budget range ($${budgetAnalysis.highestAmount.toLocaleString()})`);
      } else {
        reasons.push(`low budget ($${budgetAnalysis.highestAmount.toLocaleString()})`);
      }
    } else {
      reasons.push('budget not specified');
    }

    // Technology reasons
    if (technologyAnalysis.preferredCMS.found) {
      reasons.push(`uses preferred CMS (${technologyAnalysis.preferredCMS.matches.join(', ')})`);
    } else if (technologyAnalysis.acceptableCMS.found) {
      reasons.push(`uses acceptable CMS (${technologyAnalysis.acceptableCMS.matches.join(', ')})`);
    }

    if (technologyAnalysis.projectTypes.found) {
      reasons.push(`suitable project type (${technologyAnalysis.projectTypes.matches.join(', ')})`);
    }

    if (technologyAnalysis.redFlags.found) {
      reasons.push(`red flags present (${technologyAnalysis.redFlags.matches.join(', ')})`);
    }

    const baseReasoning = `Score: ${percentage}% - ${reasons.join(', ')}.`;

    // Add recommendation-specific guidance
    switch (recommendation) {
      case RECOMMENDATION_LEVELS.HIGH:
        return `${baseReasoning} Strong fit for KWALL's expertise and target market. Recommend immediate pursuit.`;
      
      case RECOMMENDATION_LEVELS.MEDIUM:
        return `${baseReasoning} Good fit with some favorable factors. Worth considering if capacity allows.`;
      
      case RECOMMENDATION_LEVELS.LOW:
        return `${baseReasoning} Limited alignment with target criteria. Pursue only if strategic value or low competition.`;
      
      default:
        return `${baseReasoning} Poor fit for KWALL's target market and expertise. Recommend skipping.`;
    }
  }
}