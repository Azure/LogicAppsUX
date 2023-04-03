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

  const areFailedRepetitionsSupported = false;

  const onClickNextFailed: PageChangeEventHandler = (page: PageChangeEventArgs) => {
    setCurrentPage(page.value);
  };

  const onClickPreviousFailed: PageChangeEventHandler = (page: PageChangeEventArgs) => {
    setCurrentPage(page.value);
  };

  const onPagerChange: PageChangeEventHandler = (page: PageChangeEventArgs) => {
    setCurrentPage(page.value);
  };

  const failedIterationProps = areFailedRepetitionsSupported
    ? {
        max: 5,
        min: 1,
        onClickNext: onClickNextFailed,
        onClickPrevious: onClickPreviousFailed,
      }
    : undefined;

  return hasPager && isMonitoringView && max ? (
    <Pager
      current={currentPage}
      onChange={onPagerChange}
      max={max}
      maxLength={max.toString().length + 1}
      min={1}
      readonlyPagerInput={false}
      failedIterationProps={failedIterationProps}
    />
  ) : null;
};
