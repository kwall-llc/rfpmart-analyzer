import fs from 'fs-extra';
import path from 'path';
import { config } from '../config/environment';
import { RECOMMENDATION_LEVELS } from '../config/constants';
import { systemLogger } from '../utils/logger';
import { formatDate, getRelativeDateString } from '../utils/dateHelper';
import { RFPAnalysisResult, RFPAnalyzer } from './rfpAnalyzer';

export class ReportGenerator {
  private reportsDir: string;

  constructor() {
    this.reportsDir = config.storage.reportsDirectory;
  }

  /**
   * Generate a comprehensive summary report
   */
  async generateSummaryReport(analysisResults: RFPAnalysisResult[]): Promise<string> {
    try {
      systemLogger.info('Generating summary report');

      const reportDate = new Date();
      const reportFileName = `summary-report-${formatDate(reportDate)}.md`;
      const reportPath = path.join(this.reportsDir, reportFileName);

      // Ensure reports directory exists
      await fs.ensureDir(this.reportsDir);

      // Generate report content
      const content = this.generateSummaryContent(analysisResults, reportDate);

      // Write report to file
      await fs.writeFile(reportPath, content, 'utf-8');

      systemLogger.info(`Summary report generated: ${reportFileName}`);
      return reportPath;

    } catch (error) {
      systemLogger.error('Failed to generate summary report', { 
        error: error instanceof Error ? error.message : String(error) 
      });
      throw error;
    }
  }

  /**
   * Generate individual RFP report
   */
  async generateIndividualReport(analysis: RFPAnalysisResult): Promise<string> {
    try {
      systemLogger.info(`Generating individual report for RFP: ${analysis.rfpId}`);

      const reportFileName = `rfp-${analysis.rfpId}-${formatDate(analysis.analysisDate)}.md`;
      const reportPath = path.join(this.reportsDir, 'individual', reportFileName);

      // Ensure directory exists
      await fs.ensureDir(path.dirname(reportPath));

      // Generate report content
      const content = this.generateIndividualContent(analysis);

      // Write report to file
      await fs.writeFile(reportPath, content, 'utf-8');

      systemLogger.info(`Individual report generated: ${reportFileName}`);
      return reportPath;

    } catch (error) {
      systemLogger.error(`Failed to generate individual report for RFP: ${analysis.rfpId}`, { 
        error: error instanceof Error ? error.message : String(error) 
      });
      throw error;
    }
  }

  /**
   * Generate CSV export of all analysis results
   */
  async generateCSVExport(analysisResults: RFPAnalysisResult[]): Promise<string> {
    try {
      systemLogger.info('Generating CSV export');

      const exportDate = new Date();
      const exportFileName = `rfp-analysis-export-${formatDate(exportDate)}.csv`;
      const exportPath = path.join(this.reportsDir, 'exports', exportFileName);

      // Ensure directory exists
      await fs.ensureDir(path.dirname(exportPath));

      // Generate CSV content
      const csvContent = this.generateCSVContent(analysisResults);

      // Write CSV to file
      await fs.writeFile(exportPath, csvContent, 'utf-8');

      systemLogger.info(`CSV export generated: ${exportFileName}`);
      return exportPath;

    } catch (error) {
      systemLogger.error('Failed to generate CSV export', { 
        error: error instanceof Error ? error.message : String(error) 
      });
      throw error;
    }
  }

  /**
   * Generate summary report content
   */
  private generateSummaryContent(analysisResults: RFPAnalysisResult[], reportDate: Date): string {
    const stats = RFPAnalyzer.getSummaryStatistics(analysisResults);
    const highScoreRFPs = RFPAnalyzer.filterRFPs(analysisResults, { 
      recommendation: RECOMMENDATION_LEVELS.HIGH 
    });
    const mediumScoreRFPs = RFPAnalyzer.filterRFPs(analysisResults, { 
      recommendation: RECOMMENDATION_LEVELS.MEDIUM 
    });

    let content = `# RFP Mart Analysis Summary Report\n\n`;
    content += `**Generated:** ${reportDate.toISOString()}\n`;
    content += `**Report Period:** ${formatDate(reportDate)}\n\n`;

    // Executive Summary
    content += `## 📊 Executive Summary\n\n`;
    content += `- **Total RFPs Analyzed:** ${stats.totalAnalyzed}\n`;
    content += `- **Successful Analyses:** ${stats.successfulAnalyses}\n`;
    content += `- **Average Score:** ${stats.averageScore}\n`;
    content += `- **Higher Education RFPs:** ${stats.higherEdCount}\n`;
    content += `- **RFPs with Budget Info:** ${stats.budgetAnalyzedCount}\n`;
    if (stats.averageBudget > 0) {
      content += `- **Average Budget:** $${stats.averageBudget.toLocaleString()}\n`;
    }
    content += `\n`;

    // Recommendations Breakdown
    content += `## 🎯 Recommendations Breakdown\n\n`;
    content += `| Recommendation | Count | Percentage |\n`;
    content += `|----------------|-------|------------|\n`;
    
    for (const [recommendation, count] of Object.entries(stats.recommendationCounts)) {
      const percentage = stats.totalAnalyzed > 0 ? Math.round((count / stats.totalAnalyzed) * 100) : 0;
      const emoji = this.getRecommendationEmoji(recommendation);
      content += `| ${emoji} ${recommendation} | ${count} | ${percentage}% |\n`;
    }
    content += `\n`;

    // High Priority RFPs
    if (highScoreRFPs.length > 0) {
      content += `## 🚀 High Priority RFPs (${highScoreRFPs.length})\n\n`;
      content += `These RFPs are strong fits for KWALL and should be pursued immediately:\n\n`;
      
      for (const rfp of highScoreRFPs.slice(0, 10)) {
        content += `### ${rfp.title || rfp.rfpId}\n`;
        content += `- **Score:** ${rfp.fitAnalysis.totalScore}/${rfp.fitAnalysis.maxPossibleScore} (${rfp.fitAnalysis.percentage}%)\n`;
        content += `- **Institution:** ${rfp.institutionAnalysis.institutionName || 'Not identified'}\n`;
        if (rfp.budgetAnalysis.budgetFound) {
          content += `- **Budget:** $${rfp.budgetAnalysis.highestAmount.toLocaleString()}\n`;
        }
        if (rfp.technologyAnalysis.preferredCMS.found) {
          content += `- **CMS:** ${rfp.technologyAnalysis.preferredCMS.matches.join(', ')}\n`;
        }
        content += `- **Reasoning:** ${rfp.fitAnalysis.reasoning}\n\n`;
      }
    }

    // Medium Priority RFPs
    if (mediumScoreRFPs.length > 0) {
      content += `## ⚡ Medium Priority RFPs (${mediumScoreRFPs.length})\n\n`;
      content += `These RFPs have potential and should be considered if capacity allows:\n\n`;
      
      for (const rfp of mediumScoreRFPs.slice(0, 5)) {
        content += `- **${rfp.title || rfp.rfpId}** - Score: ${rfp.fitAnalysis.percentage}%\n`;
        if (rfp.institutionAnalysis.institutionName) {
          content += `  - Institution: ${rfp.institutionAnalysis.institutionName}\n`;
        }
        if (rfp.budgetAnalysis.budgetFound) {
          content += `  - Budget: $${rfp.budgetAnalysis.highestAmount.toLocaleString()}\n`;
        }
      }
      content += `\n`;
    }

    // Key Insights
    content += `## 💡 Key Insights\n\n`;
    
    const insights: string[] = [];
    
    if (stats.higherEdCount / stats.totalAnalyzed > 0.8) {
      insights.push(`Strong focus on higher education sector (${Math.round((stats.higherEdCount / stats.totalAnalyzed) * 100)}% of RFPs)`);
    }
    
    if (stats.averageBudget > config.budget.minPreferred) {
      insights.push(`Above-average budget range detected ($${stats.averageBudget.toLocaleString()} average)`);
    }
    
    if ((stats.recommendationCounts[RECOMMENDATION_LEVELS.HIGH] || 0) > 3) {
      insights.push(`High opportunity period with ${stats.recommendationCounts[RECOMMENDATION_LEVELS.HIGH]} high-priority RFPs`);
    }

    if (insights.length === 0) {
      insights.push('No significant patterns identified in current dataset');
    }

    for (const insight of insights) {
      content += `- ${insight}\n`;
    }
    content += `\n`;

    // Recommendations for KWALL
    content += `## 📋 Action Items for KWALL\n\n`;
    content += `### Immediate Actions\n`;
    if (highScoreRFPs.length > 0) {
      content += `- Review and pursue ${highScoreRFPs.length} high-priority RFPs\n`;
      content += `- Prioritize RFPs with budgets over $${config.budget.minPreferred.toLocaleString()}\n`;
    } else {
      content += `- No high-priority RFPs identified in current batch\n`;
    }

    content += `\n### Strategic Considerations\n`;
    if (mediumScoreRFPs.length > 0) {
      content += `- Evaluate ${mediumScoreRFPs.length} medium-priority opportunities for strategic value\n`;
    }
    content += `- Monitor trends in higher education technology requirements\n`;
    content += `- Consider capacity planning for identified opportunities\n\n`;

    // Footer
    content += `---\n`;
    content += `*Report generated by RFP Mart Analyzer v1.0*\n`;
    content += `*For questions or issues, contact the development team*\n`;

    return content;
  }

  /**
   * Generate individual RFP report content
   */
  private generateIndividualContent(analysis: RFPAnalysisResult): string {
    let content = `# RFP Analysis Report: ${analysis.title || analysis.rfpId}\n\n`;
    
    // Header Information
    content += `**RFP ID:** ${analysis.rfpId}\n`;
    if (analysis.title) {
      content += `**Title:** ${analysis.title}\n`;
    }
    content += `**Analysis Date:** ${analysis.analysisDate.toISOString()}\n`;
    content += `**Analysis Status:** ${analysis.processingSuccessful ? '✅ Successful' : '❌ Failed'}\n\n`;

    if (!analysis.processingSuccessful) {
      content += `## ❌ Analysis Errors\n\n`;
      for (const error of analysis.errors) {
        content += `- ${error}\n`;
      }
      return content;
    }

    // Executive Summary
    content += `## 📊 Executive Summary\n\n`;
    content += `**Overall Score:** ${analysis.fitAnalysis.totalScore}/${analysis.fitAnalysis.maxPossibleScore} (${analysis.fitAnalysis.percentage}%)\n\n`;
    content += `**Recommendation:** ${this.getRecommendationEmoji(analysis.fitAnalysis.recommendation)} **${analysis.fitAnalysis.recommendation}**\n\n`;
    content += `**Reasoning:** ${analysis.fitAnalysis.reasoning}\n\n`;

    // Institution Analysis
    content += `## 🏫 Institution Analysis\n\n`;
    if (analysis.institutionAnalysis.isHigherEducation) {
      content += `✅ **Confirmed Higher Education Institution**\n`;
      if (analysis.institutionAnalysis.institutionName) {
        content += `- **Name:** ${analysis.institutionAnalysis.institutionName}\n`;
      }
      if (analysis.institutionAnalysis.institutionType) {
        content += `- **Type:** ${analysis.institutionAnalysis.institutionType}\n`;
      }
      content += `- **Confidence:** ${analysis.institutionAnalysis.confidence}%\n`;
      if (analysis.institutionAnalysis.isLargeInstitution) {
        content += `- **Size:** Large Institution ✅\n`;
      }
      if (analysis.institutionAnalysis.stateLocation) {
        content += `- **Location:** ${analysis.institutionAnalysis.stateLocation}`;
        if (analysis.institutionAnalysis.isPreferredState) {
          content += ` (Preferred State ⭐)`;
        }
        content += `\n`;
      }
    } else {
      content += `❌ **Not identified as Higher Education Institution**\n`;
    }
    content += `\n`;

    // Budget Analysis
    content += `## 💰 Budget Analysis\n\n`;
    if (analysis.budgetAnalysis.budgetFound) {
      content += `✅ **Budget Information Found**\n`;
      content += `- **Highest Amount:** $${analysis.budgetAnalysis.highestAmount.toLocaleString()}\n`;
      content += `- **In Target Range:** ${analysis.budgetAnalysis.inRange ? '✅ Yes' : '❌ No'}\n`;
      content += `- **Budget Score:** ${analysis.budgetAnalysis.score} points\n`;
      
      if (analysis.budgetAnalysis.budgetText.length > 0) {
        content += `- **Budget Context:**\n`;
        for (const text of analysis.budgetAnalysis.budgetText.slice(0, 3)) {
          content += `  - "${text.substring(0, 100)}..."\n`;
        }
      }
    } else {
      content += `❌ **No Budget Information Found**\n`;
    }
    content += `\n`;

    // Technology Analysis
    content += `## 💻 Technology Analysis\n\n`;
    
    if (analysis.technologyAnalysis.preferredCMS.found) {
      content += `✅ **Preferred CMS Mentioned:** ${analysis.technologyAnalysis.preferredCMS.matches.join(', ')}\n`;
    } else if (analysis.technologyAnalysis.acceptableCMS.found) {
      content += `⚡ **Acceptable CMS Mentioned:** ${analysis.technologyAnalysis.acceptableCMS.matches.join(', ')}\n`;
    } else {
      content += `❌ **No Specific CMS Platform Mentioned**\n`;
    }

    if (analysis.technologyAnalysis.projectTypes.found) {
      content += `✅ **Project Types:** ${analysis.technologyAnalysis.projectTypes.matches.join(', ')}\n`;
    }

    if (analysis.technologyAnalysis.techKeywords.found) {
      content += `✅ **Technology Keywords:** ${analysis.technologyAnalysis.techKeywords.matches.join(', ')}\n`;
    }

    if (analysis.technologyAnalysis.redFlags.found) {
      content += `🚨 **Red Flags:** ${analysis.technologyAnalysis.redFlags.matches.join(', ')}\n`;
    }
    content += `\n`;

    // Score Breakdown
    content += `## 📈 Score Breakdown\n\n`;
    content += `| Category | Score | Max Score | Details |\n`;
    content += `|----------|-------|-----------|----------|\n`;
    
    for (const item of analysis.fitAnalysis.scoreBreakdown) {
      const impact = item.impact === 'positive' ? '✅' : item.impact === 'negative' ? '❌' : '⚪';
      content += `| ${impact} ${item.category} | ${item.score} | ${item.maxScore} | ${item.details} |\n`;
    }
    content += `\n`;

    // Key Findings
    if (analysis.fitAnalysis.keyFindings.length > 0) {
      content += `## 🔍 Key Findings\n\n`;
      for (const finding of analysis.fitAnalysis.keyFindings) {
        content += `- ${finding}\n`;
      }
      content += `\n`;
    }

    // Advantages
    if (analysis.fitAnalysis.advantages.length > 0) {
      content += `## ✅ Advantages for KWALL\n\n`;
      for (const advantage of analysis.fitAnalysis.advantages) {
        content += `- ${advantage}\n`;
      }
      content += `\n`;
    }

    // Red Flags
    if (analysis.fitAnalysis.redFlags.length > 0) {
      content += `## 🚨 Red Flags & Concerns\n\n`;
      for (const redFlag of analysis.fitAnalysis.redFlags) {
        content += `- ${redFlag}\n`;
      }
      content += `\n`;
    }

    // Extracted Information
    if (analysis.extractedInfo.contactInfo && analysis.extractedInfo.contactInfo.length > 0) {
      content += `## 📞 Contact Information\n\n`;
      for (const contact of analysis.extractedInfo.contactInfo) {
        content += `- ${contact}\n`;
      }
      content += `\n`;
    }

    // Document Analysis Summary
    content += `## 📄 Document Analysis Summary\n\n`;
    content += `- **Documents Processed:** ${analysis.textAnalyzed.documentCount}\n`;
    content += `- **Total Words:** ${analysis.textAnalyzed.totalWords.toLocaleString()}\n`;
    content += `- **Total Characters:** ${analysis.textAnalyzed.totalCharacters.toLocaleString()}\n\n`;

    // Footer
    content += `---\n`;
    content += `*Generated by RFP Mart Analyzer on ${new Date().toISOString()}*\n`;

    return content;
  }

  /**
   * Generate CSV content for export
   */
  private generateCSVContent(analysisResults: RFPAnalysisResult[]): string {
    const headers = [
      'RFP_ID',
      'Title',
      'Analysis_Date',
      'Score',
      'Percentage',
      'Recommendation',
      'Is_Higher_Ed',
      'Institution_Name',
      'Institution_Type',
      'Budget_Found',
      'Budget_Amount',
      'Budget_In_Range',
      'Preferred_CMS',
      'Acceptable_CMS',
      'Project_Types',
      'Tech_Keywords',
      'Red_Flags',
      'Is_Large_Institution',
      'State_Location',
      'Is_Preferred_State',
      'Document_Count',
      'Total_Words',
      'Processing_Successful',
    ];

    let csv = headers.join(',') + '\n';

    for (const analysis of analysisResults) {
      const row = [
        this.csvEscape(analysis.rfpId),
        this.csvEscape(analysis.title || ''),
        analysis.analysisDate.toISOString(),
        analysis.fitAnalysis.totalScore || 0,
        analysis.fitAnalysis.percentage || 0,
        analysis.fitAnalysis.recommendation || '',
        analysis.institutionAnalysis.isHigherEducation || false,
        this.csvEscape(analysis.institutionAnalysis.institutionName || ''),
        this.csvEscape(analysis.institutionAnalysis.institutionType || ''),
        analysis.budgetAnalysis.budgetFound || false,
        analysis.budgetAnalysis.highestAmount || 0,
        analysis.budgetAnalysis.inRange || false,
        this.csvEscape(analysis.technologyAnalysis.preferredCMS.matches.join('; ') || ''),
        this.csvEscape(analysis.technologyAnalysis.acceptableCMS.matches.join('; ') || ''),
        this.csvEscape(analysis.technologyAnalysis.projectTypes.matches.join('; ') || ''),
        this.csvEscape(analysis.technologyAnalysis.techKeywords.matches.join('; ') || ''),
        this.csvEscape(analysis.technologyAnalysis.redFlags.matches.join('; ') || ''),
        analysis.institutionAnalysis.isLargeInstitution || false,
        this.csvEscape(analysis.institutionAnalysis.stateLocation || ''),
        analysis.institutionAnalysis.isPreferredState || false,
        analysis.textAnalyzed.documentCount || 0,
        analysis.textAnalyzed.totalWords || 0,
        analysis.processingSuccessful || false,
      ];

      csv += row.join(',') + '\n';
    }

    return csv;
  }

  /**
   * Escape CSV values
   */
  private csvEscape(value: string | number | boolean): string {
    if (typeof value === 'string') {
      // Escape quotes and wrap in quotes if contains comma, quote, or newline
      if (value.includes(',') || value.includes('"') || value.includes('\n')) {
        return '"' + value.replace(/"/g, '""') + '"';
      }
      return value;
    }
    return String(value);
  }

  /**
   * Get emoji for recommendation level
   */
  private getRecommendationEmoji(recommendation: string): string {
    switch (recommendation) {
      case RECOMMENDATION_LEVELS.HIGH:
        return '🚀';
      case RECOMMENDATION_LEVELS.MEDIUM:
        return '⚡';
      case RECOMMENDATION_LEVELS.LOW:
        return '⚠️';
      default:
        return '❌';
    }
  }
}