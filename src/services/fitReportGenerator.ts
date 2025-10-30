import { AIAnalysisResult } from './aiAnalyzer';
import { RFPListing } from '../scrapers/rfpMartScraper';
import { analyzerLogger } from '../utils/logger';
import fs from 'fs-extra';
import path from 'path';
import { config } from '../config/environment';

export interface FitReport {
  rfpId: string;
  title: string;
  fitScore: number;
  fitRating: string;
  generatedDate: string;
  rfpMetadata: RFPListing;
  analysis: AIAnalysisResult;
  summary: string;
  htmlContent: string;
  markdownContent: string;
}

export class FitReportGenerator {
  
  /**
   * Generate a comprehensive fit report for an RFP
   */
  async generateFitReport(
    rfp: RFPListing, 
    analysis: AIAnalysisResult, 
    rfpDirectory: string
  ): Promise<FitReport> {
    try {
      analyzerLogger.info(`Generating fit report for RFP: ${rfp.id}`, { rfpId: rfp.id });

      const report: FitReport = {
        rfpId: rfp.id,
        title: rfp.title,
        fitScore: analysis.fitScore,
        fitRating: analysis.fitRating,
        generatedDate: new Date().toISOString(),
        rfpMetadata: rfp,
        analysis: analysis,
        summary: this.generateSummary(rfp, analysis),
        htmlContent: '',
        markdownContent: ''
      };

      // Generate HTML content
      report.htmlContent = this.generateHTMLReport(report);
      
      // Generate Markdown content
      report.markdownContent = this.generateMarkdownReport(report);

      // Save report files to RFP directory
      await this.saveReportFiles(report, rfpDirectory);

      analyzerLogger.info(`Fit report generated successfully for RFP: ${rfp.id}`, { 
        rfpId: rfp.id, 
        fitScore: analysis.fitScore 
      });

      return report;

    } catch (error) {
      analyzerLogger.error(`Failed to generate fit report for RFP ${rfp.id}`, { 
        error: error instanceof Error ? error.message : String(error) 
      });
      throw error;
    }
  }

  /**
   * Generate executive summary for the RFP fit
   */
  private generateSummary(rfp: RFPListing, analysis: AIAnalysisResult): string {
    const summary = [];

    // Fit assessment
    summary.push(`**Fit Assessment:** ${analysis.fitRating.toUpperCase()} (${analysis.fitScore}/100)`);
    
    // Recommendation
    summary.push(`**Recommendation:** ${analysis.recommendation}`);
    
    // Key highlights
    if (analysis.opportunities.length > 0) {
      summary.push(`**Key Opportunities:** ${analysis.opportunities.slice(0, 3).join(', ')}`);
    }
    
    // Red flags if any
    if (analysis.redFlags.length > 0) {
      summary.push(`**Red Flags:** ${analysis.redFlags.slice(0, 3).join(', ')}`);
    }
    
    // Budget info
    if (analysis.budgetEstimate && analysis.budgetEstimate !== 'not specified') {
      summary.push(`**Budget:** ${analysis.budgetEstimate}`);
    }
    
    // Institution type
    if (analysis.institutionType !== 'unknown') {
      summary.push(`**Institution:** ${analysis.institutionType}`);
    }

    return summary.join(' | ');
  }

  /**
   * Generate HTML report content
   */
  private generateHTMLReport(report: FitReport): string {
    const fitScoreColor = this.getFitScoreColor(report.fitScore);
    const rfp = report.rfpMetadata;
    const analysis = report.analysis;

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>RFP Fit Report - ${rfp.title}</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; margin: 0; padding: 20px; background: #f5f5f5; }
        .container { max-width: 900px; margin: 0 auto; background: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .header { border-bottom: 3px solid #007cba; padding-bottom: 20px; margin-bottom: 30px; }
        .title { font-size: 2.2em; font-weight: 700; color: #333; margin: 0; }
        .subtitle { font-size: 1.1em; color: #666; margin: 10px 0 0 0; }
        .fit-score { display: inline-block; background: ${fitScoreColor}; color: white; padding: 8px 16px; border-radius: 20px; font-weight: bold; font-size: 1.2em; }
        .section { margin: 25px 0; }
        .section-title { font-size: 1.4em; font-weight: 600; color: #333; margin-bottom: 10px; border-bottom: 2px solid #eee; padding-bottom: 5px; }
        .metadata { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; margin: 20px 0; }
        .metadata-item { background: #f8f9fa; padding: 12px; border-radius: 6px; border-left: 4px solid #007cba; }
        .metadata-label { font-weight: 600; color: #555; font-size: 0.9em; }
        .metadata-value { color: #333; margin-top: 4px; }
        .tags { display: flex; flex-wrap: wrap; gap: 8px; margin: 10px 0; }
        .tag { background: #e3f2fd; color: #1976d2; padding: 4px 8px; border-radius: 12px; font-size: 0.85em; }
        .red-flag { background: #ffebee; color: #c62828; }
        .opportunity { background: #e8f5e8; color: #2e7d32; }
        .recommendation { background: #fff3e0; color: #f57c00; padding: 15px; border-radius: 6px; border-left: 4px solid #ff9800; margin: 15px 0; }
        .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee; font-size: 0.9em; color: #666; text-align: center; }
        .confidence { float: right; font-size: 0.9em; color: #666; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1 class="title">${this.escapeHtml(rfp.title)}</h1>
            <div class="subtitle">
                <span class="fit-score">${analysis.fitRating.toUpperCase()} FIT - ${analysis.fitScore}/100</span>
                <span class="confidence">Confidence: ${analysis.confidence}%</span>
            </div>
        </div>

        <div class="section">
            <h2 class="section-title">Executive Summary</h2>
            <div class="recommendation">
                <strong>Recommendation:</strong> ${this.escapeHtml(analysis.recommendation)}
            </div>
            <p><strong>Analysis:</strong> ${this.escapeHtml(analysis.reasoning)}</p>
        </div>

        <div class="section">
            <h2 class="section-title">RFP Details</h2>
            <div class="metadata">
                <div class="metadata-item">
                    <div class="metadata-label">RFP ID</div>
                    <div class="metadata-value">${this.escapeHtml(rfp.id)}</div>
                </div>
                <div class="metadata-item">
                    <div class="metadata-label">Institution</div>
                    <div class="metadata-value">${this.escapeHtml(rfp.institution || 'Not specified')}</div>
                </div>
                <div class="metadata-item">
                    <div class="metadata-label">Posted Date</div>
                    <div class="metadata-value">${this.escapeHtml(rfp.postedDate || 'Not specified')}</div>
                </div>
                <div class="metadata-item">
                    <div class="metadata-label">Due Date</div>
                    <div class="metadata-value">${this.escapeHtml(rfp.dueDate || 'Not specified')}</div>
                </div>
                <div class="metadata-item">
                    <div class="metadata-label">Budget</div>
                    <div class="metadata-value">${this.escapeHtml(analysis.budgetEstimate)}</div>
                </div>
                <div class="metadata-item">
                    <div class="metadata-label">Project Type</div>
                    <div class="metadata-value">${this.escapeHtml(analysis.projectType)}</div>
                </div>
            </div>
        </div>

        <div class="section">
            <h2 class="section-title">Key Requirements</h2>
            <div class="tags">
                ${analysis.keyRequirements.map(req => `<span class="tag">${this.escapeHtml(req)}</span>`).join('')}
            </div>
        </div>

        <div class="section">
            <h2 class="section-title">Technologies</h2>
            <div class="tags">
                ${analysis.technologies.map(tech => `<span class="tag">${this.escapeHtml(tech)}</span>`).join('')}
            </div>
        </div>

        ${analysis.opportunities.length > 0 ? `
        <div class="section">
            <h2 class="section-title">Opportunities</h2>
            <div class="tags">
                ${analysis.opportunities.map(opp => `<span class="tag opportunity">${this.escapeHtml(opp)}</span>`).join('')}
            </div>
        </div>
        ` : ''}

        ${analysis.redFlags.length > 0 ? `
        <div class="section">
            <h2 class="section-title">Red Flags</h2>
            <div class="tags">
                ${analysis.redFlags.map(flag => `<span class="tag red-flag">${this.escapeHtml(flag)}</span>`).join('')}
            </div>
        </div>
        ` : ''}

        <div class="footer">
            <p>Report generated on ${new Date(report.generatedDate).toLocaleString()}</p>
            <p>Generated by KWALL RFP Analyzer v1.0</p>
        </div>
    </div>
</body>
</html>`;
  }

  /**
   * Generate Markdown report content
   */
  private generateMarkdownReport(report: FitReport): string {
    const rfp = report.rfpMetadata;
    const analysis = report.analysis;

    return `# RFP Fit Report: ${rfp.title}

## Executive Summary

**Fit Score:** ${analysis.fitScore}/100 (${analysis.fitRating.toUpperCase()})  
**Confidence:** ${analysis.confidence}%  
**Recommendation:** ${analysis.recommendation}

**Analysis:** ${analysis.reasoning}

## RFP Details

| Field | Value |
|-------|-------|
| RFP ID | ${rfp.id} |
| Institution | ${rfp.institution || 'Not specified'} |
| Posted Date | ${rfp.postedDate || 'Not specified'} |
| Due Date | ${rfp.dueDate || 'Not specified'} |
| Budget | ${analysis.budgetEstimate} |
| Project Type | ${analysis.projectType} |
| Institution Type | ${analysis.institutionType} |

## Key Requirements

${analysis.keyRequirements.length > 0 
  ? analysis.keyRequirements.map(req => `- ${req}`).join('\n')
  : '_No specific requirements identified_'
}

## Technologies

${analysis.technologies.length > 0 
  ? analysis.technologies.map(tech => `- ${tech}`).join('\n')
  : '_No specific technologies identified_'
}

${analysis.opportunities.length > 0 ? `
## Opportunities

${analysis.opportunities.map(opp => `- ${opp}`).join('\n')}
` : ''}

${analysis.redFlags.length > 0 ? `
## Red Flags

${analysis.redFlags.map(flag => `- ${flag}`).join('\n')}
` : ''}

## Links

- [RFP Detail Page](${rfp.detailUrl})
${rfp.downloadUrl ? `- [Download Link](${rfp.downloadUrl})` : ''}

---

*Report generated on ${new Date(report.generatedDate).toLocaleString()} by KWALL RFP Analyzer v1.0*
`;
  }

  /**
   * Save report files to the RFP directory
   */
  private async saveReportFiles(report: FitReport, rfpDirectory: string): Promise<void> {
    try {
      // Save HTML report
      const htmlPath = path.join(rfpDirectory, 'fit-report.html');
      await fs.writeFile(htmlPath, report.htmlContent, 'utf8');

      // Save Markdown report
      const markdownPath = path.join(rfpDirectory, 'fit-report.md');
      await fs.writeFile(markdownPath, report.markdownContent, 'utf8');

      // Save JSON report data
      const jsonPath = path.join(rfpDirectory, 'fit-analysis.json');
      const jsonData = {
        metadata: report.rfpMetadata,
        analysis: report.analysis,
        summary: report.summary,
        generatedDate: report.generatedDate
      };
      await fs.writeJson(jsonPath, jsonData, { spaces: 2 });

      analyzerLogger.info(`Fit report files saved to ${rfpDirectory}`, { 
        rfpId: report.rfpId,
        files: ['fit-report.html', 'fit-report.md', 'fit-analysis.json']
      });

    } catch (error) {
      analyzerLogger.error('Failed to save fit report files', { 
        error: error instanceof Error ? error.message : String(error),
        rfpDirectory
      });
      throw error;
    }
  }

  /**
   * Get color for fit score display
   */
  private getFitScoreColor(score: number): string {
    if (score >= config.ai.thresholds.excellent) return '#4caf50'; // Green
    if (score >= config.ai.thresholds.good) return '#ff9800'; // Orange
    if (score >= config.ai.thresholds.poor) return '#f44336'; // Red
    return '#9e9e9e'; // Gray
  }

  /**
   * Escape HTML characters for safe rendering
   */
  private escapeHtml(text: string): string {
    const div = document?.createElement('div') || { textContent: '', innerHTML: '' };
    if (typeof document !== 'undefined') {
      div.textContent = text;
      return div.innerHTML;
    }
    
    // Fallback for Node.js environment
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;');
  }

  /**
   * Generate summary report for multiple RFPs
   */
  async generateSummaryReport(reports: FitReport[], outputDirectory: string): Promise<void> {
    try {
      analyzerLogger.info(`Generating summary report for ${reports.length} RFPs`);

      // Sort reports by fit score descending
      const sortedReports = reports.sort((a, b) => b.fitScore - a.fitScore);
      
      // Group by fit rating
      const excellent = sortedReports.filter(r => r.fitRating === 'excellent');
      const good = sortedReports.filter(r => r.fitRating === 'good');
      const poor = sortedReports.filter(r => r.fitRating === 'poor');
      const rejected = sortedReports.filter(r => r.fitRating === 'rejected');

      const summaryContent = `# RFP Analysis Summary Report

Generated on: ${new Date().toLocaleString()}

## Overview

- **Total RFPs Analyzed:** ${reports.length}
- **Excellent Fit:** ${excellent.length}
- **Good Fit:** ${good.length}
- **Poor Fit:** ${poor.length}
- **Rejected:** ${rejected.length}

## Excellent Fit RFPs (${excellent.length})

${excellent.length > 0 
  ? excellent.map(r => `### ${r.title}\n- **Score:** ${r.fitScore}/100\n- **Summary:** ${r.summary}\n- **Directory:** ${r.rfpId}\n`).join('\n')
  : '_No excellent fit RFPs found_'
}

## Good Fit RFPs (${good.length})

${good.length > 0 
  ? good.map(r => `### ${r.title}\n- **Score:** ${r.fitScore}/100\n- **Summary:** ${r.summary}\n- **Directory:** ${r.rfpId}\n`).join('\n')
  : '_No good fit RFPs found_'
}

## Statistics

- **Average Fit Score:** ${(reports.reduce((sum, r) => sum + r.fitScore, 0) / reports.length).toFixed(1)}
- **Pursuit Recommended:** ${excellent.length + good.length} RFPs
- **Review Required:** ${poor.length} RFPs
- **Not Recommended:** ${rejected.length} RFPs

---

*Generated by KWALL RFP Analyzer v1.0*
`;

      // Save summary report
      const summaryPath = path.join(outputDirectory, `rfp-analysis-summary-${Date.now()}.md`);
      await fs.writeFile(summaryPath, summaryContent, 'utf8');

      analyzerLogger.info(`Summary report saved to ${summaryPath}`);

    } catch (error) {
      analyzerLogger.error('Failed to generate summary report', { 
        error: error instanceof Error ? error.message : String(error) 
      });
      throw error;
    }
  }
}