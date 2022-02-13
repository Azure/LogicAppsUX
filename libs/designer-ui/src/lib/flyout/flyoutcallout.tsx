import { DirectionalHint, FocusTrapCallout, IFocusTrapZoneProps, mergeStyleSets, Target, useTheme } from '@fluentui/react';
import { calloutContentStyles } from '../fabric';

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
      <div role="dialog" style={{ color: palette.neutralPrimary }} data-is-focusable={true} tabIndex={0}>
        {text}
      </div>
    </FocusTrapCallout>
  );
};
