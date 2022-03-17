export abstract class BaseException extends Error {
    constructor(
        public name: string,
        public message: string,
        public code?: string,
        public data?: Record<string, any> /* tslint:disable-line: no-any */,
        public innerException?: any /* tslint:disable-line: no-any */
    ) {
        super(message);
    }
}
