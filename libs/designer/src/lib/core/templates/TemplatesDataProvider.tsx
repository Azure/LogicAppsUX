import { TemplatesWrappedContext } from './TemplatesDesignerContext';
import type React from 'react';
import { useContext, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import type { AppDispatch, RootState } from '../state/templates/store';
import { loadManifestNames, loadManifests } from '../state/templates/manifestSlice';
import { setConsumption, setExistingWorkflowName, setLocation, setSubscriptionId } from '../state/templates/workflowSlice';
import type { ServiceOptions } from '../state/designerOptions/designerOptionsInterfaces';
import { initializeTemplateServices } from '../state/templates/templateSlice';
import { useAreTemplateServicesInitialized } from '../state/templates/templateSelectors';

export interface TemplatesDataProviderProps {
  isConsumption: boolean | undefined;
  existingWorkflowName: string | undefined;
  subscriptionId: string | undefined;
  location: string | undefined;
  services: ServiceOptions;
  children?: React.ReactNode;
}

const DataProviderInner = ({ isConsumption, existingWorkflowName, subscriptionId, location, children }: TemplatesDataProviderProps) => {
  const dispatch = useDispatch<AppDispatch>();
  const availableTemplateNames = useSelector((state: RootState) => state?.manifest?.availableTemplateNames);

  useEffect(() => {
    if (availableTemplateNames) {
      dispatch(loadManifests({}));
    }
  }, [dispatch, availableTemplateNames]);

  useEffect(() => {
    dispatch(loadManifestNames());
  }, [dispatch]);

  useEffect(() => {
    dispatch(setConsumption(!!isConsumption));
  }, [dispatch, isConsumption]);

  useEffect(() => {
    if (existingWorkflowName) {
      dispatch(setExistingWorkflowName(existingWorkflowName));
    }
  }, [dispatch, existingWorkflowName]);

  useEffect(() => {
    if (subscriptionId) {
      dispatch(setSubscriptionId(subscriptionId));
    }
  }, [dispatch, subscriptionId]);

  useEffect(() => {
    if (location) {
      dispatch(setLocation(location));
    }
  }, [dispatch, location]);

  return <>{children}</>;
};

export const TemplatesDataProvider = (props: TemplatesDataProviderProps) => {
  const wrapped = useContext(TemplatesWrappedContext);

  const dispatch = useDispatch<AppDispatch>();
  const servicesInitialized = useAreTemplateServicesInitialized();

  if (!wrapped) {
    throw new Error('TemplatesDataProvider must be used inside of a TemplatesWrappedContext');
  }

  useEffect(() => {
    if (!servicesInitialized && props.services) {
      dispatch(initializeTemplateServices(props.services));
    }
  }, [dispatch, servicesInitialized, props.services]);

  return <DataProviderInner {...props} />;
};
