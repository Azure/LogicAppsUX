import { ChoiceGroup, css, Label, List, MessageBar, MessageBarType, SearchBox, Text } from '@fluentui/react';
import { Spinner } from '@fluentui/react-components';
import { labelCase } from '@microsoft/logic-apps-shared';
import Fuse from 'fuse.js';
import { useMemo, useState } from 'react';
import { useIntl } from 'react-intl';
import { useQuery } from 'react-query';

export interface AssistedConnectionProps {
  resourceType: string;
  subResourceType: string;
  titleText: string;
  loadingText: string;
  headers: string[];
  getColumns: (resource: any) => string[];
  getResourcesCallback: GetResourceCallback;
  getSubResourceName?: (subResource: any) => string;
  fetchSubResourcesCallback?: GetResourceCallback;
}

export type GetResourceCallback = (id?: string) => Promise<any>;
export interface AzureResourcePickerProps extends AssistedConnectionProps {
  selectedResourceId: string | undefined;
  onResourceSelect: (resource: string) => void;
  onSubResourceSelect?: (subResource: any) => void;
  selectedSubResource?: any;
}

const fuseOptions: Fuse.IFuseOptions<{ id: string; text: string }> = {
  includeScore: true,
  minMatchCharLength: 2,
  includeMatches: true,
  threshold: 0.4,
  keys: ['text'],
};

export const AzureResourcePicker = (props: AzureResourcePickerProps) => {
  const {
    resourceType,
    subResourceType,
    titleText,
    headers,
    getResourcesCallback,
    loadingText,
    getColumns,
    selectedResourceId,
    onResourceSelect,
    getSubResourceName,
    onSubResourceSelect,
    fetchSubResourcesCallback,
  } = props;

  const intl = useIntl();

  const itemsQuery = useQuery([resourceType], async () => getResourcesCallback?.() ?? [], {
    enabled: true,
    staleTime: 1000 * 60 * 60 * 24,
  });

  const resources = useMemo(() => ((itemsQuery?.data ?? []) as any[]).sort((a, b) => a.name.localeCompare(b.name)), [itemsQuery.data]);
  const resourceNames = useMemo(() => resources.map((resource) => resource.name), [resources]);

  const gridTemplateColumns = useMemo(() => '2fr '.repeat(headers.length - 1) + '1fr', [headers.length]);

  const [searchTerm, setSearchTerm] = useState<string | null>(null);
  const searchText = intl.formatMessage({
    defaultMessage: 'Search',
    description: 'Search box placeholder text',
  });
  const fuseObject = useMemo(
    () =>
      new Fuse(
        resourceNames.map((name) => ({ text: labelCase(name), id: name })),
        fuseOptions
      ),
    [resourceNames]
  );
  const searchResourceNames = useMemo(() => {
    if (!searchTerm) return resourceNames;
    return fuseObject.search(searchTerm).map((result) => result.item.id);
  }, [resourceNames, fuseObject, searchTerm]);

  const searchFilteredResources = useMemo(() => {
    return resources.filter((resource) => searchResourceNames.includes(resource.name));
  }, [resources, searchResourceNames]);

  return (
    <div style={{ width: '100%' }}>
      <Label className="label" required>
        {titleText}
      </Label>
      <SearchBox placeholder={searchText} onChange={(e, newValue) => setSearchTerm(newValue ?? null)} />
      <div className="msla-azure-resources-container">
        <div className="msla-azure-resource-list-header" style={{ gridTemplateColumns }}>
          {headers.map((header) => (
            <Text key={header}>{header}</Text>
          ))}
        </div>
        {itemsQuery?.isLoading ? (
          <Spinner size="tiny" label={loadingText} style={{ margin: '16px' }} />
        ) : itemsQuery?.isSuccess ? (
          <div className="msla-azure-resources-list-container" style={{ gridTemplateColumns }} data-is-scrollable>
            <List
              items={searchFilteredResources.map((resource) => ({
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
            {JSON.stringify(itemsQuery?.error as string)}
          </MessageBar>
        ) : null}
      </div>
    </div>
  );
};

interface ResourceEntryProps {
  resource: any;
  getColumns: (resource: any) => string[];
  onResourceSelect: (resource: string) => void;
  subResourceType: string;
  getSubResourceName?: (subResource: any) => string;
  onSubResourceSelect?: (subResource: any) => void;
  fetchSubResourcesCallback?: GetResourceCallback;
  subResourceLoadingText?: string;
}

export const ResourceEntry = (props: ResourceEntryProps) => {
  const {
    subResourceType,
    resource,
    getColumns,
    onResourceSelect,
    getSubResourceName,
    onSubResourceSelect,
    fetchSubResourcesCallback,
    subResourceLoadingText,
  } = props;

  const intl = useIntl();
  const hasSubResources = !!fetchSubResourcesCallback;

  const subResourcesQuery = useQuery([subResourceType, resource.id], async () => fetchSubResourcesCallback?.(resource) ?? [], {
    enabled: resource.selected && hasSubResources,
    staleTime: 1000 * 60 * 60 * 24,
  });

  const selected = resource.selected;
  const expanded = useMemo(() => selected && hasSubResources, [hasSubResources, selected]);
  const selectedSubResourceId = useMemo(() => resource.selectedSubresource, [resource.selectedSubresource]);

  const noSubResourceText = intl.formatMessage({
    defaultMessage: 'No resources of this type found under this subscription.',
    description: 'Message to show when no resources are found',
  });

  const columns = useMemo(() => getColumns(resource), [resource, getColumns]);

  const gridTemplateColumns = useMemo(() => '2fr '.repeat(columns.length - 1) + '1fr', [columns.length]);

  return (
    <div className="msla-azure-resource-entry">
      <button
        className={css('msla-azure-resource-entry-heading', expanded && 'expanded')}
        onClick={() => onResourceSelect(selected ? undefined : resource)}
        style={{ gridTemplateColumns }}
      >
        {columns.map((value, index) => (
          <Text key={`${value}-${index}`}>{value ?? ' '}</Text>
        ))}
      </button>
      {hasSubResources && expanded && (
        <div className="msla-azure-resource-entry-content">
          {subResourcesQuery?.isLoading ? (
            <Spinner size="tiny" label={subResourceLoadingText} style={{ margin: '8px' }} />
          ) : subResourcesQuery?.isSuccess ? (
            <>
              {(subResourcesQuery?.data as any[])?.length === 0 ? (
                <Text style={{ margin: '16px', textAlign: 'center' }}>{noSubResourceText}</Text>
              ) : (
                <ChoiceGroup
                  options={((subResourcesQuery?.data as any[]) ?? []).map((sub) => ({
                    key: sub?.id,
                    text: getSubResourceName?.(sub) ?? '',
                    data: sub,
                  }))}
                  onChange={(_e: any, f: any) => onSubResourceSelect?.(f.data as any)}
                  selectedKey={selectedSubResourceId}
                />
              )}
            </>
          ) : subResourcesQuery?.isError ? (
            <MessageBar messageBarType={MessageBarType.error}>{JSON.stringify(subResourcesQuery?.error as any)}</MessageBar>
          ) : null}
        </div>
      )}
    </div>
  );
};
