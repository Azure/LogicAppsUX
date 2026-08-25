import { execFile } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);
const screenshotRoot =
  process.env.LA_E2E_CLI_SCREENSHOT_DIR ?? path.resolve(__dirname, '..', '..', '..', '.vscode-test', 'screenshots', 'cli');

export async function captureCliScreenshot(name: string): Promise<string | undefined> {
  fs.mkdirSync(screenshotRoot, { recursive: true });

  const screenshotPath = path.join(screenshotRoot, `${sanitizeFileSegment(name)}.png`);
  if (process.platform !== 'win32') {
    console.log(`[screenshot] Skipping CLI screenshot on unsupported platform: ${process.platform}`);
    return undefined;
  }

  await captureWindowsScreenshot(screenshotPath);
  console.log(`[screenshot] Saved: ${screenshotPath}`);
  return screenshotPath;
}

export async function captureCdpScreenshot(
  cdp: { send(method: string, params?: Record<string, unknown>): Promise<unknown> },
  name: string
): Promise<string | undefined> {
  fs.mkdirSync(screenshotRoot, { recursive: true });

  const screenshotPath = path.join(screenshotRoot, `${sanitizeFileSegment(name)}.png`);
  const response = (await cdp.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true })) as {
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
