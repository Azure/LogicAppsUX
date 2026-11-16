// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

import type { WebDriver } from 'vscode-extension-tester';
import { sleep } from './helpers';

const REGENERATION_PROMPT = 'The .vscode configuration files will be regenerated to match the current project settings';

/** Confirm only the visible regeneration prompt, if it appears. */
export async function confirmVSCodeRegenerationIfVisible(driver: WebDriver): Promise<boolean> {
  await driver.switchTo().defaultContent();

  const clicked = await driver.executeScript<boolean>((prompt: string) => {
    const dialogs = Array.from(document.querySelectorAll<HTMLElement>('[role="dialog"], .monaco-dialog-box'));
    for (const dialog of dialogs) {
      const style = getComputedStyle(dialog);
      if (
        style.display === 'none' ||
        style.visibility === 'hidden' ||
        style.opacity === '0' ||
        dialog.getClientRects().length === 0 ||
        dialog.querySelector('[role="dialog"], .monaco-dialog-box') ||
        !(dialog.textContent || '').includes(prompt)
      ) {
        continue;
      }

      const buttons = Array.from(dialog.querySelectorAll<HTMLElement>('button, .monaco-text-button'));
      const yesButton = buttons.find((button) => {
        const buttonStyle = getComputedStyle(button);
        return (
          (button.textContent || '').trim() === 'Yes' &&
          buttonStyle.display !== 'none' &&
          buttonStyle.visibility !== 'hidden' &&
          buttonStyle.opacity !== '0' &&
          button.getClientRects().length > 0 &&
          !button.hasAttribute('disabled') &&
          button.getAttribute('aria-disabled') !== 'true'
        );
      });
      if (yesButton) {
        yesButton.click();
        return true;
      }
    }
    return false;
  }, REGENERATION_PROMPT);

  if (clicked === true) {
    console.log('[nugetDebugConversion] Clicked Yes on .vscode regeneration prompt');
  }
  return clicked === true;
}

/**
 * Regeneration can finish without a prompt. Keep polling the exact file
 * assertions while opportunistically confirming the matching prompt.
 */
export async function waitForExactNugetDebugFiles(driver: WebDriver, assertFiles: () => void, timeoutMs: number): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  let lastError: unknown;
  while (Date.now() < deadline) {
    await confirmVSCodeRegenerationIfVisible(driver);
    try {
      assertFiles();
      return;
    } catch (error) {
      lastError = error;
    }
    await sleep(1000);
  }

  throw new Error(
    `Timed out waiting for exact converted NuGet .vscode files: ${lastError instanceof Error ? lastError.message : String(lastError)}`
  );
}
