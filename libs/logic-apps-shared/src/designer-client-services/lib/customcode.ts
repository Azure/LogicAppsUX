import { AssertionErrorCode, AssertionException } from '../../utils/src';

export interface UploadCustomCode {
  fileData: string;
  fileName: string;
  fileExtension: string;
}

export interface VFSObject {
  name: string;
  size: number;
  mtime: string;
  crtime: string;
  mime: string;
  href: string;
  path: string;
}

export const CustomCodeConstants = {
  EDITOR: {
    CODE: 'code',
  },
  EDITOR_OPTIONS: {
    LANGUAGE: {
      JAVASCRIPT: 'javascript',
    },
  },
};

export interface ICustomCodeService {
  isCustomCode(editor?: string, language?: string): boolean;
  getAllCustomCodeFiles(): Promise<VFSObject[]>;
  getCustomCodeFile(fileName: string): Promise<string>;
  uploadCustomCode(customCode: UploadCustomCode): Promise<void>;
  deleteCustomCode(fileName: string): Promise<void>;
}

let service: ICustomCodeService;

export const InitCustomCodeService = (customCodeService: ICustomCodeService): void => {
  service = customCodeService;
};

export const CustomCodeService = (): ICustomCodeService => {
  if (!service) {
    throw new AssertionException(AssertionErrorCode.SERVICE_NOT_INITIALIZED, 'Custom Code Service needs to be initialized before using');
  }

  return service;
};
