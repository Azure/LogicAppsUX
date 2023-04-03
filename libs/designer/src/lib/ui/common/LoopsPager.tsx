import constants from '../../common/constants';
import { useMonitoringView } from '../../core/state/designerOptions/designerOptionsSelectors';
import type { PageChangeEventArgs, PageChangeEventHandler } from '@microsoft/designer-ui';
import { Pager } from '@microsoft/designer-ui';
import { useState } from 'react';

export interface LoopsPagerProps {
  normalizedType: string;
  metadata: any;
}

export const LoopsPager = ({ normalizedType, metadata }: LoopsPagerProps) => {
  const [currentPage, setCurrentPage] = useState(1);
  const isMonitoringView = useMonitoringView();
  const max = metadata?.runData?.inputsLink?.metadata?.foreachItemsCount ?? 5;
  const hasPager = normalizedType === constants.NODE.TYPE.FOREACH || normalizedType === constants.NODE.TYPE.UNTIL;

  const onPagerChange: PageChangeEventHandler = (page: PageChangeEventArgs) => {
    setCurrentPage(page.value);
  };

  return hasPager && isMonitoringView ? (
    <Pager
      current={currentPage}
      onChange={onPagerChange}
      max={max}
      maxLength={max.toString().length + 1}
      min={1}
      readonlyPagerInput={false}
    />
  ) : null;
};
