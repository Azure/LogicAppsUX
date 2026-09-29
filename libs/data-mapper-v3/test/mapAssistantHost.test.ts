import * as vscode from 'vscode';
import { MapEditorProvider } from '../src/mapEditorProvider';
import { BtmSerializer } from '../src/schema/btmSerializer';
import { DEFAULT_MAP_OPTIONS, FunctoidCategory } from '../src/model/mapModel';
import type { MapDocument } from '../src/model/mapModel';

jest.mock('vscode', () => {
  const base = jest.requireActual('vscode');
  return {
    ...base,
    lm: { selectChatModels: jest.fn() },
    LanguageModelChatMessage: {
      User: (content: string) => ({ role: 'user', content }),
      Assistant: (content: string) => ({ role: 'assistant', content }),
    },
    Range: class {},
    WorkspaceEdit: class {
      replace = jest.fn();
    },
    workspace: {
      ...base.workspace,
      onDidChangeTextDocument: jest.fn(() => ({ dispose: jest.fn() })),
      applyEdit: jest.fn(),
    },
  };
});

jest.mock('../src/worker/compilerWorkerClient', () => ({
  CompilerWorkerClient: class {},
}));

const serializer = new BtmSerializer();
const confirm = jest.mocked<(message: string, options: vscode.MessageOptions, ...items: string[]) => Thenable<string | undefined>>(
  vscode.window.showInformationMessage
);

async function setup(layoutOnly = false) {
  const map: MapDocument = {
    name: 'Host layout',
    version: '1',
    sourceSchema: { location: '' },
    targetSchema: { location: '' },
    options: { ...DEFAULT_MAP_OPTIONS },
    pages: [0, 1].map((index) => ({
      id: `page${index}`,
      name: `Page ${index}`,
      links: [],
      functoids: [
        {
          id: String(index),
          functoidId: 107,
          category: FunctoidCategory.String,
          name: 'String Concatenate',
          x: 1,
          y: 1,
          inputLinks: [],
          outputLinks: [],
          parameters: [],
        },
      ],
    })),
  };
  const document = {
    uri: vscode.Uri.file('test.btm'),
    version: 1,
    lineCount: 1,
    getText: () => serializer.serialize(map),
  };
  const onDidReceiveMessage = jest.fn();
  const postMessage = jest.fn().mockResolvedValue(true);
  const panel: vscode.WebviewPanel = {
    viewType: 'test',
    title: 'test',
    options: {},
    viewColumn: undefined,
    visible: true,
    active: true,
    onDidChangeViewState: jest.fn(),
    reveal: jest.fn(),
    dispose: jest.fn(),
    webview: {
      options: {},
      html: '',
      cspSource: '',
      onDidReceiveMessage,
      postMessage,
      asWebviewUri: () => vscode.Uri.file('script'),
    },
    onDidDispose: jest.fn(),
  };
  const countTokens = jest
    .fn()
    .mockImplementation(async (prompt: string) => (layoutOnly && prompt.includes('Current MapDocument:') ? 20000 : 100));
  let responseText = '{"summary":"Arrange all pages","patches":[{"op":"layout","path":"/pages"}]}';
  const sendRequest = jest.fn().mockImplementation(async () => ({
    text: (async function* () {
      yield responseText;
    })(),
  }));
  jest.mocked(vscode.lm.selectChatModels).mockResolvedValue([
    {
      name: 'test',
      id: 'test',
      vendor: 'copilot',
      family: 'test',
      version: '1',
      maxInputTokens: 10000,
      countTokens,
      sendRequest,
    },
  ]);
  jest.mocked(vscode.workspace.applyEdit).mockResolvedValue(true);
  const provider = new MapEditorProvider({ extensionUri: vscode.Uri.file('.') } as vscode.ExtensionContext);
  await provider.resolveCustomTextEditor(document as vscode.TextDocument, panel, {
    isCancellationRequested: false,
    onCancellationRequested: jest.fn(),
  });
  return {
    document,
    map,
    postMessage,
    sendRequest,
    countTokens,
    setResponse: (text: string) => {
      responseText = text;
    },
    submit: () =>
      onDidReceiveMessage.mock.calls[0][0]({
        type: 'copilotPrompt',
        data: { prompt: 'Arrange every page', activePage: 1 },
      }),
  };
}

describe('Assistant layout host integration', () => {
  beforeEach(() => jest.clearAllMocks());

  test.each([false, true])('applies all pages in one confirmed edit (compact context: %s)', async (compact) => {
    const host = await setup(compact);
    confirm.mockResolvedValue('Apply Changes');
    await host.submit();
    expect(vscode.workspace.applyEdit).toHaveBeenCalledTimes(1);
    const edit = jest.mocked(vscode.workspace.applyEdit).mock.calls[0][0];
    expect(edit.replace).toHaveBeenCalledTimes(1);
    const [uri, , xml] = jest.mocked(edit.replace).mock.calls[0];
    expect(uri).toEqual(host.document.uri);
    const updated = serializer.deserialize(xml);
    expect(updated.pages.every((page) => page.functoids[0].x !== 1 && page.functoids[0].y !== 1)).toBe(true);
    expect(host.postMessage).toHaveBeenLastCalledWith(
      expect.objectContaining({
        type: 'copilotResult',
        data: expect.objectContaining({ success: true, applied: true }),
      })
    );
    const prompt = host.countTokens.mock.calls[host.countTokens.mock.calls.length - 1][0];
    expect(prompt.includes('Current MapDocument:')).toBe(!compact);
  });

  test('canceling confirmation leaves the document untouched', async () => {
    const host = await setup();
    confirm.mockResolvedValue(undefined);
    await host.submit();
    expect(vscode.workspace.applyEdit).not.toHaveBeenCalled();
    expect(host.postMessage).toHaveBeenLastCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ applied: false, success: true }),
      })
    );
  });

  test('rejects graph edits when only the page summary fits', async () => {
    const host = await setup(true);
    host.setResponse('{"summary":"Rename","patches":[{"op":"replace","path":"/name","value":"wrong"}]}');
    await host.submit();
    expect(vscode.workspace.applyEdit).not.toHaveBeenCalled();
    expect(vscode.window.showInformationMessage).not.toHaveBeenCalled();
    expect(host.postMessage).toHaveBeenLastCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ applied: false, success: false, message: expect.stringContaining('Only layout operations') }),
      })
    );
  });

  test('reports an oversized page summary without sending an unbounded request', async () => {
    const host = await setup(true);
    host.countTokens.mockResolvedValue(20000);
    await host.submit();
    expect(host.sendRequest).not.toHaveBeenCalled();
    expect(vscode.workspace.applyEdit).not.toHaveBeenCalled();
    expect(host.postMessage).toHaveBeenLastCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ success: false, message: expect.stringContaining('page summary exceeds') }),
      })
    );
  });

  test('explains the context limitation when a compact-context request cannot be fulfilled', async () => {
    const host = await setup(true);
    host.setResponse('{"summary":"Need full context","patches":[]}');
    await host.submit();
    expect(vscode.workspace.applyEdit).not.toHaveBeenCalled();
    expect(host.postMessage).toHaveBeenLastCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ success: false, message: expect.stringContaining('larger context window') }),
      })
    );
  });

  test('rejects an out-of-range page without applying a partial layout', async () => {
    const host = await setup();
    host.setResponse('{"summary":"Arrange pages","patches":[{"op":"layout","path":"/pages/0"},{"op":"layout","path":"/pages/9"}]}');
    await host.submit();
    expect(host.sendRequest).toHaveBeenCalledTimes(2);
    expect(vscode.workspace.applyEdit).not.toHaveBeenCalled();
    expect(host.postMessage).toHaveBeenLastCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ success: false, message: expect.stringContaining('out of range') }),
      })
    );
  });

  test('rejects a stale proposal after confirmation', async () => {
    const host = await setup();
    confirm.mockImplementation(async () => {
      host.document.version++;
      return 'Apply Changes';
    });
    await host.submit();
    expect(vscode.workspace.applyEdit).not.toHaveBeenCalled();
    expect(host.postMessage).toHaveBeenLastCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ success: false, message: expect.stringContaining('map changed') }),
      })
    );
  });

  test('rejects a proposal when the document changes during the model request', async () => {
    const host = await setup(true);
    host.sendRequest.mockImplementationOnce(async () => {
      host.document.version++;
      return {
        text: (async function* () {
          yield '{"summary":"Arrange pages","patches":[{"op":"layout","path":"/pages"}]}';
        })(),
      };
    });
    await host.submit();
    expect(vscode.window.showInformationMessage).not.toHaveBeenCalled();
    expect(vscode.workspace.applyEdit).not.toHaveBeenCalled();
    expect(host.postMessage).toHaveBeenLastCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ success: false, message: expect.stringContaining('map changed') }),
      })
    );
  });

  test('reports failed document application instead of success', async () => {
    const host = await setup();
    confirm.mockResolvedValue('Apply Changes');
    jest.mocked(vscode.workspace.applyEdit).mockResolvedValue(false);
    await host.submit();
    expect(host.postMessage).toHaveBeenLastCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ applied: false, success: false, message: expect.stringContaining('could not apply') }),
      })
    );
  });
});
