import { useIntl } from 'react-intl';
import { Option, Field, Dropdown } from '@fluentui/react-components';
import { useEffect, useMemo, useState } from 'react';
import { type Resource, equals } from '@microsoft/logic-apps-shared';
import { FieldSectionItem } from '@microsoft/designer-ui';

export type ResourceFieldRenderType = 'section' | 'default';

interface ResourceFieldProps {
  id: string;
  label: string;
  defaultKey: string;
  resources: Resource[];
  onSelect: (value: any) => void;
  isLoading?: boolean;
  errorMessage?: string;
  lockField: boolean;
  renderType?: ResourceFieldRenderType;
  hintTooltip?: string;
}

export const ResourceField = (props: ResourceFieldProps) => {
  const { label, renderType = 'default', errorMessage, hintTooltip } = props;

  if (renderType === 'section') {
    return (
      <FieldSectionItem
        item={{
          type: 'custom',
          label: label,
          value: '',
          required: true,
          errorMessage: errorMessage,
          onRenderItem: () => <ResourceFieldDropdown {...props} />,
          description: hintTooltip,
        }}
      />
    );
  }

  return (
    <Field
      className="msla-templates-tab-label"
      style={{ marginBottom: '12px' }}
      label={label}
      required={true}
      validationMessage={errorMessage}
      validationState={errorMessage ? 'error' : 'none'}
    >
      <ResourceFieldDropdown {...props} />
    </Field>
  );
};

const ResourceFieldDropdown = ({
  id,
  resources,
  defaultKey,
  isLoading,
  onSelect,
  lockField,
  renderType = 'default',
}: ResourceFieldProps) => {
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
  const isDropdownSizeSmall = renderType === 'default';

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
    <Dropdown
      style={{ width: '100%' }}
      id={id}
      onOptionSelect={(e, option) => onSelect(option?.optionValue)}
      disabled={isLoading || (lockField && !!selectedResource)}
      value={selectedResource}
      selectedOptions={[defaultKey]}
      size={isDropdownSizeSmall ? 'small' : 'medium'}
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
  );
};
