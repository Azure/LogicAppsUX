import * as assert from 'assert';
import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';
import { connectToVsCodeWorkbenchCdp } from './cdpClient';

const logicAppsExtensionId = 'ms-azuretools.vscode-azurelogicapps';
const defaultStartupReadyTimeoutMs = 180000;

export interface ExtensionStartupReadinessInput {
  extensionActive: boolean;
  registeredCommands: string[];
  requiredCommands: string[];
  workbenchText: string;
  logText: string;
}

export interface ExtensionStartupReadinessResult {
  ready: boolean;
  reasons: string[];
}

export function classifyExtensionStartupReadiness(input: ExtensionStartupReadinessInput): ExtensionStartupReadinessResult {
  const reasons: string[] = [];
  const combinedText = `${input.workbenchText}\n${input.logText}`.replace(/\s+/g, ' ').toLowerCase();

  if (!input.extensionActive) {
    reasons.push('extension-inactive');
  }

  const missingCommands = input.requiredCommands.filter((command) => !input.registeredCommands.includes(command));
  if (missingCommands.length > 0) {
    reasons.push(`commands-missing:${missingCommands.join(',')}`);
  }

  if (isBundlePending(input.workbenchText) || getLatestLogBundleState(input.logText) === 'pending') {
    reasons.push('extension-bundle-downloading');
  }

  if (
    /activat(?:e|ing|ion).*ms-azuretools\.vscode-azurelogicapps.*(?:fail|error)/.test(combinedText) ||
    /ms-azuretools\.vscode-azurelogicapps.*activat(?:e|ing|ion).*(?:fail|error)/.test(combinedText)
  ) {
    reasons.push('extension-activation-error');
  }

  return {
    ready: reasons.length === 0,
    reasons,
  };
}

function getLatestLogBundleState(logText: string): 'pending' | 'ready' | 'unknown' {
  const bundleLines = logText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && line.toLowerCase().includes('bundle'));

  for (const line of bundleLines.reverse()) {
    if (isBundleReady(line)) {
      return 'ready';
    }
    if (isBundlePending(line)) {
      return 'pending';
    }
  }

  return 'unknown';
}

function isBundlePending(value: string): boolean {
  const normalized = value.replace(/\s+/g, ' ').toLowerCase();
  return (
    /download(?:ing|ed)? (?:the )?(?:azure )?(?:functions )?extension bundle/.test(normalized) ||
    /(?:azure )?(?:functions )?extension bundle (?:is )?(?:download|downloading|install|installing|extract|extracting)/.test(normalized)
  );
}

function isBundleReady(value: string): boolean {
  const normalized = value.replace(/\s+/g, ' ').toLowerCase();
  return (
    /bundle healthy/.test(normalized) ||
    /(?:azure )?(?:functions )?extension bundle.*(?:ready|downloaded|installed|complete|completed|succeeded|healthy)/.test(normalized)
  );
}

export async function waitForLogicAppsExtensionStartupReady(options: {
  label: string;
  requiredCommands: string[];
  timeoutMs?: number;
}): Promise<void> {
  const deadline = Date.now() + (options.timeoutMs ?? getStartupReadyTimeoutMs());
  let lastSnapshot: Awaited<ReturnType<typeof collectExtensionStartupReadinessSnapshot>> | undefined;
  let lastResult: ExtensionStartupReadinessResult | undefined;

  while (Date.now() < deadline) {
    lastSnapshot = await collectExtensionStartupReadinessSnapshot(options.requiredCommands);
    lastResult = classifyExtensionStartupReadiness(lastSnapshot);
    if (lastResult.ready) {
      console.log(`[extension-startup] ${options.label}: ready`);
      return;
    }

    console.log(`[extension-startup] ${options.label}: waiting (${lastResult.reasons.join(', ')})`);
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  assert.fail(
    `[extension-startup] ${options.label}: Logic Apps extension was not ready before timeout. Reasons=${lastResult?.reasons.join(
      ', '
    )}. Snapshot=${JSON.stringify({
      extensionActive: lastSnapshot?.extensionActive,
      registeredCommands: lastSnapshot?.registeredCommands,
      workbenchTail: redactDiagnosticString(lastSnapshot?.workbenchText ?? '').slice(-1500),
      logTail: redactDiagnosticString(lastSnapshot?.logText ?? '').slice(-4000),
    })}`
  );
}

async function collectExtensionStartupReadinessSnapshot(requiredCommands: string[]): Promise<ExtensionStartupReadinessInput> {
  const extension = vscode.extensions.getExtension(logicAppsExtensionId);
  assert.ok(extension, `Expected ${logicAppsExtensionId} to be loaded from the extension development path`);
  if (!extension.isActive) {
    await Promise.resolve(extension.activate()).catch((error: unknown) => {
      console.warn(`[extension-startup] ${logicAppsExtensionId} activation attempt failed: ${String(error)}`);
    });
  }

  const commands = await vscode.commands.getCommands(true);
  const registeredCommands = requiredCommands.filter((command) => commands.includes(command));
  return {
    extensionActive: extension.isActive,
    registeredCommands,
    requiredCommands,
    workbenchText: await getWorkbenchText().catch((error) => `Unable to read workbench text: ${String(error)}`),
    logText: readRelevantLogicAppsLogTails(),
  };
}

function getStartupReadyTimeoutMs(): number {
  const configured = Number(process.env.LA_E2E_CLI_EXTENSION_STARTUP_READY_TIMEOUT_MS ?? '');
  return Number.isFinite(configured) && configured > 0 ? configured : defaultStartupReadyTimeoutMs;
}

async function getWorkbenchText(): Promise<string> {
  const cdp = await connectToVsCodeWorkbenchCdp({ activate: false, timeoutMs: 5000 });
  try {
    return await cdp.evaluate<string>(undefined, 'document.body?.innerText || ""', { timeoutMs: 3000 });
  } finally {
    cdp.dispose();
  }
}

function readRelevantLogicAppsLogTails(): string {
  return findRelevantVsCodeLogFiles()
    .slice(-8)
    .map((filePath) => `[${filePath}]\n${tailFile(filePath, 2500)}`)
    .join('\n');
}

function findRelevantVsCodeLogFiles(): string[] {
  const userDataDir = process.env.LA_E2E_CLI_USER_DATA_DIR;
  if (!userDataDir || !fs.existsSync(userDataDir)) {
    return [];
  }

  const logsDir = path.join(userDataDir, 'logs');
  if (!fs.existsSync(logsDir)) {
    return [];
  }

  return walkFiles(logsDir)
    .filter((filePath) => {
      const lowerPath = filePath.toLowerCase();
      return (
        lowerPath.includes('azure logic apps') ||
        lowerPath.includes('output_logging') ||
        lowerPath.endsWith(`${path.sep}exthost.log`) ||
        lowerPath.endsWith(`${path.sep}renderer.log`) ||
        lowerPath.endsWith(`${path.sep}main.log`)
      );
    })
    .sort((a, b) => fs.statSync(a).mtimeMs - fs.statSync(b).mtimeMs);
}

function walkFiles(directory: string): string[] {
  const result: string[] = [];
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      result.push(...walkFiles(entryPath));
    } else {
      result.push(entryPath);
    }
  }
  return result;
}

function tailFile(filePath: string, maxChars: number): string {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    return content.slice(-maxChars);
  } catch (error) {
    return `Unable to read ${filePath}: ${String(error)}`;
  }
}

function redactDiagnosticString(value: string): string {
  return value.replace(
    /(authorization|bearer|token|secret|password|key|connectionstring|clientsecret|access[_-]?token)(\s*[:=]\s*)([^\s,;"']+)/gi,
    '$1$2<redacted>'
  );
}
