import type { AuthProps } from '.';
import type { ValueSegment } from '../editor';
import { BaseEditor } from '../editor/base';
import { CollapsedAuthenticationValidation } from './plugins/CollapsedAuthenticationValidation';
import type { Dispatch, SetStateAction } from 'react';

interface CollapsedAuthenticationProps {
  collapsedValue: ValueSegment[];
  isValid: boolean;
  setCollapsedValue: (value: ValueSegment[]) => void;
  setCurrentProps: Dispatch<SetStateAction<AuthProps>>;
  setIsValid: (b: boolean) => void;
  GetTokenPicker: (editorId: string, labelId: string, onClick?: (b: boolean) => void) => JSX.Element;
  setOption: (s: string) => void;
}

export const CollapsedAuthentication = ({
  collapsedValue,
  isValid,
  setCollapsedValue,
  setCurrentProps,
  GetTokenPicker,
  setIsValid,
  setOption,
}: CollapsedAuthenticationProps): JSX.Element => {
  return (
    <div className="msla-authentication-editor-collapsed-container">
      <BaseEditor
        initialValue={collapsedValue}
        GetTokenPicker={GetTokenPicker}
        BasePlugins={{ tokens: true }}
        tokenPickerButtonProps={{ buttonClassName: 'msla-editor-tokenpicker-button' }}
      >
        <CollapsedAuthenticationValidation
          className={'msla-auth-editor-validation'}
          collapsedValue={collapsedValue}
          isValid={isValid}
          setCollapsedValue={setCollapsedValue}
          setCurrentProps={setCurrentProps}
          setIsValid={setIsValid}
          setOption={setOption}
        />
      </BaseEditor>
    </div>
  );
};
