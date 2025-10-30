import sqlite3 from 'sqlite3';
import { Database, open } from 'sqlite';
import * as path from 'path';
import fs from 'fs-extra';
import { config } from '../config/environment';
import { DATABASE } from '../config/constants';
import { databaseLogger } from '../utils/logger';
import { RFPListing } from '../scrapers/rfpMartScraper';
import { RFPAnalysisResult } from '../analyzers/rfpAnalyzer';
import { AIAnalysisResult } from '../services/aiAnalyzer';

export interface RFPRunRecord {
  id?: number;
  runDate: string;
  rfpsFound: number;
  rfpsDownloaded: number;
  rfpsAnalyzed: number;
  highScoreCount: number;
  createdAt?: string;
}

export interface RFPRecord {
  id: string;
  title: string;
  dueDate?: string;
  postedDate?: string;
  downloadDate?: string;
  filePath?: string;
  institution?: string;
  score?: number;
  recommendation?: string;
  analysisComplete: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface AnalysisRecord {
  id?: number;
  rfpId: string;
  analysisType: string;
  score: number;
  details?: string;
  createdAt?: string;
}

export class DatabaseManager {
  private db?: Database;
  private dbPath: string;

  constructor() {
    this.dbPath = config.storage.databasePath;
  }

  /**
   * Initialize database connection and create tables
   */
  async initialize(): Promise<void> {
    try {
      databaseLogger.info('Initializing database connection');

      // Ensure database directory exists
      await fs.ensureDir(path.dirname(this.dbPath));

      // Open database connection
      this.db = await open({
        filename: this.dbPath,
        driver: sqlite3.Database,
      });

      // Enable foreign key constraints
      await this.db.exec('PRAGMA foreign_keys = ON');

      // Create tables
      await this.createTables();

      databaseLogger.info('Database initialized successfully', { dbPath: this.dbPath });

    } catch (error) {
      databaseLogger.error('Failed to initialize database', { 
        error: error instanceof Error ? error.message : String(error),
        dbPath: this.dbPath,
      });
      throw error;
    }
  }

  /**
   * Create database tables
   */
  private async createTables(): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    try {
      // Create RFP runs table
      await this.db.exec(DATABASE.SCHEMA.RFP_RUNS);
      
      // Create RFPs table
      await this.db.exec(DATABASE.SCHEMA.RFPS);
      
      // Create analysis results table
      await this.db.exec(DATABASE.SCHEMA.ANALYSIS_RESULTS);
      
      // Create AI analysis table
      await this.db.exec(DATABASE.SCHEMA.AI_ANALYSIS);

      databaseLogger.debug('Database tables created successfully');

    } catch (error) {
      databaseLogger.error('Failed to create database tables', { 
        error: error instanceof Error ? error.message : String(error) 
      });
      throw error;
    }
  }

  /**
   * Record a new RFP run
   */
  async recordRFPRun(runData: Omit<RFPRunRecord, 'id' | 'createdAt'>): Promise<number> {
    if (!this.db) throw new Error('Database not initialized');

    try {
      const result = await this.db.run(
        `INSERT INTO ${DATABASE.TABLES.RFP_RUNS} 
         (run_date, rfps_found, rfps_downloaded, rfps_analyzed, high_score_count)
         VALUES (?, ?, ?, ?, ?)`,
        [runData.runDate, runData.rfpsFound, runData.rfpsDownloaded, runData.rfpsAnalyzed, runData.highScoreCount]
      );

      const runId = result.lastID;
      databaseLogger.info('RFP run recorded', { runId, ...runData });
      return runId!;

    } catch (error) {
      databaseLogger.error('Failed to record RFP run', { 
        error: error instanceof Error ? error.message : String(error),
        runData,
      });
      throw error;
    }
  }

  /**
   * Save RFP listing to database
   */
  async saveRFP(rfp: RFPListing, filePath?: string): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    try {
      const record: RFPRecord = {
        id: rfp.id,
        title: rfp.title,
        dueDate: rfp.dueDate,
        postedDate: rfp.postedDate,
        downloadDate: new Date().toISOString(),
        filePath,
        institution: rfp.institution,
        analysisComplete: false,
      };

      await this.db.run(
        `INSERT OR REPLACE INTO ${DATABASE.TABLES.RFPS}
         (id, title, due_date, posted_date, download_date, file_path, institution, analysis_complete)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [record.id, record.title, record.dueDate, record.postedDate, record.downloadDate, record.filePath, record.institution, record.analysisComplete]
      );

      databaseLogger.debug('RFP saved to database', { rfpId: rfp.id });

    } catch (error) {
      databaseLogger.error('Failed to save RFP', { 
        error: error instanceof Error ? error.message : String(error),
        rfpId: rfp.id,
      });
      throw error;
    }
  }

  /**
   * Update RFP with analysis results
   */
  async updateRFPAnalysis(rfpId: string, analysis: RFPAnalysisResult): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    try {
      // Update main RFP record
      await this.db.run(
        `UPDATE ${DATABASE.TABLES.RFPS}
         SET score = ?, recommendation = ?, institution = ?, analysis_complete = ?, updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [
          analysis.fitAnalysis.totalScore,
          analysis.fitAnalysis.recommendation,
          analysis.institutionAnalysis.institutionName || analysis.extractedInfo.institutionName,
          analysis.processingSuccessful,
          rfpId,
        ]
      );

      // Save detailed analysis results
      const analysisRecords: AnalysisRecord[] = [
        {
          rfpId,
          analysisType: 'institution',
          score: analysis.institutionAnalysis.isHigherEducation ? 30 : 0,
          details: JSON.stringify({
            isHigherEducation: analysis.institutionAnalysis.isHigherEducation,
            institutionType: analysis.institutionAnalysis.institutionType,
            confidence: analysis.institutionAnalysis.confidence,
          }),
        },
        {
          rfpId,
          analysisType: 'budget',
          score: analysis.budgetAnalysis.score || 0,
          details: JSON.stringify({
            budgetFound: analysis.budgetAnalysis.budgetFound,
            highestAmount: analysis.budgetAnalysis.highestAmount,
            inRange: analysis.budgetAnalysis.inRange,
          }),
        },
        {
          rfpId,
          analysisType: 'technology',
          score: analysis.technologyAnalysis.preferredCMS.found ? 20 : (analysis.technologyAnalysis.acceptableCMS.found ? 10 : 0),
          details: JSON.stringify({
            preferredCMS: analysis.technologyAnalysis.preferredCMS.matches,
            acceptableCMS: analysis.technologyAnalysis.acceptableCMS.matches,
            projectTypes: analysis.technologyAnalysis.projectTypes.matches,
          }),
        },
        {
          rfpId,
          analysisType: 'overall',
          score: analysis.fitAnalysis.totalScore,
          details: JSON.stringify({
            percentage: analysis.fitAnalysis.percentage,
            recommendation: analysis.fitAnalysis.recommendation,
            keyFindings: analysis.fitAnalysis.keyFindings,
            redFlags: analysis.fitAnalysis.redFlags,
          }),
        },
      ];

      // Insert analysis records
      for (const record of analysisRecords) {
        await this.db.run(
          `INSERT INTO ${DATABASE.TABLES.ANALYSIS_RESULTS}
           (rfp_id, analysis_type, score, details)
           VALUES (?, ?, ?, ?)`,
          [record.rfpId, record.analysisType, record.score, record.details]
        );
      }

      databaseLogger.info('RFP analysis updated in database', { 
        rfpId,
        score: analysis.fitAnalysis.totalScore,
        recommendation: analysis.fitAnalysis.recommendation,
      });

    } catch (error) {
      databaseLogger.error('Failed to update RFP analysis', { 
        error: error instanceof Error ? error.message : String(error),
        rfpId,
      });
      throw error;
    }
  }

  /**
   * Get RFPs by criteria
   */
  async getRFPs(criteria: {
    recommendation?: string;
    minScore?: number;
    higherEdOnly?: boolean;
    limit?: number;
    orderBy?: 'score' | 'created_at' | 'due_date';
    orderDirection?: 'ASC' | 'DESC';
  } = {}): Promise<RFPRecord[]> {
    if (!this.db) throw new Error('Database not initialized');

    try {
      let query = `SELECT * FROM ${DATABASE.TABLES.RFPS} WHERE 1=1`;
      const params: any[] = [];

      if (criteria.recommendation) {
        query += ' AND recommendation = ?';
        params.push(criteria.recommendation);
      }

      if (criteria.minScore !== undefined) {
        query += ' AND score >= ?';
        params.push(criteria.minScore);
      }

      if (criteria.higherEdOnly) {
        query += ' AND institution IS NOT NULL';
      }

      // Add ordering
      const orderBy = criteria.orderBy || 'created_at';
      const orderDirection = criteria.orderDirection || 'DESC';
      query += ` ORDER BY ${orderBy} ${orderDirection}`;

      // Add limit
      if (criteria.limit) {
        query += ' LIMIT ?';
        params.push(criteria.limit);
      }

      const rfps = await this.db.all(query, params);
      
      databaseLogger.debug('Retrieved RFPs from database', { 
        count: rfps.length,
        criteria,
      });

      return rfps;

    } catch (error) {
      databaseLogger.error('Failed to retrieve RFPs', { 
        error: error instanceof Error ? error.message : String(error),
        criteria,
      });
      return [];
    }
  }

  /**
   * Get RFP runs history
   */
  async getRFPRuns(limit: number = 10): Promise<RFPRunRecord[]> {
    if (!this.db) throw new Error('Database not initialized');

    try {
      const runs = await this.db.all(
        `SELECT * FROM ${DATABASE.TABLES.RFP_RUNS} 
         ORDER BY created_at DESC 
         LIMIT ?`,
        [limit]
      );

      return runs;

    } catch (error) {
      databaseLogger.error('Failed to retrieve RFP runs', { 
        error: error instanceof Error ? error.message : String(error) 
      });
      return [];
    }
  }

  /**
   * Get last run date
   */
  async getLastRunDate(): Promise<Date | null> {
    if (!this.db) throw new Error('Database not initialized');

    try {
      const lastRun = await this.db.get(
        `SELECT run_date FROM ${DATABASE.TABLES.RFP_RUNS} 
         ORDER BY created_at DESC 
         LIMIT 1`
      );

      return lastRun ? new Date(lastRun.run_date) : null;

    } catch (error) {
      databaseLogger.error('Failed to get last run date', { 
        error: error instanceof Error ? error.message : String(error) 
      });
      return null;
    }
  }

  /**
   * Get analysis results for an RFP
   */
  async getAnalysisResults(rfpId: string): Promise<AnalysisRecord[]> {
    if (!this.db) throw new Error('Database not initialized');

    try {
      const results = await this.db.all(
        `SELECT * FROM ${DATABASE.TABLES.ANALYSIS_RESULTS} 
         WHERE rfp_id = ? 
         ORDER BY created_at DESC`,
        [rfpId]
      );

      return results;

    } catch (error) {
      databaseLogger.error('Failed to get analysis results', { 
        error: error instanceof Error ? error.message : String(error),
        rfpId,
      });
      return [];
    }
  }

  /**
   * Get summary statistics
   */
  async getSummaryStats(): Promise<{
    totalRFPs: number;
    analyzedRFPs: number;
    highScoreRFPs: number;
    mediumScoreRFPs: number;
    higherEdRFPs: number;
    avgScore: number;
    lastRunDate?: string;
  }> {
    if (!this.db) throw new Error('Database not initialized');

    try {
      const stats = await this.db.get(`
        SELECT 
          COUNT(*) as totalRFPs,
          COUNT(CASE WHEN analysis_complete = 1 THEN 1 END) as analyzedRFPs,
          COUNT(CASE WHEN recommendation = 'HIGH' THEN 1 END) as highScoreRFPs,
          COUNT(CASE WHEN recommendation = 'MEDIUM' THEN 1 END) as mediumScoreRFPs,
          COUNT(CASE WHEN institution IS NOT NULL THEN 1 END) as higherEdRFPs,
          ROUND(AVG(CASE WHEN score IS NOT NULL THEN score END), 1) as avgScore
        FROM ${DATABASE.TABLES.RFPS}
      `);

      const lastRun = await this.db.get(
        `SELECT run_date FROM ${DATABASE.TABLES.RFP_RUNS} 
         ORDER BY created_at DESC 
         LIMIT 1`
      );

      return {
        ...stats,
        lastRunDate: lastRun?.run_date,
      };

    } catch (error) {
      databaseLogger.error('Failed to get summary stats', { 
        error: error instanceof Error ? error.message : String(error) 
      });
      return {
        totalRFPs: 0,
        analyzedRFPs: 0,
        highScoreRFPs: 0,
        mediumScoreRFPs: 0,
        higherEdRFPs: 0,
        avgScore: 0,
      };
    }
  }

  /**
   * Save AI analysis results to database
   */
  async saveAIAnalysis(rfpId: string, analysis: AIAnalysisResult, provider: string, model: string): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    try {
      await this.db.run(
        `INSERT OR REPLACE INTO ${DATABASE.TABLES.AI_ANALYSIS}
         (rfp_id, fit_score, fit_rating, reasoning, key_requirements, budget_estimate, 
          technologies, institution_type, project_type, red_flags, opportunities, 
          recommendation, confidence, ai_provider, ai_model, analysis_date)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          rfpId,
          analysis.fitScore,
          analysis.fitRating,
          analysis.reasoning,
          JSON.stringify(analysis.keyRequirements),
          analysis.budgetEstimate,
          JSON.stringify(analysis.technologies),
          analysis.institutionType,
          analysis.projectType,
          JSON.stringify(analysis.redFlags),
          JSON.stringify(analysis.opportunities),
          analysis.recommendation,
          analysis.confidence,
          provider,
          model,
          new Date().toISOString()
        ]
      );

      databaseLogger.info('AI analysis saved to database', { 
        rfpId,
        fitScore: analysis.fitScore,
        fitRating: analysis.fitRating
      });

    } catch (error) {
      databaseLogger.error('Failed to save AI analysis', { 
        error: error instanceof Error ? error.message : String(error),
        rfpId
      });
      throw error;
    }
  }

  /**
   * Get AI analysis results for an RFP
   */
  async getAIAnalysis(rfpId: string): Promise<AIAnalysisResult | null> {
    if (!this.db) throw new Error('Database not initialized');

    try {
      const result = await this.db.get(
        `SELECT * FROM ${DATABASE.TABLES.AI_ANALYSIS} 
         WHERE rfp_id = ? 
         ORDER BY created_at DESC 
         LIMIT 1`,
        [rfpId]
      );

      if (!result) return null;

      return {
        rfpId: result.rfp_id,
        fitScore: result.fit_score,
        fitRating: result.fit_rating,
        reasoning: result.reasoning,
        keyRequirements: JSON.parse(result.key_requirements || '[]'),
        budgetEstimate: result.budget_estimate,
        technologies: JSON.parse(result.technologies || '[]'),
        institutionType: result.institution_type,
        projectType: result.project_type,
        redFlags: JSON.parse(result.red_flags || '[]'),
        opportunities: JSON.parse(result.opportunities || '[]'),
        recommendation: result.recommendation,
        confidence: result.confidence
      };

    } catch (error) {
      databaseLogger.error('Failed to get AI analysis', { 
        error: error instanceof Error ? error.message : String(error),
        rfpId
      });
      return null;
    }
  }

  /**
   * Get all AI analysis results with pagination
   */
  async getAllAIAnalysis(options: {
    fitRating?: string;
    minScore?: number;
    limit?: number;
    offset?: number;
    orderBy?: 'fit_score' | 'analysis_date' | 'rfp_id';
    orderDirection?: 'ASC' | 'DESC';
  } = {}): Promise<Array<AIAnalysisResult & { analysisDate: string }>> {
    if (!this.db) throw new Error('Database not initialized');

    try {
      let query = `SELECT * FROM ${DATABASE.TABLES.AI_ANALYSIS} WHERE 1=1`;
      const params: any[] = [];

      if (options.fitRating) {
        query += ' AND fit_rating = ?';
        params.push(options.fitRating);
      }

      if (options.minScore !== undefined) {
        query += ' AND fit_score >= ?';
        params.push(options.minScore);
      }

      // Add ordering
      const orderBy = options.orderBy || 'analysis_date';
      const orderDirection = options.orderDirection || 'DESC';
      query += ` ORDER BY ${orderBy} ${orderDirection}`;

      // Add pagination
      if (options.limit) {
        query += ' LIMIT ?';
        params.push(options.limit);
      }

      if (options.offset) {
        query += ' OFFSET ?';
        params.push(options.offset);
      }

      const results = await this.db.all(query, params);

      return results.map(result => ({
        rfpId: result.rfp_id,
        fitScore: result.fit_score,
        fitRating: result.fit_rating,
        reasoning: result.reasoning,
        keyRequirements: JSON.parse(result.key_requirements || '[]'),
        budgetEstimate: result.budget_estimate,
        technologies: JSON.parse(result.technologies || '[]'),
        institutionType: result.institution_type,
        projectType: result.project_type,
        redFlags: JSON.parse(result.red_flags || '[]'),
        opportunities: JSON.parse(result.opportunities || '[]'),
        recommendation: result.recommendation,
        confidence: result.confidence,
        analysisDate: result.analysis_date
      }));

    } catch (error) {
      databaseLogger.error('Failed to get all AI analyses', { 
        error: error instanceof Error ? error.message : String(error)
      });
      return [];
    }
  }

  /**
   * Get AI analysis statistics
   */
  async getAIAnalysisStats(): Promise<{
    totalAnalyzed: number;
    excellentFit: number;
    goodFit: number;
    poorFit: number;
    rejected: number;
    averageScore: number;
    averageConfidence: number;
  }> {
    if (!this.db) throw new Error('Database not initialized');

    try {
      const stats = await this.db.get(`
        SELECT 
          COUNT(*) as totalAnalyzed,
          COUNT(CASE WHEN fit_rating = 'excellent' THEN 1 END) as excellentFit,
          COUNT(CASE WHEN fit_rating = 'good' THEN 1 END) as goodFit,
          COUNT(CASE WHEN fit_rating = 'poor' THEN 1 END) as poorFit,
          COUNT(CASE WHEN fit_rating = 'rejected' THEN 1 END) as rejected,
          ROUND(AVG(fit_score), 1) as averageScore,
          ROUND(AVG(confidence), 1) as averageConfidence
        FROM ${DATABASE.TABLES.AI_ANALYSIS}
      `);

      return stats || {
        totalAnalyzed: 0,
        excellentFit: 0,
        goodFit: 0,
        poorFit: 0,
        rejected: 0,
        averageScore: 0,
        averageConfidence: 0
      };

    } catch (error) {
      databaseLogger.error('Failed to get AI analysis stats', { 
        error: error instanceof Error ? error.message : String(error)
      });
      return {
        totalAnalyzed: 0,
        excellentFit: 0,
        goodFit: 0,
        poorFit: 0,
        rejected: 0,
        averageScore: 0,
        averageConfidence: 0
      };
    }
  }

  /**
   * Close database connection
   */
  async close(): Promise<void> {
    if (this.db) {
      await this.db.close();
      this.db = undefined;
      databaseLogger.info('Database connection closed');
    }
  }
}