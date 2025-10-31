import RSSParser from 'rss-parser';
import { systemLogger } from '../utils/logger';

export interface RSSRFPItem {
  title: string;
  description?: string;
  link: string;
  pubDate: Date;
  guid?: string;
  category?: string;
  author?: string;
}

export interface RSSParserConfig {
  feedUrl: string;
  sinceDate?: Date;
  maxItems?: number;
  timeout?: number;
}

export class RSSFeedParser {
  private parser: RSSParser;
  private readonly defaultFeedUrl = 'https://feeds.feedburner.com/WebDesign-RFP';

  constructor() {
    this.parser = new RSSParser({
      timeout: 10000,
      headers: {
        'User-Agent': 'KWALL RFP Analyzer 1.0'
      }
    });
  }

  async parseRSSFeed(config?: Partial<RSSParserConfig>): Promise<RSSRFPItem[]> {
    const {
      feedUrl = this.defaultFeedUrl,
      sinceDate,
      maxItems = 100,
      timeout = 10000
    } = config || {};

    try {
      systemLogger.info(`Fetching RSS feed from: ${feedUrl}`);
      
      // Set timeout for this request
      this.parser = new RSSParser({
        timeout,
        headers: {
          'User-Agent': 'KWALL RFP Analyzer 1.0'
        }
      });

      const feed = await this.parser.parseURL(feedUrl);
      
      if (!feed.items || feed.items.length === 0) {
        systemLogger.warn('No items found in RSS feed');
        return [];
      }

      systemLogger.info(`Found ${feed.items.length} total items in RSS feed`);
      
      // Parse and filter RSS items
      const parsedItems: RSSRFPItem[] = [];
      
      for (const item of feed.items) {
        try {
          const rfpItem = this.parseRSSItem(item);
          
          // Filter by date if provided
          if (sinceDate && rfpItem.pubDate < sinceDate) {
            continue;
          }
          
          parsedItems.push(rfpItem);
          
          // Respect max items limit
          if (parsedItems.length >= maxItems) {
            break;
          }
        } catch (error) {
          systemLogger.warn(`Failed to parse RSS item: ${error instanceof Error ? error.message : 'Unknown error'}`);
          continue;
        }
      }

      systemLogger.info(`Parsed ${parsedItems.length} valid RFP items from RSS feed`);
      
      if (sinceDate) {
        systemLogger.info(`Filtered items published since: ${sinceDate.toISOString()}`);
      }

      return parsedItems;

    } catch (error) {
      systemLogger.error(`Failed to fetch or parse RSS feed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw new Error(`RSS parsing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private parseRSSItem(item: any): RSSRFPItem {
    // Extract publication date
    let pubDate: Date;
    if (item.pubDate) {
      pubDate = new Date(item.pubDate);
      if (isNaN(pubDate.getTime())) {
        throw new Error(`Invalid publication date: ${item.pubDate}`);
      }
    } else if (item.isoDate) {
      pubDate = new Date(item.isoDate);
      if (isNaN(pubDate.getTime())) {
        throw new Error(`Invalid ISO date: ${item.isoDate}`);
      }
    } else {
      // Fallback to current date if no date found
      pubDate = new Date();
      systemLogger.warn('No publication date found, using current date');
    }

    // Validate required fields
    if (!item.title || typeof item.title !== 'string') {
      throw new Error('Missing or invalid title');
    }

    if (!item.link || typeof item.link !== 'string') {
      throw new Error('Missing or invalid link');
    }

    // Extract and clean description
    let description = '';
    if (item.contentSnippet) {
      description = item.contentSnippet.trim();
    } else if (item.content) {
      // Strip HTML tags from content
      description = this.stripHTML(item.content).trim();
    } else if (item.summary) {
      description = this.stripHTML(item.summary).trim();
    }

    return {
      title: item.title.trim(),
      description: description || undefined,
      link: item.link.trim(),
      pubDate,
      guid: item.guid || item.id,
      category: this.extractCategory(item),
      author: item.creator || item.author
    };
  }

  private stripHTML(html: string): string {
    // Simple HTML tag removal - more sophisticated parsing could be added if needed
    return html.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
  }

  private extractCategory(item: any): string | undefined {
    if (item.categories && Array.isArray(item.categories) && item.categories.length > 0) {
      return item.categories[0];
    }
    if (item.category) {
      return item.category;
    }
    return undefined;
  }

  async getLatestRFPs(sinceDate: Date, maxItems: number = 50): Promise<RSSRFPItem[]> {
    return this.parseRSSFeed({
      sinceDate,
      maxItems
    });
  }

  async getAllRecentRFPs(daysBack: number = 7, maxItems: number = 100): Promise<RSSRFPItem[]> {
    const sinceDate = new Date();
    sinceDate.setDate(sinceDate.getDate() - daysBack);
    
    return this.parseRSSFeed({
      sinceDate,
      maxItems
    });
  }
}

// Export singleton instance
export const rssParser = new RSSFeedParser();