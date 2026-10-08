import * as assert from 'assert';
import { randomUUID } from 'crypto';
import { abortable, remainingMs, withinDeadline } from './statelessVariablesControls';

export interface StatelessDebugSession {
  id: string;
  workspacePath: string;
  ownerTag: string | undefined;
  stop(): PromiseLike<void>;
}

export interface StatelessDebugTask {
  id: string;
  workspacePath: string;
  name: string;
  terminate(): void;
}

interface Attempt {
  tag: string;
  settled: boolean;
  started: boolean;
  taskStarted: boolean;
  cancelled: boolean;
  result?: boolean;
}

export async function coordinateStatelessStartup(
  signal: AbortSignal,
  readiness: (startupSignal: AbortSignal) => Promise<void>,
  monitorPrompts: (startupSignal: AbortSignal, isReady: () => boolean) => Promise<void>,
  cancelOwned: () => void
): Promise<void> {
  const startup = new AbortController();
  const cancelStartup = () => {
    startup.abort(signal.reason);
    cancelOwned();
  };
  signal.addEventListener('abort', cancelStartup, { once: true });
  if (signal.aborted) {
    cancelStartup();
  }
  let ready = false;
  const cancelSibling = (error: unknown) => {
    startup.abort(error);
    cancelOwned();
  };
  const readinessTask = readiness(startup.signal)
    .then(() => {
      ready = true;
    })
    .catch((error) => {
      cancelSibling(error);
      throw error;
    });
  const promptTask = monitorPrompts(startup.signal, () => ready).catch((error) => {
    cancelSibling(error);
    throw error;
  });
  try {
    const results = await Promise.allSettled([readinessTask, promptTask]);
    const failures = results.flatMap((result) => (result.status === 'rejected' ? [result.reason] : []));
    if (failures.length > 0) {
      throw new AggregateError(failures, 'Owned stateless debug startup failed');
    }
    startup.signal.throwIfAborted();
  } finally {
    signal.removeEventListener('abort', cancelStartup);
  }
}

/** Test-window handles only, not OS process discovery or a process-owner protocol.
 * Listeners stay armed on failure so a resolving late launch is stopped by exact
 * session marker + workspace identity, even after a bounded quiescence failure. */
export class StatelessOwnedDebug {
  private readonly attempts = new Map<string, Attempt>();
  private readonly sessions = new Map<string, StatelessDebugSession>();
  private readonly tasks = new Map<string, { task: StatelessDebugTask; ownerTag: string }>();
  private readonly stopping = new Set<string>();
  private readonly terminating = new Set<string>();
  private readonly stopJobs = new Set<Promise<void>>();
  private readonly cleanupErrors: unknown[] = [];

  constructor(
    private readonly workspacePath: string,
    private readonly preLaunchTask: string,
    private readonly launch: (tag: string) => PromiseLike<boolean>
  ) {}

  async start(signal: AbortSignal): Promise<void> {
    signal.throwIfAborted();
    assert.ok(this.isQuiescent(), 'An earlier owned launch must quiesce before another debug start');
    const attempt: Attempt = { tag: randomUUID(), settled: false, started: false, taskStarted: false, cancelled: false };
    this.attempts.set(attempt.tag, attempt);
    const cancel = () => {
      attempt.cancelled = true;
      this.stopOwnedHandles(attempt.tag);
    };
    signal.addEventListener('abort', cancel, { once: true });
    // Never discard this underlying promise when the caller's abort wins.
    const operation = Promise.resolve()
      .then(() => {
        signal.throwIfAborted();
        return this.launch(attempt.tag);
      })
      .then(
        (result) => {
          attempt.result = result;
          attempt.settled = true;
          if (attempt.cancelled) {
            this.stopOwnedHandles(attempt.tag);
          }
          return result;
        },
        (error) => {
          attempt.settled = true;
          throw error;
        }
      );
    try {
      assert.strictEqual(await abortable(operation, signal), true, 'VS Code reported startDebugging=false');
    } finally {
      signal.removeEventListener('abort', cancel);
      if (signal.aborted) {
        cancel();
      }
    }
  }

  sessionStarted(session: StatelessDebugSession): void {
    const attempt = session.ownerTag ? this.attempts.get(session.ownerTag) : undefined;
    if (!attempt || session.workspacePath !== this.workspacePath) {
      return; // Explicitly foreign sessions are never stopped.
    }
    attempt.started = true;
    this.sessions.set(session.id, session);
    if (attempt.cancelled) {
      this.stopOwnedHandles(attempt.tag);
    }
  }

  sessionEnded(id: string): void {
    this.sessions.delete(id);
  }

  taskStarted(task: StatelessDebugTask): void {
    const pending = [...this.attempts.values()].find((attempt) => !attempt.settled);
    if (task.workspacePath !== this.workspacePath || task.name !== this.preLaunchTask || !pending) {
      return;
    }
    this.tasks.set(task.id, { task, ownerTag: pending.tag });
    pending.taskStarted = true;
    if (pending.cancelled) {
      this.stopOwnedHandles(pending.tag);
    }
  }

  taskEnded(id: string): void {
    this.tasks.delete(id);
  }

  cancel(): void {
    for (const attempt of this.attempts.values()) {
      attempt.cancelled = true;
    }
    this.stopOwnedHandles();
  }

  async quiesce(deadline: number): Promise<void> {
    this.cancel();
    await withinDeadline(deadline, 'owned debug quiescence', async () => {
      while (!this.isQuiescent()) {
        this.throwCleanupErrors();
        await new Promise((resolve) => setTimeout(resolve, remainingMs(deadline, 20)));
      }
      this.throwCleanupErrors();
    });
  }

  private isQuiescent(): boolean {
    return (
      [...this.attempts.values()].every(
        (attempt) => attempt.settled && (attempt.result !== true || (attempt.started && attempt.taskStarted))
      ) &&
      this.sessions.size === 0 &&
      this.tasks.size === 0 &&
      this.stopJobs.size === 0
    );
  }

  private stopOwnedHandles(ownerTag?: string): void {
    const sessions = [...this.sessions.values()].filter(
      (session) => (!ownerTag || session.ownerTag === ownerTag) && !this.stopping.has(session.id)
    );
    const tasks = [...this.tasks.values()]
      .filter(({ task, ownerTag: taskOwner }) => (!ownerTag || taskOwner === ownerTag) && !this.terminating.has(task.id))
      .map(({ task }) => task);
    if (sessions.length === 0 && tasks.length === 0) {
      return;
    }
    sessions.forEach((session) => this.stopping.add(session.id));
    tasks.forEach((task) => this.terminating.add(task.id));
    const job = Promise.all(
      sessions.map((session) =>
        Promise.resolve()
          .then(() => session.stop())
          .catch((error) => {
            this.cleanupErrors.push(error);
          })
      )
    ).then(() => {
      for (const task of tasks) {
        if (!this.tasks.has(task.id)) {
          continue;
        }
        try {
          task.terminate();
        } catch (error) {
          this.cleanupErrors.push(error);
        }
      }
    });
    this.stopJobs.add(job);
    job.then(() => this.stopJobs.delete(job));
  }

  private throwCleanupErrors(): void {
    if (this.cleanupErrors.length > 0) {
      throw new AggregateError(this.cleanupErrors, 'Matching owned debug cleanup failed');
    }
  }
}
