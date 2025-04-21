import type { AppDispatch, RootState } from '../../../core/state/templates/store';
import { TemplatesSection, type TemplateTabProps, type TemplatesSectionItem } from '@microsoft/designer-ui';
import constants from '../../../common/constants';
import type { IntlShape } from 'react-intl';
import { selectWizardTab } from '../../../core/state/templates/tabSlice';
import { useResourceStrings } from '../resources';
import { useDispatch, useSelector } from 'react-redux';
import type { Template } from '@microsoft/logic-apps-shared';
import { useMemo } from 'react';
import { type TemplateEnvironment, updateEnvironment, updateTemplateManifest } from '../../../core/state/templates/templateSlice';
import { getSupportedSkus } from '../../../core/configuretemplate/utils/helper';
import type { TemplateWizardTabProps } from './model';

const TemplateSettings = () => {
  const { manifest, environment, isPublished, connections } = useSelector((state: RootState) => state.template);
  const dispatch = useDispatch<AppDispatch>();
  const resources = useResourceStrings();
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
  const environmentValues = useMemo(
    () => [
      { id: '3', label: resources.DevelopmentEnvironment, value: 'Development' },
      { id: '4', label: resources.ProductionEnvironment, value: 'Production' },
    ],
    [resources.DevelopmentEnvironment, resources.ProductionEnvironment]
  );

  const items: TemplatesSectionItem[] = [
    {
      label: resources.Host,
      value: skuValue,
      type: 'dropdown',
      required: true,
      multiselect: true,
      options: skuTypes,
      disabled: disableSkuSelection,
      selectedOptions: manifest?.skus as string[],
      onOptionSelect: (selectedOptions: string[]) => dispatch(updateTemplateManifest({ skus: selectedOptions as Template.SkuType[] })),
    },
    {
      label: resources.Environment,
      value: environmentValues.find((env) => env.value === environment)?.label,
      type: 'dropdown',
      options: environmentValues,
      selectedOptions: [environment as string],
      onOptionSelect: (selectedOptions: string[]) => dispatch(updateEnvironment(selectedOptions[0] as TemplateEnvironment)),
    },
    {
      label: resources.Status,
      value: isPublished ? resources.Published : resources.Unpublished,
      type: 'text',
    },
  ];

  return (
    <div className="msla-templates-wizard-tab-content" style={{ width: '70%' }}>
      <TemplatesSection items={items} />
    </div>
  );
};

export const publishTab = (
  intl: IntlShape,
  resources: Record<string, string>,
  dispatch: AppDispatch,
  { disabled, tabStatusIcon }: TemplateWizardTabProps
): TemplateTabProps => ({
  id: constants.CONFIGURE_TEMPLATE_WIZARD_TAB_NAMES.PUBLISH,
  title: resources.SettingsTabLabel,
  description: intl.formatMessage({
    defaultMessage: 'The below are the settings for this template, to publish a template you need to go to Review and Publish and publish.',
    id: 'uOlHLw',
    description: 'The description for the settings tab on the configure template wizard',
  }),
  tabStatusIcon,
  disabled,
  content: <TemplateSettings />,
  footerContent: {
    primaryButtonText: resources.PreviousButtonText,
    primaryButtonOnClick: () => {
      dispatch(selectWizardTab(constants.CONFIGURE_TEMPLATE_WIZARD_TAB_NAMES.PROFILE));
    },
    secondaryButtonText: resources.NextButtonText,
    secondaryButtonOnClick: () => {
      dispatch(selectWizardTab(constants.CONFIGURE_TEMPLATE_WIZARD_TAB_NAMES.REVIEW_AND_PUBLISH));
    },
  },
});
