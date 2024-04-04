/**
 * Polyfill stable language features. These imports will be optimized by `@babel/preset-env`.
 *
 * See: https://github.com/zloirock/core-js#babel
 */
// import { Buffer } from 'buffer';
import 'core-js/stable';
// import * as monaco from 'monaco-editor';
// import * as process from 'process';
// import 'regenerator-runtime/runtime';

// (window as any).global = window;
// (window as any).process = process;

// (window as any).Buffer = window.Buffer || Buffer;
import { loader } from "@monaco-editor/react";
// you can change the source of the monaco files
// loader.config({ paths: { vs: "https://cdn.jsdelivr.net/npm/monaco-editor@0.47.0/min/vs" } });
loader.config({ paths: { vs: "../node_modules/monaco-editor/min/vs" } });


process.cwd = () => '/';