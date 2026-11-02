export function formatErrorForDiagnostics(error: unknown): string;
export function diagnosticBinding(env?: NodeJS.ProcessEnv): Record<string, string | null>;
export function diagnosticState(value: unknown): unknown;
export function diagnosticError(error: unknown): unknown;
export function diagnosticOperationId(value: unknown): string | null;
export function getFuncDiagnosticProducer(channel: 'events' | 'startup', env?: NodeJS.ProcessEnv): DiagnosticProducer | undefined;
export interface DiagnosticSpan {
  id: string;
  end(state?: unknown): void;
  fail(error: unknown, state?: unknown): void;
}
export interface DiagnosticProducer {
  fork(producer: string): DiagnosticProducer;
  start(operation: string, state?: unknown, parentOperation?: string | null): DiagnosticSpan;
  emit(operation: string, status: string, details?: { state?: unknown; error?: unknown }): void;
  run<T>(operation: string, body: () => PromiseLike<T> | T, state?: unknown, parentOperation?: string | null): Promise<T>;
  summary(body: string, harness: string): void;
}
export function createDiagnosticProducer(options?: {
  sink?: (line: string) => void;
  binding?: Record<string, string | null>;
  producer?: string;
  maxEvents?: number;
  maxBytes?: number;
}): DiagnosticProducer;
export function fileDiagnosticSnapshot(file: string): unknown;
export function relayObserverDiagnostics(directory: string, trace: DiagnosticProducer): void;
export function observeFileOperation<T>(
  file: string, writer: string, operation: string, body: () => PromiseLike<T> | T, env?: NodeJS.ProcessEnv,
  owningBody?: (trace: DiagnosticProducer, parentOperation: string) => PromiseLike<T> | T
): Promise<T>;
export function writeFileWithDiagnostics(
  file: string, content: string, trace: DiagnosticProducer, parentOperation: string,
  io?: Pick<typeof fsPromises, 'open'>
): Promise<void>;
import type * as fsPromises from 'node:fs/promises';
