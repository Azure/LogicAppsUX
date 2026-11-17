import { forwardRef, useEffect, useState } from 'react';
import type { HTMLAttributes, KeyboardEvent, MouseEvent } from 'react';
import { Button, makeStyles, mergeClasses, tokens } from '@fluentui/react-components';
import { ChevronDoubleLeftRegular, ChevronDoubleRightRegular, ChevronLeftRegular, ChevronRightRegular } from '@fluentui/react-icons';
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
  position: { whiteSpace: 'nowrap', paddingInline: tokens.spacingHorizontalXXS },
});

export interface NodeIterationPagerProps extends Omit<HTMLAttributes<HTMLDivElement>, 'onChange' | 'children'> {
  /** Zero-based selected iteration. Out-of-range or non-finite values are clamped for display. */
  current: number;
  /** Total iteration count. Nothing renders when it is not a positive integer. */
  count: number;
  /** Receives the next zero-based iteration; never called with the current or an out-of-range index. */
  onChange: (index: number) => void;
  /** Zero-based failed iterations; enables the previous/next failed jumps. Out-of-range entries are ignored. */
  failed?: readonly number[];
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
  const [draft, setDraft] = useState(String(index + 1));
  // Host updates (including a stale current that was clamped) replace any uncommitted draft.
  useEffect(() => setDraft(String(index + 1)), [index]);

  if (total <= 0) {
    return null;
  }

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
      className={mergeClasses('nodrag', styles.root, className)}
      data-node-pager=""
      onKeyDown={isolateKeys}
      onClick={isolateClick}
    >
      {hasFailed ? (
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
          className={styles.input}
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
      <span className={styles.position} aria-live="off">
        {editable ? `/ ${total}` : strings.position(index + 1, total)}
      </span>
      <Button
        appearance="transparent"
        size="small"
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
      {hasFailed ? (
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
    </div>
  );
});
