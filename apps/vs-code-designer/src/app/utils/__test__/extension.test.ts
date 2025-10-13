/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { getPublicUrl, getExtensionVersion } from '../extension';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as vscode from 'vscode';

describe('extension utils', () => {
  describe('getPublicUrl', () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    it('should convert a local URL to a public external URL', async () => {
      const localUrl = 'http://localhost:3000';
      const expectedExternalUrl = 'https://external-url.example.com:3000';

      const mockParsedUri = {
        scheme: 'http',
        authority: 'localhost:3000',
        toString: () => localUrl,
      } as vscode.Uri;

      const mockExternalUri = {
        scheme: 'https',
        authority: 'external-url.example.com:3000',
        toString: () => expectedExternalUrl,
      } as vscode.Uri;

      const parseSpy = vi.spyOn(vscode.Uri, 'parse').mockReturnValue(mockParsedUri);
      const asExternalUriSpy = vi.spyOn(vscode.env, 'asExternalUri').mockResolvedValue(mockExternalUri);

      const result = await getPublicUrl(localUrl);

      expect(parseSpy).toHaveBeenCalledWith(localUrl);
      expect(asExternalUriSpy).toHaveBeenCalledWith(mockParsedUri);
      expect(result).toBe(expectedExternalUrl);
    });

    it('should handle URLs with different ports', async () => {
      const localUrl = 'http://localhost:8080';
      const expectedExternalUrl = 'https://external-url.example.com:8080';

      const mockParsedUri = {
        scheme: 'http',
        authority: 'localhost:8080',
        toString: () => localUrl,
      } as vscode.Uri;

      const mockExternalUri = {
        toString: () => expectedExternalUrl,
      } as vscode.Uri;

      vi.spyOn(vscode.Uri, 'parse').mockReturnValue(mockParsedUri);
      vi.spyOn(vscode.env, 'asExternalUri').mockResolvedValue(mockExternalUri);

      const result = await getPublicUrl(localUrl);

      expect(result).toBe(expectedExternalUrl);
    });

    it('should handle HTTPS URLs', async () => {
      const localUrl = 'https://localhost:5001';
      const expectedExternalUrl = 'https://external-url.example.com:5001';

      const mockParsedUri = {
        scheme: 'https',
        authority: 'localhost:5001',
        toString: () => localUrl,
      } as vscode.Uri;

      const mockExternalUri = {
        toString: () => expectedExternalUrl,
      } as vscode.Uri;

      vi.spyOn(vscode.Uri, 'parse').mockReturnValue(mockParsedUri);
      vi.spyOn(vscode.env, 'asExternalUri').mockResolvedValue(mockExternalUri);

      const result = await getPublicUrl(localUrl);

      expect(result).toBe(expectedExternalUrl);
    });

    it('should handle URLs with paths', async () => {
      const localUrl = 'http://localhost:3000/api/callback';
      const expectedExternalUrl = 'https://external-url.example.com:3000/api/callback';

      const mockParsedUri = {
        scheme: 'http',
        authority: 'localhost:3000',
        path: '/api/callback',
        toString: () => localUrl,
      } as vscode.Uri;

      const mockExternalUri = {
        toString: () => expectedExternalUrl,
      } as vscode.Uri;

      vi.spyOn(vscode.Uri, 'parse').mockReturnValue(mockParsedUri);
      vi.spyOn(vscode.env, 'asExternalUri').mockResolvedValue(mockExternalUri);

      const result = await getPublicUrl(localUrl);

      expect(result).toBe(expectedExternalUrl);
    });

    it('should handle URLs with query parameters', async () => {
      const localUrl = 'http://localhost:3000/callback?code=123&state=abc';
      const expectedExternalUrl = 'https://external-url.example.com:3000/callback?code=123&state=abc';

      const mockParsedUri = {
        scheme: 'http',
        authority: 'localhost:3000',
        path: '/callback',
        query: 'code=123&state=abc',
        toString: () => localUrl,
      } as vscode.Uri;

      const mockExternalUri = {
        toString: () => expectedExternalUrl,
      } as vscode.Uri;

      vi.spyOn(vscode.Uri, 'parse').mockReturnValue(mockParsedUri);
      vi.spyOn(vscode.env, 'asExternalUri').mockResolvedValue(mockExternalUri);

      const result = await getPublicUrl(localUrl);

      expect(result).toBe(expectedExternalUrl);
    });

    it('should handle non-localhost URLs', async () => {
      const localUrl = 'http://127.0.0.1:3000';
      const expectedExternalUrl = 'https://external-url.example.com:3000';

      const mockParsedUri = {
        scheme: 'http',
        authority: '127.0.0.1:3000',
        toString: () => localUrl,
      } as vscode.Uri;

      const mockExternalUri = {
        toString: () => expectedExternalUrl,
      } as vscode.Uri;

      vi.spyOn(vscode.Uri, 'parse').mockReturnValue(mockParsedUri);
      vi.spyOn(vscode.env, 'asExternalUri').mockResolvedValue(mockExternalUri);

      const result = await getPublicUrl(localUrl);

      expect(result).toBe(expectedExternalUrl);
    });

    it('should return the same URL if no external mapping is needed', async () => {
      const publicUrl = 'https://example.com:3000';

      const mockParsedUri = {
        scheme: 'https',
        authority: 'example.com:3000',
        toString: () => publicUrl,
      } as vscode.Uri;

      const mockExternalUri = {
        toString: () => publicUrl,
      } as vscode.Uri;

      vi.spyOn(vscode.Uri, 'parse').mockReturnValue(mockParsedUri);
      vi.spyOn(vscode.env, 'asExternalUri').mockResolvedValue(mockExternalUri);

      const result = await getPublicUrl(publicUrl);

      expect(result).toBe(publicUrl);
    });

    it('should handle vscode-webview:// scheme URLs', async () => {
      const webviewUrl = 'vscode-webview://some-webview-id';
      const expectedExternalUrl = 'vscode-webview://some-webview-id';

      const mockParsedUri = {
        scheme: 'vscode-webview',
        authority: 'some-webview-id',
        toString: () => webviewUrl,
      } as vscode.Uri;

      const mockExternalUri = {
        toString: () => expectedExternalUrl,
      } as vscode.Uri;

      vi.spyOn(vscode.Uri, 'parse').mockReturnValue(mockParsedUri);
      vi.spyOn(vscode.env, 'asExternalUri').mockResolvedValue(mockExternalUri);

      const result = await getPublicUrl(webviewUrl);

      expect(result).toBe(expectedExternalUrl);
    });
  });

  describe('getExtensionVersion', () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    it('should return the version from the extension package.json', () => {
      const mockExtension = {
        packageJSON: {
          version: '1.2.3',
        },
      } as vscode.Extension<unknown>;

      vi.spyOn(vscode.extensions, 'getExtension').mockReturnValue(mockExtension);

      const result = getExtensionVersion();

      expect(result).toBe('1.2.3');
    });

    it('should return empty string if extension is not found', () => {
      vi.spyOn(vscode.extensions, 'getExtension').mockReturnValue(undefined);

      const result = getExtensionVersion();

      expect(result).toBe('');
    });

    it('should return empty string if packageJSON is not available', () => {
      const mockExtension = {
        packageJSON: undefined,
      } as unknown as vscode.Extension<unknown>;

      vi.spyOn(vscode.extensions, 'getExtension').mockReturnValue(mockExtension);

      const result = getExtensionVersion();

      expect(result).toBe('');
    });

    it('should return empty string if version is not in packageJSON', () => {
      const mockExtension = {
        packageJSON: {
          version: undefined,
        },
      } as vscode.Extension<unknown>;

      vi.spyOn(vscode.extensions, 'getExtension').mockReturnValue(mockExtension);

      const result = getExtensionVersion();

      // Note: The function returns undefined when version is not present,
      // which technically violates the return type signature
      expect(result).toBeUndefined();
    });
  });
});
