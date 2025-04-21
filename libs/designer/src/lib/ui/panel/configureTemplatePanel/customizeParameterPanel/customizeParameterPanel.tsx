import type { AppDispatch, RootState } from '../../../../core/state/templates/store';
import { useDispatch, useSelector } from 'react-redux';
import { closePanel, TemplatePanelView } from '../../../../core/state/templates/panelSlice';
import { TemplatesPanelFooter, TemplatesPanelHeader } from '@microsoft/designer-ui';
import { useCallback, useMemo, useState } from 'react';
import { useIntl } from 'react-intl';
import { Panel, PanelType } from '@fluentui/react';
import { CustomizeParameter } from '../../../configuretemplate/parameters/customizeParameter';
import { updateTemplateParameterDefinition } from '../../../../core/state/templates/templateSlice';
import { useFunctionalState } from '@react-hookz/web';
import type { Template } from '@microsoft/logic-apps-shared';
import { useParameterDefinition } from '../../../../core/configuretemplate/configuretemplateselectors';

const layerProps = {
  hostId: 'msla-layer-host',
  eventBubblingEnabled: true,
};

export const CustomizeParameterPanel = () => {
  const dispatch = useDispatch<AppDispatch>();
  const intl = useIntl();
  const { parameterId, isOpen, currentPanelView, parameterErrors } = useSelector((state: RootState) => ({
    parameterId: state.panel.selectedTabId,
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

  const footerContent = useMemo(() => {
    return {
      primaryButtonText: intl.formatMessage({
        defaultMessage: 'Save',
        id: '9klmbJ',
        description: 'Button text for saving changes for parameter in the customize parameter panel',
      }),
      primaryButtonOnClick: () => {
        // TODO: onSave
        dispatch(
          updateTemplateParameterDefinition({
            parameterId: parameterId as string,
            data: selectedParameterDefinition(),
          })
        );
        dispatch(closePanel());
      },
      primaryButtonDisabled: !isDirty,
      secondaryButtonText: intl.formatMessage({
        defaultMessage: 'Cancel',
        id: '75zXUl',
        description: 'Button text for closing the panel',
      }),
      secondaryButtonOnClick: () => {
        dispatch(closePanel());
      },
    };
  }, [dispatch, intl, isDirty, parameterId, selectedParameterDefinition]);

  const onRenderFooterContent = useCallback(() => <TemplatesPanelFooter showPrimaryButton={true} {...footerContent} />, [footerContent]);

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
