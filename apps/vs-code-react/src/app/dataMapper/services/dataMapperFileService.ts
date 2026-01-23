import type { IDataMapperFileService, SchemaFile } from '@microsoft/logic-apps-data-mapper-v2';
import type { SchemaType } from '@microsoft/logic-apps-shared';
import type { MessageToVsix } from '@microsoft/vscode-extension-logic-apps';
import { ExtensionCommand } from '@microsoft/vscode-extension-logic-apps';

export class DataMapperFileService implements IDataMapperFileService {
  private sendMsgToVsix: (msg: MessageToVsix) => void;

  constructor(sendMsgToVsix: (msg: MessageToVsix) => void) {
    this.sendMsgToVsix = sendMsgToVsix;
  }

  public isTestDisabledForOS = () => {
    this.sendMsgToVsix({
      command: ExtensionCommand.isTestDisabledForOS,
    });
  };

  public getSchemaFromFile = (schemaType: SchemaType) => {
    this.sendMsgToVsix({
      command: ExtensionCommand.addSchemaFromFile,
      data: schemaType,
    });
  };

  /**
   * @deprecated Use saveMapXsltCall instead. Kept for backward compatibility.
   */
  public saveMapDefinitionCall = (dataMapDefinition: string, mapMetadata: string) => {
    this.sendMsgToVsix({
      command: ExtensionCommand.saveDataMapDefinition,
      data: dataMapDefinition,
    });
    this.sendMsgToVsix({
      command: ExtensionCommand.saveDataMapMetadata,
      data: mapMetadata,
    });
  };

  /**
   * Saves the XSLT with embedded metadata to the filesystem.
   * This is the primary save method.
   */
  public saveMapXsltCall = (xsltWithMetadata: string) => {
    this.sendMsgToVsix({
      command: ExtensionCommand.saveDataMapXslt,
      data: xsltWithMetadata,
    });
  };

  public saveDraftStateCall(xsltWithMetadata: string): void {
    this.sendMsgToVsix({
      command: ExtensionCommand.saveDraftDataMapDefinition,
      data: xsltWithMetadata,
    });
  }

  public readCurrentSchemaOptions = () => {
    this.sendMsgToVsix({
      command: ExtensionCommand.readLocalSchemaFileOptions,
    });
  };

  /**
   * @deprecated Use saveMapXsltCall instead. Kept for backward compatibility.
   */
  public saveXsltCall = (xslt: string) => {
    this.sendMsgToVsix({
      command: ExtensionCommand.saveDataMapXslt,
      data: xslt,
    });
  };

  public readCurrentCustomXsltPathOptions = () => {
    this.sendMsgToVsix({
      command: ExtensionCommand.readLocalCustomXsltFileOptions,
    });
  };

  public addSchemaFromFile = (selectedSchemaFile: SchemaFile) => {
    this.sendMsgToVsix({
      command: ExtensionCommand.addSchemaFromFile,
      data: {
        path: selectedSchemaFile.path,
        type: selectedSchemaFile.type as SchemaType,
      },
    });
  };

  public sendNotification(title: string, text: string, level: number) {
    this.sendMsgToVsix({
      command: ExtensionCommand.sendNotification,
      data: { title, text, level },
    });
  }

  public testXsltTransform = (xsltContent: string, inputXml: string) => {
    this.sendMsgToVsix({
      command: ExtensionCommand.testXsltTransform,
      data: { xsltContent, inputXml },
    });
  };
}
