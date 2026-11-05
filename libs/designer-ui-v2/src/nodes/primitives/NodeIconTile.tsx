import { forwardRef } from 'react';
import type { HTMLAttributes, ReactNode } from 'react';
import { makeStyles, mergeClasses, shorthands, tokens } from '@fluentui/react-components';
import { designerUiTokens as ui } from '../../theme/tokens';
import { nodeMetrics } from '../metrics';
import type { NodeCategory } from '../types';

const useStyles = makeStyles({
  root: {
    position: 'relative',
    boxSizing: 'border-box',
    display: 'flex',
    flexShrink: 0,
    alignItems: 'center',
    justifyContent: 'center',
    ...shorthands.borderWidth(tokens.strokeWidthThin),
    ...shorthands.borderStyle('solid'),
    borderRadius: tokens.borderRadiusXLarge,
    backgroundColor: ui.nodeTileBackground,
    '@media (forced-colors: active)': { ...shorthands.borderColor('CanvasText'), color: 'CanvasText' },
  },
  medium: { width: `${nodeMetrics.tile.medium}px`, height: `${nodeMetrics.tile.medium}px`, fontSize: `${nodeMetrics.tile.mediumIcon}px` },
  small: { width: `${nodeMetrics.tile.small}px`, height: `${nodeMetrics.tile.small}px`, fontSize: `${nodeMetrics.tile.smallIcon}px` },
  icon: { display: 'inline-flex', '& > img, & > svg': { width: '1em', height: '1em' } },
  trigger: { ...shorthands.borderColor(tokens.colorPaletteSeafoamBorderActive), color: tokens.colorPaletteSeafoamForeground2 },
  action: { ...shorthands.borderColor(tokens.colorPaletteBlueBorderActive), color: tokens.colorPaletteBlueForeground2 },
  control: { ...shorthands.borderColor(tokens.colorPaletteLilacBorderActive), color: tokens.colorPaletteLilacForeground2 },
  agent: { ...shorthands.borderColor(tokens.colorPaletteCornflowerBorderActive), color: tokens.colorPaletteCornflowerForeground2 },
  testData: { ...shorthands.borderColor(ui.nodeTestDataStroke), color: ui.nodeTestDataStroke },
  borderless: { ...shorthands.borderColor('transparent') },
});
export interface NodeIconTileProps extends HTMLAttributes<HTMLSpanElement> {
  category: NodeCategory;
  icon: ReactNode;
  selectedIcon?: ReactNode;
  selected?: boolean;
  size?: 'medium' | 'small';
  bordered?: boolean;
  testData?: boolean;
}
export const NodeIconTile = forwardRef<HTMLSpanElement, NodeIconTileProps>(function NodeIconTile(
  { category, icon, selectedIcon, selected, size = 'medium', bordered = true, testData, className, ...rest },
  ref
) {
  const styles = useStyles();
  return (
    <span
      {...rest}
      ref={ref}
      className={mergeClasses(
        styles.root,
        styles[size],
        styles[category],
        testData && styles.testData,
        !bordered && styles.borderless,
        className
      )}
      data-category={category}
      data-test-data={testData || undefined}
      aria-hidden="true"
    >
      <span className={styles.icon}>{selected ? (selectedIcon ?? icon) : icon}</span>
    </span>
  );
});
