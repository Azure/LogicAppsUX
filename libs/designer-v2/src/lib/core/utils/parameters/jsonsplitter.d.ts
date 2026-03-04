/**
 * The JSON splitter.
 */
export declare class JsonSplitter {
    private _json;
    constructor(json: string);
    /**
     * Splits the JSON string into sections.
     * There are two kind of sections:
     * 1. a section representing a string
     * 2. a section representing a non-string
     * For example: { "abc": true } => [ '{ ', '"abc"', ': true }' ]
     * @return {string[]}
     */
    split(): string[];
    private _findStartOfString;
    private _findEndOfString;
}
