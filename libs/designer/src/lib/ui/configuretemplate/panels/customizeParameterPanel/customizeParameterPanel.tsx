import type { AppDispatch, RootState } from '../../../../core/state/templates/store';
import { useDispatch, useSelector } from 'react-redux';
import { closePanel, TemplatePanelView } from '../../../../core/state/templates/panelSlice';
import { type TemplatePanelFooterProps, TemplatesPanelFooter, TemplatesPanelHeader } from '@microsoft/designer-ui';
import { useCallback, useMemo, useState } from 'react';
import { useIntl } from 'react-intl';
import { Panel, PanelType } from '@fluentui/react';
import { CustomizeParameter } from '../../../configuretemplate/parameters/customizeParameter';
import { validateParameterDetails } from '../../../../core/state/templates/templateSlice';
import { useFunctionalState } from '@react-hookz/web';
import type { Template } from '@microsoft/logic-apps-shared';
import { useParameterDefinition } from '../../../../core/configuretemplate/configuretemplateselectors';
import { updateWorkflowParameter } from '../../../../core/actions/bjsworkflow/configuretemplate';

const layerProps = {
  hostId: 'msla-layer-host',
  eventBubblingEnabled: true,
};

export const CustomizeParameterPanel = () => {
  const dispatch = useDispatch<AppDispatch>();
  const intl = useIntl();
  const { parameterId, runValidation, isOpen, currentPanelView, parameterErrors } = useSelector((state: RootState) => ({
    parameterId: state.panel.selectedTabId,
    runValidation: state.tab.runValidation,
    isOpen: state.panel.isOpen,
    currentPanelView: state.panel.currentPanelView,
    parameterErrors: state.template.errors.parameters,
  }));

  const parameterDefinition = useParameterDefinition(parameterId as string);

  const resources = {
    customizeParamtersTitle: intl.formatMessage({
      defaultMessage: 'Customize parameter',
      id: 'CqN0oM',
      description: 'Panel header title for customizing parameters',
    }),
  };
  const [selectedParameterDefinition, setSelectedParameterDefinition] =
    useFunctionalState<Template.ParameterDefinition>(parameterDefinition);
  const [isDirty, setIsDirty] = useState(false);

  const updateParameterDefinition = useCallback(
    (parameterDefinition: Template.ParameterDefinition) => {
      setIsDirty(true);
      setSelectedParameterDefinition(parameterDefinition);
    },
    [setSelectedParameterDefinition]
  );

  const onRenderHeaderContent = useCallback(
    () => (
      <TemplatesPanelHeader title={resources.customizeParamtersTitle}>
        <div />
      </TemplatesPanelHeader>
    ),
    [resources.customizeParamtersTitle]
  );

  const dismissPanel = useCallback(() => {
    dispatch(closePanel());
  }, [dispatch]);

  const footerContent: TemplatePanelFooterProps = useMemo(() => {
    return {
      buttonContents: [
        {
          type: 'button',
          text: intl.formatMessage({
            defaultMessage: 'Save',
            id: '9klmbJ',
            description: 'Button text for saving changes for parameter in the customize parameter panel',
          }),
          appreance: 'primary',
          onClick: () => {
            dispatch(updateWorkflowParameter({ parameterId: parameterId as string, definition: selectedParameterDefinition() }));
            if (runValidation) {
              dispatch(validateParameterDetails());
            }
          },
          disabled: !isDirty,
        },
        {
          type: 'button',
          text: intl.formatMessage({
            defaultMessage: 'Cancel',
            id: '75zXUl',
            description: 'Button text for closing the panel',
          }),
          onClick: () => {
            dispatch(closePanel());
          },
        },
      ],
    };
  }, [dispatch, intl, isDirty, parameterId, runValidation, selectedParameterDefinition]);

  const onRenderFooterContent = useCallback(() => <TemplatesPanelFooter {...footerContent} />, [footerContent]);

  return (
    <Panel
      styles={{ main: { padding: '0 20px', zIndex: 1000 }, content: { paddingLeft: '0px' } }}
      isLightDismiss={false}
      type={PanelType.custom}
      customWidth={'50%'}
      isOpen={isOpen && currentPanelView === TemplatePanelView.CustomizeParameter}
      onDismiss={dismissPanel}
      onRenderHeader={onRenderHeaderContent}
      onRenderFooterContent={onRenderFooterContent}
      hasCloseButton={true}
      layerProps={layerProps}
      isFooterAtBottom={true}
    >
      <CustomizeParameter
        parameterError={parameterErrors?.[parameterId as string]}
        parameterDefinition={selectedParameterDefinition()}
        setParameterDefinition={updateParameterDefinition}
      />
    </Panel>
  );
};
