import { useDispatch, useSelector } from 'react-redux';
import { TagPicker, TagPickerInput, TagPickerControl, type TagPickerProps, TagPickerGroup, Tag } from '@fluentui/react-components';
import type { AppDispatch, RootState } from '../../../core/state/templates/store';
import { TemplatesSection, type TemplatesSectionItem } from '@microsoft/designer-ui';
import { useTemplatesStrings } from '../../templates/templatesStrings';
import { getLogicAppsCategories, useResourceStrings } from '../resources';
import { updateTemplateManifest } from '../../../core/state/templates/templateSlice';
import { useMemo, useState } from 'react';
import { useIntl } from 'react-intl';
import { FeaturedConnectors } from './connectors';
import type { Template } from '@microsoft/logic-apps-shared';

export const TemplateManifestForm = () => {
  const resources = { ...useTemplatesStrings().resourceStrings, ...useResourceStrings() };
  const generalSectionItems = useGeneralSectionItems(resources);
  const contactInfoSectionItems = useContactInfoSectionItems(resources);
  const descriptionSectionItems = useDescriptionSectionItems(resources);
  const categorySectionItems = useCategorySectionItems(resources);

  return (
    <div className="msla-templates-wizard-tab-content" style={{ width: '70%' }}>
      <TemplatesSection title={resources.General} titleHtmlFor={'generalSectionLabel'} items={generalSectionItems} />
      <TemplatesSection title={resources.ContactInfo} titleHtmlFor={'contactInfoSectionLabel'} items={contactInfoSectionItems} />
      <TemplatesSection title={resources.DESCRIPTION} titleHtmlFor={'descriptionSectionLabel'} items={descriptionSectionItems} />
      <TemplatesSection title={resources.Categorization} titleHtmlFor={'categorySectionLabel'} items={categorySectionItems} />
    </div>
  );
};

const useGeneralSectionItems = (resources: Record<string, string>) => {
  const dispatch = useDispatch<AppDispatch>();
  const { manifest, workflows } = useSelector((state: RootState) => state.template);
  const workflowKeys = Object.keys(workflows);
  const isMultiWorkflow = workflowKeys.length > 1;
  const items: TemplatesSectionItem[] = [
    {
      label: resources.DisplayName,
      value: manifest?.title || '',
      type: 'textfield',
      required: true,
      onChange: (value: string) => dispatch(updateTemplateManifest({ title: value })),
    },
    {
      label: resources.WorkflowType,
      value: isMultiWorkflow ? 'Accelerator' : 'Workflow',
      type: 'text',
    },
  ];

  if (!isMultiWorkflow) {
    items.push({
      label: resources.Trigger,
      value: manifest?.details.Trigger ?? '',
      type: 'text',
    });
  }

  return items;
};

const useContactInfoSectionItems = (resources: Record<string, string>) => {
  const dispatch = useDispatch<AppDispatch>();
  const { manifest } = useSelector((state: RootState) => state.template);
  const items: TemplatesSectionItem[] = [
    {
      label: resources.BY,
      value: manifest?.details?.By || '',
      type: 'textfield',
      required: true,
      onChange: (value: string) => dispatch(updateTemplateManifest({ details: { ...(manifest?.details ?? {}), By: value } as any })),
    },
  ];

  return items;
};

const useDescriptionSectionItems = (resources: Record<string, string>) => {
  const dispatch = useDispatch<AppDispatch>();
  const { manifest, workflows } = useSelector((state: RootState) => state.template);
  const isMultiWorkflow = Object.keys(workflows).length > 1;
  const items: TemplatesSectionItem[] = [
    {
      label: resources.Summary,
      value: manifest?.summary || '',
      type: 'textarea',
      required: true,
      onChange: (value: string) => dispatch(updateTemplateManifest({ summary: value })),
    },
    {
      label: isMultiWorkflow ? resources.Features : resources.Prerequisites,
      value: manifest?.description || '',
      type: 'textarea',
      required: true,
      onChange: (value: string) => dispatch(updateTemplateManifest({ description: value })),
    },
  ];

  return items;
};

const useCategorySectionItems = (resources: Record<string, string>) => {
  const dispatch = useDispatch<AppDispatch>();
  const { details, tags, featuredConnectors } = useSelector((state: RootState) => state.template.manifest as Template.TemplateManifest);
  const categories = useMemo(
    () =>
      getLogicAppsCategories().map((category) => ({
        id: category.value,
        label: category.displayName,
        value: category.value,
      })),
    []
  );
  const selectedCategories = useMemo(() => {
    return details?.Category ? (details?.Category ?? '').split(',') : [];
  }, [details?.Category]);
  const categoryValue = useMemo(
    () =>
      categories
        .filter((category) => selectedCategories.includes(category.value))
        .map((category) => category.label)
        .join(', '),
    [categories, selectedCategories]
  );

  const items: TemplatesSectionItem[] = [
    {
      label: resources.FeaturedConnectors,
      value: featuredConnectors || [],
      type: 'custom',
      required: true,
      onRenderItem: () => <FeaturedConnectors />,
    },
    {
      label: resources.Category,
      value: categoryValue,
      type: 'dropdown',
      required: true,
      multiselect: true,
      options: categories,
      selectedOptions: selectedCategories,
      onOptionSelect: (selectedOptions) =>
        dispatch(updateTemplateManifest({ details: { ...(details ?? {}), Category: selectedOptions.join(',') } as any })),
    },
    {
      label: resources.Tags,
      value: tags || [],
      type: 'custom',
      onRenderItem: () => <TagsInput tags={tags ?? []} />,
    },
  ];

  return items;
};

const TagsInput = ({ tags }: { tags: string[] }) => {
  const dispatch = useDispatch<AppDispatch>();
  const intl = useIntl();
  const texts = {
    Content_AriaLabel: intl.formatMessage({
      defaultMessage: 'Current tags',
      id: 'Y5Z6jr',
      description: 'Aria label for current tags',
    }),
    Add_AriaLabel: intl.formatMessage({
      defaultMessage: 'Add new tag',
      id: 'j1FtOw',
      description: 'Aria label for add new tag',
    }),
  };
  const [selectedOptions, setSelectedOptions] = useState<string[]>(tags);
  const [inputValue, setInputValue] = useState('');

  const onOptionSelect: TagPickerProps['onOptionSelect'] = (_, data) => {
    setSelectedOptions(data.selectedOptions);
    dispatch(updateTemplateManifest({ tags: data.selectedOptions }));
  };
  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(event.currentTarget.value);
  };
  const handleKeyDown = (event: React.KeyboardEvent) => {
    if ((event.code === 'Enter' || event.code === 'Space') && inputValue) {
      setInputValue('');
      if (!selectedOptions.includes(inputValue)) {
        const newOptions = [...selectedOptions, inputValue];
        setSelectedOptions(newOptions);
        dispatch(updateTemplateManifest({ tags: newOptions }));
      }
    }
  };

  return (
    <TagPicker noPopover onOptionSelect={onOptionSelect} selectedOptions={selectedOptions}>
      <TagPickerControl>
        <TagPickerGroup aria-label={texts.Content_AriaLabel}>
          {selectedOptions.map((option, index) => (
            <Tag key={index} shape="rounded" value={option} style={{ backgroundColor: 'azure' }}>
              {option}
            </Tag>
          ))}
        </TagPickerGroup>
        <TagPickerInput value={inputValue} onChange={handleChange} onKeyDown={handleKeyDown} aria-label={texts.Add_AriaLabel} />
      </TagPickerControl>
    </TagPicker>
  );
};
