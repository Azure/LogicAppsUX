import { type TemplateServiceOptions, TemplatesWrappedContext } from './TemplatesDesignerContext';
import type React from 'react';
import { useContext, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import type { AppDispatch, RootState } from '../state/templates/store';
import { loadManifestNames, loadManifests, setFilteredTemplates } from '../state/templates/manifestSlice';
import { type ResourceDetails, setConsumption, setExistingWorkflowName, setResourceDetails } from '../state/templates/workflowSlice';
import { initializeTemplateServices } from '../state/templates/templateSlice';
import { useAreServicesInitialized } from '../state/templates/templateselectors';
import { getFilteredTemplates } from './utils/helper';

export interface TemplatesDataProviderProps {
  isConsumption: boolean | undefined;
  existingWorkflowName: string | undefined;
  resourceDetails: ResourceDetails;
  services: TemplateServiceOptions;
  children?: React.ReactNode;
}

const DataProviderInner = ({ isConsumption, existingWorkflowName, children }: TemplatesDataProviderProps) => {
  const dispatch = useDispatch<AppDispatch>();
  const { availableTemplateNames, availableTemplates, filters } = useSelector((state: RootState) => state?.manifest);

  useEffect(() => {
    if (availableTemplateNames) {
      dispatch(loadManifests({}));
    }
  }, [dispatch, availableTemplateNames]);

  useEffect(() => {
    if (!availableTemplates) {
      dispatch(setFilteredTemplates(undefined));
      return;
    }
    const filteredTemplates = getFilteredTemplates(availableTemplates, filters);
    dispatch(setFilteredTemplates(filteredTemplates));
  }, [dispatch, availableTemplates, filters]);

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

  return <>{children}</>;
};

export const TemplatesDataProvider = (props: TemplatesDataProviderProps) => {
  const wrapped = useContext(TemplatesWrappedContext);
  const dispatch = useDispatch<AppDispatch>();
  const servicesInitialized = useAreServicesInitialized();

  if (!wrapped) {
    throw new Error('TemplatesDataProvider must be used inside of a TemplatesWrappedContext');
  }

  useEffect(() => {
    if (!servicesInitialized) {
      dispatch(initializeTemplateServices(props.services));
    }

    dispatch(setResourceDetails(props.resourceDetails));
  }, [dispatch, servicesInitialized, props.services, props.resourceDetails]);

  if (!servicesInitialized) {
    return null;
  }

  return <DataProviderInner {...props} />;
};
