# Claude Code Integration Guide

This project is optimized for Claude Code development with comprehensive automation, intelligent routing, and specialized tooling.

## 🤖 Claude Code Features

### SuperClaude Framework Integration
This project leverages the full SuperClaude framework with:
- **Intelligent Routing**: Auto-detection of task complexity and tool selection
- **Persona System**: Domain-specific AI behavior for different development contexts
- **MCP Server Integration**: Enhanced capabilities through Model Context Protocol
- **Wave Orchestration**: Multi-stage execution for complex operations

### Auto-Activated Personas
The project automatically activates specialized personas based on context:

- **`--persona-backend`**: For server-side development, API design, database work
- **`--persona-analyzer`**: For RFP analysis, scoring logic, data investigation
- **`--persona-security`**: For credential management, vulnerability assessment
- **`--persona-devops`**: For deployment, automation, CI/CD workflows
- **`--persona-qa`**: For testing, validation, quality assurance

### MCP Server Configuration
Configured servers in `.mcp.json`:

```json
{
  "mcpServers": {
    "sequential-thinking": "Complex analysis and multi-step reasoning",
    "memory": "Session context and knowledge persistence", 
    "filesystem": "File operations within allowed directories",
    "browser-tools": "Web automation and testing capabilities",
    "fetch": "Enhanced web content retrieval with image support"
  }
}
```

## 🚀 Quick Start Commands

### Development Workflow
```bash
# Analyze the entire codebase
/analyze @src --focus architecture

# Improve code quality across project  
/improve @src --focus quality --loop

# Build and test the application
/build --validate --test

# Deploy with comprehensive checks
/git commit --validate --safe-mode
```

### RFP Analysis Commands
```bash
# Analyze RFP processing logic
/analyze @src/analyzers --focus performance

# Improve scoring algorithms
/improve @src/analyzers/scoreCalculator.ts --focus accuracy

# Test scraping workflows
/test @src/scrapers --type integration
```

### Automation Commands
```bash
# Analyze GitHub Actions workflow
/analyze @.github/workflows --focus reliability

# Improve error handling
/improve @src --focus error-handling --wave-mode

# Review security practices
/analyze @src --focus security --persona-security
```

## 🛠️ Development Guidelines

### Code Quality Standards
- **TypeScript Strict Mode**: All code uses strict TypeScript configuration
- **Error Handling**: Comprehensive try-catch blocks with structured logging
- **Testing**: Unit and integration tests for all critical paths
- **Documentation**: Inline documentation for complex algorithms

### Claude Code Optimization
- **Structured Responses**: Uses unified symbol system for clarity
- **Minimal Output**: Direct answers without unnecessary verbosity
- **Evidence-Based**: All recommendations backed by analysis
- **Context Awareness**: Maintains project understanding across sessions

### Recommended Flags
For optimal Claude Code experience:

```bash
# For complex analysis
--think --seq --persona-analyzer

# For code improvements  
--improve --wave-mode --validate

# For deployment tasks
--safe-mode --persona-devops --validate

# For debugging issues
--troubleshoot --think-hard --seq
```

## 📊 Project Context

### Architecture Overview
- **Modular Design**: Separated concerns across analyzers, processors, scrapers
- **Async/Await**: Modern JavaScript patterns throughout
- **Configuration-Driven**: Environment variables and keyword-based scoring
- **Error Resilient**: Graceful degradation and comprehensive logging

### Key Components
1. **Scrapers** (`src/scrapers/`): Web automation with Playwright
2. **Processors** (`src/processors/`): Multi-format document extraction
3. **Analyzers** (`src/analyzers/`): Intelligent RFP scoring and analysis
4. **Storage** (`src/storage/`): SQLite database and file management

### Business Logic
- **Scoring Algorithm**: 100-point scale across 5 categories
- **Higher Education Focus**: Universities, colleges, K-12 schools
- **CMS Preferences**: Drupal, WordPress, Modern Campus
- **Budget Analysis**: $50K minimum, $100K+ preferred

## 🔧 Configuration for Claude Code

### Environment Setup
```env
# Enable detailed logging for Claude Code analysis
LOG_LEVEL=debug

# Optimize for development
NODE_ENV=development

# Enable comprehensive error tracking
ERROR_TRACKING=enabled
```

### Recommended IDE Integration
- **File Watching**: Monitor changes in `src/` directory
- **Auto-formatting**: Prettier integration for consistent style
- **Type Checking**: Real-time TypeScript validation
- **Testing Integration**: Jest test runner with watch mode

## 🧪 Testing Strategy

### Test Categories
- **Unit Tests**: Individual function and class testing
- **Integration Tests**: Component interaction testing  
- **End-to-End Tests**: Complete workflow validation
- **Performance Tests**: Execution time and resource usage

### Claude Code Testing Commands
```bash
# Run comprehensive test suite
/test --coverage --validate

# Test specific components
/test @src/analyzers --type unit --persona-qa

# Performance testing
/test @src/scrapers --type performance --benchmark
```

## 📈 Performance Optimization

### Claude Code Enhancements
- **Parallel Processing**: Concurrent document analysis
- **Caching Strategy**: Intelligent result caching
- **Resource Management**: Memory and file handle optimization
- **Batch Operations**: Grouped database operations

### Monitoring Integration
- **Structured Logging**: JSON-formatted logs for analysis
- **Performance Metrics**: Execution time tracking
- **Error Analytics**: Comprehensive error classification
- **Success Metrics**: Scoring accuracy and discovery rates

## 🔒 Security Best Practices

### Credential Management
- **Environment Variables**: No hardcoded credentials
- **GitHub Secrets**: Secure CI/CD credential storage
- **Rotation Policy**: Regular credential updates
- **Access Logging**: Comprehensive audit trails

### Data Protection
- **Local Storage**: SQLite database for sensitive data
- **Encryption**: Sensitive data encryption at rest
- **Cleanup Policies**: Automatic old data removal
- **Privacy Controls**: Configurable data retention

## 🚀 Deployment Integration

### GitHub Actions Optimization
- **Automated Testing**: Pre-deployment validation
- **Artifact Management**: Report and data preservation
- **Issue Creation**: Automated workflow for high-priority findings
- **Monitoring**: Deployment success tracking

### Claude Code Deployment Commands
```bash
# Validate before deployment
/git status --validate --safe-mode

# Deploy with comprehensive checks
/git commit --persona-devops --validate

# Monitor deployment success
/analyze @.github/workflows --focus monitoring
```

## 📚 Learning Resources

### Claude Code Documentation
- [SuperClaude Framework](https://docs.anthropic.com/claude-code/superclaude)
- [MCP Server Integration](https://docs.anthropic.com/claude-code/mcp)
- [Persona System](https://docs.anthropic.com/claude-code/personas)
- [Wave Orchestration](https://docs.anthropic.com/claude-code/waves)

### Project-Specific Guides
- [RFP Analysis Methodology](docs/analysis-methodology.md)
- [Scoring Algorithm Details](docs/scoring-algorithm.md)
- [Database Schema Reference](docs/database-schema.md)
- [API Integration Guide](docs/api-integration.md)

## 🤝 Contributing with Claude Code

### Development Workflow
1. **Analysis Phase**: Use `/analyze` to understand existing code
2. **Planning Phase**: Use `/task` for complex feature planning
3. **Implementation Phase**: Use `/implement` with appropriate personas
4. **Validation Phase**: Use `/test` and `/validate` for quality assurance
5. **Documentation Phase**: Use `/document` for comprehensive documentation

### Code Review Process
- **Automated Analysis**: Claude Code pre-review analysis
- **Security Review**: Automated security vulnerability scanning
- **Performance Review**: Automated performance impact assessment
- **Quality Metrics**: Comprehensive code quality evaluation

### Best Practices
- **Incremental Development**: Small, focused commits with clear purposes
- **Test-Driven Development**: Tests before implementation
- **Documentation-First**: Clear documentation for complex algorithms
- **Security-First**: Security considerations in all design decisions

---

**This project is optimized for Claude Code development - leverage the full SuperClaude framework for maximum productivity!**