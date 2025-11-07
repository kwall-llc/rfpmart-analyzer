import fs from 'fs-extra';
import * as path from 'path';
import { DatabaseManager } from '../storage/database';
import { config } from '../config/environment';
import { systemLogger } from '../utils/logger';
import { formatDate } from '../utils/dateHelper';

interface DashboardRFP {
  rfpId: string;
  title: string;
  institution?: string;
  dueDate?: string;
  postedDate?: string;
  downloadDate?: string;
  score?: number;
  recommendation?: string;
  fitScore?: number;
  fitRating?: string;
  reasoning?: string;
  technologies?: string;
  opportunities?: string;
  redFlags?: string;
  budgetEstimate?: string;
  projectType?: string;
  institutionType?: string;
  analysisComplete: boolean;
  detailUrl?: string;
}

interface DashboardStats {
  totalAnalyzed: number;
  excellentFit: number;
  goodFit: number;
  poorFit: number;
  rejected: number;
  averageScore: number;
  successRate: string;
  lastUpdated: string;
  totalWithBudget: number;
  higherEdCount: number;
}

export class StaticDashboardGenerator {
  private db: DatabaseManager;
  private outputPath: string;

  constructor() {
    this.db = new DatabaseManager();
    this.outputPath = path.join(config.storage.reportsDirectory, 'dashboard.html');
  }

  async generateDashboard(): Promise<string> {
    try {
      systemLogger.info('🎨 Starting static dashboard generation');

      // Initialize database
      await this.db.initialize();

      // Get data from database
      const [rfpData, stats] = await Promise.all([
        this.getRFPData(),
        this.getStats()
      ]);

      // Generate HTML
      const htmlContent = this.generateHTML(rfpData, stats);

      // Ensure output directory exists
      await fs.ensureDir(path.dirname(this.outputPath));

      // Write HTML file
      await fs.writeFile(this.outputPath, htmlContent, 'utf-8');

      // Also create a copy in docs directory for GitHub Pages
      const docsPath = path.join(config.storage.reportsDirectory, 'docs', 'dashboard.html');
      await fs.ensureDir(path.dirname(docsPath));
      await fs.writeFile(docsPath, htmlContent, 'utf-8');

      // Close database connection
      await this.db.close();

      systemLogger.info(`✅ Static dashboard generated successfully: ${this.outputPath}`);
      systemLogger.info(`📊 Dashboard contains ${rfpData.length} RFPs with ${stats.excellentFit} excellent fits`);

      return this.outputPath;

    } catch (error) {
      systemLogger.error('❌ Failed to generate static dashboard', {
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  private async getRFPData(): Promise<DashboardRFP[]> {
    try {
      // Get all RFPs from database
      const rfps = await this.db.getAllRFPs();

      // Get AI analysis for each RFP
      const dashboardRFPs: DashboardRFP[] = [];

      for (const rfp of rfps) {
        // Get AI analysis if available
        const aiAnalysis = await this.getAIAnalysisForRFP(rfp.id);

        dashboardRFPs.push({
          rfpId: rfp.id,
          title: rfp.title,
          institution: rfp.institution,
          dueDate: rfp.dueDate,
          postedDate: rfp.postedDate,
          downloadDate: rfp.downloadDate,
          score: rfp.score,
          recommendation: rfp.recommendation,
          fitScore: aiAnalysis?.fit_score || rfp.score,
          fitRating: aiAnalysis?.fit_rating || this.scoresToRating(aiAnalysis?.fit_score || rfp.score),
          reasoning: aiAnalysis?.reasoning,
          technologies: aiAnalysis?.technologies,
          opportunities: aiAnalysis?.opportunities,
          redFlags: aiAnalysis?.red_flags,
          budgetEstimate: aiAnalysis?.budget_estimate,
          projectType: aiAnalysis?.project_type,
          institutionType: aiAnalysis?.institution_type,
          analysisComplete: rfp.analysisComplete,
          detailUrl: `https://www.rfpmart.com/rfp/${rfp.id}` // Construct likely URL
        });
      }

      // Sort by score/fit score descending
      return dashboardRFPs.sort((a, b) => {
        const scoreA = a.fitScore || a.score || 0;
        const scoreB = b.fitScore || b.score || 0;
        return scoreB - scoreA;
      });

    } catch (error) {
      systemLogger.error('Failed to get RFP data for dashboard', {
        error: error instanceof Error ? error.message : String(error)
      });
      return [];
    }
  }

  private async getAIAnalysisForRFP(rfpId: string): Promise<any | null> {
    try {
      const analysis = await this.db.executeQuery(
        `SELECT * FROM ai_analysis WHERE rfp_id = ? ORDER BY created_at DESC LIMIT 1`,
        [rfpId]
      );

      return analysis || null;
    } catch (error) {
      return null;
    }
  }

  private async getStats(): Promise<DashboardStats> {
    try {
      // Use the existing getSummaryStats method
      const baseStats = await this.db.getSummaryStats();

      // Get additional statistics using direct queries (need more detailed breakdown)
      const detailedStatsQuery = `
        SELECT
          COUNT(*) as total_analyzed,
          AVG(COALESCE(a.fit_score, r.score, 0)) as avg_score,
          SUM(CASE WHEN COALESCE(a.fit_score, r.score, 0) >= 80 THEN 1 ELSE 0 END) as excellent_fit,
          SUM(CASE WHEN COALESCE(a.fit_score, r.score, 0) >= 60 AND COALESCE(a.fit_score, r.score, 0) < 80 THEN 1 ELSE 0 END) as good_fit,
          SUM(CASE WHEN COALESCE(a.fit_score, r.score, 0) >= 30 AND COALESCE(a.fit_score, r.score, 0) < 60 THEN 1 ELSE 0 END) as poor_fit,
          SUM(CASE WHEN COALESCE(a.fit_score, r.score, 0) < 30 THEN 1 ELSE 0 END) as rejected,
          SUM(CASE WHEN r.analysis_complete = 1 THEN 1 ELSE 0 END) as successful_analyses,
          SUM(CASE WHEN a.budget_estimate IS NOT NULL AND a.budget_estimate != '' THEN 1 ELSE 0 END) as total_with_budget,
          SUM(CASE WHEN LOWER(COALESCE(a.institution_type, r.institution, '')) LIKE '%university%'
                     OR LOWER(COALESCE(a.institution_type, r.institution, '')) LIKE '%college%'
                     OR LOWER(COALESCE(a.institution_type, r.institution, '')) LIKE '%school%' THEN 1 ELSE 0 END) as higher_ed_count
        FROM rfps r
        LEFT JOIN ai_analysis a ON r.id = a.rfp_id
      `;

      const detailedStats = await this.db.executeQuery(detailedStatsQuery);

      return {
        totalAnalyzed: detailedStats.total_analyzed || 0,
        excellentFit: detailedStats.excellent_fit || 0,
        goodFit: detailedStats.good_fit || 0,
        poorFit: detailedStats.poor_fit || 0,
        rejected: detailedStats.rejected || 0,
        averageScore: Math.round((detailedStats.avg_score || 0) * 10) / 10,
        successRate: detailedStats.total_analyzed > 0
          ? Math.round((detailedStats.successful_analyses / detailedStats.total_analyzed) * 100) + '%'
          : '0%',
        lastUpdated: new Date().toISOString(),
        totalWithBudget: detailedStats.total_with_budget || 0,
        higherEdCount: detailedStats.higher_ed_count || 0
      };

    } catch (error) {
      systemLogger.error('Failed to get dashboard stats', {
        error: error instanceof Error ? error.message : String(error)
      });

      return {
        totalAnalyzed: 0,
        excellentFit: 0,
        goodFit: 0,
        poorFit: 0,
        rejected: 0,
        averageScore: 0,
        successRate: '0%',
        lastUpdated: new Date().toISOString(),
        totalWithBudget: 0,
        higherEdCount: 0
      };
    }
  }

  private scoresToRating(score?: number): string {
    if (!score) return 'unknown';
    if (score >= 80) return 'excellent';
    if (score >= 60) return 'good';
    if (score >= 30) return 'poor';
    return 'rejected';
  }

  private generateHTML(rfpData: DashboardRFP[], stats: DashboardStats): string {
    // Read the base dashboard HTML
    const baseDashboardPath = path.join(__dirname, 'dashboard.html');
    let htmlTemplate: string;

    if (fs.existsSync(baseDashboardPath)) {
      htmlTemplate = fs.readFileSync(baseDashboardPath, 'utf-8');
    } else {
      // Fallback to inline template if the separate file doesn't exist
      htmlTemplate = this.getInlineHTMLTemplate();
    }

    // Embed the data
    const dataScript = `
    <script>
      // Embedded RFP data generated on ${new Date().toISOString()}
      window.rfpData = ${JSON.stringify(rfpData, null, 2)};
      window.dashboardStats = ${JSON.stringify(stats, null, 2)};

      // Initialize dashboard with embedded data
      document.addEventListener('DOMContentLoaded', function() {
        initializeDashboard(window.rfpData, window.dashboardStats);
      });
    </script>`;

    // Insert the data script before the closing body tag
    return htmlTemplate.replace('</body>', dataScript + '\n</body>');
  }

  private getInlineHTMLTemplate(): string {
    const reportDate = formatDate(new Date());

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>KWALL RFP Analysis Dashboard - ${reportDate}</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }

        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.6;
            color: #333;
            background: #f5f7fa;
        }

        .header {
            background: linear-gradient(135deg, #007cba 0%, #005a8b 100%);
            color: white;
            padding: 2rem 0;
            text-align: center;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }

        .header h1 { font-size: 2.5rem; margin-bottom: 0.5rem; }
        .header p { font-size: 1.1rem; opacity: 0.9; }

        .container { max-width: 1200px; margin: 0 auto; padding: 2rem; }

        .stats-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 1.5rem;
            margin-bottom: 2rem;
        }

        .stat-card {
            background: white;
            padding: 1.5rem;
            border-radius: 10px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            text-align: center;
            border-left: 4px solid #007cba;
        }

        .stat-card h3 { font-size: 2rem; color: #007cba; margin-bottom: 0.5rem; }
        .stat-card p { color: #666; font-weight: 500; }

        .section {
            background: white;
            margin-bottom: 2rem;
            border-radius: 10px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            overflow: hidden;
        }

        .section-header {
            background: #007cba;
            color: white;
            padding: 1rem 1.5rem;
            font-size: 1.2rem;
            font-weight: 600;
        }

        .section-content { padding: 1.5rem; }

        .rfp-grid { display: grid; gap: 1rem; }

        .rfp-card {
            border: 1px solid #e1e8ed;
            border-radius: 8px;
            padding: 1.5rem;
            transition: all 0.3s ease;
        }

        .rfp-card:hover { box-shadow: 0 4px 12px rgba(0,0,0,0.15); }

        .rfp-card.excellent { border-left: 4px solid #4caf50; background: #f8fff9; }
        .rfp-card.good { border-left: 4px solid #ff9800; background: #fff8f0; }
        .rfp-card.poor { border-left: 4px solid #f44336; background: #fff5f5; }
        .rfp-card.rejected { border-left: 4px solid #9e9e9e; background: #f9f9f9; }

        .rfp-title {
            font-size: 1.1rem;
            font-weight: 600;
            margin-bottom: 0.5rem;
            color: #333;
        }

        .rfp-meta {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
            gap: 0.5rem;
            margin: 0.5rem 0;
            font-size: 0.9rem;
            color: #666;
        }

        .fit-score {
            display: inline-block;
            padding: 0.3rem 0.8rem;
            border-radius: 20px;
            font-weight: bold;
            font-size: 0.9rem;
            margin-bottom: 0.5rem;
        }

        .fit-score.excellent { background: #4caf50; color: white; }
        .fit-score.good { background: #ff9800; color: white; }
        .fit-score.poor { background: #f44336; color: white; }
        .fit-score.rejected { background: #9e9e9e; color: white; }

        .rfp-summary {
            margin: 0.5rem 0;
            font-size: 0.95rem;
            line-height: 1.5;
        }

        .search-controls {
            background: white;
            padding: 1rem;
            border-radius: 8px;
            margin-bottom: 1rem;
            display: flex;
            gap: 1rem;
            flex-wrap: wrap;
            align-items: center;
        }

        .search-input {
            padding: 0.5rem;
            border: 1px solid #ddd;
            border-radius: 4px;
            font-size: 0.9rem;
            min-width: 200px;
        }

        .filter-select {
            padding: 0.5rem;
            border: 1px solid #ddd;
            border-radius: 4px;
            font-size: 0.9rem;
        }

        .btn {
            padding: 0.5rem 1rem;
            border: none;
            border-radius: 5px;
            font-size: 0.9rem;
            cursor: pointer;
            text-decoration: none;
            display: inline-block;
            transition: all 0.3s ease;
        }

        .btn-primary { background: #007cba; color: white; }
        .btn-primary:hover { background: #005a8b; }

        .loading { text-align: center; padding: 2rem; color: #666; }

        @media (max-width: 768px) {
            .container { padding: 1rem; }
            .stats-grid { grid-template-columns: repeat(2, 1fr); }
            .header h1 { font-size: 2rem; }
            .search-controls { flex-direction: column; align-items: stretch; }
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>KWALL RFP Analysis Dashboard</h1>
        <p>Daily RFP Analysis Results & Good Fit Opportunities - ${reportDate}</p>
    </div>

    <div class="container">
        <!-- Statistics Section -->
        <div class="stats-grid" id="statsGrid">
            <div class="stat-card">
                <h3 id="totalRFPs">-</h3>
                <p>Total RFPs Analyzed</p>
            </div>
            <div class="stat-card">
                <h3 id="excellentFit">-</h3>
                <p>Excellent Fit (80+)</p>
            </div>
            <div class="stat-card">
                <h3 id="goodFit">-</h3>
                <p>Good Fit (60-79)</p>
            </div>
            <div class="stat-card">
                <h3 id="avgScore">-</h3>
                <p>Average Score</p>
            </div>
        </div>

        <!-- Search and Filter Controls -->
        <div class="search-controls">
            <input type="text" id="searchInput" class="search-input" placeholder="Search RFPs by title, institution, or keywords...">
            <select id="scoreFilter" class="filter-select">
                <option value="">All Scores</option>
                <option value="excellent">Excellent (80+)</option>
                <option value="good">Good (60-79)</option>
                <option value="poor">Poor (30-59)</option>
                <option value="rejected">Rejected (<30)</option>
            </select>
            <select id="institutionFilter" class="filter-select">
                <option value="">All Institutions</option>
                <option value="university">Universities</option>
                <option value="college">Colleges</option>
                <option value="school">Schools</option>
            </select>
            <button id="exportBtn" class="btn btn-primary">Export to CSV</button>
        </div>

        <!-- Excellent Fit RFPs -->
        <div class="section">
            <div class="section-header">🎯 Excellent Fit RFPs (Highly Recommended)</div>
            <div class="section-content">
                <div class="rfp-grid" id="excellentRFPs">
                    <div class="loading">Loading excellent fit RFPs...</div>
                </div>
            </div>
        </div>

        <!-- Good Fit RFPs -->
        <div class="section">
            <div class="section-header">✅ Good Fit RFPs (Worth Pursuing)</div>
            <div class="section-content">
                <div class="rfp-grid" id="goodRFPs">
                    <div class="loading">Loading good fit RFPs...</div>
                </div>
            </div>
        </div>

        <!-- All RFPs -->
        <div class="section">
            <div class="section-header">📊 All RFPs (Searchable & Filterable)</div>
            <div class="section-content">
                <div class="rfp-grid" id="allRFPs">
                    <div class="loading">Loading all RFPs...</div>
                </div>
            </div>
        </div>
    </div>

    <script>
        let currentData = [];
        let filteredData = [];

        function initializeDashboard(rfpData, stats) {
            currentData = rfpData || [];
            filteredData = currentData;

            // Update statistics
            updateStats(stats);

            // Render sections
            renderRFPSections();

            // Set up event listeners
            setupEventListeners();

            console.log('Dashboard initialized with', currentData.length, 'RFPs');
        }

        function updateStats(stats) {
            if (!stats) return;

            document.getElementById('totalRFPs').textContent = stats.totalAnalyzed;
            document.getElementById('excellentFit').textContent = stats.excellentFit;
            document.getElementById('goodFit').textContent = stats.goodFit;
            document.getElementById('avgScore').textContent = stats.averageScore;
        }

        function renderRFPSections() {
            const excellent = filteredData.filter(r => r.fitRating === 'excellent');
            const good = filteredData.filter(r => r.fitRating === 'good');

            renderRFPSection('excellentRFPs', excellent);
            renderRFPSection('goodRFPs', good);
            renderRFPSection('allRFPs', filteredData);
        }

        function renderRFPSection(elementId, rfps) {
            const container = document.getElementById(elementId);

            if (rfps.length === 0) {
                container.innerHTML = '<p style="text-align: center; color: #666; padding: 1rem;">No RFPs match the current filters.</p>';
                return;
            }

            container.innerHTML = rfps.map(rfp => {
                const score = rfp.fitScore || rfp.score || 0;
                const rating = rfp.fitRating || 'unknown';

                return \`
                <div class="rfp-card \${rating}">
                    <div class="rfp-title">\${rfp.title}</div>
                    <div class="fit-score \${rating}">\${rating.toUpperCase()} FIT - \${score}/100</div>

                    <div class="rfp-meta">
                        <div><strong>Institution:</strong> \${rfp.institution || 'Not specified'}</div>
                        <div><strong>Type:</strong> \${rfp.institutionType || 'Unknown'}</div>
                        <div><strong>Budget:</strong> \${rfp.budgetEstimate || 'Not specified'}</div>
                        <div><strong>Due Date:</strong> \${rfp.dueDate ? new Date(rfp.dueDate).toLocaleDateString() : 'Not specified'}</div>
                    </div>

                    \${rfp.reasoning ? \`
                        <div class="rfp-summary">
                            <strong>Analysis:</strong> \${rfp.reasoning.substring(0, 200)}\${rfp.reasoning.length > 200 ? '...' : ''}
                        </div>
                    \` : ''}

                    \${rfp.opportunities ? \`
                        <div class="rfp-summary">
                            <strong>Key Opportunities:</strong> \${rfp.opportunities.split(',').slice(0, 3).join(', ')}
                        </div>
                    \` : ''}

                    \${rfp.redFlags ? \`
                        <div class="rfp-summary" style="color: #d32f2f;">
                            <strong>⚠️ Red Flags:</strong> \${rfp.redFlags}
                        </div>
                    \` : ''}
                </div>
                \`;
            }).join('');
        }

        function setupEventListeners() {
            // Search functionality
            document.getElementById('searchInput').addEventListener('input', handleSearch);
            document.getElementById('scoreFilter').addEventListener('change', handleFilters);
            document.getElementById('institutionFilter').addEventListener('change', handleFilters);
            document.getElementById('exportBtn').addEventListener('click', exportToCSV);
        }

        function handleSearch() {
            handleFilters();
        }

        function handleFilters() {
            const searchTerm = document.getElementById('searchInput').value.toLowerCase();
            const scoreFilter = document.getElementById('scoreFilter').value;
            const institutionFilter = document.getElementById('institutionFilter').value;

            filteredData = currentData.filter(rfp => {
                // Search filter
                if (searchTerm && !rfp.title.toLowerCase().includes(searchTerm) &&
                    !(rfp.institution && rfp.institution.toLowerCase().includes(searchTerm)) &&
                    !(rfp.reasoning && rfp.reasoning.toLowerCase().includes(searchTerm))) {
                    return false;
                }

                // Score filter
                if (scoreFilter && rfp.fitRating !== scoreFilter) {
                    return false;
                }

                // Institution filter
                if (institutionFilter) {
                    const instType = (rfp.institutionType || rfp.institution || '').toLowerCase();
                    if (!instType.includes(institutionFilter)) {
                        return false;
                    }
                }

                return true;
            });

            renderRFPSections();
        }

        function exportToCSV() {
            const headers = ['Title', 'Institution', 'Score', 'Rating', 'Budget', 'Due Date', 'Analysis'];
            const csvContent = [
                headers.join(','),
                ...filteredData.map(rfp => [
                    \`"\${rfp.title}"\`,
                    \`"\${rfp.institution || ''}"\`,
                    rfp.fitScore || rfp.score || 0,
                    rfp.fitRating || '',
                    \`"\${rfp.budgetEstimate || ''}"\`,
                    \`"\${rfp.dueDate || ''}"\`,
                    \`"\${(rfp.reasoning || '').replace(/"/g, '""')}"\`
                ].join(','))
            ].join('\\n');

            const blob = new Blob([csvContent], { type: 'text/csv' });
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = \`rfp-analysis-\${new Date().toISOString().split('T')[0]}.csv\`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);
        }

        // Fallback for when no data is embedded
        document.addEventListener('DOMContentLoaded', function() {
            if (typeof window.rfpData === 'undefined') {
                console.log('No embedded data found, using fallback');
                initializeDashboard([], {
                    totalAnalyzed: 0,
                    excellentFit: 0,
                    goodFit: 0,
                    averageScore: 0
                });
            }
        });
    </script>
</body>
</html>`;
  }
}

// CLI interface for running the generator
export async function generateStaticDashboard(): Promise<void> {
  const generator = new StaticDashboardGenerator();
  try {
    const outputPath = await generator.generateDashboard();
    console.log(`✅ Static dashboard generated successfully: ${outputPath}`);
  } catch (error) {
    console.error(`❌ Failed to generate dashboard: ${error instanceof Error ? error.message : error}`);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  generateStaticDashboard();
}