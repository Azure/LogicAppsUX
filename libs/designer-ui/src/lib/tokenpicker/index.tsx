import { TokenPickerMode, TokenPickerPivot } from './tokenpickerpivot';
import type { PivotItem } from '@fluentui/react';
import { Callout, DirectionalHint } from '@fluentui/react';
// import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { useState } from 'react';

export type { Token as OutputToken } from './models/token';

const directionalHint = DirectionalHint.leftTopEdge;
const gapSpace = 10;
const beakWidth = 20;

export interface TokenPickerProps {
  editorId: string;
  labelId: string;
}

export default function TokenPicker({ editorId, labelId }: TokenPickerProps): JSX.Element {
  // const [editor] = useLexicalComposerContext();
  const [selectedKey, setSelectedKey] = useState<string>(TokenPickerMode.TOKEN);

  const handleSelectKey = (item?: PivotItem) => {
    if (item?.props?.itemKey) {
      setSelectedKey(item.props.itemKey);
    }
  };

  return (
    <Callout
      role="dialog"
      ariaLabelledBy={labelId}
      gapSpace={gapSpace}
      target={`#${editorId}`}
      isBeakVisible={true}
      beakWidth={beakWidth}
      directionalHint={directionalHint}
      onMouseDown={(e) => {
        e.preventDefault();
      }}
    >
      <div className="msla-token-picker-container">
        <div className="msla-token-picker">
          <TokenPickerPivot selectedKey={selectedKey} selectKey={handleSelectKey} />
        </div>
      </div>
    </Callout>
  );
}
