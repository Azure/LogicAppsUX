import type { DictionaryEditorItemProps } from '.';
import type { ValueSegment } from '../editor';
import { CollapsedEditor, CollapsedEditorType } from '../editor';
import type { TokenGroup } from '../tokenpicker/models/token';
import type { Dispatch, SetStateAction } from 'react';
import { useIntl } from 'react-intl';

export type CollapsedDictionaryProps = {
  isValid?: boolean;
  collapsedValue: ValueSegment[];
  tokenGroup?: TokenGroup[];
  expressionGroup?: TokenGroup[];
  setIsValid?: Dispatch<SetStateAction<boolean>>;
  setItems: (items: DictionaryEditorItemProps[]) => void;
  setCollapsedValue: (val: ValueSegment[]) => void;
  onBlur?: () => void;
};

export const CollapsedDictionary = ({
  isValid,
  collapsedValue,
  tokenGroup,
  expressionGroup,
  setItems,
  setIsValid,
  setCollapsedValue,
  onBlur,
}: CollapsedDictionaryProps): JSX.Element => {
  const intl = useIntl();

  const errorMessage = intl.formatMessage({
    defaultMessage: 'Please enter a valid dictionary',
    description: 'Error Message for Invalid Dictionary',
  });

  return (
    <div className="msla-dictionary-container msla-dictionary-editor-collapsed">
      <div className="msla-dictionary-content">
        <CollapsedEditor
          type={CollapsedEditorType.DICTIONARY}
          isValid={isValid}
          errorMessage={errorMessage}
          collapsedValue={collapsedValue}
          tokenGroup={tokenGroup}
          expressionGroup={expressionGroup}
          setItems={setItems}
          setIsValid={setIsValid}
          setCollapsedValue={setCollapsedValue}
          onBlur={onBlur}
        />
      </div>
    </div>
  );
};
