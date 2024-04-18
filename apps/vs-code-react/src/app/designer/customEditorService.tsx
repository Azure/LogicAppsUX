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
    this._areCustomEditorsEnabled = areCustomEditorsEnabled || true;
  }

  public getEditor = (props: IEditorParameterInfo) => {
    const { operationInfo, parameter } = props;
    const { connectorId, operationId } = operationInfo ?? {};
    const { parameterName, editor, editorOptions } = parameter ?? {};

    if (!this._areCustomEditorsEnabled) {
      return undefined;
    }

    // TODO Elaina: this is the correct one
    // if (connectorId === 'connectionProviders/dataMapperOperations' && operationId === 'xsltTransform' && parameterName === 'text') {
    //   return {
    //     EditorComponent: DisplayTextEditor,
    //     hideLabel: true,
    //     editor,
    //     editorOptions,
    //   };
    // }

    // TODO Elaina : checking with local manifest
    if (parameterName === 'text') {
      return {
        EditorComponent: this.DisplayTextEditor,
        hideLabel: true,
        editor,
        editorOptions,
      };
    }

    return undefined;
  };

  DisplayTextEditor = ({ value, onValueChange, renderDefaultEditor, editor, editorOptions, disabled }: IEditorProps) => {
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

// const DisplayTextEditor = ({ value, onValueChange, renderDefaultEditor, editor, editorOptions, disabled }: IEditorProps) => {
//   return (
//     <>
//       {editorOptions?.displayText?.text}
//       <Link onClick={() => {
//         // openRelativeLink?.(relativeLink ?? '')
//         }}>{editorOptions?.displayText?.relativeLinkText}
//       </Link>
//     </>
//   );
// };
