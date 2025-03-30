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

export const PublishTab = () => {
  const { manifest, environment, isPublished } = useSelector((state: RootState) => state.template);
  const dispatch = useDispatch<AppDispatch>();
  const resources = useResourceStrings();

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
    <div style={{ width: '70%' }}>
      <TemplatesSection items={items} />
    </div>
  );
};

export const publishTab = (intl: IntlShape, dispatch: AppDispatch): TemplateTabProps => ({
  id: constants.CONFIGURE_TEMPLATE_WIZARD_TAB_NAMES.PUBLISH,
  title: intl.formatMessage({
    defaultMessage: 'Publish',
    id: 'mI+yA/',
    description: 'The tab label for the monitoring publish tab on the configure template wizard',
  }),
  hasError: false,
  content: <PublishTab />,
  footerContent: {
    primaryButtonText: intl.formatMessage({
      defaultMessage: 'Previous',
      id: 'Q1LEiE',
      description: 'Button text for going back to the previous tab',
    }),
    primaryButtonOnClick: () => {
      dispatch(selectWizardTab(constants.CONFIGURE_TEMPLATE_WIZARD_TAB_NAMES.PROFILE));
    },
    secondaryButtonText: intl.formatMessage({
      defaultMessage: 'Next',
      id: 'daThty',
      description: 'Button text for proceeding to the next tab',
    }),
    secondaryButtonOnClick: () => {
      dispatch(selectWizardTab(constants.CONFIGURE_TEMPLATE_WIZARD_TAB_NAMES.REVIEW_AND_PUBLISH));
    },
  },
});
