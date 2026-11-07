/**
 * Render the workbench at 4K, independently of the host desktop's size/DPI.
 * --window-size is only a launch hint: Code can restore or clamp native bounds.
 * CDP metrics cause real layout/rasterization, not bitmap upscaling. Input
 * coordinates remain CSS pixels because the device scale factor is one.
 */
export const evidenceScreenshotViewport = { width: 3840, height: 2160, deviceScaleFactor: 1 } as const;

export async function prepareEvidenceScreenshotViewport(
  cdp: {
    readonly targetUrl?: string;
    send(method: string, params?: Record<string, unknown>, options?: { timeoutMs?: number }): Promise<unknown>;
  },
  deadline: number
): Promise<void> {
  if (cdp.targetUrl && !cdp.targetUrl.includes('/workbench/workbench.html')) {
    throw new Error('4K screenshot metrics may only be applied to the owning workbench target');
  }
  const budget = deadline - Date.now();
  if (budget <= 0) {
    throw new Error('Screenshot deadline expired before preparing the 4K viewport');
  }
  await cdp.send(
    'Emulation.setDeviceMetricsOverride',
    {
      ...evidenceScreenshotViewport,
      mobile: false,
      screenWidth: evidenceScreenshotViewport.width,
      screenHeight: evidenceScreenshotViewport.height,
    },
    { timeoutMs: Math.min(2000, budget) }
  );
}

export function readScreenshotPngDimensions(png: Buffer): { width: number; height: number } {
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  if (png.length < 33 || !png.subarray(0, 8).equals(signature) || png.readUInt32BE(8) !== 13 || png.toString('ascii', 12, 16) !== 'IHDR') {
    throw new Error('CDP screenshot did not return a PNG with an IHDR');
  }
  const width = png.readUInt32BE(16);
  const height = png.readUInt32BE(20);
  if (!width || !height) {
    throw new Error('CDP screenshot returned invalid PNG dimensions');
  }
  return { width, height };
}

export function assertEvidenceScreenshotDimensions(png: Buffer): void {
  const { width, height } = readScreenshotPngDimensions(png);
  if (width !== evidenceScreenshotViewport.width || height !== evidenceScreenshotViewport.height) {
    throw new Error(`Evidence screenshot must be native 3840x2160; CDP returned ${width}x${height}`);
  }
}
