import { MonacoEditor as Editor, EditorLanguage } from '../editor/monaco';
import type { EventHandler } from '../eventhandler';
import { useState } from 'react';

export interface IntellisenseControlEvent {
  value: string;
  selectionStart: number;
  selectionEnd: number;
}

export interface IntellisenseControlProps {
  initialValue: string;
  onBlur?: EventHandler<IntellisenseControlEvent>;
}

export function IntellisenseControl({ initialValue }: IntellisenseControlProps): JSX.Element {
  const [focused, setFocused] = useState(false);

  const handleBlur = (): void => {
    setFocused(false);
  };

  const handleFocus = (): void => {
    setFocused(true);
  };

  return (
    <div className={focused ? 'msla-intellisense-editor-container msla-focused' : 'msla-intellisense-editor-container'}>
      <Editor
        className={'msla-intellisense-editor'}
        language={EditorLanguage.templateExpressionLanguage}
        folding={false}
        lineNumbers="off"
        value={initialValue}
        scrollbar={{ horizontal: 'hidden', vertical: 'hidden' }}
        minimapEnabled={false}
        overviewRulerLanes={0}
        overviewRulerBorder={false}
        contextMenu={false}
        onFocus={handleFocus}
        onBlur={handleBlur}
        width={'340px'}
      />
    </div>
  );
}
