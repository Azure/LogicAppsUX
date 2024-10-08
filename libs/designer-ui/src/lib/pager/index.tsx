import type { IIconProps, IIconStyles, ITextFieldStyles } from '@fluentui/react';
import { css, Icon, IconButton, TextField, TooltipHost } from '@fluentui/react';
import { Text } from '@fluentui/react-components';
import React, { useCallback, useEffect, useMemo } from 'react';
import { useIntl } from 'react-intl';

export type PageChangeEventHandler = (e: PageChangeEventArgs) => void;

// value is 0-based, because the pager index in the store is 0-based.
export interface PageChangeEventArgs {
  value: number;
}

// max and min are 0-based numbers.
export interface FailedIterationPagerProps {
  max: number;
  min: number;
  onClickNext?: PageChangeEventHandler;
  onClickPrevious?: PageChangeEventHandler;
}

export interface PagerProps {
  current?: number;
  failedIterationProps?: FailedIterationPagerProps;
  max: number;
  maxLength?: number;
  min: number;
  pagerTitleText?: string;
  readonlyPagerInput?: boolean;
  // If given a number, the pager will show clickable page numbers of amount instead of a text field.
  clickablePageNumbers?: number; // Has to be a odd number
  // If provided, the pager will show the count of items displayed on the left
  countToDisplay?: {
    countPerPage: number;
    totalCount: number;
  };
  onChange?: PageChangeEventHandler;
}

interface PagerButtonProps {
  disabled: boolean;
  failed?: boolean;
  iconProps: IIconProps;
  text: string;
  onClick(): void;
}

const iconFailedProps: IIconProps = {
  iconName: 'Important',
};

const iconFailedNextStyles: IIconStyles = {
  root: {
    right: 0,
  },
};

const iconFailedPreviousStyles: IIconStyles = {
  root: {
    left: 0,
  },
};

const nextIconProps: IIconProps = {
  iconName: 'ChevronRight',
};

const previousIconProps: IIconProps = {
  iconName: 'ChevronLeft',
};

export const Pager: React.FC<PagerProps> = ({
  current: initialCurrent = 1,
  failedIterationProps,
  max,
  maxLength,
  min,
  readonlyPagerInput,
  clickablePageNumbers,
  countToDisplay: countInfo,
  onChange,
}) => {
  const [current, setCurrent] = React.useState(initialCurrent);

  useEffect(() => {
    setCurrent(initialCurrent);
  }, [initialCurrent]);

  let failedMax = 0;
  let failedMin = 0;
  let onClickNext: PageChangeEventHandler | undefined;
  let onClickPrevious: PageChangeEventHandler | undefined;

  if (failedIterationProps) {
    ({ max: failedMax, min: failedMin, onClickNext, onClickPrevious } = failedIterationProps);
  }

  const changeValue = useCallback(
    (newValue: string, changeHandler = onChange, minimum = min, maximum = max): void => {
      const value = Number.parseInt(newValue, 10);
      if (value < minimum) {
        setCurrent(minimum);
        changeHandler && changeHandler({ value });
      } else if (value >= minimum && value <= maximum) {
        setCurrent(value);
        changeHandler && changeHandler({ value });
      } else if (value > maximum) {
        setCurrent(maximum);
        changeHandler && changeHandler({ value });
      }
    },
    [max, min, onChange]
  );

  const handleChange = useCallback(
    (_: React.FormEvent<HTMLElement>, newValue: string): void => {
      changeValue(newValue);
    },
    [changeValue]
  );

  // Prevent pager button clicks from selecting the foreach/until card.
  const handleClick = useCallback((e: React.MouseEvent<HTMLElement>): void => {
    e.stopPropagation();
  }, []);

  const handlePageNumberClick = useCallback(
    (pageNumber: number): void => {
      changeValue(String(pageNumber));
    },
    [changeValue]
  );

  const handleNextClick = useCallback((): void => {
    changeValue(String(current + 1));
  }, [changeValue, current]);

  const handleNextFailedClick = useCallback((): void => {
    changeValue(String(current + 1), onClickNext, failedMin, failedMax);
  }, [changeValue, current, failedMax, failedMin, onClickNext]);

  const handlePreviousClick = useCallback((): void => {
    changeValue(String(current - 1));
  }, [changeValue, current]);

  const handlePreviousFailedClick = useCallback((): void => {
    changeValue(String(current - 1), onClickPrevious, failedMin, failedMax);
  }, [changeValue, current, failedMax, failedMin, onClickPrevious]);

  const intl = useIntl();

  const pagerPreviousString = intl.formatMessage({
    defaultMessage: 'Previous',
    id: '6oqk+A',
    description: 'Text of a button to go to previous page',
  });

  const textFieldStyles: Pick<ITextFieldStyles, 'fieldGroup'> = {
    fieldGroup: {
      width: maxLength ? 14 * maxLength : 'none',
    },
  };

  const previousPagerFailedStrign = intl.formatMessage({
    defaultMessage: 'Previous failed',
    id: 'gKq3Jv',
    description: 'Label of a button to go to the previous failed page option',
  });

  const pagerOfString = intl.formatMessage(
    {
      defaultMessage: 'of {max}',
      id: 'W070M2',
      description: 'Text on a pager where people can select a page number out of {max}',
    },
    {
      max,
    }
  );

  const currentIndexStart = (current - 1) * (countInfo?.countPerPage ?? 0);
  const showingResultsString = intl.formatMessage(
    {
      defaultMessage: 'Showing {current_index_start} - {current_index_last} of {max_count} results.',
      id: '0ZZJos',
      description:
        'Accessibility label telling that the results showing is from {current_index_start} to {current_index_last} out of {max_count} items',
    },
    {
      current_index_start: currentIndexStart + 1,
      current_index_last: Math.min(currentIndexStart + (countInfo?.countPerPage ?? 0), countInfo?.totalCount ?? 0),
      max_count: countInfo?.totalCount,
    }
  );

  const pagerOfStringAria = intl.formatMessage(
    {
      defaultMessage: '{current_page} of {max_page}',
      id: 'o1HOyf',
      description: 'Accessibility label telling that the user is on page {current} of {max} pages',
    },
    {
      current_page: current,
      max_page: max,
    }
  );

  const pagerNextFailedString = intl.formatMessage({
    defaultMessage: 'Next failed',
    id: 'Mb/Vp8',
    description: 'Button indicating to go to the next page with failed options',
  });

  const pagerNextString = intl.formatMessage({
    defaultMessage: 'Next',
    id: 'iJOIca',
    description: 'Button indicating to go to the next page',
  });

  const pageNumbers = useMemo(() => {
    const result = [];

    if (clickablePageNumbers) {
      // Calculate initial range around the current number
      let rangeStart = Math.max(current - Math.floor(clickablePageNumbers / 2), min);
      let rangeEnd = Math.min(current + Math.floor(clickablePageNumbers / 2), max);

      // Adjust the range if it's less than 5 numbers
      while (rangeEnd - rangeStart + 1 < clickablePageNumbers) {
        // Try to expand the range to the left if possible
        if (rangeStart > min) {
          rangeStart--;
        }
        // If no more room on the left, try to expand to the right
        else if (rangeEnd < max) {
          rangeEnd++;
        }
        // If both are at their limits, stop
        else {
          break;
        }
      }

      // Fill the result array
      for (let i = rangeStart; i <= rangeEnd; i++) {
        result.push(i);
      }
    }
    return result;
  }, [current, clickablePageNumbers, max, min]);

  return (
    <div className={countInfo && 'msla-pager-v2-pagenumbers'}>
      {countInfo && (
        <div className="msla-pager-v2">
          <div className="msla-pager-v2--inner">
            <Text>{showingResultsString}</Text>
          </div>
        </div>
      )}
      <div className="msla-pager-v2" onClick={handleClick}>
        <PagerButton disabled={current <= min} iconProps={previousIconProps} text={pagerPreviousString} onClick={handlePreviousClick} />
        {failedIterationProps && (
          <PagerButton
            disabled={failedMin < 1 || current <= failedMin}
            failed={true}
            iconProps={previousIconProps}
            text={previousPagerFailedStrign}
            onClick={handlePreviousFailedClick}
          />
        )}
        {clickablePageNumbers ? (
          <div className="msla-pager-v2--inner">
            {pageNumbers.map((pageNum) => (
              <Text
                className={css('msla-pager-pageNum', pageNum !== current && 'toSelect')}
                key={pageNum}
                onClick={() => {
                  if (pageNum !== current) {
                    handlePageNumberClick(pageNum);
                  }
                }}
              >
                {pageNum}
              </Text>
            ))}
          </div>
        ) : (
          <div className="msla-pager-v2--inner">
            {readonlyPagerInput ? null : (
              <TextField
                ariaLabel={pagerOfStringAria}
                borderless={readonlyPagerInput}
                max={max}
                min={min}
                maxLength={maxLength}
                readOnly={readonlyPagerInput}
                styles={textFieldStyles}
                value={String(current)}
                onChange={handleChange as any}
              />
            )}
            {clickablePageNumbers ? (
              <Text>{current}</Text>
            ) : readonlyPagerInput ? (
              <Text>{pagerOfStringAria}</Text>
            ) : (
              <Text>&nbsp;{pagerOfString}</Text>
            )}
          </div>
        )}
        {failedIterationProps && (
          <PagerButton
            disabled={failedMax < 1 || current >= failedMax}
            failed={true}
            iconProps={nextIconProps}
            text={pagerNextFailedString}
            onClick={handleNextFailedClick}
          />
        )}
        <PagerButton disabled={current >= max} iconProps={nextIconProps} text={pagerNextString} onClick={handleNextClick} />
      </div>
      {countInfo && <div />}
    </div>
  );
};

const PagerButton: React.FC<PagerButtonProps> = ({ disabled, failed, iconProps, text, onClick }) => {
  const intl = useIntl();
  const previousPagerFailedString = intl.formatMessage({
    defaultMessage: 'Previous failed',
    id: 'gKq3Jv',
    description: 'Label of a button to go to the previous failed page option',
  });

  return (
    <div className="msla-pager-failed-container">
      <TooltipHost content={text}>
        <IconButton ariaLabel={text} disabled={disabled} iconProps={iconProps} text={text} onClick={onClick} />
      </TooltipHost>
      {failed && (
        <Icon
          className="msla-pager-failed-icon"
          iconName={iconFailedProps.iconName}
          styles={text === previousPagerFailedString ? iconFailedPreviousStyles : iconFailedNextStyles}
        />
      )}
    </div>
  );
};
