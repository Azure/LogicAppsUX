#!/usr/bin/env node
/* eslint-disable no-undef */

/**
 * Fetch PRs from GitHub and Generate Changelog
 * 
 * This script fetches all PRs between two releases and generates a detailed HTML changelog.
 * 
 * Usage:
 *   node fetch-and-generate-changelog.cjs <from-version> <to-version>
 *   pnpm changelog <from-version> <to-version>
 * 
 * Example:
 *   node fetch-and-generate-changelog.cjs 5.203.0 5.230.11
 *   pnpm changelog 5.203.0 5.230.11
 * 
 * The script will:
 * 1. Fetch release dates for both versions from GitHub
 * 2. Search for all merged PRs between those dates
 * 3. Categorize PRs by risk level (Low, Medium, High)
 * 4. Exclude Data Mapper, VSCode, and Standalone PRs
 * 5. Highlight DesignerV2/experimental features
 * 6. Generate a beautiful HTML changelog with collapsible sections
 * 
 * Output: CHANGELOG_v<from>_to_v<to>.html
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

const OWNER = 'Azure';
const REPO = 'LogicAppsUX';

// Parse command line arguments
function parseArguments() {
  const args = process.argv.slice(2);
  
  if (args.length < 2) {
    console.error('Usage: node fetch-and-generate-changelog.cjs <from-version> <to-version>');
    console.error('Example: node fetch-and-generate-changelog.cjs 5.203.0 5.230.11');
    console.error('\nVersions should match git tags (without "v" prefix)');
    process.exit(1);
  }
  
  return {
    fromVersion: args[0],
    toVersion: args[1]
  };
}

// GitHub API helper
function githubRequest(endpoint) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.github.com',
      path: endpoint,
      headers: {
        'User-Agent': 'LogicAppsUX-Changelog-Generator',
        'Accept': 'application/vnd.github.v3+json'
      }
    };

    https.get(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode === 200) {
          resolve(JSON.parse(data));
        } else {
          reject(new Error(`GitHub API returned ${res.statusCode}: ${data}`));
        }
      });
    }).on('error', reject);
  });
}

// Fetch release date by tag
async function getReleaseDate(version) {
  try {
    const tag = version.startsWith('v') ? version : `v${version}`;
    const endpoint = `/repos/${OWNER}/${REPO}/releases/tags/${tag}`;
    console.log(`Fetching release date for ${tag}...`);
    const release = await githubRequest(endpoint);
    return release.created_at;
  } catch (error) {
    throw new Error(`Failed to fetch release ${version}: ${error.message}`);
  }
}

// Fetch all PRs
async function fetchAllPRs(startDate, endDate) {
  console.log(`Fetching PRs merged between ${startDate} and ${endDate}...`);
  
  const allPRs = [];
  let page = 1;
  const perPage = 100;
  
  while (true) {
    const query = encodeURIComponent(`is:pr is:merged repo:${OWNER}/${REPO} merged:${startDate}..${endDate}`);
    const endpoint = `/search/issues?q=${query}&per_page=${perPage}&page=${page}&sort=created&order=asc`;
    
    console.log(`Fetching page ${page}...`);
    const result = await githubRequest(endpoint);
    
    if (result.items && result.items.length > 0) {
      allPRs.push(...result.items);
      console.log(`  Found ${result.items.length} PRs (total so far: ${allPRs.length})`);
      
      if (result.items.length < perPage) {
        break; // Last page
      }
      page++;
    } else {
      break;
    }
    
    // Rate limiting - wait 1 second between requests
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  console.log(`\nTotal PRs fetched: ${allPRs.length}`);
  return allPRs;
}

// Changelog Generator Class
class ChangelogGenerator {
  constructor(fromVersion, toVersion) {
    this.fromVersion = fromVersion;
    this.toVersion = toVersion;
    this.lowRisk = [];
    this.mediumRisk = [];
    this.highRisk = [];
    this.excluded = [];
    this.designerV2Features = new Set();
  }

  shouldExclude(pr) {
    // Check for VSCode label
    if (pr.labels && pr.labels.some(label => label.name === 'VSCode')) {
      return true;
    }

    // Check for Data Mapper in title or body
    const text = `${pr.title} ${pr.body || ''}`.toLowerCase();
    if (text.includes('data mapper') || text.includes('data-mapper') || text.includes('datamapper')) {
      return true;
    }

    // Check for Standalone in title or body
    if (text.includes('standalone')) {
      return true;
    }

    return false;
  }

  getRiskLevel(pr) {
    if (!pr.labels) return null;
    
    const riskLabel = pr.labels.find(label => label.name.startsWith('Risk:'));
    
    if (riskLabel) {
      if (riskLabel.name === 'Risk:Low') return 'low';
      if (riskLabel.name === 'Risk:Medium') return 'medium';
      if (riskLabel.name === 'Risk:High') return 'high';
    }
    
    return null;
  }

  isDesignerV2Feature(pr) {
    const text = `${pr.title} ${pr.body || ''}`.toLowerCase();
    return text.includes('designerv2') || 
           text.includes('designer v2') || 
           text.includes('clone feature') ||
           text.includes('experimental');
  }

  getProjectArea(pr) {
    const title = pr.title.toLowerCase();
    
    if (title.includes('vscode')) return 'VS Code Extension';
    if (title.includes('designer')) return 'Designer';
    if (title.includes('data mapper')) return 'Data Mapper';
    if (title.includes('mcp')) return 'MCP Integration';
    if (title.includes('agent')) return 'Agent Features';
    if (title.includes('chatbot') || title.includes('chat')) return 'Chatbot';
    if (title.includes('apim')) return 'APIM Gateway';
    if (title.includes('connection')) return 'Connections';
    if (title.includes('monitoring')) return 'Monitoring';
    if (title.includes('template')) return 'Templates';
    
    return 'Core';
  }

  formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  }

  getDescription(pr) {
    if (!pr.body) return 'No description provided';
    
    // Try to extract "What & Why" section
    const whatMatch = pr.body.match(/##\s*What\s*&\s*Why\s*\n([^\n]*)/i);
    if (whatMatch && whatMatch[1]) {
      const desc = whatMatch[1].trim().replace(/<!--.*?-->/g, '').trim();
      if (desc) {
        return desc.substring(0, 200) + (desc.length > 200 ? '...' : '');
      }
    }
    
    // Fallback to first non-empty line
    const lines = pr.body.split('\n').filter(line => {
      const trimmed = line.trim();
      return trimmed && !trimmed.startsWith('#') && !trimmed.startsWith('<!--') && !trimmed.startsWith('-');
    });
    
    if (lines[0]) {
      const desc = lines[0].trim();
      return desc.substring(0, 200) + (desc.length > 200 ? '...' : '');
    }
    
    return 'No description provided';
  }

  processPR(pr) {
    if (this.shouldExclude(pr)) {
      this.excluded.push(pr);
      return;
    }

    const riskLevel = this.getRiskLevel(pr);
    const isDesignerV2 = this.isDesignerV2Feature(pr);
    
    if (isDesignerV2) {
      this.designerV2Features.add(pr.number);
    }

    const prData = {
      number: pr.number,
      title: pr.title,
      url: pr.html_url,
      author: pr.user.login,
      mergedAt: this.formatDate(pr.closed_at || pr.merged_at),
      projectArea: this.getProjectArea(pr),
      description: this.getDescription(pr),
      isDesignerV2: isDesignerV2
    };

    if (riskLevel === 'low' || riskLevel === null) {
      this.lowRisk.push(prData);
    } else if (riskLevel === 'medium') {
      this.mediumRisk.push(prData);
    } else if (riskLevel === 'high') {
      this.highRisk.push(prData);
    }
  }

  escapeHtml(text) {
    const map = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, m => map[m]);
  }

  generatePRHTML(pr) {
    const designerV2Badge = pr.isDesignerV2 ? 
      '<span class="experimental-badge">🧪 Experimental / New Feature Work</span>' : '';
    
    return `
      <div class="pr-item ${pr.isDesignerV2 ? 'experimental' : ''}">
        <div class="pr-header">
          <a href="${this.escapeHtml(pr.url)}" target="_blank" class="pr-link">
            <strong>#${pr.number}</strong> - ${this.escapeHtml(pr.title)}
          </a>
          ${designerV2Badge}
        </div>
        <div class="pr-meta">
          <span class="pr-author">👤 ${this.escapeHtml(pr.author)}</span>
          <span class="pr-date">📅 ${this.escapeHtml(pr.mergedAt)}</span>
          <span class="pr-area">📦 ${this.escapeHtml(pr.projectArea)}</span>
        </div>
        <div class="pr-description">${this.escapeHtml(pr.description)}</div>
      </div>`;
  }

  generateRiskGroupHTML(riskLevel, prs, isExpanded) {
    const levelNames = {
      low: 'Low Risk',
      medium: 'Medium Risk',
      high: 'High Risk'
    };

    const levelColors = {
      low: '#28a745',
      medium: '#fd7e14',
      high: '#dc3545'
    };

    const levelName = levelNames[riskLevel];
    const levelColor = levelColors[riskLevel];
    const count = prs.length;

    const prsHTML = prs
      .sort((a, b) => b.number - a.number)
      .map(pr => this.generatePRHTML(pr))
      .join('');

    return `
      <details class="risk-group" ${isExpanded ? 'open' : ''}>
        <summary class="risk-header" style="border-left-color: ${levelColor}">
          <span class="risk-title">${levelName}</span>
          <span class="risk-count">${count} PRs</span>
        </summary>
        <div class="pr-list">
          ${prsHTML}
        </div>
      </details>`;
  }

  generateHTML() {
    const totalIncluded = this.lowRisk.length + this.mediumRisk.length + this.highRisk.length;
    const totalExcluded = this.excluded.length;
    const designerV2Count = this.designerV2Features.size;
    const currentDate = new Date().toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Azure Logic Apps UX Changelog: v${this.fromVersion} → v${this.toVersion}</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      padding: 40px 20px;
    }

    .container {
      max-width: 1200px;
      margin: 0 auto;
      background: white;
      border-radius: 12px;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
      overflow: hidden;
    }

    .header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 40px;
      text-align: center;
    }

    .header h1 {
      font-size: 2.5em;
      margin-bottom: 10px;
      font-weight: 700;
    }

    .version-badge {
      display: inline-block;
      background: rgba(255, 255, 255, 0.2);
      padding: 8px 16px;
      border-radius: 20px;
      margin: 10px 5px;
      font-size: 1.1em;
      backdrop-filter: blur(10px);
    }

    .stats {
      display: flex;
      justify-content: space-around;
      padding: 30px;
      background: #f8f9fa;
      border-bottom: 3px solid #e9ecef;
      flex-wrap: wrap;
      gap: 20px;
    }

    .stat-item {
      text-align: center;
      flex: 1;
      min-width: 150px;
    }

    .stat-number {
      font-size: 2.5em;
      font-weight: bold;
      color: #667eea;
      display: block;
    }

    .stat-label {
      color: #6c757d;
      font-size: 0.9em;
      text-transform: uppercase;
      letter-spacing: 1px;
    }

    .content {
      padding: 40px;
    }

    .risk-group {
      margin-bottom: 30px;
      border: 1px solid #e9ecef;
      border-radius: 8px;
      overflow: hidden;
      transition: all 0.3s ease;
    }

    .risk-group:hover {
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    }

    .risk-header {
      padding: 20px;
      background: #f8f9fa;
      cursor: pointer;
      font-size: 1.3em;
      font-weight: 600;
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-left: 4px solid;
      transition: background 0.2s ease;
      user-select: none;
    }

    .risk-header:hover {
      background: #e9ecef;
    }

    .risk-title {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .risk-title::before {
      content: '▶';
      display: inline-block;
      transition: transform 0.3s ease;
    }

    details[open] .risk-title::before {
      transform: rotate(90deg);
    }

    .risk-count {
      background: #667eea;
      color: white;
      padding: 4px 12px;
      border-radius: 20px;
      font-size: 0.85em;
    }

    .pr-list {
      padding: 20px;
      background: white;
    }

    .pr-item {
      padding: 20px;
      margin-bottom: 15px;
      border: 1px solid #e9ecef;
      border-radius: 8px;
      transition: all 0.2s ease;
      background: white;
    }

    .pr-item:hover {
      border-color: #667eea;
      box-shadow: 0 2px 8px rgba(102, 126, 234, 0.2);
    }

    .pr-item.experimental {
      border-left: 4px solid #ff6b6b;
      background: linear-gradient(to right, #fff5f5 0%, white 20%);
    }

    .pr-header {
      margin-bottom: 12px;
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 10px;
      flex-wrap: wrap;
    }

    .pr-link {
      color: #667eea;
      text-decoration: none;
      font-size: 1.05em;
      flex: 1;
      min-width: 200px;
    }

    .pr-link:hover {
      text-decoration: underline;
      color: #764ba2;
    }

    .experimental-badge {
      background: linear-gradient(135deg, #ff6b6b 0%, #ff8e53 100%);
      color: white;
      padding: 4px 12px;
      border-radius: 4px;
      font-size: 0.75em;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      white-space: nowrap;
    }

    .pr-meta {
      display: flex;
      gap: 20px;
      flex-wrap: wrap;
      margin-bottom: 12px;
      font-size: 0.9em;
      color: #6c757d;
    }

    .pr-meta span {
      display: flex;
      align-items: center;
      gap: 5px;
    }

    .pr-description {
      color: #495057;
      font-size: 0.95em;
      line-height: 1.6;
      padding: 12px;
      background: #f8f9fa;
      border-radius: 4px;
      border-left: 3px solid #667eea;
    }

    .footer {
      padding: 40px;
      background: #f8f9fa;
      border-top: 3px solid #e9ecef;
      text-align: center;
    }

    .footer-links {
      margin-top: 20px;
      display: flex;
      justify-content: center;
      gap: 20px;
      flex-wrap: wrap;
    }

    .footer-link {
      display: inline-block;
      padding: 12px 24px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      text-decoration: none;
      border-radius: 6px;
      font-weight: 600;
      transition: all 0.3s ease;
    }

    .footer-link:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
    }

    .note {
      background: #fff3cd;
      border: 1px solid #ffc107;
      border-radius: 8px;
      padding: 20px;
      margin-bottom: 30px;
      color: #856404;
    }

    .note strong {
      display: block;
      margin-bottom: 8px;
      font-size: 1.1em;
    }

    @media (max-width: 768px) {
      .header h1 {
        font-size: 1.8em;
      }

      .stats {
        flex-direction: column;
      }

      .content {
        padding: 20px;
      }

      .pr-meta {
        flex-direction: column;
        gap: 8px;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🚀 Azure Logic Apps UX Changelog</h1>
      <div>
        <span class="version-badge">v${this.fromVersion}</span>
        <span style="font-size: 1.5em;">→</span>
        <span class="version-badge">v${this.toVersion}</span>
      </div>
    </div>

    <div class="stats">
      <div class="stat-item">
        <span class="stat-number">${totalIncluded}</span>
        <span class="stat-label">Total Changes</span>
      </div>
      <div class="stat-item">
        <span class="stat-number">${this.lowRisk.length}</span>
        <span class="stat-label">Low Risk</span>
      </div>
      <div class="stat-item">
        <span class="stat-number">${this.mediumRisk.length}</span>
        <span class="stat-label">Medium Risk</span>
      </div>
      <div class="stat-item">
        <span class="stat-number">${this.highRisk.length}</span>
        <span class="stat-label">High Risk</span>
      </div>
      <div class="stat-item">
        <span class="stat-number">${designerV2Count}</span>
        <span class="stat-label">Experimental Features</span>
      </div>
    </div>

    <div class="content">
      <div class="note">
        <strong>📝 Note:</strong>
        This changelog excludes ${totalExcluded} PRs related to Data Mapper, VS Code extensions, and Standalone. 
        PRs marked with 🧪 are experimental DesignerV2 or new feature work.
      </div>

      ${this.generateRiskGroupHTML('low', this.lowRisk, true)}
      ${this.generateRiskGroupHTML('medium', this.mediumRisk, false)}
      ${this.generateRiskGroupHTML('high', this.highRisk, false)}
    </div>

    <div class="footer">
      <p><strong>Generated on:</strong> ${currentDate}</p>
      <div class="footer-links">
        <a href="https://github.com/Azure/LogicAppsUX/compare/v${this.fromVersion}...v${this.toVersion}" 
           target="_blank" 
           class="footer-link">
          📊 View Full Comparison on GitHub
        </a>
        <a href="https://github.com/Azure/LogicAppsUX/releases" 
           target="_blank" 
           class="footer-link">
          📋 View All PRs
        </a>
      </div>
      <p style="margin-top: 20px; color: #6c757d; font-size: 0.9em;">
        Azure Logic Apps UX Team | Microsoft
      </p>
    </div>
  </div>
</body>
</html>`;
  }

  async generate(allPRs) {
    console.log(`\nProcessing ${allPRs.length} PRs...`);
    
    allPRs.forEach(pr => this.processPR(pr));

    console.log(`\nResults:`);
    console.log(`- Low Risk: ${this.lowRisk.length}`);
    console.log(`- Medium Risk: ${this.mediumRisk.length}`);
    console.log(`- High Risk: ${this.highRisk.length}`);
    console.log(`- Excluded: ${this.excluded.length}`);
    console.log(`- DesignerV2 Features: ${this.designerV2Features.size}`);

    return this.generateHTML();
  }
}

// Main execution
async function main() {
  try {
    console.log('='.repeat(60));
    console.log('Azure Logic Apps UX Changelog Generator');
    console.log('='.repeat(60));
    
    // Parse command line arguments
    const { fromVersion, toVersion } = parseArguments();
    
    console.log(`\nGenerating changelog from v${fromVersion} to v${toVersion}...`);
    
    // Fetch release dates
    const startDate = await getReleaseDate(fromVersion);
    const endDate = await getReleaseDate(toVersion);
    
    const startFormatted = new Date(startDate).toISOString().split('T')[0];
    const endFormatted = new Date(endDate).toISOString().split('T')[0];
    
    console.log(`Date range: ${startFormatted} to ${endFormatted}\n`);
    
    // Fetch all PRs
    const allPRs = await fetchAllPRs(startFormatted, endFormatted);
    
    // Generate changelog
    const generator = new ChangelogGenerator(fromVersion, toVersion);
    const html = await generator.generate(allPRs);
    
    // Save to file
    const outputPath = path.join(__dirname, `CHANGELOG_v${fromVersion}_to_v${toVersion}.html`);
    fs.writeFileSync(outputPath, html, 'utf8');
    
    console.log(`\n✅ Changelog generated successfully!`);
    console.log(`📄 Output: ${outputPath}`);
    console.log('\nYou can now open this HTML file in your browser.');
    
  } catch (error) {
    console.error('\n❌ Error generating changelog:', error.message);
    process.exit(1);
  }
}

// Run the script
if (require.main === module) {
  main();
}

module.exports = { ChangelogGenerator, fetchAllPRs };
