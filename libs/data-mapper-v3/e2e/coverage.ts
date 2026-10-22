import { CoverageReport } from 'monocart-coverage-reports';
import path from 'node:path';

export const coverageEnabled = process.env.MAPPER_E2E_COVERAGE === '1';
export const coverageDirectory = path.resolve(__dirname, '../coverage/e2e');

export function createCoverageReport(): CoverageReport {
  return new CoverageReport({
    name: 'Mapper v3 browser coverage',
    outputDir: coverageDirectory,
    reports: ['v8', 'v8-json', 'console-summary', 'markdown-details'],
    sourceFilter: (sourcePath) => {
      const normalized = sourcePath.replaceAll('\\', '/');
      return !normalized.includes('node_modules') && /(?:^|\/)(?:webview\/src|src)\//.test(normalized) && /\.tsx?$/.test(normalized);
    },
  });
}

export default async function generateCoverage(): Promise<void> {
  if (coverageEnabled) {
    const results = await createCoverageReport().generate();
    if (!results || results.files.length === 0) {
      throw new Error('No mapper source coverage collected. Check the webview source map and browser coverage fixture.');
    }
  }
}
