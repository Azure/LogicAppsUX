import type { IEditorParameterInfo, IEditorProps, IEditorService } from '@microsoft/logic-apps-designer';
import { createLiteralValueSegment } from '@microsoft/logic-apps-designer';

export class CustomEditorService implements IEditorService {
  public areCustomEditorsEnabled = false;

  public getEditor = ({
    operationInfo: { connectorId, operationId },
    parameter: { parameterName, editor, editorOptions },
  }: IEditorParameterInfo) => {
    if (!this.areCustomEditorsEnabled) {
      return undefined;
    }

    if (connectorId === 'connectionProviders/variable' && operationId === 'incrementvariable' && parameterName === 'value') {
      return {
        EditorComponent: IncrementVariableEditor,
        hideLabel: true,
        editor,
        editorOptions,
      };
    }

    if (connectorId === 'connectionProviders/variable' && operationId === 'initializevariable' && parameterName === 'value') {
      return {
        EditorComponent: InitializeVariableEditor,
        hideLabel: true,
        editor,
        editorOptions,
      };
    }

    return undefined;
  };
}

const IncrementVariableEditor = ({ value, onValueChange, renderDefaultEditor, editor, editorOptions }: IEditorProps) => {
  const inputValue = +(value?.[0]?.value ?? 0);
  const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onValueChange?.({
      value: [createLiteralValueSegment(e.target.value)],
    });
  };

  if (value && value[0] && (value.length > 1 || value[0].type !== 'literal' || isNaN(inputValue))) {
    return renderDefaultEditor?.({
      editor,
      editorOptions,
      value,
      onValueChange,
    });
  }

  return (
    <div
      style={{
        display: 'flex',
        paddingTop: '12px',
      }}
    >
      <div
        style={{
          textAlign: 'center',
          color: 'rgb(119, 11, 214)',
          fontSize: 'xxx-large',
          fontWeight: '600',
          border: '6px solid rgb(119, 11, 214)',
          borderRadius: '16px',
          display: 'flex',
          alignItems: 'baseline',
          padding: '0px 12px 0px 29px',
        }}
      >
        <span>+</span>
        <input
          type="number"
          min={0}
          max={999}
          step={10}
          value={inputValue}
          onChange={onChange}
          style={{
            height: '100px',
            width: '100px',
            color: 'rgb(119, 11, 214)',
            fontSize: 'xxx-large',
            fontWeight: '600',
            border: 'unset',
            outline: 'unset',
          }}
        />
      </div>
    </div>
  );
};

const InitializeVariableEditor = ({ value, onValueChange, renderDefaultEditor, editor, editorOptions }: IEditorProps) => {
  return (
    <div
      style={{
        paddingTop: '12px',
      }}
    >
      <div
        style={{
          textAlign: 'center',
          fontSize: 'xxx-large',
          fontWeight: '600',
          border: '6px solid rgb(119, 11, 214)',
          display: 'flex',
          alignItems: 'baseline',
        }}
      >
        {renderDefaultEditor?.({
          editor,
          editorOptions,
          value,
          onValueChange,
        })}
      </div>
    </div>
  );
};
