

export interface ResponseData {
    status: number;
    contentLength?: number;
    serviceRequestId?: string;
    /* tslint:disable: no-any */
    responseBodyOnError?: any;
    data?: any;
    /* tslint:enable: no-any */
    hostName?: string;
    apiVersion?: string;}