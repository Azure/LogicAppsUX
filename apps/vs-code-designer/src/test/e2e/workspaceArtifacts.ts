import * as assert from 'assert';
import * as fs from 'fs';
import * as path from 'path';

export function hasCsproj(folderPath: string): boolean {
  return fs.existsSync(folderPath) && fs.readdirSync(folderPath).some((entry) => entry.endsWith('.csproj'));
}

export function requiredValue(value: string | undefined): string {
  assert.ok(value, 'Expected required workspace creation value to be defined');
  return value;
}

export async function waitForPathExists(filePath: string, timeoutMs: number): Promise<void> {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    if (fs.existsSync(filePath)) {
      return;
    }

    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  const parentPath = path.dirname(filePath);
  const parentContents = fs.existsSync(parentPath) ? fs.readdirSync(parentPath) : ['(parent missing)'];
  assert.fail(`Timed out waiting for generated path ${filePath}. Parent contents: ${JSON.stringify(parentContents)}`);
}
