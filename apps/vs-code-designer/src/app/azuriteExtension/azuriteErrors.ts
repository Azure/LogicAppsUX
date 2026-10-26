/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

/**
 * Raised when the Azurite VS Code extension itself is unusable: it is missing from the extension
 * host, or it failed to activate. Neither case can be resolved by waiting.
 *
 * This is deliberately distinct from a rejected `azurite.start`, which the same extension also
 * emits when the port is already bound by a perfectly healthy emulator serving another debug
 * session. That rejection is not authoritative; this one is.
 *
 * It lives in its own module, free of any `vscode` import, for two reasons:
 *  - `activateAzurite`'s tests mock the whole `executeOnAzuriteExt` module, so a marker declared
 *    there would be replaced by the mock and `instanceof` would compare against the wrong class.
 *  - it keeps the classifier importable from anywhere without dragging in the VS Code API.
 */
export class AzuriteExtensionTerminalError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AzuriteExtensionTerminalError';
  }
}

/**
 * Narrows an unknown rejection to a terminal Azurite extension failure.
 *
 * Fails open on purpose: anything unrecognised is treated as NON-terminal so the bounded readiness
 * probe stays the single source of truth. Someone running Azurite outside VS Code (Docker,
 * `npm -g azurite`) with the extension disabled must never be failed fast on the strength of a
 * guess about an error we do not recognise.
 */
export function isAzuriteExtensionTerminalError(error: unknown): error is AzuriteExtensionTerminalError {
  return error instanceof AzuriteExtensionTerminalError;
}
