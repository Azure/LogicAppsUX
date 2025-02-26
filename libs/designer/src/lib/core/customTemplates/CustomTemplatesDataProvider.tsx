import { type CustomTemplateServiceOptions, CustomTemplatesWrappedContext } from './CustomTemplatesContext';
import type React from 'react';
import { useContext, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import type { AppDispatch, RootState } from '../state/customTemplates/store';
import { setInitialData } from '../state/customTemplates/workflowSlice';
import { useAreServicesInitialized } from '../state/templates/templateselectors';
import type { ConnectionReferences } from '../../common/models/workflow';
import { initializeTemplateServices } from '../actions/bjsworkflow/templates';
import { InitTemplateService } from '@microsoft/logic-apps-shared';
import type { ResourceDetails } from '../state/templates/workflowSlice';

export interface CustomTemplatesDataProviderProps {
  resourceDetails: ResourceDetails;
  services: CustomTemplateServiceOptions;
  connectionReferences: ConnectionReferences;
  children?: React.ReactNode;
}

const DataProviderInner = ({ children, services }: CustomTemplatesDataProviderProps) => {
  const dispatch = useDispatch<AppDispatch>();
  const { servicesInitialized } = useSelector((state: RootState) => ({
    servicesInitialized: state.customTemplateOptions.servicesInitialized,
  }));

  useEffect(() => {
    if (servicesInitialized && services.templateService) {
      InitTemplateService(services.templateService);
    }
  }, [dispatch, services.templateService, servicesInitialized]);

  return <>{children}</>;
};

export const CustomTemplatesDataProvider = (props: CustomTemplatesDataProviderProps) => {
  const wrapped = useContext(CustomTemplatesWrappedContext);
  const dispatch = useDispatch<AppDispatch>();
  const servicesInitialized = useAreServicesInitialized();

  if (!wrapped) {
    throw new Error('CustomTemplatesDataProvider must be used inside of a CustomTemplatesWrappedContext');
  }

  useEffect(() => {
    if (!servicesInitialized) {
      dispatch(initializeTemplateServices(props.services));
    }

    dispatch(
      setInitialData({
        subscriptionId: props.resourceDetails.subscriptionId,
        resourceGroup: props.resourceDetails.resourceGroup,
        location: props.resourceDetails.location,
        workflowAppName: props.resourceDetails.workflowAppName,
        references: props.connectionReferences,
      })
    );
  }, [dispatch, servicesInitialized, props.services, props.resourceDetails, props.connectionReferences]);

  if (!servicesInitialized) {
    return null;
  }

  return <DataProviderInner {...props} />;
};
