/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as path from 'path';

export class ProjectOverviewAbortError extends Error {
  public constructor(message = 'Project overview operation was cancelled.') {
    super(message);
    this.name = 'AbortError';
  }
}

export class ProjectOverviewTimeoutError extends Error {
  public constructor(public readonly timeoutMs: number) {
    super(`Project overview operation timed out after ${timeoutMs}ms.`);
    this.name = 'ProjectOverviewTimeoutError';
  }
}

export function throwIfAborted(signal?: AbortSignal): void {
  if (signal?.aborted) {
    throw new ProjectOverviewAbortError();
  }
}

export function canonicalizeWorkflowPath(workflowPath: string): string {
  const normalized = path.normalize(path.resolve(workflowPath)).replace(/[\\/]+$/, '');
  return process.platform === 'win32' ? normalized.toLowerCase() : normalized;
}

export function canonicalizeWorkflowName(workflowName: string): string {
  return workflowName.trim().toLocaleLowerCase('en-US');
}

export async function withTimeout<T>(operation: Promise<T>, timeoutMs: number, signal?: AbortSignal): Promise<T> {
  throwIfAborted(signal);

  return await new Promise<T>((resolve, reject) => {
    let settled = false;
    const finish = (complete: () => void): void => {
      if (settled) {
        return;
      }
      settled = true;
      clearTimeout(timeout);
      signal?.removeEventListener('abort', onAbort);
      complete();
    };
    const timeout = setTimeout(() => finish(() => reject(new ProjectOverviewTimeoutError(timeoutMs))), timeoutMs);
    const onAbort = () => finish(() => reject(new ProjectOverviewAbortError()));

    signal?.addEventListener('abort', onAbort, { once: true });
    operation.then(
      (value) => finish(() => resolve(value)),
      (error) => finish(() => reject(error))
    );
  });
}

export async function mapWithConcurrency<T, R>(
  values: readonly T[],
  concurrency: number,
  mapper: (value: T, index: number) => Promise<R>,
  signal?: AbortSignal
): Promise<R[]> {
  if (!Number.isInteger(concurrency) || concurrency < 1) {
    throw new Error('Concurrency must be a positive integer.');
  }

  const results = new Array<R>(values.length);
  let nextIndex = 0;
  const worker = async (): Promise<void> => {
    while (nextIndex < values.length) {
      throwIfAborted(signal);
      const index = nextIndex++;
      results[index] = await mapper(values[index], index);
    }
  };

  await Promise.all(Array.from({ length: Math.min(concurrency, values.length) }, worker));
  return results;
}
