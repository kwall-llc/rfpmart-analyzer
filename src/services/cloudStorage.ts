import { S3Client, PutObjectCommand, GetObjectCommand, HeadObjectCommand, ListObjectsV2Command } from '@aws-sdk/client-s3';
import { analyzerLogger } from '../utils/logger';
import fs from 'fs-extra';
import path from 'path';
import { Readable } from 'stream';
import { config } from '../config/environment';

export interface CloudStorageConfig {
  provider: 'aws' | 'gcp' | 'azure' | 'github';
  bucket: string;
  region?: string;
  accessKeyId?: string;
  secretAccessKey?: string;
  endpoint?: string;
}

export interface StorageItem {
  key: string;
  size: number;
  lastModified: Date;
  etag: string;
}

export class CloudStorageManager {
  private s3Client?: S3Client;
  private config: CloudStorageConfig;

  constructor(storageConfig?: CloudStorageConfig) {
    this.config = storageConfig || this.getConfigFromEnv();
    
    if (this.config.provider === 'aws') {
      this.initializeS3Client();
    }
  }

  private getConfigFromEnv(): CloudStorageConfig {
    return {
      provider: (process.env.CLOUD_STORAGE_PROVIDER as 'aws' | 'gcp' | 'azure' | 'github') || 'github',
      bucket: process.env.CLOUD_STORAGE_BUCKET || 'rfp-analyzer-data',
      region: process.env.CLOUD_STORAGE_REGION || 'us-east-1',
      accessKeyId: process.env.CLOUD_STORAGE_ACCESS_KEY,
      secretAccessKey: process.env.CLOUD_STORAGE_SECRET_KEY,
      endpoint: process.env.CLOUD_STORAGE_ENDPOINT
    };
  }

  private initializeS3Client(): void {
    if (!this.config.accessKeyId || !this.config.secretAccessKey) {
      analyzerLogger.warn('Cloud storage credentials not provided, using local storage only');
      return;
    }

    this.s3Client = new S3Client({
      region: this.config.region,
      credentials: {
        accessKeyId: this.config.accessKeyId,
        secretAccessKey: this.config.secretAccessKey
      },
      ...(this.config.endpoint && { endpoint: this.config.endpoint })
    });

    analyzerLogger.info('Cloud storage initialized', { 
      provider: this.config.provider, 
      bucket: this.config.bucket 
    });
  }

  /**
   * Upload file to cloud storage
   */
  async uploadFile(localPath: string, cloudKey: string, metadata?: Record<string, string>): Promise<void> {
    if (!this.s3Client) {
      analyzerLogger.warn('Cloud storage not available, skipping upload', { localPath, cloudKey });
      return;
    }

    try {
      const fileContent = await fs.readFile(localPath);
      const stats = await fs.stat(localPath);

      const command = new PutObjectCommand({
        Bucket: this.config.bucket,
        Key: cloudKey,
        Body: fileContent,
        ContentType: this.getContentType(localPath),
        Metadata: {
          originalPath: localPath,
          uploadDate: new Date().toISOString(),
          fileSize: stats.size.toString(),
          ...metadata
        }
      });

      await this.s3Client.send(command);
      analyzerLogger.info('File uploaded to cloud storage', { localPath, cloudKey, size: stats.size });

    } catch (error) {
      analyzerLogger.error('Failed to upload file to cloud storage', {
        localPath,
        cloudKey,
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  /**
   * Download file from cloud storage
   */
  async downloadFile(cloudKey: string, localPath: string): Promise<void> {
    if (!this.s3Client) {
      analyzerLogger.warn('Cloud storage not available, skipping download', { cloudKey, localPath });
      return;
    }

    try {
      const command = new GetObjectCommand({
        Bucket: this.config.bucket,
        Key: cloudKey
      });

      const response = await this.s3Client.send(command);
      
      if (response.Body) {
        await fs.ensureDir(path.dirname(localPath));
        
        if (response.Body instanceof Readable) {
          const writeStream = fs.createWriteStream(localPath);
          response.Body.pipe(writeStream);
          
          await new Promise((resolve, reject) => {
            writeStream.on('finish', resolve);
            writeStream.on('error', reject);
          });
        } else {
          const buffer = Buffer.from(await response.Body.transformToByteArray());
          await fs.writeFile(localPath, buffer);
        }

        analyzerLogger.info('File downloaded from cloud storage', { cloudKey, localPath });
      }

    } catch (error) {
      analyzerLogger.error('Failed to download file from cloud storage', {
        cloudKey,
        localPath,
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  /**
   * Check if file exists in cloud storage
   */
  async fileExists(cloudKey: string): Promise<boolean> {
    if (!this.s3Client) {
      return false;
    }

    try {
      const command = new HeadObjectCommand({
        Bucket: this.config.bucket,
        Key: cloudKey
      });

      await this.s3Client.send(command);
      return true;

    } catch (error) {
      return false;
    }
  }

  /**
   * List files in cloud storage with prefix
   */
  async listFiles(prefix: string): Promise<StorageItem[]> {
    if (!this.s3Client) {
      return [];
    }

    try {
      const command = new ListObjectsV2Command({
        Bucket: this.config.bucket,
        Prefix: prefix,
        MaxKeys: 1000
      });

      const response = await this.s3Client.send(command);
      
      return (response.Contents || []).map(item => ({
        key: item.Key || '',
        size: item.Size || 0,
        lastModified: item.LastModified || new Date(),
        etag: item.ETag || ''
      }));

    } catch (error) {
      analyzerLogger.error('Failed to list files in cloud storage', {
        prefix,
        error: error instanceof Error ? error.message : String(error)
      });
      return [];
    }
  }

  /**
   * Upload directory to cloud storage
   */
  async uploadDirectory(localDir: string, cloudPrefix: string): Promise<void> {
    if (!fs.existsSync(localDir)) {
      analyzerLogger.warn('Local directory does not exist, skipping upload', { localDir });
      return;
    }

    const files = await this.getAllFiles(localDir);
    
    for (const file of files) {
      const relativePath = path.relative(localDir, file);
      const cloudKey = path.posix.join(cloudPrefix, relativePath);
      
      await this.uploadFile(file, cloudKey);
    }

    analyzerLogger.info('Directory uploaded to cloud storage', { 
      localDir, 
      cloudPrefix, 
      fileCount: files.length 
    });
  }

  /**
   * Download directory from cloud storage
   */
  async downloadDirectory(cloudPrefix: string, localDir: string): Promise<void> {
    const files = await this.listFiles(cloudPrefix);
    
    for (const file of files) {
      const relativePath = file.key.replace(cloudPrefix, '').replace(/^\//, '');
      const localPath = path.join(localDir, relativePath);
      
      await this.downloadFile(file.key, localPath);
    }

    analyzerLogger.info('Directory downloaded from cloud storage', { 
      cloudPrefix, 
      localDir, 
      fileCount: files.length 
    });
  }

  /**
   * Sync database to cloud storage
   */
  async syncDatabase(): Promise<void> {
    const dbPath = config.databasePath;
    
    if (await fs.pathExists(dbPath)) {
      const cloudKey = `database/rfp-analyzer.sqlite`;
      await this.uploadFile(dbPath, cloudKey, {
        type: 'database',
        timestamp: new Date().toISOString()
      });
      
      analyzerLogger.info('Database synced to cloud storage');
    }
  }

  /**
   * Restore database from cloud storage
   */
  async restoreDatabase(): Promise<void> {
    const dbPath = config.databasePath;
    const cloudKey = `database/rfp-analyzer.sqlite`;
    
    if (await this.fileExists(cloudKey)) {
      await fs.ensureDir(path.dirname(dbPath));
      await this.downloadFile(cloudKey, dbPath);
      
      analyzerLogger.info('Database restored from cloud storage');
    } else {
      analyzerLogger.info('No database backup found in cloud storage');
    }
  }

  /**
   * Clean up old files in cloud storage
   */
  async cleanupOldFiles(prefix: string, retentionDays: number): Promise<void> {
    const files = await this.listFiles(prefix);
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

    const filesToDelete = files.filter(file => file.lastModified < cutoffDate);

    for (const file of filesToDelete) {
      try {
        await this.s3Client?.send(new PutObjectCommand({
          Bucket: this.config.bucket,
          Key: file.key
        }));
        
        analyzerLogger.info('Deleted old file from cloud storage', { 
          key: file.key, 
          age: Math.floor((Date.now() - file.lastModified.getTime()) / (1000 * 60 * 60 * 24)) 
        });
      } catch (error) {
        analyzerLogger.error('Failed to delete old file from cloud storage', {
          key: file.key,
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }
  }

  private async getAllFiles(dir: string): Promise<string[]> {
    const files: string[] = [];
    const items = await fs.readdir(dir);

    for (const item of items) {
      const fullPath = path.join(dir, item);
      const stat = await fs.stat(fullPath);

      if (stat.isDirectory()) {
        files.push(...await this.getAllFiles(fullPath));
      } else {
        files.push(fullPath);
      }
    }

    return files;
  }

  private getContentType(filePath: string): string {
    const ext = path.extname(filePath).toLowerCase();
    
    const contentTypes: Record<string, string> = {
      '.pdf': 'application/pdf',
      '.doc': 'application/msword',
      '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      '.txt': 'text/plain',
      '.md': 'text/markdown',
      '.html': 'text/html',
      '.json': 'application/json',
      '.sqlite': 'application/vnd.sqlite3',
      '.zip': 'application/zip',
      '.rar': 'application/vnd.rar',
      '.7z': 'application/x-7z-compressed'
    };

    return contentTypes[ext] || 'application/octet-stream';
  }
}

export default CloudStorageManager;