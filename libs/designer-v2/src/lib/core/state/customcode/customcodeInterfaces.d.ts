import type { CustomCode } from '../../../common/models/customcode';
export interface CustomCodeState {
    files: Record<string, CustomCode>;
    fileData: Record<string, string>;
}
export interface AddCustomCodePayload {
    nodeId: string;
    fileData: string;
    fileExtension: string;
    fileName: string;
    oleFileName?: string;
}
export interface DeleteCustomCodePayload {
    nodeId: string;
    fileName: string;
}
export interface RenameCustomCodePayload {
    oldFileName: string;
    newFileName: string;
}
