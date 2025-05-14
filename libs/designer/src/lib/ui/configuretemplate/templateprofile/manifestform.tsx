import { useDispatch, useSelector } from 'react-redux';
import { TagPicker, TagPickerInput, TagPickerControl, type TagPickerProps, TagPickerGroup, Tag } from '@fluentui/react-components';
import type { AppDispatch, RootState } from '../../../core/state/templates/store';
import { TemplatesSection, type TemplatesSectionItem } from '@microsoft/designer-ui';
import { useTemplatesStrings } from '../../templates/templatesStrings';
import { getLogicAppsCategories, useResourceStrings } from '../resources';
import { updateTemplateManifest, validateTemplateManifest } from '../../../core/state/templates/templateSlice';
import { useMemo, useState } from 'react';
import { useIntl } from 'react-intl';
import { FeaturedConnectors } from './connectors';
import type { Template } from '@microsoft/logic-apps-shared';
import { getSupportedSkus } from '../../../core/configuretemplate/utils/helper';
import { DescriptionWithLink } from '../common';
import { mergeStyles } from '@fluentui/react';

export const TemplateManifestForm = () => {
  const dispatch = useDispatch<AppDispatch>();
  const intl = useIntl();
  const runValidation = useSelector((state: RootState) => state.tab.runValidation);

  const resources = { ...useTemplatesStrings().resourceStrings, ...useResourceStrings() };
  const handleUpdateManifest = (manifest: Partial<Template.TemplateManifest>) => {
    dispatch(updateTemplateManifest(manifest));
    if (runValidation) {
      dispatch(validateTemplateManifest());
    }
  };

  const generalSectionItems = useGeneralSectionItems(resources, handleUpdateManifest);
  const contactInfoSectionItems = useContactInfoSectionItems(resources, handleUpdateManifest);
  const descriptionSectionItems = useDescriptionSectionItems(resources, handleUpdateManifest);
  const categorySectionItems = useCategorySectionItems(resources, handleUpdateManifest);

  return (
    <div className="msla-templates-wizard-tab-content" style={{ width: '70%', marginTop: '8px' }}>
      <DescriptionWithLink
        text={intl.formatMessage({
          defaultMessage:
            'Add details to help template users evaluate this template. The profile includes the information shown to users and settings that control how the template is filtered and displayed.',
          id: 'tkkN++',
          description: 'Description for template profile tab',
        })}
        linkText={resources.LearnMore}
        linkUrl="https://learn.microsoft.com/en-us/azure/logic-apps/logic-apps-templates-manifest"
        className={mergeStyles({ marginLeft: '-10px' })}
      />
      <TemplatesSection title={resources.General} titleHtmlFor={'generalSectionLabel'} items={generalSectionItems} />
      <TemplatesSection title={resources.ContactInfo} titleHtmlFor={'contactInfoSectionLabel'} items={contactInfoSectionItems} />
      <TemplatesSection title={resources.DESCRIPTION} titleHtmlFor={'descriptionSectionLabel'} items={descriptionSectionItems} />
      <TemplatesSection title={resources.Categorization} titleHtmlFor={'categorySectionLabel'} items={categorySectionItems} />
    </div>
  );
};

const useGeneralSectionItems = (
  resources: Record<string, string>,
  handleUpdateManifest: (manifest: Partial<Template.TemplateManifest>) => void
) => {
  const { manifest, workflows, errors, connections } = useSelector((state: RootState) => state.template);
  const workflowKeys = Object.keys(workflows);
  const isMultiWorkflow = workflowKeys.length > 1;
  const disableSkuSelection = useMemo(() => getSupportedSkus(connections).length === 1, [connections]);
  const skuTypes = useMemo(
    () => [
      { id: '1', label: resources.Standard, value: 'standard' },
      { id: '2', label: resources.Consumption, value: 'consumption' },
    ],
    [resources.Consumption, resources.Standard]
  );
  const skuValue = useMemo(
    () =>
      skuTypes
        .filter((skuType) => (manifest?.skus as string[]).includes(skuType.value))
        .map((sku) => sku.label)
        .join(', '),
    [skuTypes, manifest?.skus]
  );

  const items: TemplatesSectionItem[] = [
    {
      label: resources.DisplayName,
      value: manifest?.title || '',
      type: 'textfield',
      required: true,
      onChange: (value: string) => handleUpdateManifest({ title: value }),
      errorMessage: errors?.manifest?.title,
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

  items.push({
    label: resources.Host,
    value: skuValue,
    type: 'dropdown',
    required: true,
    multiselect: true,
    options: skuTypes,
    disabled: disableSkuSelection,
    selectedOptions: manifest?.skus as string[],
    onOptionSelect: (selectedOptions: string[]) => handleUpdateManifest({ skus: selectedOptions as Template.SkuType[] }),
  });

  return items;
};

const useContactInfoSectionItems = (
  resources: Record<string, string>,
  handleUpdateManifest: (manifest: Partial<Template.TemplateManifest>) => void
) => {
  const { manifest, errors } = useSelector((state: RootState) => state.template);
  const items: TemplatesSectionItem[] = [
    {
      label: resources.BY,
      value: manifest?.details?.By || '',
      type: 'textfield',
      required: true,
      onChange: (value: string) => handleUpdateManifest({ details: { ...(manifest?.details ?? {}), By: value } as any }),
      errorMessage: errors?.manifest?.['details.By'],
    },
  ];

  return items;
};

const useDescriptionSectionItems = (
  resources: Record<string, string>,
  handleUpdateManifest: (manifest: Partial<Template.TemplateManifest>) => void
) => {
  const { manifest, workflows, errors } = useSelector((state: RootState) => state.template);
  const isMultiWorkflow = Object.keys(workflows).length > 1;
  const items: TemplatesSectionItem[] = [
    {
      label: resources.Summary,
      value: manifest?.summary || '',
      type: 'textarea',
      required: true,
      onChange: (value: string) => handleUpdateManifest({ summary: value }),
      errorMessage: errors?.manifest?.summary,
    },
  ];

  if (isMultiWorkflow) {
    items.push({
      label: resources.Features,
      value: manifest?.description || '',
      type: 'textarea',
      onChange: (value: string) => handleUpdateManifest({ description: value }),
    });
  }

  return items;
};

const useCategorySectionItems = (
  resources: Record<string, string>,
  handleUpdateManifest: (manifest: Partial<Template.TemplateManifest>) => void
) => {
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
      multiselect: true,
      options: categories,
      selectedOptions: selectedCategories,
      onOptionSelect: (selectedOptions) =>
        handleUpdateManifest({ details: { ...(details ?? {}), Category: selectedOptions.join(',') } as any }),
    },
    {
      label: resources.Tags,
      value: tags || [],
      type: 'custom',
      onRenderItem: () => <TagsInput tags={tags ?? []} handleUpdateManifest={handleUpdateManifest} />,
    },
  ];

  return items;
};

const TagsInput = ({
  tags,
  handleUpdateManifest,
}: { tags: string[]; handleUpdateManifest: (manifest: Partial<Template.TemplateManifest>) => void }) => {
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
    handleUpdateManifest({ tags: data.selectedOptions });
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
        handleUpdateManifest({ tags: newOptions });
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
