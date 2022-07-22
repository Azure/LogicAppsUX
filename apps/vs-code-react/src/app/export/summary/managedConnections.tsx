import { Checkbox, Text } from '@fluentui/react';
import { useCallback, useState } from 'react';
import { useIntl } from 'react-intl';

export const ManagedConnections: React.FC = () => {
  const intl = useIntl();
  const [isChecked, setIsChecked] = useState(false);

  const intlText = {
    DEPLOY_MANAGED_CONNECTIONS: intl.formatMessage({
      defaultMessage: 'Deploy managed connections',
      description: 'Deploy managed connections text',
    }),
    MANAGED_CONNECTIONS: intl.formatMessage({
      defaultMessage:
        'Deploying Managed Connections will copy the credentials from original connections. This is not recommended for production environments.',
      description: 'Managed Connections text',
    }),
  };

  const onChangeConnections = useCallback((_ev?: React.FormEvent<HTMLElement | HTMLInputElement>, checked?: boolean): void => {
    setIsChecked(!!checked);
  }, []);

  return (
    <div className="msla-export-summary">
      <Text variant="large" nowrap block>
        {intlText.MANAGED_CONNECTIONS}
      </Text>
      <Checkbox label={intlText.DEPLOY_MANAGED_CONNECTIONS} checked={isChecked} onChange={onChangeConnections} />
    </div>
  );
};
