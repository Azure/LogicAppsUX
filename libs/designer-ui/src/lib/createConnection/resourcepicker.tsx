import { ChoiceGroup, css, Label, List, MessageBar, MessageBarType, Spinner, Text } from '@fluentui/react';
import { useMemo } from 'react';
import { useIntl } from 'react-intl';
import { useQuery } from 'react-query';

export interface AssistedConnectionProps {
  resourceType: string;
  subResourceType: string;
  title: string;
  headers: string[];
  getColumns: (resource: any) => string[];
  getResourcesCallback: getResourceCallback;
  resourcesLoadingText: string;
  getSubResourceName?: (subResource: any) => string;
  fetchSubResourcesCallback?: getResourceCallback;
}

export type getResourceCallback = (id?: string) => Promise<any>;
export interface ResourceSelectorProps extends AssistedConnectionProps {
  selectedResourceId: string;
  onResourceSelect: (resourceId: string) => void;
  onSubResourceSelect?: (subResource: any) => void;
  selectedSubResource?: any;
}

export const ResourceSelector = (props: ResourceSelectorProps) => {
  const {
    resourceType,
    subResourceType,
    title,
    headers,
    getResourcesCallback,
    resourcesLoadingText,
    getColumns,
    selectedResourceId,
    onResourceSelect,
    getSubResourceName,
    onSubResourceSelect,
    fetchSubResourcesCallback,
  } = props;

  const itemsQuery = useQuery([resourceType], async () => getResourcesCallback() ?? [], {
    enabled: true,
    staleTime: 1000 * 60 * 60 * 24,
  });

  const resources = useMemo(() => ((itemsQuery?.data ?? []) as any[]).sort((a, b) => a.name.localeCompare(b.name)), [itemsQuery.data]);

  return (
    <div>
      <Label className="label" required>
        {title}
      </Label>
      <div className="msla-function-apps-container">
        <div className="msla-function-app-list-header">
          {headers.map((header) => (
            <Text key={header}>{header}</Text>
          ))}
        </div>
        {itemsQuery?.isLoading ? (
          <Spinner label={resourcesLoadingText} style={{ margin: '16px' }} />
        ) : itemsQuery?.isSuccess ? (
          <div className="msla-function-apps-list-container" data-is-scrollable>
            <List
              items={resources.map((resource) => ({
                ...resource,
                selected: selectedResourceId === resource.id,
              }))}
              onRenderCell={(resource) => (
                <ResourceEntry
                  subResourceType={subResourceType}
                  resource={resource}
                  getColumns={getColumns}
                  onResourceSelect={onResourceSelect}
                  getSubResourceName={getSubResourceName}
                  onSubResourceSelect={onSubResourceSelect}
                  fetchSubResourcesCallback={fetchSubResourcesCallback}
                />
              )}
            />
          </div>
        ) : itemsQuery?.isError ? (
          <MessageBar messageBarType={MessageBarType.error} style={{ margin: '16px' }}>
            {itemsQuery?.error as string}
          </MessageBar>
        ) : null}
      </div>
    </div>
  );
};

interface ResourceEntryProps {
  resource: any;
  getColumns: (resource: any) => string[];
  onResourceSelect: (resourceId: string) => void;
  subResourceType: string;
  getSubResourceName?: (subResource: any) => string;
  onSubResourceSelect?: (subResource: any) => void;
  fetchSubResourcesCallback?: getResourceCallback;
  subResourceLoadingText?: string;
}

export const ResourceEntry = (props: ResourceEntryProps) => {
  const {
    subResourceType: id,
    resource,
    getColumns,
    onResourceSelect,
    getSubResourceName,
    onSubResourceSelect,
    fetchSubResourcesCallback,
    subResourceLoadingText,
  } = props;

  const intl = useIntl();
  const hasSubResources = !!onSubResourceSelect || !!fetchSubResourcesCallback;

  const subResourcsQuery = useQuery([id, resource.id], async () => fetchSubResourcesCallback?.(resource.id) ?? [], {
    enabled: resource.selected && hasSubResources,
    staleTime: 1000 * 60 * 60 * 24,
  });

  const expanded = useMemo(() => resource.selected, [resource.selected]);
  const selectedFunctionId = useMemo(() => resource.selectedSubresource, [resource.selectedSubresource]);

  const noSubResourceText = intl.formatMessage({
    defaultMessage: 'No resources of this type found under this subscription.',
    description: 'Message to show when no resources are found',
  });

  return (
    <div className="msla-function-app-entry">
      <button
        className={css('msla-function-app-entry-heading', expanded && 'expanded')}
        onClick={() => onResourceSelect(expanded ? '' : resource.id)}
      >
        {getColumns(resource).map((value) => (
          <Text key={value}>{value}</Text>
        ))}
      </button>
      {expanded && hasSubResources && (
        <div className="msla-function-app-entry-content">
          {subResourcsQuery?.isLoading ? (
            <Spinner label={subResourceLoadingText} style={{ margin: '8px' }} />
          ) : subResourcsQuery?.isSuccess ? (
            <>
              {(subResourcsQuery?.data as any[])?.length === 0 ? (
                <Text style={{ margin: '16px', textAlign: 'center' }}>{noSubResourceText}</Text>
              ) : (
                <ChoiceGroup
                  options={((subResourcsQuery?.data as any[]) ?? []).map((sub) => ({
                    key: sub?.id,
                    text: getSubResourceName?.(sub) ?? '',
                    data: sub,
                  }))}
                  onChange={(_e: any, f: any) => onSubResourceSelect?.(f.data as any)}
                  selectedKey={selectedFunctionId}
                />
              )}
            </>
          ) : subResourcsQuery?.isError ? (
            <MessageBar messageBarType={MessageBarType.error}>{(subResourcsQuery?.error as any)?.toString()}</MessageBar>
          ) : null}
        </div>
      )}
    </div>
  );
};
