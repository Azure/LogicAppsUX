import { DefaultButton, Icon, Label, PrimaryButton, TextField, TooltipHost } from '@fluentui/react';
import type { Connection } from '@microsoft-logic-apps/utils';
import { useState } from 'react';
import { useIntl } from 'react-intl';

export interface CreateConfigurableConnectionProps {
  connection: Connection;
  isLoading?: boolean;
  createConnectionCallback?: (val: Record<string, string | undefined>) => void;
  cancelCallback?: () => void;
}

export const CreateConfigurableConnection = (props: CreateConfigurableConnectionProps): JSX.Element => {
  const { connection, isLoading, createConnectionCallback, cancelCallback } = props;

  const intl = useIntl();

  const [configurationValues, setConfigurationValues] = useState<Record<string, string | undefined>>({});

  const canSubmit =
    !isLoading &&
    !!configurationValues['connection-name'] && // has a name
    connection.properties.connectionParameters &&
    Object.values(connection.properties.connectionParameters).every((parameter) => {
      // has all required parameters
      return (
        parameter.uiDefinition?.constraints?.required === 'false' ||
        !!configurationValues[parameter.uiDefinition?.displayName ?? 'UNDEFINED']
      );
    });

  const inputConnectionNameLabel = intl.formatMessage({
    defaultMessage: 'Connection Name',
    description: 'Connection Name',
  });

  const inputConnectionNamePlaceholder = intl.formatMessage({
    defaultMessage: 'Enter a name for the connection',
    description: 'Placeholder text for connection name input',
  });

  const createButtonText = intl.formatMessage({
    defaultMessage: 'Create New',
    description: 'Button to add a new connection',
  });

  const createButtonLoadingText = intl.formatMessage({
    defaultMessage: 'Creating...',
    description: 'Button text to show a connection is being created',
  });

  const createButtonAria = intl.formatMessage({
    defaultMessage: 'Create a new connection',
    description: 'aria label description for create button',
  });

  const cancelButtonText = intl.formatMessage({
    defaultMessage: 'Cancel',
    description: 'Button to cancel creating a connection',
  });

  const cancelButtonAria = intl.formatMessage({
    defaultMessage: 'Cancel creating a connection',
    description: 'aria label description for cancel button',
  });

  return (
    <div className="msla-create-connection-container">
      <div className="connection-params-container">
        <div className="param-row">
          <Label className="label" required htmlFor={'connection-name-input'} disabled={isLoading}>
            {inputConnectionNameLabel}
          </Label>
          <TextField
            id={'connection-name-input'}
            className="textfield"
            disabled={isLoading}
            autoComplete="off"
            placeholder={inputConnectionNamePlaceholder}
            value={configurationValues['connection-name'] ?? ''}
            onChange={(e: any, newValue?: string) => setConfigurationValues({ ...configurationValues, 'connection-name': newValue })}
          />
        </div>
        {connection.properties.connectionParameters
          ? Object.values(connection.properties.connectionParameters).map((parameter) => {
              const data = parameter.uiDefinition;
              const id = data?.displayName ?? 'UNDEFINED';

              if (data?.constraints?.hidden === 'true') return null;

              return (
                <div key={id} className="param-row">
                  <Label className="label" required={data?.constraints?.required === 'true'} htmlFor={id} disabled={isLoading}>
                    {data?.displayName}
                    <TooltipHost content={data?.tooltip}>
                      <Icon iconName="Info" style={{ marginLeft: '4px', transform: 'translate(0px, 2px)' }} />
                    </TooltipHost>
                  </Label>
                  <TextField
                    id={id}
                    className="textfield"
                    disabled={isLoading}
                    autoComplete="off"
                    // onNotifyValidationResult
                    placeholder={data?.description}
                    value={configurationValues[id]}
                    onChange={(e: any, newVal?: string) => setConfigurationValues({ ...configurationValues, [id]: newVal })}
                  />
                </div>
              );
            })
          : null}
      </div>

      <div className="msla-create-connection-actions-container">
        <PrimaryButton
          disabled={!canSubmit}
          text={isLoading ? createButtonLoadingText : createButtonText}
          ariaLabel={createButtonAria}
          onClick={() => createConnectionCallback?.(configurationValues)}
        />
        <DefaultButton disabled={isLoading} text={cancelButtonText} ariaLabel={cancelButtonAria} onClick={cancelCallback} />
      </div>
    </div>
  );
};
