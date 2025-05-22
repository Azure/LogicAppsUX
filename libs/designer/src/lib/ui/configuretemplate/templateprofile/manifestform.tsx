import { useDispatch, useSelector } from 'react-redux';
import { Field, TagPicker, TagPickerInput, TagPickerControl, type TagPickerProps, TagPickerGroup, Tag } from '@fluentui/react-components';
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
import { DescriptionWithLink, ErrorBar } from '../common';
import { mergeStyles } from '@fluentui/react';

export const TemplateManifestForm = () => {
  const dispatch = useDispatch<AppDispatch>();
  const intl = useIntl();
  const runValidation = useSelector((state: RootState) => state.tab.runValidation);
  const { apiErrors, uiErrors, saveError } = useSelector((state: RootState) => ({
    apiErrors: state.template.apiValidatationErrors?.template,
    uiErrors: state.template.errors,
    saveError: state.template.apiValidatationErrors?.saveGeneral?.template,
  }));

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
  const errorTitle = intl.formatMessage({
    defaultMessage: 'Template validation failed',
    id: 'tVVCyO',
    description: 'Error title for template profile tab',
  });

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
        linkUrl="https://aka.ms/LogicApps/CustomTemplates/Profile"
        className={mergeStyles({ marginLeft: '-10px', width: '70%' })}
      />

      {saveError ? <ErrorBar errorMessage={saveError} styles={{ marginLeft: '-10px' }} /> : null}
      {apiErrors?.general || uiErrors.general ? (
        <ErrorBar title={errorTitle} errorMessage={apiErrors?.general ?? uiErrors.general ?? ''} styles={{ marginLeft: '-10px' }} />
      ) : null}
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
  const { manifest, workflows, errors, apiValidatationErrors: apiErrors, connections } = useSelector((state: RootState) => state.template);
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
      errorMessage: apiErrors?.template?.manifest?.title ?? errors?.manifest?.title,
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
    errorMessage: apiErrors?.template?.manifest?.allowedSkus ?? errors?.manifest?.allowedSkus,
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
  const { manifest, errors, apiValidatationErrors: apiErrors } = useSelector((state: RootState) => state.template);
  const items: TemplatesSectionItem[] = [
    {
      label: resources.BY,
      value: manifest?.details?.By || '',
      type: 'textfield',
      required: true,
      onChange: (value: string) => handleUpdateManifest({ details: { ...(manifest?.details ?? {}), By: value } as any }),
      errorMessage: apiErrors?.template?.manifest?.['details.By'] ?? errors?.manifest?.['details.By'],
    },
  ];

  return items;
};

const useDescriptionSectionItems = (
  resources: Record<string, string>,
  handleUpdateManifest: (manifest: Partial<Template.TemplateManifest>) => void
) => {
  const { manifest, workflows, errors, apiValidatationErrors: apiErrors } = useSelector((state: RootState) => state.template);
  const isMultiWorkflow = Object.keys(workflows).length > 1;
  const items: TemplatesSectionItem[] = [
    {
      label: resources.Summary,
      value: manifest?.summary || '',
      type: 'textarea',
      required: true,
      onChange: (value: string) => handleUpdateManifest({ summary: value }),
      errorMessage: apiErrors?.template?.manifest?.summary ?? errors?.manifest?.summary,
    },
  ];

  if (isMultiWorkflow) {
    items.push({
      label: resources.Features,
      value: manifest?.description || '',
      type: 'textarea',
      onChange: (value: string) => handleUpdateManifest({ description: value }),
      errorMessage: apiErrors?.template?.manifest?.description ?? errors?.manifest?.description,
    });
  }

  return items;
};

const useCategorySectionItems = (
  resources: Record<string, string>,
  handleUpdateManifest: (manifest: Partial<Template.TemplateManifest>) => void
) => {
  const { manifest, errors, apiValidatationErrors: apiErrors } = useSelector((state: RootState) => state.template);
  const { details, tags, featuredConnectors } = manifest as Template.TemplateManifest;
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
      errorMessage: apiErrors?.template?.manifest?.['details.Category'] ?? errors?.manifest?.['details.Category'],
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
      onRenderItem: () => (
        <TagsInput
          tags={tags ?? []}
          errorMessage={apiErrors?.template?.manifest?.keywords ?? errors?.manifest?.keywords}
          handleUpdateManifest={handleUpdateManifest}
        />
      ),
    },
  ];

  return items;
};

const TagsInput = ({
  tags,
  errorMessage,
  handleUpdateManifest,
}: { tags: string[]; errorMessage: string | undefined; handleUpdateManifest: (manifest: Partial<Template.TemplateManifest>) => void }) => {
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
    <Field validationMessage={errorMessage} validationState={errorMessage ? 'error' : undefined}>
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
    </Field>
  );
};
