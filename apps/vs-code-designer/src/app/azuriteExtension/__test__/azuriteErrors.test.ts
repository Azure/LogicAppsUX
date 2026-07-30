/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { describe, expect, it } from 'vitest';
import { AzuriteExtensionTerminalError, isAzuriteExtensionTerminalError } from '../azuriteErrors';

describe('azuriteErrors', () => {
  it('behaves like an Error and carries a stable name', () => {
    const error = new AzuriteExtensionTerminalError('Azurite extension is not installed');

    expect(error).toBeInstanceOf(Error);
    expect(error.message).toBe('Azurite extension is not installed');
    // The name is what makes the class recognisable in telemetry and serialized logs, where the
    // prototype chain has been lost.
    expect(error.name).toBe('AzuriteExtensionTerminalError');
  });

  it('recognises a terminal extension failure', () => {
    expect(isAzuriteExtensionTerminalError(new AzuriteExtensionTerminalError('boom'))).toBe(true);
  });

  it('fails open for anything it does not recognise', () => {
    // The bounded readiness probe -- not a guess about an unfamiliar rejection -- decides whether
    // Azurite is usable. Everything below must stay non-terminal.
    expect(isAzuriteExtensionTerminalError(new Error('port 10000 is already in use'))).toBe(false);
    expect(isAzuriteExtensionTerminalError('a string rejection')).toBe(false);
    expect(isAzuriteExtensionTerminalError(undefined)).toBe(false);
    expect(isAzuriteExtensionTerminalError(null)).toBe(false);
    // A look-alike must not pass: only the real class counts, never a duck-typed name.
    expect(isAzuriteExtensionTerminalError({ name: 'AzuriteExtensionTerminalError', message: 'boom' })).toBe(false);
  });
});
