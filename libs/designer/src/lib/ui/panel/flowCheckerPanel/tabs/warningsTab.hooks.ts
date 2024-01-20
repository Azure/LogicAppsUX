import type { RootState } from '../../../../core';
import type { FlowCheckerMessage } from '../../../../core/state/operation/operationMetadataSlice';
import { MessageLevel } from '@microsoft/designer-ui';
import { useMemo } from 'react';
import { useSelector } from 'react-redux';

export const useHostCheckerWarnings = () =>
  useSelector((state: RootState): Record<string, Record<string, FlowCheckerMessage[]>> => {
    const warningMessagesToShow: Record<string, Record<string, FlowCheckerMessage[]>> = {};

    const warningMessages = state.operations.hostData.flowCheckerMessages[MessageLevel.Warning] || [];
    warningMessages.forEach((message: FlowCheckerMessage) => {
      const messagesBySubtitle = (warningMessagesToShow[message.nodeId] ||= {});
      (messagesBySubtitle[message.subtitle] ||= []).push(message);
    });
    return warningMessagesToShow;
  });

export const useTotalNumWarnings = () => {
  const hostCheckerWarnings = useHostCheckerWarnings();
  return useMemo(() => {
    return Object.values(hostCheckerWarnings).reduce((acc, curr) => {
      return acc + Object.values(curr).reduce((acc2, curr2) => acc2 + curr2.length, 0);
    }, 0);
  }, [hostCheckerWarnings]);
};
