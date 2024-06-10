import type { IDataMapperFileService } from "@microsoft/logic-apps-data-mapper-v2";
import type {
  MessageToVsix} from "@microsoft/vscode-extension-logic-apps";
import {
  ExtensionCommand
} from "@microsoft/vscode-extension-logic-apps";

export class DataMapperFileService implements IDataMapperFileService {
  private sendMsgToVsix: (msg: MessageToVsix) => void;

  constructor(sendMsgToVsix: (msg: MessageToVsix) => void) {
    this.sendMsgToVsix = sendMsgToVsix;
  }

  public saveMapDefinitionCall = (
    dataMapDefinition: string,
    mapMetadata: string
  ) => {
    this.sendMsgToVsix({
      command: ExtensionCommand.saveDataMapDefinition,
      data: dataMapDefinition,
    });
    this.sendMsgToVsix({
      command: ExtensionCommand.saveDataMapMetadata,
      data: mapMetadata,
    });
  };

  public readCurrentSchemaOptions = () => {
    this.sendMsgToVsix({
      command: ExtensionCommand.readLocalSchemaFileOptions,
    });
  };
}
