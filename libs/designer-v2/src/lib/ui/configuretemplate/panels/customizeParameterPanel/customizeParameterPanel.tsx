import type { AppDispatch, RootState } from '../../../../core/state/templates/store';
import { useDispatch, useSelector } from 'react-redux';
import { closePanel, TemplatePanelView } from '../../../../core/state/templates/panelSlice';
import { type TemplatePanelFooterProps, TemplatesPanelFooter, TemplatesPanelHeader } from '@microsoft/designer-ui';
import { useCallback, useMemo, useState } from 'react';
import { useIntl } from 'react-intl';
import { Drawer, DrawerBody, DrawerHeader, DrawerFooter, makeStyles, shorthands, tokens } from '@fluentui/react-components';
import { CustomizeParameter } from '../../../configuretemplate/parameters/customizeParameter';
import { validateParameterDetails } from '../../../../core/state/templates/templateSlice';
import { useFunctionalState } from '@react-hookz/web';
import { isUndefinedOrEmptyString, type Template } from '@microsoft/logic-apps-shared';
import { useParameterDefinition } from '../../../../core/configuretemplate/configuretemplateselectors';
import { updateWorkflowParameter } from '../../../../core/actions/bjsworkflow/configuretemplate';

const useStyles = makeStyles({
  drawer: {
    zIndex: 1000,
    height: '100%',
    width: '50%', // Set the width of the drawer
  },
  header: {
    ...shorthands.padding('0', tokens.spacingHorizontalL),
  },
  body: {
    ...shorthands.padding('0', tokens.spacingHorizontalL),
    overflow: 'auto',
  },
  footer: {
    ...shorthands.padding(tokens.spacingVerticalM, tokens.spacingHorizontalL),
  },
});

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

  const intlText = {
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
      <TemplatesPanelHeader title={intlText.customizeParamtersTitle}>
        <div />
      </TemplatesPanelHeader>
    ),
    [intlText.customizeParamtersTitle]
  );

  const dismissPanel = useCallback(() => {
    dispatch(closePanel());
  }, [dispatch]);

  const parameterError = parameterErrors?.[parameterId as string];

  const footerContent: TemplatePanelFooterProps = useMemo(() => {
    const isDisplayNameEmpty = isUndefinedOrEmptyString(selectedParameterDefinition()?.displayName);

    return {
      buttonContents: [
        {
          type: 'action',
          text: intl.formatMessage({
            defaultMessage: 'Save',
            id: '9klmbJ',
            description: 'Button text for saving changes for parameter in the customize parameter panel',
          }),
          appearance: 'primary',
          onClick: () => {
            if (runValidation) {
              dispatch(validateParameterDetails());
            }
            dispatch(
              updateWorkflowParameter({
                parameterId: parameterId as string,
                definition: selectedParameterDefinition(),
              })
            );
          },
          disabled: !isDirty || isDisplayNameEmpty,
        },
        {
          type: 'action',
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

  const styles = useStyles();

  return (
    <Drawer
      className={styles.drawer}
      modalType="non-modal"
      open={isOpen && currentPanelView === TemplatePanelView.CustomizeParameter}
      onOpenChange={(_, { open }) => !open && dismissPanel()}
      position="end"
    >
      <DrawerHeader className={styles.header}>{onRenderHeaderContent()}</DrawerHeader>
      <DrawerBody className={styles.body}>
        <CustomizeParameter
          parameterError={parameterError}
          parameterDefinition={selectedParameterDefinition()}
          setParameterDefinition={updateParameterDefinition}
        />
      </DrawerBody>
      <DrawerFooter className={styles.footer}>
        <TemplatesPanelFooter {...footerContent} />
      </DrawerFooter>
    </Drawer>
  );
};
