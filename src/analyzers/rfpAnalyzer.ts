import { CriteriaChecker, InstitutionAnalysis, BudgetAnalysis, TechnologyAnalysis } from './criteriaChecker';
import { ScoreCalculator, FitAnalysis } from './scoreCalculator';
import { RFPProcessingResult } from '../processors/rfpProcessor';
import { analyzerLogger, logHighScoreRFP } from '../utils/logger';
import { config } from '../config/environment';
import { RECOMMENDATION_LEVELS } from '../config/constants';

export interface RFPAnalysisResult {
  rfpId: string;
  title?: string;
  analysisDate: Date;
  
  // Core analyses
  institutionAnalysis: InstitutionAnalysis;
  budgetAnalysis: BudgetAnalysis;
  technologyAnalysis: TechnologyAnalysis;
  fitAnalysis: FitAnalysis;
  
  // Metadata
  textAnalyzed: {
    totalWords: number;
    totalCharacters: number;
    documentCount: number;
  };
  
  // Processing info
  processingSuccessful: boolean;
  errors: string[];
  
  // Key extracted information
  extractedInfo: {
    institutionName?: string;
    dueDate?: string;
    contactInfo?: string[];
    keyRequirements?: string[];
  };
}

export class RFPAnalyzer {
  private criteriaChecker: CriteriaChecker;
  private scoreCalculator: ScoreCalculator;

  constructor() {
    this.criteriaChecker = new CriteriaChecker();
    this.scoreCalculator = new ScoreCalculator();
  }

  /**
   * Analyze a single RFP from processing results
   */
  async analyzeRFP(processingResult: RFPProcessingResult, rfpTitle?: string): Promise<RFPAnalysisResult> {
    analyzerLogger.info(`Starting analysis for RFP: ${processingResult.rfpId}`);

    const result: RFPAnalysisResult = {
      rfpId: processingResult.rfpId,
      title: rfpTitle || 'Unknown RFP',
      analysisDate: new Date(),
      institutionAnalysis: {} as InstitutionAnalysis,
      budgetAnalysis: {} as BudgetAnalysis,
      technologyAnalysis: {} as TechnologyAnalysis,
      fitAnalysis: {} as FitAnalysis,
      textAnalyzed: {
        totalWords: processingResult.metadata.totalWords,
        totalCharacters: processingResult.metadata.totalCharacters,
        documentCount: processingResult.extractedDocuments.length,
      },
      processingSuccessful: false,
      errors: [...processingResult.errors],
      extractedInfo: {},
    };

    try {
      // Check if we have enough text to analyze
      if (processingResult.combinedText.length < 100) {
        throw new Error('Insufficient text content for analysis');
      }

      const text = processingResult.combinedText;

      // Perform all analyses
      result.institutionAnalysis = this.criteriaChecker.analyzeInstitution(text);
      result.budgetAnalysis = this.criteriaChecker.analyzeBudget(text);
      result.technologyAnalysis = this.criteriaChecker.analyzeTechnology(text);

      // Calculate fit score
      result.fitAnalysis = this.scoreCalculator.calculateFitScore(
        text,
        result.institutionAnalysis,
        result.budgetAnalysis,
        result.technologyAnalysis
      );

      // Extract additional information
      result.extractedInfo = this.extractAdditionalInfo(text);

      result.processingSuccessful = true;

      // Log high-scoring RFPs
      if (result.fitAnalysis.recommendation === RECOMMENDATION_LEVELS.HIGH) {
        logHighScoreRFP(
          result.rfpId,
          result.fitAnalysis.totalScore,
          result.title || result.rfpId
        );
      }

      analyzerLogger.info(`Analysis completed for RFP: ${processingResult.rfpId}`, {
        score: result.fitAnalysis.totalScore,
        percentage: result.fitAnalysis.percentage,
        recommendation: result.fitAnalysis.recommendation,
      });

      return result;

    } catch (error) {
      const errorMsg = `Analysis failed for RFP ${processingResult.rfpId}: ${error instanceof Error ? error.message : String(error)}`;
      result.errors.push(errorMsg);
      analyzerLogger.error(errorMsg);

      // Return partial result with error info
      return result;
    }
  }

  /**
   * Analyze multiple RFPs
   */
  async analyzeMultipleRFPs(processingResults: RFPProcessingResult[]): Promise<RFPAnalysisResult[]> {
    analyzerLogger.info(`Starting analysis for ${processingResults.length} RFPs`);

    const results: RFPAnalysisResult[] = [];

    for (const processingResult of processingResults) {
      try {
        const analysisResult = await this.analyzeRFP(processingResult);
        results.push(analysisResult);
      } catch (error) {
        analyzerLogger.error(`Failed to analyze RFP ${processingResult.rfpId}`, { 
          error: error instanceof Error ? error.message : String(error) 
        });
        
        // Add error result
        results.push({
          rfpId: processingResult.rfpId,
          analysisDate: new Date(),
          institutionAnalysis: {} as InstitutionAnalysis,
          budgetAnalysis: {} as BudgetAnalysis,
          technologyAnalysis: {} as TechnologyAnalysis,
          fitAnalysis: {} as FitAnalysis,
          textAnalyzed: {
            totalWords: 0,
            totalCharacters: 0,
            documentCount: 0,
          },
          processingSuccessful: false,
          errors: [`Analysis failed: ${error instanceof Error ? error.message : String(error)}`],
          extractedInfo: {},
        });
      }
    }

    // Log summary statistics
    const highScoreCount = results.filter(r => r.fitAnalysis.recommendation === RECOMMENDATION_LEVELS.HIGH).length;
    const mediumScoreCount = results.filter(r => r.fitAnalysis.recommendation === RECOMMENDATION_LEVELS.MEDIUM).length;
    const successfulAnalyses = results.filter(r => r.processingSuccessful).length;

    analyzerLogger.info('Batch analysis completed', {
      totalRFPs: results.length,
      successfulAnalyses,
      highScoreRFPs: highScoreCount,
      mediumScoreRFPs: mediumScoreCount,
    });

    return results;
  }

  /**
   * Extract additional information from RFP text
   */
  private extractAdditionalInfo(text: string): {
    institutionName?: string;
    dueDate?: string;
    contactInfo?: string[];
    keyRequirements?: string[];
  } {
    const info: any = {};

    try {
      // Extract institution name (more comprehensive)
      const institutionPatterns = [
        /(?:university of|college of|state university|community college)\s+([a-zA-Z\s]+)/gi,
        /([a-zA-Z\s]+)\s+(?:university|college|institute|polytechnic)/gi,
        /issued by[:\s]+([a-zA-Z\s,]+(?:university|college|institute))/gi,
      ];

      for (const pattern of institutionPatterns) {
        const match = text.match(pattern);
        if (match && match[0]) {
          info.institutionName = match[0].trim();
          break;
        }
      }

      // Extract contact information
      const emails = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g);
      const phones = text.match(/(?:\+?1[-.\s]?)?\(?[0-9]{3}\)?[-.\s]?[0-9]{3}[-.\s]?[0-9]{4}/g);
      
      info.contactInfo = [];
      if (emails) info.contactInfo.push(...emails.slice(0, 3));
      if (phones) info.contactInfo.push(...phones.slice(0, 2));

      // Extract key requirements (look for numbered or bulleted lists)
      const requirementPatterns = [
        /(?:requirements?|scope|specifications?)[:\s]+((?:[^\n]*\n?){1,10})/gi,
        /(?:\d+\.|\•|\*)\s*([^\n]{10,100})/g,
      ];

      info.keyRequirements = [];
      for (const pattern of requirementPatterns) {
        const matches = text.match(pattern);
        if (matches) {
          info.keyRequirements.push(...matches.slice(0, 5).map(m => m.trim()));
        }
      }

      return info;

    } catch (error) {
      analyzerLogger.warn('Failed to extract additional info', { error: error instanceof Error ? error.message : String(error) });
      return info;
    }
  }

  /**
   * Get summary statistics for analysis results
   */
  static getSummaryStatistics(results: RFPAnalysisResult[]): {
    totalAnalyzed: number;
    successfulAnalyses: number;
    averageScore: number;
    recommendationCounts: { [key: string]: number };
    higherEdCount: number;
    budgetAnalyzedCount: number;
    averageBudget: number;
    topRecommendations: Array<{
      rfpId: string;
      title?: string;
      score: number;
      recommendation: string;
    }>;
  } {
    const stats = {
      totalAnalyzed: results.length,
      successfulAnalyses: results.filter(r => r.processingSuccessful).length,
      averageScore: 0,
      recommendationCounts: {} as { [key: string]: number },
      higherEdCount: results.filter(r => r.institutionAnalysis.isHigherEducation).length,
      budgetAnalyzedCount: results.filter(r => r.budgetAnalysis.budgetFound).length,
      averageBudget: 0,
      topRecommendations: [] as Array<{
        rfpId: string;
        title?: string;
        score: number;
        recommendation: string;
      }>,
    };

    const successfulResults = results.filter(r => r.processingSuccessful);

    if (successfulResults.length > 0) {
      // Calculate average score
      const totalScore = successfulResults.reduce((sum, r) => sum + (r.fitAnalysis.totalScore || 0), 0);
      stats.averageScore = Math.round(totalScore / successfulResults.length);

      // Count recommendations
      for (const result of successfulResults) {
        const rec = result.fitAnalysis.recommendation || 'UNKNOWN';
        stats.recommendationCounts[rec] = (stats.recommendationCounts[rec] || 0) + 1;
      }

      // Calculate average budget (for RFPs with budget info)
      const budgetResults = successfulResults.filter(r => r.budgetAnalysis.budgetFound);
      if (budgetResults.length > 0) {
        const totalBudget = budgetResults.reduce((sum, r) => sum + r.budgetAnalysis.highestAmount, 0);
        stats.averageBudget = Math.round(totalBudget / budgetResults.length);
      }

      // Get top recommendations
      stats.topRecommendations = successfulResults
        .filter(r => r.fitAnalysis.totalScore > 0)
        .sort((a, b) => (b.fitAnalysis.totalScore || 0) - (a.fitAnalysis.totalScore || 0))
        .slice(0, 10)
        .map(r => ({
          rfpId: r.rfpId,
          title: r.title,
          score: r.fitAnalysis.totalScore || 0,
          recommendation: r.fitAnalysis.recommendation || 'UNKNOWN',
        }));
    }

    return stats;
  }

  /**
   * Filter RFPs by criteria
   */
  static filterRFPs(
    results: RFPAnalysisResult[],
    criteria: {
      minScore?: number;
      recommendation?: string;
      higherEdOnly?: boolean;
      hasBudget?: boolean;
      minBudget?: number;
      maxBudget?: number;
    }
  ): RFPAnalysisResult[] {
    return results.filter(result => {
      if (!result.processingSuccessful) return false;

      if (criteria.minScore && result.fitAnalysis.totalScore < criteria.minScore) return false;
      if (criteria.recommendation && result.fitAnalysis.recommendation !== criteria.recommendation) return false;
      if (criteria.higherEdOnly && !result.institutionAnalysis.isHigherEducation) return false;
      if (criteria.hasBudget && !result.budgetAnalysis.budgetFound) return false;
      if (criteria.minBudget && result.budgetAnalysis.highestAmount < criteria.minBudget) return false;
      if (criteria.maxBudget && result.budgetAnalysis.highestAmount > criteria.maxBudget) return false;

      return true;
    });
  }
}