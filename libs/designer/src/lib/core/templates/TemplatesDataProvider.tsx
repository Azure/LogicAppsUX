import { TemplatesWrappedContext } from './TemplatesDesignerContext';
// import { Theme as ThemeType } from '@microsoft/logic-apps-shared';
import type React from 'react';
import { useContext, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import type { AppDispatch, RootState } from '../state/templates/store';
import { loadManifestNames, loadManifests } from '../state/templates/manifestSlice';
import {
  setConsumption,
  setLocation,
  setResourceGroup,
  setSubscriptionId,
  setWorkflowName,
  setTopResourceName,
} from '../state/templates/workflowSlice';

export interface TemplatesDataProviderProps {
  isConsumption: boolean | undefined;
  workflowName: string | undefined;
  subscriptionId: string | undefined;
  location: string | undefined;
  resourceGroup: string | undefined;
  topResourceName: string | undefined;
  children?: React.ReactNode;
}

const DataProviderInner = ({
  isConsumption,
  workflowName,
  subscriptionId,
  location,
  resourceGroup,
  topResourceName,
  children,
}: TemplatesDataProviderProps) => {
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

  useEffect(() => {
    if (resourceGroup) {
      dispatch(setResourceGroup(resourceGroup));
    }
  }, [dispatch, resourceGroup]);

  useEffect(() => {
    if (topResourceName) {
      dispatch(setTopResourceName(topResourceName));
    }
  }, [dispatch, topResourceName]);

  return <>{children}</>;
};

export const TemplatesDataProvider = (props: TemplatesDataProviderProps) => {
  const wrapped = useContext(TemplatesWrappedContext);

  if (!wrapped) {
    throw new Error('TemplatesDataProvider must be used inside of a TemplatesWrappedContext');
  }

  return <DataProviderInner {...props} />;
};
