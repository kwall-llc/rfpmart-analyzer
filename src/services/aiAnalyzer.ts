import { config } from '../config/environment';
import { analyzerLogger } from '../utils/logger';
import { RFPListing } from '../scrapers/rfpMartScraper';
import { FileExtractor } from '../utils/fileExtractor';
import fs from 'fs-extra';
import path from 'path';

export interface AIAnalysisResult {
  rfpId: string;
  fitScore: number; // 0-100
  fitRating: 'excellent' | 'good' | 'poor' | 'rejected';
  reasoning: string;
  keyRequirements: string[];
  budgetEstimate?: string;
  technologies: string[];
  institutionType: string;
  projectType: string;
  redFlags: string[];
  opportunities: string[];
  recommendation: string;
  confidence: number; // 0-100
}

export interface AIProvider {
  name: string;
  endpoint: string;
  apiKey: string;
  model: string;
}

export class AIAnalyzer {
  private provider: AIProvider;
  private fitPrompt: string;

  constructor() {
    this.provider = this.getAIProvider();
    this.fitPrompt = this.buildFitAnalysisPrompt();
  }

  /**
   * Analyze an RFP for fit based on content and extracted files
   */
  async analyzeRFPFit(rfp: RFPListing, rfpDirectory: string): Promise<AIAnalysisResult> {
    try {
      analyzerLogger.info(`Starting AI analysis for RFP: ${rfp.id}`, { rfpId: rfp.id });

      // Extract all text content from the RFP directory
      const textContent = await this.extractTextContent(rfpDirectory);
      
      // Prepare analysis prompt with RFP data and extracted content
      const analysisPrompt = this.buildAnalysisPrompt(rfp, textContent);
      
      // Send to AI service for analysis
      const aiResponse = await this.callAIService(analysisPrompt);
      
      // Parse AI response into structured result
      const result = this.parseAIResponse(rfp.id, aiResponse);
      
      analyzerLogger.info(`AI analysis completed for RFP: ${rfp.id}`, { 
        rfpId: rfp.id, 
        fitScore: result.fitScore, 
        fitRating: result.fitRating 
      });

      return result;

    } catch (error) {
      analyzerLogger.error(`Failed to analyze RFP ${rfp.id}`, { 
        error: error instanceof Error ? error.message : String(error) 
      });
      
      // Return default poor fit result for error cases
      return {
        rfpId: rfp.id,
        fitScore: 0,
        fitRating: 'rejected',
        reasoning: `Analysis failed: ${error instanceof Error ? error.message : String(error)}`,
        keyRequirements: [],
        technologies: [],
        institutionType: 'unknown',
        projectType: 'unknown',
        redFlags: ['Analysis failed'],
        opportunities: [],
        recommendation: 'Skip due to analysis error',
        confidence: 0
      };
    }
  }

  /**
   * Extract text content from all documents in RFP directory
   */
  private async extractTextContent(directory: string): Promise<string> {
    try {
      const documentFiles = await FileExtractor.getDocumentFiles(directory);
      let combinedText = '';

      for (const filePath of documentFiles) {
        try {
          const ext = path.extname(filePath).toLowerCase();
          let fileContent = '';

          if (ext === '.txt') {
            fileContent = await fs.readFile(filePath, 'utf8');
          } else if (ext === '.pdf') {
            // For PDF extraction, we'll need pdf-parse
            fileContent = await this.extractPDFText(filePath);
          } else if (['.doc', '.docx'].includes(ext)) {
            // For Word documents, we'll need mammoth
            fileContent = await this.extractWordText(filePath);
          }

          if (fileContent.trim()) {
            combinedText += `\n\n--- ${path.basename(filePath)} ---\n${fileContent}`;
          }

        } catch (error) {
          analyzerLogger.warn(`Failed to extract text from ${filePath}`, { 
            error: error instanceof Error ? error.message : String(error) 
          });
        }
      }

      return combinedText.trim();

    } catch (error) {
      analyzerLogger.error('Failed to extract text content', { 
        error: error instanceof Error ? error.message : String(error) 
      });
      return '';
    }
  }

  /**
   * Extract text from PDF files using pdf-parse
   */
  private async extractPDFText(filePath: string): Promise<string> {
    try {
      const pdfParse = require('pdf-parse');
      const dataBuffer = await fs.readFile(filePath);
      const data = await pdfParse(dataBuffer);
      return data.text;
    } catch (error) {
      analyzerLogger.warn(`Failed to extract PDF text from ${filePath}`, { 
        error: error instanceof Error ? error.message : String(error) 
      });
      return '';
    }
  }

  /**
   * Extract text from Word documents using mammoth
   */
  private async extractWordText(filePath: string): Promise<string> {
    try {
      const mammoth = require('mammoth');
      const result = await mammoth.extractRawText({ path: filePath });
      return result.value;
    } catch (error) {
      analyzerLogger.warn(`Failed to extract Word text from ${filePath}`, { 
        error: error instanceof Error ? error.message : String(error) 
      });
      return '';
    }
  }

  /**
   * Get AI provider configuration
   */
  private getAIProvider(): AIProvider {
    const providerName = config.ai?.provider || 'openai';
    
    switch (providerName.toLowerCase()) {
      case 'openai':
        return {
          name: 'OpenAI',
          endpoint: 'https://api.openai.com/v1/chat/completions',
          apiKey: config.ai?.openai?.apiKey || '',
          model: config.ai?.openai?.model || 'gpt-4'
        };
      
      case 'anthropic':
        return {
          name: 'Anthropic',
          endpoint: 'https://api.anthropic.com/v1/messages',
          apiKey: config.ai?.anthropic?.apiKey || '',
          model: config.ai?.anthropic?.model || 'claude-3-sonnet-20240229'
        };
      
      case 'azure':
        return {
          name: 'Azure OpenAI',
          endpoint: config.ai?.azure?.endpoint || '',
          apiKey: config.ai?.azure?.apiKey || '',
          model: config.ai?.azure?.model || 'gpt-4'
        };
      
      default:
        throw new Error(`Unsupported AI provider: ${providerName}`);
    }
  }

  /**
   * Build the core fit analysis prompt template
   */
  private buildFitAnalysisPrompt(): string {
    return `You are an expert RFP analyzer for KWALL, a web design and development company specializing in higher education websites.

KWALL CAPABILITIES AND PREFERENCES:
- Expertise: Web design, development, and digital strategy for higher education
- Preferred Technologies: Drupal, WordPress, Modern Campus, Omni CMS, Cascade CMS
- Project Types: Website redesigns, redevelopments, migrations, modernization
- Budget Range: $50K minimum acceptable, $100K+ preferred
- Focus Areas: Responsive design, accessibility (WCAG/ADA), user experience, SEO
- Institution Preference: Universities, colleges, state institutions, large enrollments

RED FLAGS TO AVOID:
- Maintenance-only contracts
- Minor updates or template customization only
- Logo design or brochure websites
- Very low budgets (<$50K)
- Non-education sectors (unless exceptional fit)

ANALYSIS REQUIREMENTS:
Analyze the provided RFP and score it on a scale of 0-100 for fit with KWALL's capabilities and preferences. Provide detailed reasoning and extract key information.

Respond in this exact JSON format:
{
  "fitScore": [0-100 integer],
  "fitRating": "[excellent|good|poor|rejected]",
  "reasoning": "[detailed explanation of fit assessment]",
  "keyRequirements": ["requirement1", "requirement2", ...],
  "budgetEstimate": "[extracted budget info or 'not specified']",
  "technologies": ["tech1", "tech2", ...],
  "institutionType": "[university|college|school|government|other]",
  "projectType": "[redesign|development|maintenance|migration|other]",
  "redFlags": ["flag1", "flag2", ...],
  "opportunities": ["opportunity1", "opportunity2", ...],
  "recommendation": "[clear recommendation: pursue/consider/skip]",
  "confidence": [0-100 integer indicating confidence in analysis]
}`;
  }

  /**
   * Build analysis prompt with RFP data and content
   */
  private buildAnalysisPrompt(rfp: RFPListing, textContent: string): string {
    const prompt = `${this.fitPrompt}

RFP METADATA:
- Title: ${rfp.title}
- Institution: ${rfp.institution || 'Not specified'}
- Posted Date: ${rfp.postedDate || 'Not specified'}
- Due Date: ${rfp.dueDate || 'Not specified'}
- Description: ${rfp.description || 'Not specified'}

EXTRACTED DOCUMENT CONTENT:
${textContent || 'No document content available'}

Please analyze this RFP and provide your assessment in the specified JSON format.`;

    return prompt;
  }

  /**
   * Call AI service with the analysis prompt
   */
  private async callAIService(prompt: string): Promise<string> {
    const maxRetries = 3;
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        analyzerLogger.debug(`Calling AI service (attempt ${attempt}/${maxRetries})`, { 
          provider: this.provider.name 
        });

        const response = await this.makeAPICall(prompt);
        return response;

      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        analyzerLogger.warn(`AI service call failed (attempt ${attempt}/${maxRetries})`, { 
          error: lastError.message 
        });

        if (attempt < maxRetries) {
          // Wait before retry (exponential backoff)
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
        }
      }
    }

    throw new Error(`AI service failed after ${maxRetries} attempts: ${lastError?.message}`);
  }

  /**
   * Make the actual API call based on provider type
   */
  private async makeAPICall(prompt: string): Promise<string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };

    let requestBody: any;

    switch (this.provider.name) {
      case 'OpenAI':
      case 'Azure OpenAI':
        headers['Authorization'] = `Bearer ${this.provider.apiKey}`;
        requestBody = {
          model: this.provider.model,
          messages: [
            { role: 'user', content: prompt }
          ],
          temperature: 0.1,
          max_tokens: 2000
        };
        break;

      case 'Anthropic':
        headers['x-api-key'] = this.provider.apiKey;
        headers['anthropic-version'] = '2023-06-01';
        requestBody = {
          model: this.provider.model,
          max_tokens: 2000,
          temperature: 0.1,
          messages: [
            { role: 'user', content: prompt }
          ]
        };
        break;

      default:
        throw new Error(`Unsupported provider: ${this.provider.name}`);
    }

    const response = await fetch(this.provider.endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API call failed (${response.status}): ${errorText}`);
    }

    const responseData = await response.json();
    
    // Extract content based on provider response format
    switch (this.provider.name) {
      case 'OpenAI':
      case 'Azure OpenAI':
        return responseData.choices?.[0]?.message?.content || '';
      
      case 'Anthropic':
        return responseData.content?.[0]?.text || '';
      
      default:
        throw new Error(`Unknown response format for provider: ${this.provider.name}`);
    }
  }

  /**
   * Parse AI response into structured result
   */
  private parseAIResponse(rfpId: string, response: string): AIAnalysisResult {
    try {
      // Try to extract JSON from response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in AI response');
      }

      const parsedResponse = JSON.parse(jsonMatch[0]);

      // Validate and normalize the response
      return {
        rfpId,
        fitScore: Math.max(0, Math.min(100, parseInt(parsedResponse.fitScore) || 0)),
        fitRating: this.normalizeFitRating(parsedResponse.fitRating, parsedResponse.fitScore),
        reasoning: parsedResponse.reasoning || 'No reasoning provided',
        keyRequirements: Array.isArray(parsedResponse.keyRequirements) ? parsedResponse.keyRequirements : [],
        budgetEstimate: parsedResponse.budgetEstimate || 'not specified',
        technologies: Array.isArray(parsedResponse.technologies) ? parsedResponse.technologies : [],
        institutionType: parsedResponse.institutionType || 'unknown',
        projectType: parsedResponse.projectType || 'unknown',
        redFlags: Array.isArray(parsedResponse.redFlags) ? parsedResponse.redFlags : [],
        opportunities: Array.isArray(parsedResponse.opportunities) ? parsedResponse.opportunities : [],
        recommendation: parsedResponse.recommendation || 'Review manually',
        confidence: Math.max(0, Math.min(100, parseInt(parsedResponse.confidence) || 50))
      };

    } catch (error) {
      analyzerLogger.error('Failed to parse AI response', { 
        error: error instanceof Error ? error.message : String(error),
        response: response.substring(0, 500) 
      });

      // Return fallback result
      return {
        rfpId,
        fitScore: 25,
        fitRating: 'poor',
        reasoning: `Failed to parse AI response: ${error instanceof Error ? error.message : String(error)}`,
        keyRequirements: [],
        budgetEstimate: 'not specified',
        technologies: [],
        institutionType: 'unknown',
        projectType: 'unknown',
        redFlags: ['Analysis parsing failed'],
        opportunities: [],
        recommendation: 'Review manually due to parsing error',
        confidence: 0
      };
    }
  }

  /**
   * Normalize fit rating based on score
   */
  private normalizeFitRating(rating: string, score: number): 'excellent' | 'good' | 'poor' | 'rejected' {
    // Validate rating against score
    if (rating && ['excellent', 'good', 'poor', 'rejected'].includes(rating)) {
      return rating as 'excellent' | 'good' | 'poor' | 'rejected';
    }

    // Fall back to score-based rating
    if (score >= 80) return 'excellent';
    if (score >= 60) return 'good';
    if (score >= 25) return 'poor';
    return 'rejected';
  }
}