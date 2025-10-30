import { Command } from 'commander';
import { GitHubReporter } from '../services/githubReporter';
import { analyzerLogger } from '../utils/logger';
import { config } from '../config/environment';
import path from 'path';

export function createGenerateReportsCommand(): Command {
  const command = new Command('generate-reports');
  
  command
    .description('Generate GitHub-friendly reports from RFP analysis results')
    .option('-o, --output <directory>', 'Output directory for reports', './reports')
    .option('--github-pages', 'Generate GitHub Pages compatible files')
    .option('--action-summary', 'Generate GitHub Action summary')
    .option('--max-rfps <number>', 'Maximum number of RFPs to include', '50')
    .action(async (options) => {
      try {
        analyzerLogger.info('Starting GitHub report generation', { options });

        const reporter = new GitHubReporter();
        
        await reporter.generateGitHubReports({
          outputDirectory: path.resolve(options.output),
          generateGitHubPages: options.githubPages,
          createActionSummary: options.actionSummary,
          maxRFPsToShow: parseInt(options.maxRfps)
        });

        console.log('✅ GitHub reports generated successfully!');
        console.log(`📁 Reports saved to: ${path.resolve(options.output)}`);
        
        if (options.githubPages) {
          console.log('🌐 GitHub Pages files generated in docs/ directory');
          console.log('   Enable GitHub Pages in repository settings to view online');
        }
        
        if (options.actionSummary) {
          console.log('📊 GitHub Action summary generated');
        }

      } catch (error) {
        analyzerLogger.error('Failed to generate GitHub reports', {
          error: error instanceof Error ? error.message : String(error)
        });
        console.error('❌ Failed to generate reports:', error);
        process.exit(1);
      }
    });

  return command;
}