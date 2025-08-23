import type React from 'react';
import { useContext, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import type { AppDispatch, RootState } from '../state/templates/store';
import { setInitialData } from '../state/templates/workflowSlice';
import type { ResourceDetails } from '../state/templates/workflowSlice';
import {
  initializeConfigureTemplateServices,
  loadCustomTemplate,
  type ConfigureTemplateServiceOptions,
} from '../actions/bjsworkflow/configuretemplate';
import { TemplatesWrappedContext } from '../templates/TemplatesDesignerContext';

export interface ConfigureTemplateDataProviderProps {
  templateId: string;
  resourceDetails: ResourceDetails;
  services: ConfigureTemplateServiceOptions;
  onResourceChange?: () => void;
  children?: React.ReactNode;
}

const DataProviderInner = ({ templateId, children }: ConfigureTemplateDataProviderProps) => {
  const dispatch = useDispatch<AppDispatch>();
  useEffect(() => {
    if (templateId) {
      dispatch(loadCustomTemplate({ templateId }));
    }
  }, [dispatch, templateId]);

  return <>{children}</>;
};

export const ConfigureTemplateDataProvider = (props: ConfigureTemplateDataProviderProps) => {
  const wrapped = useContext(TemplatesWrappedContext);
  const dispatch = useDispatch<AppDispatch>();
  const { servicesInitialized, subscriptionId, resourceGroup, location, workflowAppName } = useSelector((state: RootState) => ({
    servicesInitialized: state.templateOptions.servicesInitialized,
    subscriptionId: state.workflow.subscriptionId,
    resourceGroup: state.workflow.resourceGroup,
    location: state.workflow.location,
    workflowAppName: state.workflow.workflowAppName,
  }));
  const { services, resourceDetails, onResourceChange } = props;

  if (!wrapped) {
    throw new Error('ConfigureTemplatesDataProvider must be used inside of a CustomTemplatesWrappedContext');
  }

  useEffect(() => {
    if (!servicesInitialized) {
      dispatch(initializeConfigureTemplateServices(services));
    }
  }, [dispatch, servicesInitialized, services]);

  useEffect(() => {
    dispatch(
      setInitialData({
        subscriptionId: resourceDetails.subscriptionId,
        resourceGroup: resourceDetails.resourceGroup,
        location: resourceDetails.location,
      })
    );
  }, [dispatch, resourceDetails]);

  useEffect(() => {
    if (
      onResourceChange &&
      (subscriptionId !== undefined || resourceGroup !== undefined || location !== undefined || workflowAppName !== undefined)
    ) {
      onResourceChange();
    }
  }, [location, onResourceChange, resourceDetails, resourceGroup, subscriptionId, workflowAppName]);

  if (!servicesInitialized) {
    return null;
  }

  return <DataProviderInner {...props} />;
};
