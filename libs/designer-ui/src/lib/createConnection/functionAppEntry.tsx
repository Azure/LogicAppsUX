import { ChoiceGroup, css, MessageBar, MessageBarType, Spinner, Text } from '@fluentui/react';
import { useMemo } from 'react';
import { useIntl } from 'react-intl';
import { useQuery } from 'react-query';

interface FunctionAppEntryProps {
  functionApp: any;
  onAppSelect: (appId: string) => void;
  onFunctionSelect: (appFunction: any) => void;
  fetchFunctions: (appId: string) => Promise<any[]>;
}

const FunctionAppEntry = (props: FunctionAppEntryProps) => {
  const { functionApp, onAppSelect, onFunctionSelect, fetchFunctions } = props;

  const intl = useIntl();

  const expanded = useMemo(() => functionApp.selected, [functionApp.selected]);
  const selectedFunctionId = useMemo(() => functionApp.selectedFunctionId, [functionApp.selectedFunctionId]);

  const functionsQuery = useQuery(['functionAppsFunctions', functionApp.id], async () => fetchFunctions(functionApp.id) ?? [], {
    enabled: expanded,
    staleTime: 1000 * 60 * 60 * 24,
  });

  const loadingText = intl.formatMessage({
    defaultMessage: 'Loading functions...',
    description: 'Message to show under the loading icon when loading functions',
  });

  const noFunctionsText = intl.formatMessage({
    defaultMessage: 'No resources of this type found under this subscription.',
    description: 'Message to show when no functions are found',
  });

  return (
    <div className="msla-function-app-entry">
      <button
        className={css('msla-function-app-entry-heading', expanded && 'expanded')}
        onClick={() => onAppSelect(expanded ? '' : functionApp.id)}
      >
        <Text>{functionApp?.name}</Text>
        <Text>{functionApp?.properties?.resourceGroup}</Text>
        <Text>{functionApp?.location}</Text>
      </button>
      {expanded && (
        <div className="msla-function-app-entry-content">
          {functionsQuery?.isLoading ? (
            <Spinner label={loadingText} style={{ margin: '8px' }} />
          ) : functionsQuery?.isSuccess ? (
            <>
              {functionsQuery?.data?.length === 0 ? (
                <Text style={{ margin: '16px', textAlign: 'center' }}>{noFunctionsText}</Text>
              ) : (
                <ChoiceGroup
                  options={(functionsQuery?.data ?? []).map((func) => ({ key: func?.id, text: func?.name.split('/')[1], data: func }))}
                  onChange={(_e: any, f: any) => onFunctionSelect(f.data)}
                  selectedKey={selectedFunctionId}
                />
              )}
            </>
          ) : functionsQuery?.isError ? (
            <MessageBar messageBarType={MessageBarType.error}>{(functionsQuery?.error as any)?.toString()}</MessageBar>
          ) : null}
        </div>
      )}
    </div>
  );
};

export default FunctionAppEntry;
