import type { IEditorProps } from '@microsoft/logic-apps-shared';

export const CustomEditorInitializeVariable = ({
  value,
  onValueChange,
  renderDefaultEditor,
  editor,
  editorOptions,
  disabled,
}: IEditorProps) => {
  const color = disabled ? 'rgb(200, 200, 250)' : 'rgb(0, 127, 255)';
  return (
    <div
      style={{
        paddingTop: '12px',
      }}
    >
      <div
        style={{
          textAlign: 'center',
          fontSize: 'large',
          fontWeight: '300',
          border: `6px solid ${color}`,
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
