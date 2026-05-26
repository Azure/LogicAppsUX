import { describe, it, expect, vi } from 'vitest';
import * as path from 'path';

// Unmock fs so we can read the actual package.json
vi.unmock('fs');
import * as fs from 'fs';

describe('DevContainer feature visibility', () => {
  // package.json is at the root of vs-code-designer
  // __dirname in vitest resolves to the source directory (src/__test__)
  const packageJsonPath = path.resolve(__dirname, '..', 'package.json');
  let packageJson: any;
  try {
    packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
  } catch {
    // Fallback: try from project root
    const fallback = path.resolve(__dirname, '..', '..', 'package.json');
    packageJson = JSON.parse(fs.readFileSync(fallback, 'utf-8'));
  }

  it('should hide enableDevContainer command from the command palette', () => {
    const commandPalette = packageJson.contributes?.menus?.commandPalette;
    expect(commandPalette).toBeDefined();

    const entry = commandPalette.find(
      (item: { command: string; when?: string }) => item.command === 'azureLogicAppsStandard.enableDevContainer'
    );
    expect(entry).toBeDefined();
    expect(entry.when).toBe('never');
  });

  it('should still register enableDevContainer in the commands array', () => {
    const commands = packageJson.contributes?.commands;
    expect(commands).toBeDefined();

    const cmd = commands.find((c: { command: string }) => c.command === 'azureLogicAppsStandard.enableDevContainer');
    expect(cmd).toBeDefined();
    expect(cmd.title).toBe('Enable Dev Container For Project');
  });
});
