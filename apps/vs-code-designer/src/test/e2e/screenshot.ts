import { execFile } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { promisify } from 'util';
import { connectToVsCodeWorkbenchCdp } from './cdpClient';

const execFileAsync = promisify(execFile);
const screenshotRoot =
  process.env.LA_E2E_CLI_SCREENSHOT_DIR ?? path.resolve(__dirname, '..', '..', '..', '.vscode-test', 'screenshots', 'cli');
const failureAttachmentManifestPath = path.join(screenshotRoot, 'failure-attachments.json');

interface FailureScreenshotAttachment {
  label: string;
  testTitle: string;
  screenshotPath: string;
  createdAt: string;
}

export function installFailureScreenshotHook(): void {
  teardown(async function (this: { currentTest?: { state?: string; fullTitle?: () => string; title?: string } }) {
    if (this.currentTest?.state !== 'failed') {
      return;
    }

    const testTitle = this.currentTest.fullTitle?.() ?? this.currentTest.title ?? 'unknown test';
    const label = process.env.LA_E2E_CLI_LABEL ?? 'unknown';
    const screenshotPath = await captureCliScreenshot(`failure-${label}-${testTitle}-${Date.now()}`);
    if (!screenshotPath) {
      return;
    }

    appendFailureAttachment({
      label,
      testTitle,
      screenshotPath: path.resolve(screenshotPath),
      createdAt: new Date().toISOString(),
    });
  });
}

export async function captureCliScreenshot(name: string): Promise<string | undefined> {
  fs.mkdirSync(screenshotRoot, { recursive: true });

  const screenshotPath = path.join(screenshotRoot, `${sanitizeFileSegment(name)}.png`);
  try {
    const cdp = await connectToVsCodeWorkbenchCdp();
    try {
      return await captureCdpScreenshot(cdp, name);
    } finally {
      cdp.dispose();
    }
  } catch (error) {
    console.warn(`[screenshot] CDP screenshot failed: ${error instanceof Error ? error.message : String(error)}`);
  }

  if (process.platform === 'win32') {
    try {
      await captureWindowsScreenshot(screenshotPath);
      console.log(`[screenshot] Saved: ${screenshotPath}`);
      return screenshotPath;
    } catch (error) {
      console.warn(`[screenshot] Windows screenshot failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  return undefined;
}

export async function captureCdpScreenshot(
  cdp: { send(method: string, params?: Record<string, unknown>): Promise<unknown> },
  name: string,
  options: { captureBeyondViewport?: boolean } = {}
): Promise<string | undefined> {
  fs.mkdirSync(screenshotRoot, { recursive: true });

  const screenshotPath = path.join(screenshotRoot, `${sanitizeFileSegment(name)}.png`);
  const response = (await cdp.send('Page.captureScreenshot', {
    format: 'png',
    captureBeyondViewport: options.captureBeyondViewport ?? true,
  })) as {
    result?: { data?: string };
  };
  const data = response.result?.data;
  if (!data) {
    console.log(`[screenshot] CDP screenshot unavailable: ${screenshotPath}`);
    return undefined;
  }

  fs.writeFileSync(screenshotPath, Buffer.from(data, 'base64'));
  console.log(`[screenshot] Saved: ${screenshotPath}`);
  return screenshotPath;
}

function sanitizeFileSegment(value: string): string {
  return value.replace(/[^a-z0-9_-]+/gi, '-').replace(/^-+|-+$/g, '') || 'screenshot';
}

function appendFailureAttachment(entry: FailureScreenshotAttachment): void {
  fs.mkdirSync(path.dirname(failureAttachmentManifestPath), { recursive: true });
  const existingEntries = readFailureAttachments();
  fs.writeFileSync(failureAttachmentManifestPath, `${JSON.stringify([...existingEntries, entry], null, 2)}\n`);
}

function readFailureAttachments(): FailureScreenshotAttachment[] {
  if (!fs.existsSync(failureAttachmentManifestPath)) {
    return [];
  }

  try {
    const value = JSON.parse(fs.readFileSync(failureAttachmentManifestPath, 'utf-8'));
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}

async function captureWindowsScreenshot(screenshotPath: string): Promise<void> {
  const escapedScreenshotPath = screenshotPath.replace(/'/g, "''");
  const script = `
Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing
$bounds = [System.Windows.Forms.SystemInformation]::VirtualScreen
$bitmap = New-Object System.Drawing.Bitmap $bounds.Width, $bounds.Height
$graphics = [System.Drawing.Graphics]::FromImage($bitmap)
try {
  $graphics.CopyFromScreen($bounds.Left, $bounds.Top, 0, 0, $bounds.Size)
  $bitmap.Save('${escapedScreenshotPath}', [System.Drawing.Imaging.ImageFormat]::Png)
} finally {
  $graphics.Dispose()
  $bitmap.Dispose()
}
`;
  const encodedCommand = Buffer.from(script, 'utf16le').toString('base64');

  await execFileAsync('powershell.exe', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-Sta', '-EncodedCommand', encodedCommand], {
    timeout: 15000,
  });
}
