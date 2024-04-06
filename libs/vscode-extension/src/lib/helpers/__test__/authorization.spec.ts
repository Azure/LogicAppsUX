import { getBaseGraphApi } from '../authorization';
import { describe, vi, beforeEach, afterEach, beforeAll, afterAll, it, test, expect } from 'vitest';
describe('getBaseGraphApi', () => {
    it('should return default URL when cloudHost is undefined', () => {
        expect(getBaseGraphApi(undefined)).toEqual('https://management.azure.com');
    });

    it('should return correct URL for .usgovcloudapi.net', () => {
        expect(getBaseGraphApi('example.usgovcloudapi.net')).toEqual('https://management.usgovcloudapi.net');
    });

    it('should return correct URL for .windows.net', () => {
        expect(getBaseGraphApi('example.windows.net')).toEqual('https://management.azure.com');
    });

    it('should return correct URL for .chinacloudapi.cn', () => {
        expect(getBaseGraphApi('example.chinacloudapi.cn')).toEqual('https://management.chinacloudapi.cn');
    });

    it('should return correct URL for .eaglex.ic.gov', () => {
        expect(getBaseGraphApi('example.eaglex.ic.gov')).toEqual('https://management.azure.eaglex.ic.gov');
    });

    it('should return correct URL for .microsoft.scloud', () => {
        expect(getBaseGraphApi('example.microsoft.scloud')).toEqual('https://management.azure.microsoft.scloud');
    });

    it('should return default URL for other cases', () => {
        expect(getBaseGraphApi('example.com')).toEqual('https://management.azure.com');
    });
});