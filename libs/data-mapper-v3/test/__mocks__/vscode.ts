// VS Code API mock for testing
import * as path from 'path';

export const window = {
    showInformationMessage: jest.fn(),
    showErrorMessage: jest.fn(),
    showWarningMessage: jest.fn(),
    showOpenDialog: jest.fn(),
    showSaveDialog: jest.fn(),
    showInputBox: jest.fn(),
    createOutputChannel: jest.fn(() => outputChannel),
    registerCustomEditorProvider: jest.fn(() => ({ dispose: jest.fn() })),
    registerTreeDataProvider: jest.fn(() => ({ dispose: jest.fn() }))
};

export const outputChannel = {
    appendLine: jest.fn(),
    show: jest.fn(),
    dispose: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
    trace: jest.fn()
};

export const workspace = {
    fs: {
        readFile: jest.fn(),
        writeFile: jest.fn(),
        readDirectory: jest.fn().mockResolvedValue([]),
        createDirectory: jest.fn(),
        copy: jest.fn(),
        delete: jest.fn()
    },
    createFileSystemWatcher: jest.fn(() => ({
        onDidCreate: jest.fn(),
        onDidDelete: jest.fn(),
        dispose: jest.fn()
    })),
    findFiles: jest.fn(),
    asRelativePath: jest.fn()
};

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
    registerCommand: jest.fn(),
    executeCommand: jest.fn()
};

export class RelativePattern {
    constructor(
        public readonly base: string,
        public readonly pattern: string
    ) {}
}

export class EventEmitter<T> {
    public readonly event = jest.fn();
    public fire = jest.fn<void, [T]>();
    public dispose = jest.fn();
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
    from: jest.fn((...items: Array<{ dispose(): void }>) => ({
        dispose: () => items.forEach(item => item.dispose())
    }))
};
