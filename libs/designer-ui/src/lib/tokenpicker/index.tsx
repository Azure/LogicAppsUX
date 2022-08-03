import { TokenNode } from '../editor/base/nodes/tokenNode';
import { Callout, DirectionalHint } from '@fluentui/react';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { useEffect } from 'react';

export type { Token as OutputToken } from './models/token';

const directionalHint = DirectionalHint.leftTopEdge;
const gapSpace = 10;
const beakWidth = 20;

export interface TokenPickerProps {
  editorId: string;
  labelId: string;
}

export default function TokenPicker({ editorId, labelId }: TokenPickerProps): JSX.Element {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    if (!editor.hasNodes([TokenNode])) {
      throw new Error('TokenPlugin: Register the TokenNode on editor');
    }
  }, [editor]);

  return (
    <Callout
      role="dialog"
      ariaLabelledBy={labelId}
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
