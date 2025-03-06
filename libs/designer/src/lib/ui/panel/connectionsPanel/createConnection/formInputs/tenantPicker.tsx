import type { IDropdownOption } from '@fluentui/react';
import { Dropdown } from '@fluentui/react';
import { parseErrorMessage, type Tenant } from '@microsoft/logic-apps-shared';
import { useTenants } from '../../../../../core/state/connection/connectionSelector';
import { useEffect, useMemo } from 'react';
import { useIntl } from 'react-intl';
import { Label } from '@microsoft/designer-ui';

const TenantPicker = (props: any) => {
  const { value, setValue, isLoading } = props;

  const intl = useIntl();

  const { data: tenants, isLoading: tenantsLoading, error: tenantsError } = useTenants();

  const tenantOptions = useMemo(
    () =>
      (tenants ?? [])
        .map((tenant: Tenant) => ({
          key: tenant.id.split('/tenants/')?.[1] ?? tenant.id,
          text: tenant.displayName,
        }))
        .sort((a: any, b: any) => a.text.localeCompare(b.text)),
    [tenants]
  );

  const tenantDropdownLabel = intl.formatMessage({
    defaultMessage: 'Tenant ID',
    id: '52c12f1b6503',
    description: 'tenant dropdown label',
  });

  const errorMessage = useMemo(() => (tenantsError ? parseErrorMessage(tenantsError) : undefined), [tenantsError]);

  useEffect(() => {
    if (!value && tenantOptions.length > 0) {
      setValue(tenantOptions[0]?.key.toString());
    }
  }, [setValue, tenantOptions, value]);

  return (
    <div className="param-row">
      <Label
        className="label"
        isRequiredField={true}
        text={tenantDropdownLabel}
        htmlFor={'oauth-tenant-select'}
        disabled={isLoading || tenantsLoading}
      />
      <Dropdown
        id="connection-param-oauth-tenants"
        className="connection-parameter-input"
        selectedKey={value}
        onChange={(e: any, newVal?: IDropdownOption) => {
          setValue(newVal?.key.toString());
        }}
        disabled={isLoading || tenantsLoading}
        errorMessage={errorMessage}
        ariaLabel={tenantDropdownLabel}
        placeholder={tenantDropdownLabel}
        options={tenantOptions}
        styles={{ callout: { maxHeight: '300px' } }}
      />
    </div>
  );
};

export default TenantPicker;
