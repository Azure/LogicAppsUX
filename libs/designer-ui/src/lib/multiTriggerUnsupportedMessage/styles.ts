import { makeStyles, tokens } from '@fluentui/react-components';

export const useMultiTriggerUnsupportedMessageStyles = makeStyles({
  root: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    height: '100%',
    // Without an explicit minWidth, a flex item's automatic minimum size defaults to its content's
    // min-content size. Since the MessageBar below has no fixed width of its own, that would let this
    // container (and therefore the MessageBar) grow to fit its widest unwrapped line instead of
    // shrinking to whatever space is actually available -- e.g. the narrower canvas region left over
    // when a RunHistoryPanel/drawer is open beside the designer. minWidth: 0 allows this flex item to
    // shrink to fit the available width so its content can wrap/reflow instead of overflowing.
    minWidth: 0,
    padding: tokens.spacingHorizontalXXL,
    boxSizing: 'border-box',
  },
  content: {
    width: '100%',
    maxWidth: '480px',
    // Same reasoning as `root`: allow the MessageBar itself to shrink below its natural content
    // width so its title/body text and action button wrap/reflow within a narrow canvas instead of
    // overflowing it.
    minWidth: 0,
    boxSizing: 'border-box',
  },
});
