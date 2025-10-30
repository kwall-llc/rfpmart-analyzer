import fs from 'fs-extra';
import * as path from 'path';
import { config } from '../config/environment';
import { systemLogger } from '../utils/logger';
import { DatabaseManager } from './database';

export interface PersistenceResult {
  success: boolean;
  message: string;
  error?: string;
}

export interface DataStateInfo {
  lastModified: string;
  recordCount: number;
  fileSize: number;
  checksum?: string;
}

export class DataPersistenceManager {
  private dataDir: string;
  private databasePath: string;
  private persistenceBranch = 'data-store';
  private persistenceDir = './data-store';

  constructor() {
    this.dataDir = config.storage.dataDirectory;
    this.databasePath = config.storage.databasePath;
  }

  /**
   * Initialize persistence manager and ensure branch/directory exists
   */
  async initialize(): Promise<void> {
    try {
      systemLogger.info('Initializing data persistence manager');
      
      // Ensure local directories exist
      await fs.ensureDir(this.dataDir);
      await fs.ensureDir(this.persistenceDir);
      
      systemLogger.info('Data persistence manager initialized');
    } catch (error) {
      systemLogger.error('Failed to initialize data persistence manager', { 
        error: error instanceof Error ? error.message : String(error) 
      });
      throw error;
    }
  }

  /**
   * Check if persistent data exists and get its state
   */
  async checkPersistentDataState(): Promise<DataStateInfo | null> {
    try {
      const persistentDbPath = path.join(this.persistenceDir, 'database.sqlite');
      
      if (!await fs.pathExists(persistentDbPath)) {
        systemLogger.info('No persistent database found');
        return null;
      }

      const stats = await fs.stat(persistentDbPath);
      
      // Try to get record count from database
      let recordCount = 0;
      try {
        const db = new DatabaseManager();
        db.dbPath = persistentDbPath; // Temporarily set path
        await db.initialize();
        recordCount = await this.getRecordCount(db);
        await db.close();
      } catch (dbError) {
        systemLogger.warn('Could not read record count from persistent database', {
          error: dbError instanceof Error ? dbError.message : String(dbError)
        });
      }

      const stateInfo: DataStateInfo = {
        lastModified: stats.mtime.toISOString(),
        recordCount,
        fileSize: stats.size
      };

      systemLogger.info('Found persistent database state', stateInfo);
      return stateInfo;

    } catch (error) {
      systemLogger.error('Failed to check persistent data state', { 
        error: error instanceof Error ? error.message : String(error) 
      });
      return null;
    }
  }

  /**
   * Download persistent database from repository storage
   */
  async downloadPersistentData(): Promise<PersistenceResult> {
    try {
      systemLogger.info('Downloading persistent database from repository storage');
      
      const persistentDbPath = path.join(this.persistenceDir, 'database.sqlite');
      
      if (!await fs.pathExists(persistentDbPath)) {
        return {
          success: false,
          message: 'No persistent database found to download'
        };
      }

      // Copy the persistent database to the working location
      await fs.copy(persistentDbPath, this.databasePath);
      
      const state = await this.checkPersistentDataState();
      
      systemLogger.info('Successfully downloaded persistent database', {
        records: state?.recordCount || 0,
        size: state?.fileSize || 0
      });

      return {
        success: true,
        message: `Downloaded database with ${state?.recordCount || 0} records`
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      systemLogger.error('Failed to download persistent data', { error: errorMessage });
      
      return {
        success: false,
        message: 'Failed to download persistent database',
        error: errorMessage
      };
    }
  }

  /**
   * Upload current database to repository storage
   */
  async uploadPersistentData(): Promise<PersistenceResult> {
    try {
      systemLogger.info('Uploading database to repository storage');
      
      if (!await fs.pathExists(this.databasePath)) {
        return {
          success: false,
          message: 'No database found to upload'
        };
      }

      // Ensure persistence directory exists
      await fs.ensureDir(this.persistenceDir);
      
      // Copy current database to persistence location
      const persistentDbPath = path.join(this.persistenceDir, 'database.sqlite');
      await fs.copy(this.databasePath, persistentDbPath);
      
      // Get current record count
      const db = new DatabaseManager();
      await db.initialize();
      const recordCount = await this.getRecordCount(db);
      await db.close();
      
      const stats = await fs.stat(persistentDbPath);
      
      systemLogger.info('Successfully uploaded database to persistence storage', {
        records: recordCount,
        size: stats.size,
        path: persistentDbPath
      });

      return {
        success: true,
        message: `Uploaded database with ${recordCount} records (${Math.round(stats.size / 1024)}KB)`
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      systemLogger.error('Failed to upload persistent data', { error: errorMessage });
      
      return {
        success: false,
        message: 'Failed to upload database to persistence storage',
        error: errorMessage
      };
    }
  }

  /**
   * Merge data from persistent database with current database
   */
  async mergePersistentData(): Promise<PersistenceResult> {
    try {
      systemLogger.info('Merging persistent data with current database');
      
      const persistentDbPath = path.join(this.persistenceDir, 'database.sqlite');
      
      if (!await fs.pathExists(persistentDbPath)) {
        return {
          success: true,
          message: 'No persistent database to merge - starting fresh'
        };
      }

      // Initialize current database
      const currentDb = new DatabaseManager();
      await currentDb.initialize();
      
      // Initialize persistent database reader
      const persistentDb = new DatabaseManager();
      persistentDb.dbPath = persistentDbPath;
      await persistentDb.initialize();
      
      // Merge RFP records (avoid duplicates)
      const persistentRfps = await persistentDb.getAllRFPs();
      let mergedCount = 0;
      
      for (const rfp of persistentRfps) {
        const existing = await currentDb.getRFP(rfp.id);
        if (!existing) {
          await currentDb.addRFP(rfp);
          mergedCount++;
        } else {
          // Update if persistent has more recent data
          if (rfp.updatedAt && (!existing.updatedAt || rfp.updatedAt > existing.updatedAt)) {
            await currentDb.updateRFP(rfp.id, rfp);
            mergedCount++;
          }
        }
      }
      
      // Merge analysis records
      const persistentAnalyses = await persistentDb.getAllAnalyses();
      let analysisCount = 0;
      
      for (const analysis of persistentAnalyses) {
        const existing = await currentDb.getAnalysis(analysis.rfpId, analysis.analysisType);
        if (!existing) {
          await currentDb.addAnalysis(analysis);
          analysisCount++;
        }
      }
      
      await persistentDb.close();
      await currentDb.close();
      
      systemLogger.info('Successfully merged persistent data', {
        mergedRfps: mergedCount,
        mergedAnalyses: analysisCount
      });

      return {
        success: true,
        message: `Merged ${mergedCount} RFPs and ${analysisCount} analyses from persistent storage`
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      systemLogger.error('Failed to merge persistent data', { error: errorMessage });
      
      return {
        success: false,
        message: 'Failed to merge persistent data',
        error: errorMessage
      };
    }
  }

  /**
   * Create a backup of current database with timestamp
   */
  async createBackup(): Promise<PersistenceResult> {
    try {
      if (!await fs.pathExists(this.databasePath)) {
        return {
          success: false,
          message: 'No database found to backup'
        };
      }

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupPath = path.join(this.persistenceDir, `database-backup-${timestamp}.sqlite`);
      
      await fs.copy(this.databasePath, backupPath);
      
      const stats = await fs.stat(backupPath);
      
      systemLogger.info('Created database backup', {
        path: backupPath,
        size: stats.size
      });

      return {
        success: true,
        message: `Created backup: ${path.basename(backupPath)}`
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      systemLogger.error('Failed to create backup', { error: errorMessage });
      
      return {
        success: false,
        message: 'Failed to create database backup',
        error: errorMessage
      };
    }
  }

  /**
   * Clean up old backups (keep only recent ones)
   */
  async cleanupOldBackups(keepCount: number = 5): Promise<PersistenceResult> {
    try {
      const files = await fs.readdir(this.persistenceDir);
      const backupFiles = files
        .filter(f => f.startsWith('database-backup-') && f.endsWith('.sqlite'))
        .map(f => ({
          name: f,
          path: path.join(this.persistenceDir, f),
          stat: fs.statSync(path.join(this.persistenceDir, f))
        }))
        .sort((a, b) => b.stat.mtime.getTime() - a.stat.mtime.getTime());

      if (backupFiles.length <= keepCount) {
        return {
          success: true,
          message: `No cleanup needed - ${backupFiles.length} backups (keeping ${keepCount})`
        };
      }

      const toDelete = backupFiles.slice(keepCount);
      let deletedCount = 0;

      for (const backup of toDelete) {
        await fs.remove(backup.path);
        deletedCount++;
      }

      systemLogger.info('Cleaned up old backups', {
        deleted: deletedCount,
        remaining: keepCount
      });

      return {
        success: true,
        message: `Cleaned up ${deletedCount} old backups, kept ${keepCount} recent ones`
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      systemLogger.error('Failed to cleanup old backups', { error: errorMessage });
      
      return {
        success: false,
        message: 'Failed to cleanup old backups',
        error: errorMessage
      };
    }
  }

  /**
   * Get total record count from database
   */
  private async getRecordCount(db: DatabaseManager): Promise<number> {
    try {
      const rfps = await db.getAllRFPs();
      return rfps.length;
    } catch (error) {
      systemLogger.warn('Could not get record count', { 
        error: error instanceof Error ? error.message : String(error) 
      });
      return 0;
    }
  }
}