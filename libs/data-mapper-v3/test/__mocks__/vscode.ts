// VS Code API mock for testing
export const window = {
    showInformationMessage: jest.fn(),
    showErrorMessage: jest.fn(),
    showWarningMessage: jest.fn(),
    showOpenDialog: jest.fn(),
    showSaveDialog: jest.fn(),
    showInputBox: jest.fn(),
    createOutputChannel: jest.fn(() => ({ appendLine: jest.fn(), show: jest.fn(), dispose: jest.fn() })),
    registerCustomEditorProvider: jest.fn(() => ({ dispose: jest.fn() })),
    registerTreeDataProvider: jest.fn(() => ({ dispose: jest.fn() }))
};

export const workspace = {
    fs: {
        readFile: jest.fn(),
        writeFile: jest.fn()
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
    file: (path: string) => ({ fsPath: path, path }),
    joinPath: jest.fn()
};

export const commands = {
    registerCommand: jest.fn(),
    executeCommand: jest.fn()
};

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
