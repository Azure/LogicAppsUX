import * as readline from 'readline';
import { XsltCompiler } from '../compiler/xsltCompiler';
import { CompileHostRequest, compileHostRequest } from './compilerHostProtocol';

const lines = readline.createInterface({
    input: process.stdin,
    crlfDelay: Infinity
});
const compiler = new XsltCompiler();

lines.on('line', line => {
    let id = 0;
    try {
        const request = JSON.parse(line) as CompileHostRequest;
        id = request.id;
        const result = compileHostRequest(request, compiler);
        process.stdout.write(`${JSON.stringify({ id, result })}\n`);
    } catch (error) {
        process.stdout.write(`${JSON.stringify({
            id,
            error: error instanceof Error ? error.message : String(error)
        })}\n`);
    }
});
