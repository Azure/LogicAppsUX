import { createLiteralValueSegment } from '@microsoft/logic-apps-designer';
import type { IEditorProps } from '@microsoft/logic-apps-shared';

export const IncrementVariableEditor = ({ value, onValueChange, renderDefaultEditor, editor, editorOptions, disabled }: IEditorProps) => {
  const inputValue = +(value?.[0]?.value ?? 0);
  const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onValueChange?.({
      value: [createLiteralValueSegment(e.target.value)],
    });
  };

  if (value && value[0] && (value.length > 1 || value[0].type !== 'literal' || Number.isNaN(inputValue))) {
    return renderDefaultEditor?.({
      editor,
      editorOptions,
      value,
      onValueChange,
    });
  }

  const color = disabled ? 'rgb(200, 200, 250)' : 'rgb(0, 127, 255)';

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
          color,
          fontSize: 'large',
          fontWeight: '300',
          border: `2px solid ${color}`,
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
          disabled={disabled}
          style={{
            height: '30px',
            width: '60px',
            color,
            fontSize: 'large',
            fontWeight: '600',
            border: 'unset',
            outline: 'unset',
          }}
        />
      </div>
    </div>
  );
};
