import { useIntl } from 'react-intl';
import { Option, Field, Dropdown } from '@fluentui/react-components';
import { useEffect, useMemo, useState } from 'react';
import { type Resource, equals } from '@microsoft/logic-apps-shared';

export const ResourceField = ({
  id,
  label,
  resources,
  defaultKey,
  errorMessage,
  isLoading,
  onSelect,
  lockField,
}: {
  id: string;
  label: string;
  defaultKey: string;
  resources: Resource[];
  onSelect: (value: any) => void;
  isLoading?: boolean;
  errorMessage?: string;
  lockField: boolean;
}) => {
  const intl = useIntl();
  const texts = {
    LOADING: intl.formatMessage({
      defaultMessage: 'Loading resources ...',
      id: 'IMWSjN',
      description: 'Loading text',
    }),
    NO_ITEMS: intl.formatMessage({
      defaultMessage: 'No resources found',
      id: 'yytPY3',
      description: 'No items to select text',
    }),
  };

  const sortedResources = useMemo(() => resources.sort((a, b) => a.displayName.localeCompare(b.displayName)), [resources]);

  const [selectedResource, setSelectedResource] = useState<string | undefined>('');
  useEffect(() => {
    if (!isLoading) {
      const resource = resources.find((resource) => equals(resource.name, defaultKey))?.displayName;
      if (!resource && !!defaultKey) {
        onSelect('');
      }

      if (resource !== selectedResource) {
        setSelectedResource(resource);
      }
    }
  }, [resources, defaultKey, onSelect, isLoading, selectedResource]);

  return (
    <div style={{ marginBottom: '12px' }}>
      <Field
        className="msla-templates-tab-label"
        label={label}
        required={true}
        validationMessage={errorMessage}
        validationState={errorMessage ? 'error' : 'none'}
      >
        <Dropdown
          style={{ width: '100%' }}
          id={id}
          onOptionSelect={(e, option) => onSelect(option?.optionValue)}
          disabled={isLoading || (lockField && !!selectedResource)}
          value={selectedResource}
          selectedOptions={[defaultKey]}
          size="small"
          placeholder={isLoading ? texts.LOADING : ''}
        >
          {!isLoading && !sortedResources.length ? (
            <Option key={'no-items'} value={'#noitem#'} disabled>
              {texts.NO_ITEMS}
            </Option>
          ) : (
            sortedResources.map((resource) => (
              <Option key={resource.id} value={resource.name}>
                {resource.displayName}
              </Option>
            ))
          )}
        </Dropdown>
      </Field>
    </div>
  );
};
