import WarningIcon from '../../../resources/Caution.svg';
import ErrorICon from '../../../resources/Error.svg';
import SuccessIcon from '../../../resources/Success.svg';
import { ValidationStatus } from '../../../run-service';
import type { IGroupedGroup, IGroupedItem } from '../../../run-service';
import './styles.less';
import {
  Skeleton,
  SkeletonItem,
  Accordion,
  AccordionHeader,
  AccordionItem,
  AccordionPanel,
  type AccordionToggleEventHandler,
} from '@fluentui/react-components';
import { ChevronRightRegular } from '@fluentui/react-icons';
import { useMemo, useState, useCallback } from 'react';

export interface IReviewListProps {
  isValidationLoading?: boolean;
  validationItems: IGroupedItem[];
  validationGroups: IGroupedGroup[];
}

export const ReviewList: React.FC<IReviewListProps> = ({ isValidationLoading, validationItems, validationGroups }) => {
  const [openItems, setOpenItems] = useState<string[]>([]);

  const handleToggle: AccordionToggleEventHandler<string> = useCallback((_event, data) => {
    setOpenItems(data.openItems);
  }, []);

  const getGroupIcon = (groupStatus: string): JSX.Element | null => {
    switch (groupStatus) {
      case ValidationStatus.succeeded: {
        return <img src={SuccessIcon} alt="Success" />;
      }
      case ValidationStatus.succeeded_with_warnings: {
        return <img src={WarningIcon} alt="Warnings" />;
      }
      case ValidationStatus.failed: {
        return <img src={ErrorICon} alt="Fail" />;
      }
      default: {
        return null;
      }
    }
  };

  const shimmerList = useMemo(() => {
    return new Array(4).fill(0).map((_element, index) => {
      return (
        <Skeleton className="review-list-shimmer" key={index}>
          <SkeletonItem className="review-list-shimmer-item" />
          <SkeletonItem className="review-list-shimmer-item" />
          <SkeletonItem className="review-list-shimmer-item" />
        </Skeleton>
      );
    });
  }, []);

  const groupedList = useMemo(() => {
    const groupedData = validationGroups.map((group) => {
      const groupItems = validationItems.filter((item) => item.groupIndex === group.startIndex / group.count);
      return {
        group,
        items: groupItems,
      };
    });

    return (
      <div className="review-list">
        <Accordion multiple collapsible openItems={openItems} onToggle={handleToggle}>
          {groupedData.map((groupData, groupIndex) => {
            const groupIcon = getGroupIcon(groupData.group.status);
            return (
              <AccordionItem key={groupIndex} value={groupIndex.toString()}>
                <AccordionHeader className="review-list-header" expandIcon={<ChevronRightRegular />}>
                  <div className="review-list-header-content">
                    <span className="review-list-header-text">{groupData.group.name}</span>
                    {groupIcon}
                  </div>
                </AccordionHeader>
                <AccordionPanel>
                  <div className="review-list-items">
                    {groupData.items.map((item, itemIndex) => (
                      <div key={itemIndex} className="review-list-item">
                        <div className="review-list-item-name">{item.name}</div>
                        <div className="review-list-item-description">{item.description}</div>
                        <div className="review-list-item-status">{item.status}</div>
                      </div>
                    ))}
                  </div>
                </AccordionPanel>
              </AccordionItem>
            );
          })}
        </Accordion>
      </div>
    );
  }, [validationItems, validationGroups, openItems, handleToggle]);

  return isValidationLoading ? <>{shimmerList}</> : <>{groupedList}</>;
};
