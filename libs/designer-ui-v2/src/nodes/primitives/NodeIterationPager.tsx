import { forwardRef, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { ChangeEvent, HTMLAttributes, KeyboardEvent, MouseEvent } from 'react';
import { Button, Menu, MenuItem, MenuList, MenuPopover, MenuTrigger, makeStyles, mergeClasses, tokens } from '@fluentui/react-components';
import {
  ChevronDoubleLeftRegular,
  ChevronDoubleRightRegular,
  ChevronLeftRegular,
  ChevronRightRegular,
  ErrorCircleRegular,
} from '@fluentui/react-icons';
import type { NodeIterationPagerStrings } from '../strings';
import { defaultNodeIterationPagerStrings } from '../strings';

const useStyles = makeStyles({
  root: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: tokens.spacingHorizontalXXS,
    color: tokens.colorNeutralForeground2,
    fontSize: tokens.fontSizeBase200,
  },
  failed: {
    color: tokens.colorStatusDangerForeground1,
    '@media (forced-colors: active)': { color: 'ButtonText' },
  },
  input: {
    boxSizing: 'border-box',
    width: '3em',
    textAlign: 'center',
    fontSize: tokens.fontSizeBase200,
    color: tokens.colorNeutralForeground1,
    backgroundColor: tokens.colorNeutralBackground1,
    border: `${tokens.strokeWidthThin} solid ${tokens.colorNeutralStroke1}`,
    borderRadius: tokens.borderRadiusSmall,
  },
  failedSelect: {
    boxSizing: 'border-box',
    width: '4.75em',
    minWidth: 0,
    fontSize: tokens.fontSizeBase200,
    color: tokens.colorNeutralForeground1,
    backgroundColor: tokens.colorNeutralBackground1,
    border: `${tokens.strokeWidthThin} solid ${tokens.colorNeutralStroke1}`,
    borderRadius: tokens.borderRadiusSmall,
  },
  position: { whiteSpace: 'nowrap', paddingInline: tokens.spacingHorizontalXXS },
  compact: { gap: 0, fontSize: tokens.fontSizeBase100, fontVariantNumeric: 'tabular-nums' },
  compactInput: {
    font: 'inherit',
    // Fit six digits without reducing the three 24px button targets.
    width: `calc(6ch + 2 * ${tokens.strokeWidthThin})`,
    paddingInline: 0,
  },
  compactPosition: { paddingInline: 0, marginInlineStart: tokens.spacingHorizontalXXS },
  compactArrow: { ':dir(rtl) svg': { transform: 'scaleX(-1)' } },
});

// Keep each Fluent menu small, including for lists too large for a single level of ranges.
const failureMenuPageSize = 32;

function FailureDestinationItems({
  indexes,
  strings,
  onSelect,
}: {
  indexes: readonly number[];
  strings: NodeIterationPagerStrings;
  onSelect: (index: number) => void;
}) {
  if (indexes.length <= failureMenuPageSize) {
    const label = strings.failedDestinationOption ?? defaultNodeIterationPagerStrings.failedDestinationOption;
    return indexes.map((index) => (
      <MenuItem key={index} onClick={() => onSelect(index)}>
        {label?.(index + 1)}
      </MenuItem>
    ));
  }

  let rangeSize = failureMenuPageSize;
  while (Math.ceil(indexes.length / rangeSize) > failureMenuPageSize) {
    rangeSize *= failureMenuPageSize;
  }
  const label = strings.failedDestinationRange ?? defaultNodeIterationPagerStrings.failedDestinationRange;
  return Array.from({ length: Math.ceil(indexes.length / rangeSize) }, (_, rangeIndex) => {
    const start = rangeIndex * rangeSize;
    const end = Math.min(start + rangeSize, indexes.length);
    return (
      <Menu key={indexes[start]}>
        <MenuTrigger disableButtonEnhancement>
          <MenuItem>{label?.(indexes[start] + 1, indexes[end - 1] + 1)}</MenuItem>
        </MenuTrigger>
        <MenuPopover>
          <MenuList>
            <FailureDestinationItems indexes={indexes.slice(start, end)} strings={strings} onSelect={onSelect} />
          </MenuList>
        </MenuPopover>
      </Menu>
    );
  });
}

export interface NodeIterationPagerProps extends Omit<HTMLAttributes<HTMLDivElement>, 'onChange' | 'children'> {
  /** Zero-based selected iteration. Out-of-range or non-finite values are clamped for display. */
  current: number;
  /** Total iteration count. Nothing renders when it is not a positive integer. */
  count: number;
  /** Receives the next zero-based iteration; never called with the current or an out-of-range index. */
  onChange: (index: number) => void;
  /** Zero-based failed iterations; enables the previous/next failed jumps. Out-of-range entries are ignored. */
  failed?: readonly number[];
  /**
   * Zero-based failed iterations that are safe to pick directly. Omitted keeps direct-selection UI hidden;
   * out-of-range, duplicate, and current entries are ignored.
   */
  failedDestinations?: readonly number[];
  /** Consolidates failure actions when direct destinations exist, for the constrained Foreach card row. */
  compactFailureNavigation?: boolean;
  /** Renders a numeric input instead of read-only position text. */
  editable?: boolean;
  strings?: NodeIterationPagerStrings;
}

const toIndex = (value: number, count: number) => (Number.isFinite(value) ? Math.min(Math.max(Math.trunc(value), 0), count - 1) : 0);

/**
 * Iteration pager for loop/scope run monitoring. The host owns run state and dispatch; this only
 * presents zero-based navigation with one-based text so it can serve both action and tool runs.
 */
export const NodeIterationPager = forwardRef<HTMLDivElement, NodeIterationPagerProps>(function NodeIterationPager(
  {
    current,
    count,
    onChange,
    failed,
    failedDestinations,
    compactFailureNavigation = false,
    editable = false,
    strings = defaultNodeIterationPagerStrings,
    className,
    onClick,
    onKeyDown,
    ...rest
  },
  ref
) {
  const styles = useStyles();
  const total = Number.isFinite(count) ? Math.trunc(count) : 0;
  const index = total > 0 ? toIndex(current, total) : 0;
  const inputRef = useRef<HTMLInputElement | null>(null);
  const selectRef = useRef<HTMLSelectElement | null>(null);
  const failureTriggerRef = useRef<HTMLButtonElement | null>(null);
  const failureMenuRef = useRef<HTMLDivElement | null>(null);
  const restoreInputFocus = useRef(false);
  const [draft, setDraft] = useState(String(index + 1));
  const validFailedDestinations = useMemo(
    () =>
      Array.from(new Set((failedDestinations ?? []).filter((value) => Number.isInteger(value) && value >= 0 && value < total))).sort(
        (a, b) => a - b
      ),
    [failedDestinations, total]
  );
  const failedDestinationIndexes = useMemo(
    () => validFailedDestinations.filter((value) => value !== index),
    [validFailedDestinations, index]
  );
  // Failed jumps target the nearest valid failed iteration strictly before/after the selection.
  const validFailed = (failed ?? []).filter((value) => Number.isInteger(value) && value >= 0 && value < total);
  const previousFailed = validFailed.reduce<number | undefined>(
    (best, value) => (value < index && (best === undefined || value > best) ? value : best),
    undefined
  );
  const nextFailed = validFailed.reduce<number | undefined>(
    (best, value) => (value > index && (best === undefined || value < best) ? value : best),
    undefined
  );
  const hasFailed = failed !== undefined;
  // Keep compact layout whenever the loop has at least one valid failed destination, including when
  // the user is viewing that sole failure, so jumping to it never re-expands the constrained Foreach
  // row with the wider input and separate previous/next failed buttons.
  const useCompactFailureLayout = editable && compactFailureNavigation && validFailedDestinations.length > 0;
  const showCompactMenu =
    useCompactFailureLayout && (failedDestinationIndexes.length > 0 || previousFailed !== undefined || nextFailed !== undefined);
  const showFailedDestinationSelect = editable && !compactFailureNavigation && failedDestinationIndexes.length > 0;
  const failedDestinationLabel = strings.failedDestinationSelect ?? defaultNodeIterationPagerStrings.failedDestinationSelect;
  const setFailureTriggerRef = useCallback((trigger: HTMLButtonElement | null) => {
    const previous = failureTriggerRef.current;
    if (!trigger && previous) {
      const focused = previous.ownerDocument.activeElement;
      restoreInputFocus.current = focused === previous || !!failureMenuRef.current?.contains(focused);
    }
    failureTriggerRef.current = trigger;
  }, []);
  const setSelectRef = useCallback((select: HTMLSelectElement | null) => {
    const previous = selectRef.current;
    restoreInputFocus.current = !select && !!previous && previous.ownerDocument.activeElement === previous;
    selectRef.current = select;
  }, []);
  // Only rescue focus when the focused chooser was removed but this pager survived, and the host didn't take focus.
  useLayoutEffect(() => {
    const input = inputRef.current;
    if (restoreInputFocus.current && input && input.ownerDocument.activeElement === input.ownerDocument.body) {
      input.focus();
    }
    restoreInputFocus.current = false;
  }, [showFailedDestinationSelect, showCompactMenu]);
  // Host updates (including a stale current that was clamped) replace any uncommitted draft.
  useEffect(() => setDraft(String(index + 1)), [index]);

  if (total <= 0) {
    return null;
  }

  const go = (target: number | undefined) => {
    if (target !== undefined && target !== index && target >= 0 && target < total) {
      onChange(target);
    }
  };

  const commit = () => {
    const parsed = Number.parseInt(draft, 10);
    if (Number.isNaN(parsed)) {
      setDraft(String(index + 1));
      return;
    }
    const target = Math.min(Math.max(parsed, 1), total) - 1;
    setDraft(String(target + 1));
    go(target);
  };

  const handleFailedDestinationSelect = (event: ChangeEvent<HTMLSelectElement>) => {
    if (event.target.value !== '') {
      const target = Number(event.target.value);
      if (failedDestinationIndexes.includes(target)) {
        go(target);
      }
    }
  };

  // The pager lives inside a draggable, keyboard-navigable canvas node; keys typed here must not
  // reach canvas shortcuts. Tab is left alone so focus can still leave the group.
  const isolateKeys = (event: KeyboardEvent<HTMLDivElement>) => {
    onKeyDown?.(event);
    if (event.key !== 'Tab') {
      event.stopPropagation();
    }
  };
  // `nodrag` only blocks drag; clicks anywhere in the pager (text, gaps) must not select the node.
  const isolateClick = (event: MouseEvent<HTMLDivElement>) => {
    onClick?.(event);
    event.stopPropagation();
  };

  return (
    <div
      {...rest}
      ref={ref}
      role="group"
      aria-label={strings.label}
      className={mergeClasses('nodrag', styles.root, useCompactFailureLayout && styles.compact, className)}
      data-node-pager=""
      onKeyDown={isolateKeys}
      onClick={isolateClick}
    >
      {hasFailed && !useCompactFailureLayout ? (
        <Button
          appearance="transparent"
          size="small"
          className={styles.failed}
          icon={<ChevronDoubleLeftRegular />}
          aria-label={strings.previousFailed}
          title={strings.previousFailed}
          disabled={previousFailed === undefined}
          onClick={(event) => {
            event.stopPropagation();
            go(previousFailed);
          }}
          data-pager-action="previous-failed"
        />
      ) : null}
      <Button
        appearance="transparent"
        size="small"
        className={useCompactFailureLayout ? styles.compactArrow : undefined}
        icon={<ChevronLeftRegular />}
        aria-label={strings.previous}
        title={strings.previous}
        disabled={index <= 0}
        onClick={(event) => {
          event.stopPropagation();
          go(index - 1);
        }}
        data-pager-action="previous"
      />
      {editable ? (
        <input
          ref={inputRef}
          className={mergeClasses(styles.input, useCompactFailureLayout && styles.compactInput)}
          type="text"
          inputMode="numeric"
          aria-label={strings.input(total)}
          value={draft}
          onChange={(event) => setDraft(event.target.value.replace(/\D/g, ''))}
          onBlur={commit}
          onClick={(event) => event.stopPropagation()}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault();
              commit();
            }
          }}
        />
      ) : null}
      <span
        className={mergeClasses(styles.position, useCompactFailureLayout && styles.compactPosition)}
        aria-live="off"
        dir={useCompactFailureLayout ? 'ltr' : undefined}
      >
        {editable ? `/ ${total}` : strings.position(index + 1, total)}
      </span>
      <Button
        appearance="transparent"
        size="small"
        className={useCompactFailureLayout ? styles.compactArrow : undefined}
        icon={<ChevronRightRegular />}
        aria-label={strings.next}
        title={strings.next}
        disabled={index >= total - 1}
        onClick={(event) => {
          event.stopPropagation();
          go(index + 1);
        }}
        data-pager-action="next"
      />
      {hasFailed && !useCompactFailureLayout ? (
        <Button
          appearance="transparent"
          size="small"
          className={styles.failed}
          icon={<ChevronDoubleRightRegular />}
          aria-label={strings.nextFailed}
          title={strings.nextFailed}
          disabled={nextFailed === undefined}
          onClick={(event) => {
            event.stopPropagation();
            go(nextFailed);
          }}
          data-pager-action="next-failed"
        />
      ) : null}
      {showCompactMenu ? (
        <Menu>
          <MenuTrigger disableButtonEnhancement>
            <Button
              ref={setFailureTriggerRef}
              appearance="transparent"
              size="small"
              className={styles.failed}
              icon={<ErrorCircleRegular />}
              aria-label={failedDestinationLabel}
              title={failedDestinationLabel}
            />
          </MenuTrigger>
          <MenuPopover ref={failureMenuRef}>
            <MenuList>
              {hasFailed ? (
                <>
                  <MenuItem disabled={previousFailed === undefined} onClick={() => go(previousFailed)}>
                    {strings.previousFailed}
                  </MenuItem>
                  <MenuItem disabled={nextFailed === undefined} onClick={() => go(nextFailed)}>
                    {strings.nextFailed}
                  </MenuItem>
                </>
              ) : null}
              <FailureDestinationItems indexes={failedDestinationIndexes} strings={strings} onSelect={go} />
            </MenuList>
          </MenuPopover>
        </Menu>
      ) : null}
      {showFailedDestinationSelect ? (
        <select
          ref={setSelectRef}
          className={styles.failedSelect}
          aria-label={failedDestinationLabel}
          title={failedDestinationLabel}
          value=""
          onChange={handleFailedDestinationSelect}
        >
          <option value="">{strings.failedDestinationPrompt ?? defaultNodeIterationPagerStrings.failedDestinationPrompt}</option>
          {failedDestinationIndexes.map((failedIndex) => (
            <option key={failedIndex} value={failedIndex}>
              {(strings.failedDestinationOption ?? defaultNodeIterationPagerStrings.failedDestinationOption)?.(failedIndex + 1)}
            </option>
          ))}
        </select>
      ) : null}
    </div>
  );
});
