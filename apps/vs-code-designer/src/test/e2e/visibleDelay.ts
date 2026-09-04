export async function waitForVisibleDelay(context: string): Promise<void> {
  const visibleDelayMs = Number(process.env.LA_E2E_CLI_VISIBLE_DELAY_MS ?? '0');
  if (visibleDelayMs > 0) {
    console.log(`[activation-smoke] Keeping VS Code visible for ${visibleDelayMs}ms before closing (${context})`);
    await new Promise((resolve) => setTimeout(resolve, visibleDelayMs));
  }
}
