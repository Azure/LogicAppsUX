import type { AppDispatch, RootState } from '../../../../core/state/templates/store';
import { useDispatch, useSelector } from 'react-redux';
import { closePanel, TemplatePanelView } from '../../../../core/state/templates/panelSlice';
import { TemplatesPanelFooter, TemplatesPanelHeader } from '@microsoft/designer-ui';
import { useCallback, useMemo } from 'react';
import { useIntl } from 'react-intl';
import { Panel, PanelType } from '@fluentui/react';
import { CustomizeParameter } from '../../../configuretemplate/parameters/customizeParameter';

const layerProps = {
  hostId: 'msla-layer-host',
  eventBubblingEnabled: true,
};

export const CustomizeParameterPanel = () => {
  const dispatch = useDispatch<AppDispatch>();
  const intl = useIntl();
  const { selectedTabId, isOpen, currentPanelView } = useSelector((state: RootState) => ({
    selectedTabId: state.panel.selectedTabId,
    isOpen: state.panel.isOpen,
    currentPanelView: state.panel.currentPanelView,
  }));

  const resources = {
    customizeParamtersTitle: intl.formatMessage({
      defaultMessage: 'Customize parameter',
      id: 'CqN0oM',
      description: 'Panel header title for customizing parameters',
    }),
  };

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
        defaultMessage: 'Next',
        id: '6id6Se',
        description: 'Button text for saving changes for parameter in the customize parameter panel',
      }),
      primaryButtonOnClick: () => {
        // TODO: onSave
        dispatch(closePanel());
      },
      secondaryButtonText: intl.formatMessage({
        defaultMessage: 'Cancel',
        id: '75zXUl',
        description: 'Button text for closing the panel',
      }),
      secondaryButtonOnClick: () => {
        dispatch(closePanel());
      },
    };
  }, [dispatch, intl]);

  const onRenderFooterContent = useCallback(() => <TemplatesPanelFooter showPrimaryButton={true} {...footerContent} />, [footerContent]);

  return (
    <Panel
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
      <CustomizeParameter parameterId={selectedTabId as string} />
    </Panel>
  );
};
