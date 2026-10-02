import * as vscode from 'vscode';
import { MapEditorProvider } from '../src/mapEditorProvider';
import { BtmSerializer } from '../src/schema/btmSerializer';
import type { MapDocument } from '../src/model/mapModel';
import { outputChannel, window as mockWindow } from './__mocks__/vscode';

jest.mock('vscode', () => {
  const base = jest.requireActual('vscode');
  return {
    ...base,
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
jest.mock('../src/worker/compilerWorkerClient', () => ({ CompilerWorkerClient: class {} }));

const serializer = new BtmSerializer();
const xsd = (field: string) =>
  `<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema"><xs:element name="Root"><xs:complexType><xs:sequence><xs:element name="${field}" type="xs:string"/></xs:sequence></xs:complexType></xs:element></xs:schema>`;
const confirm = jest.mocked<(message: string, options: vscode.MessageOptions, ...items: string[]) => Thenable<string | undefined>>(
  vscode.window.showWarningMessage
);

async function setup(inlineSource = false, existingSide?: 'source' | 'target') {
  jest.mocked(vscode.workspace.onDidChangeTextDocument).mockReturnValue({ dispose: jest.fn() });
  const initial = serializer.createNew('', '', 'Replacement');
  if (inlineSource) {
    initial.sourceSchema.inlineSchemaXml = xsd('Drop');
  }
  if (existingSide) {
    initial[`${existingSide}Schema`].inlineSchemaXml = xsd('Keep');
  }
  initial.pages = [0, 1].map((index) => ({
    id: `p${index}`,
    name: `Page ${index}`,
    functoids: [],
    links: [
      { id: 'keep', sourceId: '/Root/Keep', targetId: '/Root/Keep', sourceType: 'schemaNode', targetType: 'schemaNode' },
      { id: 'drop', sourceId: '/Root/Drop', targetId: '/Root/Drop', sourceType: 'schemaNode', targetType: 'schemaNode' },
    ],
  })) as MapDocument['pages'];
  let text = serializer.serialize(initial);
  const document = { uri: vscode.Uri.file('replacement-test.btm'), version: 1, lineCount: 1, getText: () => text };
  const onDidReceiveMessage = jest.fn();
  const postMessage = jest.fn().mockResolvedValue(true);
  const onDidDispose = jest.fn();
  const panel = {
    webview: { options: {}, html: '', cspSource: '', onDidReceiveMessage, postMessage, asWebviewUri: () => vscode.Uri.file('script') },
    onDidDispose,
  } as unknown as vscode.WebviewPanel;
  jest.mocked(vscode.workspace.fs.readFile).mockResolvedValue(Buffer.from(xsd('Keep')));
  jest.mocked(vscode.window.showOpenDialog).mockResolvedValue([vscode.Uri.file('new.xsd')]);
  const changeDocument = async (newText: string) => {
    text = newText;
    document.version++;
    const handler = jest.mocked(vscode.workspace.onDidChangeTextDocument).mock.calls[0][0];
    await handler({ document } as unknown as vscode.TextDocumentChangeEvent);
  };
  jest.mocked(vscode.workspace.applyEdit).mockImplementation(async (edit) => {
    const xml = jest.mocked(edit.replace).mock.calls[0][2];
    await changeDocument(xml);
    return true;
  });
  const provider = new MapEditorProvider({ extensionUri: vscode.Uri.file('.') } as vscode.ExtensionContext);
  await provider.resolveCustomTextEditor(document as vscode.TextDocument, panel, {} as vscode.CancellationToken);
  return {
    document,
    initial,
    postMessage,
    changeDocument,
    dispose: () => onDidDispose.mock.calls[0][0](),
    submit: (side: 'source' | 'target' = 'source') => onDidReceiveMessage.mock.calls[0][0]({ type: 'loadSchema', side }),
  };
}

describe('schema replacement host transaction', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    mockWindow.createOutputChannel.mockReturnValue(outputChannel);
  });

  test.each(['source', 'target'] as const)('confirms removal across all pages and applies %s as one undoable edit', async (side) => {
    const host = await setup();
    confirm.mockResolvedValue('Replace Schema');
    await host.submit(side);
    expect(confirm).toHaveBeenCalledWith(
      expect.stringContaining('2 unmatched link(s) across all pages'),
      { modal: true },
      'Replace Schema'
    );
    expect(vscode.workspace.applyEdit).toHaveBeenCalledTimes(1);
    const updated = serializer.deserialize(host.document.getText());
    expect(updated.pages.every((page) => page.links.length === 1 && page.links[0].id === 'keep')).toBe(true);
    expect(updated[`${side}Schema`].location).toBe('new.xsd');
    expect(host.postMessage).toHaveBeenLastCalledWith({
      type: 'schemaStateChanged',
      data: expect.objectContaining({
        map: updated,
        [side === 'source' ? 'sourceSchema' : 'targetSchema']: expect.objectContaining({ filePath: expect.stringContaining('new.xsd') }),
      }),
    });
    await host.changeDocument(serializer.serialize(host.initial));
    expect(host.postMessage).toHaveBeenLastCalledWith({
      type: 'schemaStateChanged',
      data: { map: serializer.deserialize(serializer.serialize(host.initial)), sourceSchema: null, targetSchema: null },
    });
    await host.changeDocument(serializer.serialize(updated));
    expect(host.postMessage).toHaveBeenLastCalledWith(
      expect.objectContaining({
        type: 'schemaStateChanged',
        data: expect.objectContaining({ [side === 'source' ? 'sourceSchema' : 'targetSchema']: expect.any(Object) }),
      })
    );
    expect(vscode.workspace.fs.readFile).toHaveBeenCalledTimes(1);
  });

  test.each(['browse', 'confirm', 'read', 'parse', 'dependency', 'edit', 'edit-error'] as const)(
    '%s cancellation/failure preserves document and UI',
    async (failure) => {
      const host = await setup();
      const before = host.document.getText();
      confirm.mockResolvedValue('Replace Schema');
      if (failure === 'browse') {
        jest.mocked(vscode.window.showOpenDialog).mockResolvedValue(undefined);
      }
      if (failure === 'confirm') {
        confirm.mockResolvedValue(undefined);
      }
      if (failure === 'read') {
        jest.mocked(vscode.workspace.fs.readFile).mockRejectedValue(new Error('Not found'));
      }
      if (failure === 'parse') {
        jest.mocked(vscode.workspace.fs.readFile).mockResolvedValue(Buffer.from('<bad/>'));
      }
      if (failure === 'dependency') {
        jest
          .mocked(vscode.workspace.fs.readFile)
          .mockResolvedValueOnce(
            Buffer.from(
              '<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema"><xs:include schemaLocation="missing.xsd"/><xs:element name="Root"/></xs:schema>'
            )
          )
          .mockRejectedValue(new Error('Missing dependency'));
      }
      if (failure === 'edit') {
        jest.mocked(vscode.workspace.applyEdit).mockResolvedValue(false);
      }
      if (failure === 'edit-error') {
        jest.mocked(vscode.workspace.applyEdit).mockRejectedValue(new Error('Edit rejected'));
      }
      await host.submit();
      expect(host.document.getText()).toBe(before);
      expect(host.postMessage).not.toHaveBeenCalled();
      if (!failure.startsWith('edit')) {
        expect(vscode.workspace.applyEdit).not.toHaveBeenCalled();
      }
      if (!['browse', 'confirm'].includes(failure)) {
        expect(vscode.window.showErrorMessage).toHaveBeenCalled();
      }
    }
  );

  test.each(['browse', 'parse', 'confirm'] as const)('rejects stale document while awaiting %s', async (phase) => {
    const host = await setup();
    const stale = () => {
      host.document.version++;
    };
    confirm.mockResolvedValue('Replace Schema');
    if (phase === 'browse') {
      jest.mocked(vscode.window.showOpenDialog).mockImplementation(async () => {
        stale();
        return [vscode.Uri.file('new.xsd')];
      });
    } else if (phase === 'parse') {
      jest.mocked(vscode.workspace.fs.readFile).mockImplementation(async () => {
        stale();
        return Buffer.from(xsd('Keep'));
      });
    } else {
      confirm.mockImplementation(async () => {
        stale();
        return 'Replace Schema';
      });
    }
    await host.submit();
    expect(vscode.workspace.applyEdit).not.toHaveBeenCalled();
    expect(host.postMessage).not.toHaveBeenCalled();
  });

  test('superseded request and disposed editor cannot apply', async () => {
    const host = await setup();
    let resolveFirst!: (value: vscode.Uri[] | undefined) => void;
    jest
      .mocked(vscode.window.showOpenDialog)
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveFirst = resolve;
          })
      )
      .mockResolvedValueOnce(undefined);
    const pending = host.submit();
    await host.submit('target');
    resolveFirst([vscode.Uri.file('new.xsd')]);
    await pending;
    expect(vscode.workspace.applyEdit).not.toHaveBeenCalled();
    jest.mocked(vscode.window.showOpenDialog).mockImplementationOnce(async () => {
      host.dispose();
      return [vscode.Uri.file('new.xsd')];
    });
    await host.submit();
    expect(vscode.workspace.applyEdit).not.toHaveBeenCalled();
  });

  test('adding the first schema loads includes and skips confirmation when all paths survive', async () => {
    const host = await setup();
    jest
      .mocked(vscode.workspace.fs.readFile)
      .mockResolvedValueOnce(
        Buffer.from(
          '<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema"><xs:include schemaLocation="types.xsd"/><xs:element name="Root" type="Fields"/></xs:schema>'
        )
      )
      .mockResolvedValueOnce(
        Buffer.from(
          '<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema"><xs:complexType name="Fields"><xs:sequence><xs:element name="Keep" type="xs:string"/><xs:element name="Drop" type="xs:string"/></xs:sequence></xs:complexType></xs:schema>'
        )
      );
    await host.submit();
    expect(confirm).not.toHaveBeenCalled();
    expect(vscode.workspace.applyEdit).toHaveBeenCalledTimes(1);
    expect(serializer.deserialize(host.document.getText()).pages.every((page) => page.links.length === 2)).toBe(true);
  });

  test.each(['source', 'target'] as const)('requires acceptance before replacing %s even when all links match', async (side) => {
    const host = await setup(false, side);
    const before = host.document.getText();
    const compatibleSchema = xsd('Keep').replace('</xs:sequence>', '<xs:element name="Drop" type="xs:string"/></xs:sequence>');
    jest.mocked(vscode.workspace.fs.readFile).mockResolvedValue(Buffer.from(compatibleSchema));
    let accept!: (choice: string | undefined) => void;
    let warningShown!: () => void;
    const shown = new Promise<void>((resolve) => {
      warningShown = resolve;
    });
    confirm.mockImplementation(
      () =>
        new Promise((resolve) => {
          accept = resolve;
          warningShown();
        })
    );
    const pending = host.submit(side);
    await shown;
    expect(confirm).toHaveBeenCalledWith(
      expect.stringContaining(`Replace the ${side} schema with "new.xsd"? All existing links and functoids will be preserved.`),
      { modal: true },
      'Replace Schema'
    );
    expect(vscode.workspace.applyEdit).not.toHaveBeenCalled();
    expect(host.document.getText()).toBe(before);
    expect(host.postMessage).not.toHaveBeenCalled();
    accept('Replace Schema');
    await pending;
    expect(vscode.workspace.applyEdit).toHaveBeenCalledTimes(1);
    const updated = serializer.deserialize(host.document.getText());
    expect(updated[`${side}Schema`].location).toBe('new.xsd');
    expect(updated.pages).toEqual(serializer.deserialize(before).pages);
  });

  test.each(['source', 'target'] as const)('dismissing the %s replacement warning preserves an unlinked schema', async (side) => {
    const host = await setup(false, side);
    const unlinked = serializer.deserialize(host.document.getText());
    unlinked.pages.forEach((page) => {
      page.links = [];
    });
    await host.changeDocument(serializer.serialize(unlinked));
    host.postMessage.mockClear();
    const before = host.document.getText();
    confirm.mockResolvedValue(undefined);
    await host.submit(side);
    expect(confirm).toHaveBeenCalledTimes(1);
    expect(vscode.workspace.applyEdit).not.toHaveBeenCalled();
    expect(host.document.getText()).toBe(before);
    expect(host.postMessage).not.toHaveBeenCalled();
  });

  test('undo restores the previous inline schema tree and redo restores the selected tree', async () => {
    const host = await setup(true);
    confirm.mockResolvedValue('Replace Schema');
    await host.submit();
    const replacement = host.document.getText();
    const sourceField = () => host.postMessage.mock.calls.at(-1)?.[0].data.sourceSchema.rootElement.children[0].name;
    expect(sourceField()).toBe('Keep');
    await host.changeDocument(serializer.serialize(host.initial));
    expect(sourceField()).toBe('Drop');
    await host.changeDocument(replacement);
    expect(sourceField()).toBe('Keep');
    expect(vscode.workspace.fs.readFile).toHaveBeenCalledTimes(1);
  });

  test('replacing target preserves the unrelated inline source schema', async () => {
    const host = await setup(true);
    confirm.mockResolvedValue('Replace Schema');
    await host.submit('target');
    const updated = serializer.deserialize(host.document.getText());
    expect(updated.sourceSchema.inlineSchemaXml).toContain('name="Drop"');
    expect(host.postMessage).toHaveBeenLastCalledWith(
      expect.objectContaining({
        type: 'schemaStateChanged',
        data: expect.objectContaining({
          sourceSchema: expect.objectContaining({
            rootElement: expect.objectContaining({
              children: expect.arrayContaining([expect.objectContaining({ name: 'Drop' })]),
            }),
          }),
        }),
      })
    );
  });

  test('a slow schema refresh cannot overwrite a newer document after undo', async () => {
    const host = await setup(true);
    let resolveRead!: (value: Uint8Array) => void;
    jest.mocked(vscode.workspace.fs.readFile).mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveRead = resolve;
        })
    );
    const modified = { ...host.initial, sourceSchema: { location: 'slow.xsd' } };
    const pending = host.changeDocument(serializer.serialize(modified));
    await host.changeDocument(serializer.serialize(host.initial));
    const messagesBeforeCompletion = host.postMessage.mock.calls.length;
    resolveRead(Buffer.from(xsd('Keep')));
    await pending;
    expect(host.postMessage).toHaveBeenCalledTimes(messagesBeforeCompletion);
    expect(host.postMessage).toHaveBeenLastCalledWith(
      expect.objectContaining({
        type: 'documentChanged',
        data: expect.objectContaining({ sourceSchema: expect.objectContaining({ inlineSchemaXml: expect.any(String) }) }),
      })
    );
  });
});
