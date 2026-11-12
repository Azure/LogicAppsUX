import type { CdpConnection, CdpDebuggerEvent } from './cdpClient';
import { livePhysicalWorkspaceExpression, ScreenshotCaptureCleanupError, type LivePhysicalWorkspace } from './physicalWorkspaceIdentity';
import type { PhysicalWorkspaceIdentityAuthority, PhysicalWorkspaceIdentityLease } from './screenshot';

export type RegenerationPausableConnection = Pick<
  CdpConnection,
  'targetId' | 'contextGeneration' | 'onDebuggerEvent' | 'send' | 'evaluate'
>;

function budget(deadline: number, maximum: number): number {
  const left = deadline - Date.now();
  if (left <= 0) {
    throw new Error('physical workspace deadline exhausted');
  }
  return Math.min(left, maximum);
}

/**
 * Freezes only the already-decided failure window. Unlike workspace events
 * delivered from an extension host, a paused renderer cannot mutate its
 * workspace model between the ownership checks and the screenshot.
 */
export function regenerationPhysicalWorkspaceAuthority(cdp: RegenerationPausableConnection): PhysicalWorkspaceIdentityAuthority {
  return {
    async arm(targetId, timeOrigin, deadline): Promise<PhysicalWorkspaceIdentityLease> {
      if (!targetId || cdp.targetId !== targetId || !Number.isFinite(timeOrigin) || timeOrigin <= 0) {
        throw new Error('physical workspace unavailable');
      }
      const generation = cdp.contextGeneration;
      let invalidated = false;
      let closing = false;
      let enabled = false;
      let pauseRequested = false;
      let paused = false;
      let preexistingPause = false;
      let stage: 'debugger-enable' | 'debugger-pause' | 'renderer-validation' = 'debugger-enable';
      let resolvePaused: ((frameId: string) => void) | undefined;
      let rejectPaused: ((error: Error) => void) | undefined;
      const onEvent = (event: CdpDebuggerEvent) => {
        if (event.method === 'Debugger.resumed') {
          if (!closing) {
            invalidated = true;
          }
          return;
        }
        if (!pauseRequested || paused || !event.callFrameId) {
          preexistingPause ||= !pauseRequested;
          invalidated = true;
          rejectPaused?.(new Error('renderer pause unavailable'));
          return;
        }
        paused = true;
        resolvePaused?.(event.callFrameId);
      };
      const detach = cdp.onDebuggerEvent(onEvent, () => {
        invalidated = true;
        rejectPaused?.(new Error('renderer pause unavailable'));
      });
      let cleanup: Promise<void> | undefined;
      const dispose = (): Promise<void> => {
        if (cleanup) {
          return cleanup;
        }
        closing = true;
        cleanup = (async () => {
          try {
            if (pauseRequested) {
              try {
                await cdp.send('Debugger.resume', undefined, { timeoutMs: 1000 });
              } catch {
                // Disabling the domain below is the fallback for a timed-out pause.
              }
            }
            if (enabled) {
              await cdp.send('Debugger.disable', undefined, { timeoutMs: 1000 });
            }
            if (pauseRequested || preexistingPause) {
              await cdp.evaluate(undefined, 'true', { timeoutMs: 1000 });
            }
          } finally {
            detach();
          }
        })();
        return cleanup;
      };

      try {
        await cdp.send('Debugger.enable', undefined, { timeoutMs: budget(deadline, 2000) });
        enabled = true;
        if (invalidated) {
          throw new Error('renderer was already paused');
        }
        stage = 'debugger-pause';
        const pauseBudget = budget(deadline, 2000);
        let timer: NodeJS.Timeout | undefined;
        const pauseEvent = new Promise<string>((resolve, reject) => {
          resolvePaused = resolve;
          rejectPaused = reject;
          timer = setTimeout(() => reject(new Error('renderer pause timed out')), pauseBudget);
        });
        pauseRequested = true;
        try {
          const pauseRequest = Promise.resolve().then(() => cdp.send('Debugger.pause', undefined, { timeoutMs: pauseBudget }));
          await Promise.all([pauseRequest, pauseEvent]);
        } finally {
          clearTimeout(timer);
          resolvePaused = undefined;
          rejectPaused = undefined;
        }
        stage = 'renderer-validation';
        if (invalidated || cdp.targetId !== targetId || cdp.contextGeneration !== generation) {
          throw new Error('renderer changed');
        }
        const evaluate = async <T>(expression: string, evaluateDeadline: number): Promise<T> => {
          if (invalidated || closing || cdp.targetId !== targetId || cdp.contextGeneration !== generation) {
            throw new Error('renderer changed');
          }
          const response = await cdp.send(
            'Runtime.evaluate',
            { expression, returnByValue: true, awaitPromise: false, silent: true },
            { timeoutMs: budget(evaluateDeadline, 1000) }
          );
          if (response.result?.exceptionDetails || invalidated || cdp.targetId !== targetId || cdp.contextGeneration !== generation) {
            throw new Error('paused renderer evaluation unavailable');
          }
          return response.result?.result?.value as T;
        };
        return {
          get invalidated() {
            return invalidated || closing || cdp.targetId !== targetId || cdp.contextGeneration !== generation;
          },
          async read(readDeadline) {
            const workspace = await evaluate<LivePhysicalWorkspace>(livePhysicalWorkspaceExpression, readDeadline);
            return {
              ...workspace,
              targetId,
              rendererInstance: `${targetId}:${timeOrigin}`,
              revision: 0,
            };
          },
          evaluate,
          dispose,
        };
      } catch {
        console.warn(`[workspace-regeneration-diagnostics] physical-identity-unavailable:${stage}`);
        try {
          await dispose();
        } catch {
          console.warn('[workspace-regeneration-diagnostics] renderer-resume-unavailable');
          throw new ScreenshotCaptureCleanupError();
        }
        throw new Error('physical workspace unavailable');
      }
    },
  };
}
