import type { BasicProps, ClientCertificateProps, MSIProps, OAuthProps, RawProps } from '.';
import { AuthenticationType } from '.';
import type { ValueSegment } from '../editor';
import { ValueSegmentType } from '../editor';
import { BaseEditor } from '../editor/base';
import { guid } from '@microsoft-logic-apps/utils';
import { useState, useEffect } from 'react';

interface CollapsedAuthenticationProps {
  authType: string | number;
  basicProps: BasicProps;
  clientCertificateProps: ClientCertificateProps;
  rawProps: RawProps;
  msiProps: MSIProps;
  aadOAuthProps: OAuthProps;
  GetTokenPicker: (editorId: string, labelId: string, onClick?: (b: boolean) => void) => JSX.Element;
}

export const CollapsedAuthentication = ({
  authType,
  //   basicProps,
  //   clientCertificateProps,
  //   rawProps,
  //   msiProps,
  //   aadOAuthProps,
  GetTokenPicker,
}: CollapsedAuthenticationProps): JSX.Element => {
  const [collapsedValueSegment, setCollapsedValueSegment] = useState<ValueSegment[]>([]);
  useEffect(() => {
    if (authType === AuthenticationType.BASIC) {
      setCollapsedValueSegment([{ id: guid(), type: ValueSegmentType.LITERAL, value: 'hello' }]);
    } else {
      setCollapsedValueSegment([]);
    }
  }, [authType]);
  return (
    <div className="msla-authentication-editor-collapsed-container">
      <BaseEditor initialValue={collapsedValueSegment} GetTokenPicker={GetTokenPicker} BasePlugins={{ tokens: true }}></BaseEditor>
    </div>
  );
};
