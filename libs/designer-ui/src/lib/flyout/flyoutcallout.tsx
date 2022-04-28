import { calloutContentStyles } from '../fabric';
import type { IFocusTrapZoneProps, Target } from '@fluentui/react';
import { DirectionalHint, FocusTrapCallout, mergeStyleSets, useTheme } from '@fluentui/react';

export interface FlyoutCalloutProps {
  target: Target | undefined;
  text: string;
  visible: boolean;
  onDismiss(): void;
}

const styles = mergeStyleSets(calloutContentStyles, {
  calloutMain: {
    whiteSpace: 'pre-line',
    width: 160,
  },
});

const focusTrapProps: IFocusTrapZoneProps = { isClickableOutsideFocusTrap: true };

export const FlyoutCallout: React.FC<FlyoutCalloutProps> = ({ target, text, visible, onDismiss }) => {
  const { palette } = useTheme();

  if (!visible) {
    return null;
  }

  return (
    <FocusTrapCallout
      ariaLabel={text}
      beakWidth={8}
      className="msla-flyout-callout"
      directionalHint={DirectionalHint.rightTopEdge}
      focusTrapProps={focusTrapProps}
      gapSpace={0}
      setInitialFocus={true}
      styles={styles}
      target={target}
      onDismiss={onDismiss}
    >
      <div role="dialog" aria-label={text} style={{ color: palette.neutralPrimary }} data-testid="callout-text" data-is-focusable={true}>
        {text}
      </div>
    </FocusTrapCallout>
  );
};
