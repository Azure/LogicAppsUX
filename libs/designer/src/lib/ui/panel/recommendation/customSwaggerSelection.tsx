import type { AppDispatch } from '../../../core';
import { addOperation } from '../../../core/actions/bjsworkflow/add';
import { useRelationshipIds, useIsParallelBranch, useIsAddingTrigger } from '../../../core/state/panel/panelSelectors';
import { PrimaryButton, Text, TextField } from '@fluentui/react';
import type { DiscoveryOperation, DiscoveryResultTypes } from '@microsoft/logic-apps-shared';
import { useCallback, useMemo, useState } from 'react';
import { useIntl } from 'react-intl';
import { useDispatch } from 'react-redux';

interface CustomSwaggerSelectionProps {
  operation: DiscoveryOperation<DiscoveryResultTypes>;
}

export const CustomSwaggerSelection = (props: CustomSwaggerSelectionProps) => {
  const { operation } = props;

  const dispatch = useDispatch<AppDispatch>();

  const intl = useIntl();

  const isTrigger = useIsAddingTrigger();
  const relationshipIds = useRelationshipIds();
  const isParallelBranch = useIsParallelBranch();

  const [swaggerUrl, setSwaggerUrl] = useState('');

  const submitCallback = useCallback(() => {
    const newNodeId = operation.name.replaceAll(' ', '_');
    dispatch(
      addOperation({
        operation,
        relationshipIds,
        nodeId: newNodeId,
        isParallelBranch,
        isTrigger,
        presetParameterValues: {
          'metadata.apiDefinitionUrl': swaggerUrl,
          'metadata.swaggerSource': 'custom',
        },
      })
    );
  }, [dispatch, isParallelBranch, isTrigger, operation, relationshipIds, swaggerUrl]);

  const inputLabel = intl.formatMessage({
    defaultMessage: 'Swagger Endpoint',
    description: 'Swagger endpoint input label',
  });

  const inputPlaceholder = intl.formatMessage(
    {
      defaultMessage: 'Example: {url}',
      description: 'Swagger url input placeholder',
    },
    {
      url: 'https://myapi.azurewebsites.net/swagger/docs/v1',
    }
  );

  const urlErrorMessage = intl.formatMessage({
    defaultMessage: 'Please enter a valid URL',
    description: 'Swagger url input error message',
  });

  const readyToSubmit = useMemo(() => (swaggerUrl?.length ?? '') > 3, [swaggerUrl]);

  const getErrorMessage = useCallback(
    (value: string) => {
      // if value is not a valid url, return error message
      return !value || !value.startsWith('http') ? urlErrorMessage : '';
    },
    [urlErrorMessage]
  );

  return (
    <div className={'msla-azure-resource-selection'}>
      <div className="msla-flex-row" style={{ justifyContent: 'flex-start' }}>
        <img
          src={operation.properties.api.iconUri}
          alt={operation.properties.api.name}
          style={{ width: '32px', height: '32px', borderRadius: '2px', overflow: 'hidden' }}
        />
        <Text style={{ font: '13px/20px @semibold-font-family' }}>{operation.properties.summary}</Text>
      </div>

      <TextField
        label={inputLabel}
        placeholder={inputPlaceholder}
        value={swaggerUrl}
        type={'url'}
        onChange={(_, value) => setSwaggerUrl(value ?? '')}
        spellCheck={false}
        styles={{ root: { width: '100%' } }}
        onGetErrorMessage={getErrorMessage}
        validateOnLoad={false}
        validateOnFocusOut={true}
      />

      <PrimaryButton
        disabled={!readyToSubmit}
        onClick={() => {
          if (!readyToSubmit) return;
          submitCallback();
        }}
      >
        {intl.formatMessage({ defaultMessage: 'Add Action', description: 'Add action button text' })}
      </PrimaryButton>
    </div>
  );
};
