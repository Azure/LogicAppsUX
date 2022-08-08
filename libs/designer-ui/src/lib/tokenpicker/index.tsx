import type { TokenGroup } from './models/token';
import { TokenPickerMode, TokenPickerPivot } from './tokenpickerpivot';
import { TokenPickerSearch } from './tokenpickersearch/tokenpickersearch';
import { TokenPickerSection } from './tokenpickersection/tokenpickersection';
import type { PivotItem } from '@fluentui/react';
import { Callout, DirectionalHint } from '@fluentui/react';
import type { Dispatch, SetStateAction } from 'react';
import { useState } from 'react';

export type { Token as OutputToken } from './models/token';

const directionalHint = DirectionalHint.leftTopEdge;
const gapSpace = 10;
const beakWidth = 20;

export type SearchTextChangedEventHandler = (e: string) => void;

export interface TokenPickerProps {
  editorId: string;
  labelId: string;
  tokenGroup?: TokenGroup[];
  setInTokenPicker?: Dispatch<SetStateAction<boolean>>;
  onSearchTextChanged?: SearchTextChangedEventHandler;
}
export default function TokenPicker({
  editorId,
  labelId,
  tokenGroup,
  setInTokenPicker,
  onSearchTextChanged,
}: TokenPickerProps): JSX.Element {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedKey, setSelectedKey] = useState<TokenPickerMode>(TokenPickerMode.TOKEN);

  const handleSelectKey = (item?: PivotItem) => {
    if (item?.props?.itemKey) {
      setSelectedKey(item.props.itemKey as TokenPickerMode);
    }
  };

  const handleUpdateSearch = (_: React.FormEvent<HTMLInputElement | HTMLTextAreaElement>, text?: string) => {
    if (text != null) {
      setSearchQuery(text);
      onSearchTextChanged?.(text);
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
      onMouseDown={() => {
        setInTokenPicker?.(true);
      }}
      onDismiss={() => {
        setInTokenPicker?.(false);
      }}
      onRestoreFocus={() => {
        return;
      }}
    >
      <div className="msla-token-picker-container">
        <div className="msla-token-picker">
          <TokenPickerPivot selectedKey={selectedKey} selectKey={handleSelectKey} />
          <TokenPickerSearch selectedKey={selectedKey} searchQuery={searchQuery} setSearchQuery={handleUpdateSearch} />

          <TokenPickerSection tokenGroup={tokenGroup ?? []} searchQuery={searchQuery} />
        </div>
      </div>
    </Callout>
  );
}
