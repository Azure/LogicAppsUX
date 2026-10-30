import { performance } from 'node:perf_hooks';

export interface ReadinessClock {
  now(): number;
  schedule(callback: () => void, delayMs: number): () => void;
}

interface ActivityCapture {
  dispose(): unknown;
}

interface CSharpApi {
  captureActivityLogs(): unknown;
}

const systemClock: ReadinessClock = {
  now: () => performance.now(),
  schedule(callback, delayMs) {
    const timer = setTimeout(callback, delayMs);
    return () => clearTimeout(timer);
  },
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isCSharpApi(value: unknown): value is CSharpApi {
  return isRecord(value) && typeof value.captureActivityLogs === 'function';
}

function isActivityCapture(value: unknown): value is ActivityCapture {
  return isRecord(value) && typeof value.dispose === 'function';
}

/**
 * unitTests-only ordering experiment, not a shutdown/quiescence contract.
 * The pinned C# API awaits serverStartedPromise (not project initialization).
 * Never activate a dependency here, read captured logs, or force its shutdown.
 */
export async function observeCSharpReadiness(
  extension: unknown,
  budgetMs: number,
  clock: ReadinessClock = systemClock,
  reportLateFailure: (message: string, error: unknown) => void = console.error
): Promise<void> {
  if (!Number.isFinite(budgetMs) || budgetMs <= 0) {
    throw new Error('C# dependency readiness requires a positive finite deadline budget');
  }
  const deadline = clock.now() + budgetMs;
  const deadlineError = new Error(`C# dependency readiness capture/disposal exceeded its ${budgetMs}ms absolute deadline`);
  const assertBeforeDeadline = () => {
    if (clock.now() >= deadline) {
      throw deadlineError;
    }
  };
  let timedOut = false;
  let cancelDeadline!: () => void;
  const timeout = new Promise<never>((_resolve, reject) => {
    cancelDeadline = clock.schedule(
      () => {
        timedOut = true;
        reject(deadlineError);
      },
      Math.max(0, deadline - clock.now())
    );
  });
  const observation = (async () => {
    if (!isRecord(extension) || extension.isActive !== true) {
      throw new Error('Expected already-active ms-dotnettools.csharp dependency; readiness will not activate it');
    }
    const api: unknown = extension.exports;
    if (!isCSharpApi(api)) {
      throw new Error('Active ms-dotnettools.csharp is missing expected captureActivityLogs() API');
    }
    assertBeforeDeadline();
    const capture: unknown = await api.captureActivityLogs();
    if (!isActivityCapture(capture)) {
      throw new Error('C# captureActivityLogs() did not return a disposable activity capture');
    }
    // Always dispose, even when capture arrives after the deadline. The original
    // timeout stays failed; this continuation cannot make the hook successful.
    await capture.dispose();
    assertBeforeDeadline();
  })();
  observation.catch((error: unknown) => {
    if (timedOut && error !== deadlineError) {
      reportLateFailure('[dependency-readiness] Late C# capture/disposal failed after deadline', error);
    }
  });
  try {
    await Promise.race([observation, timeout]);
  } finally {
    cancelDeadline();
  }
}
