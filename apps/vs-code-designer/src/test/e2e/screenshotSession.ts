export interface OwnedScreenshotConnection {
  readonly targetId?: string;
  readonly isClosed: boolean;
  dispose(): void;
  unref(): void;
  onDidClose(listener: () => void): () => void;
}

/**
 * One invocation-owned CDP session. Chromium clears emulation when its owning
 * session disconnects, so ordinary screenshot wrappers must not dispose it
 * between interactions. Target closure/replacement and invocation teardown do.
 */
export class EvidenceScreenshotSession<T extends OwnedScreenshotConnection> {
  private current?: T;
  private removeCloseListener?: () => void;
  private opening?: Promise<T>;
  private disposed = false;

  constructor(
    private readonly resolveTargetId: (deadline: number) => Promise<string>,
    private readonly connect: (deadline: number) => Promise<T>
  ) {}

  async acquire(deadline: number): Promise<T> {
    if (this.disposed) {
      throw new Error('Evidence screenshot invocation has already ended');
    }
    const targetId = await this.resolveTargetId(deadline);
    if (this.disposed) {
      throw new Error('Evidence screenshot invocation ended during target resolution');
    }
    if (this.current?.targetId === targetId && !this.current.isClosed) {
      return this.current;
    }
    this.closeCurrent();
    if (!this.opening) {
      this.opening = this.connect(deadline).then((connection) => {
        if (this.disposed || connection.isClosed || connection.targetId !== targetId) {
          connection.dispose();
          throw new Error('Evidence screenshot owner changed or ended during connection');
        }
        connection.unref(); // Never keep an otherwise finished invocation alive.
        this.current = connection;
        this.removeCloseListener = connection.onDidClose(() => {
          if (this.current === connection) {
            this.current = undefined;
            this.removeCloseListener = undefined;
          }
        });
        return connection;
      });
    }
    const opening = this.opening;
    try {
      const connection = await opening;
      if (connection.targetId !== targetId) {
        throw new Error('Evidence screenshot target changed during concurrent acquisition');
      }
      return connection;
    } finally {
      if (this.opening === opening) {
        this.opening = undefined;
      }
    }
  }

  dispose(): void {
    this.disposed = true;
    this.closeCurrent();
    // An in-flight connect observes disposed and closes its eventual socket.
  }

  private closeCurrent(): void {
    this.removeCloseListener?.();
    this.removeCloseListener = undefined;
    this.current?.dispose();
    this.current = undefined;
  }
}
