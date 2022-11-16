import type { AuthenticationType, AuthProps } from '.';
import type { ValueSegment } from '../editor';
import type { TokenPickerHandler } from '../editor/base';
import { BaseEditor } from '../editor/base';
import { CollapsedAuthenticationValidation } from './plugins/CollapsedAuthenticationValidation';
import type { Dispatch, SetStateAction } from 'react';

interface CollapsedAuthenticationProps {
  collapsedValue: ValueSegment[];
  isValid: boolean;
  setCollapsedValue: (value: ValueSegment[]) => void;
  setCurrentProps: Dispatch<SetStateAction<AuthProps>>;
  setIsValid: (b: boolean) => void;
  tokenPickerHandler: TokenPickerHandler;
  setOption: (s: AuthenticationType) => void;
}

export const CollapsedAuthentication = ({
  collapsedValue,
  isValid,
  setCollapsedValue,
  setCurrentProps,
  tokenPickerHandler,
  setIsValid,
  setOption,
}: CollapsedAuthenticationProps): JSX.Element => {
  return (
    <div className="msla-authentication-editor-collapsed-container">
      <BaseEditor
        initialValue={collapsedValue}
        tokenPickerHandler={{ ...tokenPickerHandler, tokenPickerButtonProps: { buttonClassName: 'msla-editor-tokenpicker-button' } }}
        BasePlugins={{ tokens: true, tabbable: true }}
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
