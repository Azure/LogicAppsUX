import { TemplatesWrappedContext } from './TemplatesDesignerContext';
// import { Theme as ThemeType } from '@microsoft/logic-apps-shared';
import type React from 'react';
import { useContext, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import type { AppDispatch, RootState } from '../state/templates/store';
import { loadManifestNames, loadManifests } from '../state/templates/manifestSlice';
import { setConsumption, setLocation, setSubscriptionId, setWorkflowName } from '../state/templates/workflowSlice';
import type { ServiceOptions } from '../state/designerOptions/designerOptionsInterfaces';
import { initializeTemplateServices } from '../state/templates/templateSlice';
import { useAreTemplateServicesInitialized } from '../state/templates/templateSelectors';

export interface TemplatesDataProviderProps {
  isConsumption: boolean | undefined;
  workflowName: string | undefined;
  subscriptionId: string | undefined;
  location: string | undefined;
  services?: ServiceOptions;
  children?: React.ReactNode;
}

const DataProviderInner = ({ isConsumption, workflowName, subscriptionId, location, children }: TemplatesDataProviderProps) => {
  const dispatch = useDispatch<AppDispatch>();
  const { availableTemplateNames } = useSelector((state: RootState) => state.manifest);

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
    if (workflowName) {
      dispatch(setWorkflowName(workflowName));
    }
  }, [dispatch, workflowName]);

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
