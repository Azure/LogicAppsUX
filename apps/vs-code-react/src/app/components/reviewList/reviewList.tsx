import WarningIcon from '../../../resources/Caution.svg';
import ErrorICon from '../../../resources/Error.svg';
import SuccessIcon from '../../../resources/Success.svg';
import { ValidationStatus } from '../../../run-service';
import type { IGroupedGroup, IGroupedItem } from '../../../run-service';
import './styles.less';
import { Skeleton, Accordion, AccordionItem, AccordionHeader, AccordionPanel } from '@fluentui/react-components';
import { useMemo } from 'react';

export interface IReviewListProps {
  isValidationLoading?: boolean;
  validationItems: IGroupedItem[];
  validationGroups: IGroupedGroup[];
}

export const ReviewList: React.FC<IReviewListProps> = ({ isValidationLoading, validationItems, validationGroups }) => {
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
        <div className="review-list-shimmer" key={index}>
          <Skeleton className="review-list-shimmer-item" />
          <Skeleton className="review-list-shimmer-item" />
          <Skeleton className="review-list-shimmer-item" />
        </div>
      );
    });
  }, []);

  const groupedList = useMemo(() => {
    // Group items by their group key
    const groupedItems = validationItems.reduce(
      (acc, item) => {
        const groupKey = item.group || 'default';
        if (!acc[groupKey]) {
          acc[groupKey] = [];
        }
        acc[groupKey].push(item);
        return acc;
      },
      {} as Record<string, IGroupedItem[]>
    );

    return (
      <div className="review-list">
        <Accordion multiple collapsible>
          {validationGroups.map((group) => {
            const items = groupedItems[group.key] || [];
            const groupIcon = getGroupIcon(group.status);

            return (
              <AccordionItem key={group.key} value={group.key}>
                <AccordionHeader>
                  <div className="review-list-header">
                    <span className="review-list-header-text">{group.name}</span>
                    {groupIcon}
                  </div>
                </AccordionHeader>
                <AccordionPanel>
                  <div className="review-list-items">
                    {items.map((item, index) => (
                      <div key={index} className="review-list-item">
                        <div className="review-list-item-name">{item.name}</div>
                        <div className="review-list-item-description">{item.description}</div>
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
  }, [validationItems, validationGroups]);

  return isValidationLoading ? <>{shimmerList}</> : <>{groupedList}</>;
};
