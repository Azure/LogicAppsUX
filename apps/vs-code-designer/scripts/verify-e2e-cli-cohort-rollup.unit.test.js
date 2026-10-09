#!/usr/bin/env node
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
/* global console, require */
const assert = require('assert');
const { _test } = require('./verify-e2e-cli-cohort-rollup');

_test.verifyNativeCompletions('unitTests', '1 passing (1s)\n');
_test.verifyNativeCompletions(
  'createWorkspaceCoreMatrix',
  ['1 passing', '1 passing', '1 passing', '1 passing', '1 passing', '1 passing', '6 passing'].join('\n')
);
assert.throws(() => _test.verifyNativeCompletions('msnWeatherLifecycle', '1 passing\n1 passing\n'), /expected=3 actual=2/);
assert.throws(() => _test.verifyNativeCompletions('unitTests', '0 passing\n'), /required real Mocha/);
console.log('Cohort rollup verification tests passed.');
