import { TokenNode } from '../editor/base/nodes/tokenNode';
import { Callout, DirectionalHint } from '@fluentui/react';
import { useId } from '@fluentui/react-hooks';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { useEffect } from 'react';

export type { Token as OutputToken } from './models/token';

const directionalHint = DirectionalHint.leftTopEdge;
const gapSpace = 10;
const beakWidth = 20;

export interface TokenPickerProps {
  editorId: string;
}

export default function TokenPicker({ editorId }: TokenPickerProps): JSX.Element {
  const [editor] = useLexicalComposerContext();
  const labelId = useId('msla-tokenpicker-callout-label');
  const descriptionId = useId('msla-tokenpicker-callout-description');

  useEffect(() => {
    if (!editor.hasNodes([TokenNode])) {
      throw new Error('TokenPlugin: Register the TokenNode on editor');
    }
  }, [editor]);

  return (
    <Callout
      ariaLabelledBy={labelId}
      ariaDescribedBy={descriptionId}
      role="dialog"
      gapSpace={gapSpace}
      target={`#${editorId}`}
      isBeakVisible={true}
      beakWidth={beakWidth}
      directionalHint={directionalHint}
      setInitialFocus
    >
      <div style={{ width: '300px', color: 'blue', height: '300px' }}></div>
    </Callout>
  );
}
