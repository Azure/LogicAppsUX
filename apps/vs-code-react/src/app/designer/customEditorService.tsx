import type { IEditorParameterInfo, IEditorProps, IEditorService } from '@microsoft/logic-apps-shared';
import { Link } from '@fluentui/react';

export interface CustomEditorServiceOptions {
  areCustomEditorsEnabled?: boolean;
  openRelativeLink?: (relativeLink: string) => void;
}

export class CustomEditorService implements IEditorService {
  _areCustomEditorsEnabled = true;

  constructor(public readonly options: CustomEditorServiceOptions) {
    const { areCustomEditorsEnabled } = options;
    this._areCustomEditorsEnabled = areCustomEditorsEnabled ?? true;
  }

  public getEditor = (props: IEditorParameterInfo) => {
    if (!this._areCustomEditorsEnabled) {
      return undefined;
    }

    const { operationInfo, parameter } = props;
    const { connectorId, operationId } = operationInfo ?? {};
    const { parameterName, editor, editorOptions } = parameter ?? {};

    if (connectorId === 'connectionProviders/dataMapperOperations' && operationId === 'xsltTransform' && parameterName === 'text') {
      return {
        EditorComponent: this.DisplayTextEditor,
        hideLabel: true,
        editor,
        editorOptions,
      };
    }

    return undefined;
  };

  DisplayTextEditor = ({ editorOptions }: IEditorProps) => {
    return (
      <>
        {editorOptions?.displayText?.text}
        <Link
          onClick={() => {
            this.options?.openRelativeLink?.(editorOptions?.displayText?.relativeLink ?? '');
          }}
        >
          {editorOptions?.displayText?.relativeLinkText}
        </Link>
      </>
    );
  };
}
