import { vi } from 'vitest';
// VS Code API mock for testing
import * as path from 'path';

export const window = {
    showInformationMessage: vi.fn(),
    showErrorMessage: vi.fn(),
    showWarningMessage: vi.fn(),
    showOpenDialog: vi.fn(),
    showSaveDialog: vi.fn(),
    showInputBox: vi.fn(),
    createOutputChannel: vi.fn(() => outputChannel),
    registerCustomEditorProvider: vi.fn(() => ({ dispose: vi.fn() })),
    registerTreeDataProvider: vi.fn(() => ({ dispose: vi.fn() }))
};

export const outputChannel = {
    appendLine: vi.fn(),
    show: vi.fn(),
    dispose: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    trace: vi.fn()
};

export const workspace = {
    fs: {
        readFile: vi.fn(),
        writeFile: vi.fn(),
        readDirectory: vi.fn(async () => []),
        createDirectory: vi.fn(),
        copy: vi.fn(),
        delete: vi.fn()
    },
    createFileSystemWatcher: vi.fn(() => ({
        onDidCreate: vi.fn(),
        onDidDelete: vi.fn(),
        dispose: vi.fn()
    })),
    findFiles: vi.fn(),
    asRelativePath: vi.fn()
};

export const FileType = { Unknown: 0, File: 1, Directory: 2, SymbolicLink: 64 };

export const Uri = {
    file: (filePath: string) => ({ scheme: 'file', fsPath: filePath, path: filePath.replace(/\\/g, '/'), toString: () => filePath }),
    parse: (value: string) => {
        const parsed = new URL(value);
        return {
            scheme: parsed.protocol.slice(0, -1),
            authority: parsed.host,
            fsPath: parsed.pathname,
            path: parsed.pathname,
            toString: () => value,
        };
    },
    joinPath: (base: { scheme?: string; authority?: string; fsPath: string; path: string }, ...segments: string[]) => {
        const uriPath = path.posix.join(base.path, ...segments);
        const fsPath = base.scheme === 'file' || !base.scheme ? path.join(base.fsPath, ...segments) : uriPath;
        const value = base.scheme && base.scheme !== 'file' ? `${base.scheme}://${base.authority ?? ''}${uriPath}` : fsPath;
        return { ...base, fsPath, path: uriPath, toString: () => value };
    },
};

export const commands = {
    registerCommand: vi.fn(),
    executeCommand: vi.fn()
};

export class RelativePattern {
    constructor(
        public readonly base: string,
        public readonly pattern: string
    ) {}
}

export class EventEmitter<T> {
    public readonly event = vi.fn();
    public fire = vi.fn<void, [T]>();
    public dispose = vi.fn();
}

export class TreeItem {
    public tooltip?: string;
    public description?: string;
    public iconPath?: unknown;
    public command?: unknown;
    public contextValue?: string;

    constructor(
        public readonly label: string,
        public readonly collapsibleState: number
    ) {}
}

export const TreeItemCollapsibleState = {
    None: 0,
    Collapsed: 1,
    Expanded: 2
};

export class ThemeIcon {
    constructor(public readonly id: string) {}
}

export const Disposable = {
    from: vi.fn((...items: Array<{ dispose(): void }>) => ({
        dispose: () => items.forEach(item => item.dispose())
    }))
};
