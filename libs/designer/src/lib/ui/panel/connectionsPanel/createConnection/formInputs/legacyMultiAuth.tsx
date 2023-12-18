import { Dropdown, type IDropdownOption, Label } from '@fluentui/react';
import { useMemo, type FormEvent } from 'react';
import { useIntl } from 'react-intl';

export const LegacyMultiAuthOptions = {
  oauth: 0,
  servicePrincipal: 1,
  managedIdentity: 2,
} as const;
export type LegacyMultiAuthOptions = (typeof LegacyMultiAuthOptions)[keyof typeof LegacyMultiAuthOptions];

export interface LegacyMultiAuthProps {
  isLoading: boolean;
  value: number;
  onChange: (_event: FormEvent<HTMLDivElement>, item: any) => void;
  supportsServicePrincipalConnection: boolean;
  supportsLegacyManagedIdentityConnection: boolean;
}

const LegacyMultiAuth = ({
  isLoading,
  value,
  onChange,
  supportsServicePrincipalConnection,
  supportsLegacyManagedIdentityConnection,
}: LegacyMultiAuthProps) => {
  const intl = useIntl();
  const legacyMultiAuthLabelText = intl.formatMessage({
    defaultMessage: 'Authentication',
    description: 'Label for legacy multi auth dropdown',
  });

  const oAuthDropdownText = intl.formatMessage({
    defaultMessage: 'OAuth',
    description: 'Dropdown text for OAuth connection',
  });
  const servicePrincipalDropdownText = intl.formatMessage({
    defaultMessage: 'Service Principal',
    description: 'Dropdown text for service principal connection',
  });
  const legacyManagedIdentityDropdownText = intl.formatMessage({
    defaultMessage: 'Managed Identity',
    description: 'Dropdown text for legacy managed identity connection',
  });

  const legacyMultiAuthOptions: IDropdownOption<any>[] = useMemo(
    () =>
      [
        {
          key: LegacyMultiAuthOptions.oauth,
          text: oAuthDropdownText,
        },
        supportsServicePrincipalConnection
          ? {
              key: LegacyMultiAuthOptions.servicePrincipal,
              text: servicePrincipalDropdownText,
            }
          : undefined,
        supportsLegacyManagedIdentityConnection
          ? {
              key: LegacyMultiAuthOptions.managedIdentity,
              text: legacyManagedIdentityDropdownText,
            }
          : undefined,
      ].filter((opt) => opt !== undefined) as IDropdownOption<any>[],
    [
      legacyManagedIdentityDropdownText,
      oAuthDropdownText,
      servicePrincipalDropdownText,
      supportsLegacyManagedIdentityConnection,
      supportsServicePrincipalConnection,
    ]
  );

  return (
    <div className="param-row">
      <Label className="label" required htmlFor={'legacy-connection-param-set-select'} disabled={isLoading}>
        {legacyMultiAuthLabelText}
      </Label>
      <Dropdown
        id="legacy-connection-param-set-select"
        className="connection-parameter-input"
        selectedKey={value}
        onChange={onChange}
        disabled={isLoading}
        ariaLabel={legacyMultiAuthLabelText}
        options={legacyMultiAuthOptions}
      />
    </div>
  );
};

export default LegacyMultiAuth;
