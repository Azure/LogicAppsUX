import { makeStyles, tokens, Text, Input, Button, Tooltip, mergeClasses } from '@fluentui/react-components';
import {
  bundleIcon,
  ChevronLeftFilled,
  ChevronLeftRegular,
  ChevronRightFilled,
  ChevronRightRegular,
  ImportantFilled,
} from '@fluentui/react-icons';
import { useCallback, useEffect, useMemo, useState } from 'react';
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
  text: string;
  onClick(): void;
  ariaLabel: string;
  icon: any;
  isNext: boolean; // Indicates if the button is for next or previous
}

const ChevronLeftIcon = bundleIcon(ChevronLeftFilled, ChevronLeftRegular);
const ChevronRightIcon = bundleIcon(ChevronRightFilled, ChevronRightRegular);

// Modern unified styles using Fluent UI v9 makeStyles
const usePagerStyles = makeStyles({
  // Main containers
  pagerContainer: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  pagerV2: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '6px',
    margin: '4px',
    position: 'relative',
  },
  pagerInner: {
    height: '32px',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },

  // Failed iteration button container
  failedButtonContainer: {
    position: 'relative',
  },

  // Failed iteration icon overlay
  failedIcon: {
    position: 'absolute',
    top: '25%',
    color: tokens.colorPaletteRedForeground1,
    pointerEvents: 'none',
  },

  failedIconPrevious: {
    left: '0',
  },

  failedIconNext: {
    right: '0',
  },

  // Page input container
  pageContainer: {
    backgroundColor: tokens.colorNeutralBackground1Hover,
    padding: '4px 14px',
    borderRadius: '18px',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    transitionProperty: 'background-color',
    transitionDuration: tokens.durationNormal,
    transitionTimingFunction: tokens.curveEasyEase,
    '&:focus-within': {
      backgroundColor: tokens.colorNeutralBackground1Selected,
    },
  },

  pageInput: {
    width: '22px',
    textAlign: 'center',
  },

  pageText: {
    color: tokens.colorNeutralForeground3,
    fontWeight: tokens.fontWeightRegular,
    fontSize: tokens.fontSizeBase200,
  },

  // Clickable page numbers
  pageNum: {
    padding: '4px 8px',
    borderRadius: '8px',
    cursor: 'default',
    fontWeight: tokens.fontWeightMedium,
    fontSize: tokens.fontSizeBase200,
    color: tokens.colorNeutralForeground2,
    transitionProperty: 'all',
    transitionDuration: tokens.durationFast,
    transitionTimingFunction: tokens.curveEasyEase,
  },

  pageNumCurrent: {
    backgroundColor: tokens.colorBrandBackground,
    color: tokens.colorNeutralForegroundOnBrand,
    borderRadius: '8px',
  },

  pageNumSelectable: {
    color: tokens.colorBrandForeground1,
    cursor: 'pointer',
    '&:hover': {
      backgroundColor: tokens.colorNeutralBackground1Hover,
      textDecoration: 'underline',
    },
  },
});

const PAGE_INPUT_WIDTH_MULTIPLIER = 14;

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
  const [current, setCurrent] = useState(initialCurrent);
  const [inputValue, setInputValue] = useState(String(initialCurrent));
  const styles = usePagerStyles();
  const intl = useIntl();

  useEffect(() => {
    setCurrent(initialCurrent);
    setInputValue(String(initialCurrent));
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
      let finalValue = value;
      if (value < minimum) {
        finalValue = minimum;
      } else if (value > maximum) {
        finalValue = maximum;
      }
      setCurrent(finalValue);
      setInputValue(String(finalValue));
      changeHandler && changeHandler({ value: finalValue });
    },
    [max, min, onChange]
  );

  const handleModernInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>): void => {
      const value = e.target.value.replace(/[^0-9]/g, '');
      if (value === '' || (Number.parseInt(value, 10) >= min && Number.parseInt(value, 10) <= max)) {
        setInputValue(value);
      }
    },
    [min, max]
  );

  const handleModernInputKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>): void => {
      if (e.key === 'Enter') {
        e.currentTarget.blur();
        if (inputValue) {
          changeValue(inputValue);
        }
      }
    },
    [inputValue, changeValue]
  );

  const handleModernInputBlur = useCallback((): void => {
    if (inputValue && inputValue !== String(current)) {
      changeValue(inputValue);
    } else {
      setInputValue(String(current));
    }
  }, [inputValue, current, changeValue]);

  const handleModernInputFocus = useCallback((e: React.FocusEvent<HTMLInputElement>): void => {
    e.target.select();
  }, []);

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

  const currentIndexStart = (current - 1) * (countInfo?.countPerPage ?? 0);

  const intlText = {
    PREVIOUS: intl.formatMessage({
      defaultMessage: 'Previous',
      id: '6oqk+A',
      description: 'Text of a button to go to previous page',
    }),
    NEXT: intl.formatMessage({
      defaultMessage: 'Next',
      id: 'iJOIca',
      description: 'Button indicating to go to the next page',
    }),
    PREVIOUS_FAILED: intl.formatMessage({
      defaultMessage: 'Previous failed',
      id: 'gKq3Jv',
      description: 'Label of a button to go to the previous failed page option',
    }),
    NEXT_FAILED: intl.formatMessage({
      defaultMessage: 'Next failed',
      id: 'Mb/Vp8',
      description: 'Button indicating to go to the next page with failed options',
    }),
    PAGER_OF: intl.formatMessage(
      {
        defaultMessage: 'of {max}',
        id: 'W070M2',
        description: 'Text on a pager where people can select a page number out of {max}',
      },
      {
        max,
      }
    ),
    SHOWING_RESULTS: intl.formatMessage(
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
    ),
    CURRENT_PAGE: intl.formatMessage(
      {
        defaultMessage: '{current_page} of {max_page}',
        id: 'o1HOyf',
        description: 'Accessibility label telling that the user is on page {current} of {max} pages',
      },
      {
        current_page: current,
        max_page: max,
      }
    ),
  };

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
    <div className={countInfo ? styles.pagerContainer : undefined}>
      {/* Count display */}
      {countInfo && (
        <div className={styles.pagerV2}>
          <div className={styles.pagerInner}>
            <Text>{intlText.SHOWING_RESULTS}</Text>
          </div>
        </div>
      )}

      {/* Main pager */}
      <div className={styles.pagerV2} onClick={handleClick}>
        {/* Previous button */}
        <PagerButton
          disabled={current <= min}
          onClick={handlePreviousClick}
          ariaLabel={intlText.PREVIOUS}
          text={intlText.PREVIOUS}
          icon={<ChevronLeftIcon />}
          isNext={false}
        />
        {/* Previous failed button */}
        {failedIterationProps && (
          <div className={styles.failedButtonContainer}>
            <PagerButton
              disabled={failedMin < 1 || current <= failedMin}
              onClick={handlePreviousFailedClick}
              ariaLabel={intlText.PREVIOUS_FAILED}
              text={intlText.PREVIOUS_FAILED}
              icon={<ChevronLeftIcon />}
              failed={true}
              isNext={false}
            />
          </div>
        )}

        {/* Page content area */}
        <div className={styles.pagerInner}>
          {clickablePageNumbers ? (
            // Clickable page numbers
            pageNumbers.map((pageNum) => (
              <Text
                className={mergeClasses(styles.pageNum, pageNum === current ? styles.pageNumCurrent : styles.pageNumSelectable)}
                key={pageNum}
                onClick={() => {
                  if (pageNum !== current) {
                    handlePageNumberClick(pageNum);
                  }
                }}
              >
                {pageNum}
              </Text>
            ))
          ) : readonlyPagerInput ? (
            // Readonly text display
            <Text>{intlText.CURRENT_PAGE}</Text>
          ) : (
            // Editable page input
            <div className={styles.pageContainer}>
              <Input
                className={styles.pageInput}
                type="text"
                value={inputValue}
                onChange={(e) => handleModernInputChange(e as React.ChangeEvent<HTMLInputElement>)}
                onKeyDown={(e) => handleModernInputKeyDown(e as React.KeyboardEvent<HTMLInputElement>)}
                onBlur={handleModernInputBlur}
                onFocus={(e) => handleModernInputFocus(e as React.FocusEvent<HTMLInputElement>)}
                aria-label={intlText.CURRENT_PAGE}
                style={maxLength ? { width: `${maxLength * PAGE_INPUT_WIDTH_MULTIPLIER}px` } : undefined}
                size="small"
                appearance="underline"
              />
              <Text className={styles.pageText}>{intlText.PAGER_OF}</Text>
            </div>
          )}
        </div>

        {/* Next failed button */}
        {failedIterationProps && (
          <div className={styles.failedButtonContainer}>
            <PagerButton
              disabled={failedMax < 1 || current >= failedMax}
              onClick={handleNextFailedClick}
              ariaLabel={intlText.NEXT_FAILED}
              text={intlText.NEXT_FAILED}
              icon={<ChevronRightIcon />}
              failed={true}
              isNext={true}
            />
          </div>
        )}
        {/* Next  button */}
        <PagerButton
          disabled={current >= max}
          onClick={handleNextClick}
          ariaLabel={intlText.NEXT}
          text={intlText.NEXT}
          icon={<ChevronRightIcon />}
          isNext={true}
        />
      </div>
      {countInfo && <div />}
    </div>
  );
};

const PagerButton: React.FC<PagerButtonProps> = ({ disabled, failed, icon, text, onClick, ariaLabel, isNext }) => {
  const styles = usePagerStyles();
  return (
    <>
      <Tooltip content={text} relationship="label" withArrow>
        <Button shape="circular" appearance="subtle" disabled={disabled} onClick={onClick} aria-label={ariaLabel} icon={icon} />
      </Tooltip>
      {failed && (
        <ImportantFilled className={mergeClasses(styles.failedIcon, isNext ? styles.failedIconNext : styles.failedIconPrevious)} />
      )}
    </>
  );
};
