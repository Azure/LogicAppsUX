import { ExtensionCommand } from '@microsoft/vscode-extension-logic-apps';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ext } from '../../../../extensionVariables';
import { tryGetWebviewPanel } from '../common';
import { UriHandler } from '../urihandler';

vi.mock('../common', () => ({
  tryGetWebviewPanel: vi.fn(),
}));

describe('UriHandler', () => {
  const postMessage = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'log').mockImplementation(() => undefined);
    (ext.webViewKey as any).languageServer = 'languageServer';
    (tryGetWebviewPanel as any).mockReturnValue(undefined);
  });

  it('posts successful OAuth redirects to the designer panel', () => {
    (tryGetWebviewPanel as any).mockImplementation((key: string) =>
      key === ext.webViewKey.designerLocal ? { webview: { postMessage } } : undefined
    );

    new UriHandler().handleUri({
      path: '/authcomplete',
      query: 'pid=designer-panel&code=auth-code&state=abc',
    } as any);

    expect(tryGetWebviewPanel).toHaveBeenCalledWith(ext.webViewKey.designerLocal, 'designer-panel');
    expect(postMessage).toHaveBeenCalledWith({
      command: ExtensionCommand.completeOauthLogin,
      value: {
        code: 'auth-code',
        pid: 'designer-panel',
        redirectUrl: '',
        state: 'abc',
      },
    });
  });

  it('posts error redirects to the language server panel without replacing the payload', () => {
    (tryGetWebviewPanel as any).mockImplementation((key: string) => (key === 'languageServer' ? { webview: { postMessage } } : undefined));

    new UriHandler().handleUri({
      path: '/authcomplete',
      query: 'pid=language-panel&error=access_denied&error_description=Denied',
    } as any);

    expect(postMessage).toHaveBeenCalledWith({
      command: ExtensionCommand.completeOauthLogin,
      value: {
        error: 'access_denied',
        error_description: 'Denied',
        pid: 'language-panel',
      },
    });
  });

  it('ignores unrelated URI paths and redirects without a matching panel', () => {
    const handler = new UriHandler();

    handler.handleUri({ path: '/other', query: 'pid=designer-panel' } as any);
    handler.handleUri({ path: '/authcomplete', query: 'pid=missing-panel&code=auth-code' } as any);

    expect(postMessage).not.toHaveBeenCalled();
  });
});
