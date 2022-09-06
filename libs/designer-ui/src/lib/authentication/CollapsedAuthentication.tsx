import type { ValueSegment } from '../editor';
import { BaseEditor } from '../editor/base';
import { CollapsedAuthenticationValidation } from './plugins/CollapsedAuthenticationValidation';

interface CollapsedAuthenticationProps {
  collapsedValue: ValueSegment[];
  errorMessage: string;
  setCollapsedValue: (value: ValueSegment[]) => void;
  GetTokenPicker: (editorId: string, labelId: string, onClick?: (b: boolean) => void) => JSX.Element;
}

export const CollapsedAuthentication = ({
  collapsedValue,
  errorMessage,
  setCollapsedValue,
  GetTokenPicker,
}: CollapsedAuthenticationProps): JSX.Element => {
  return (
    <div className="msla-authentication-editor-collapsed-container">
      <BaseEditor initialValue={collapsedValue} GetTokenPicker={GetTokenPicker} BasePlugins={{ tokens: true }}>
        <CollapsedAuthenticationValidation
          className={'msla-collapsed-editor-validation'}
          errorMessage={errorMessage}
          setCollapsedValue={setCollapsedValue}
        />
      </BaseEditor>
    </div>
  );
};
