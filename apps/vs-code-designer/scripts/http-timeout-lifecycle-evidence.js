#!/usr/bin/env node
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
/* global console, module, process, require */
const fs = require('node:fs');
const path = require('node:path');
const { generateVscodeE2eEvidenceReport, parseArgs, _test } = require('./vscode-e2e-evidence-report');
const { getSuiteDescriptor, httpCatalogGroups } = require('./vscode-e2e-evidence-plans');

function generateHttpTimeoutLifecycleEvidence(options) {
  const result = generateVscodeE2eEvidenceReport({ ...options, suiteId: 'httpTimeoutLifecycle' });
  if (!result.compatibility) {
    throw new Error('HTTP compatibility outputs were not generated');
  }
  return {
    ...result,
    genericMarkdownPath: result.markdownPath,
    genericManifestPath: result.manifestPath,
    markdownPath: result.compatibility.markdownPath,
    manifestPath: result.compatibility.manifestPath,
    markdown: fs.readFileSync(result.compatibility.markdownPath, 'utf8').trimEnd(),
    manifest: result.compatibility.manifest,
  };
}

if (require.main === module) {
  try {
    const options = parseArgs(process.argv.slice(2));
    const result = generateHttpTimeoutLifecycleEvidence({
      artifactRoot: options['artifact-root'],
      resultPath: options.result,
      terminalResultPath: options['terminal-result'],
      admissionContextPath: options['admission-context'],
      evidenceManifest: options['evidence-manifest'],
    });
    console.log(`[http-timeout-evidence] Wrote ${path.basename(result.markdownPath)} and ${path.basename(result.manifestPath)}`);
  } catch (error) {
    console.error(`[http-timeout-evidence] ${error instanceof Error ? error.message : String(error)}`);
    process.exitCode = 1;
  }
}

module.exports = {
  catalogGroups: httpCatalogGroups,
  generateHttpTimeoutLifecycleEvidence,
  getSuiteDescriptor,
  _test,
};
