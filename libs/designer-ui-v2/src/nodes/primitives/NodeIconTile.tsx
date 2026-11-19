import { forwardRef } from 'react';
import type { HTMLAttributes, ReactNode } from 'react';
import { makeStyles, mergeClasses, shorthands, tokens } from '@fluentui/react-components';
import { designerUiTokens as ui } from '../../theme/tokens';
import { nodeMetrics } from '../metrics';
import type { NodeCategory, NodeIconTone } from '../types';

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
  // Host-supplied connector art is a full-color brand mark: keep it untinted and give it a neutral frame.
  artwork: {
    ...shorthands.borderColor(tokens.colorNeutralStroke2),
    color: 'inherit',
    '& img': { borderRadius: tokens.borderRadiusMedium },
  },
  // Brand art carries its own detail and backplate, so it gets more of the tile than a single-color glyph.
  artworkMedium: { fontSize: `${nodeMetrics.tile.mediumArtwork}px` },
  artworkSmall: { fontSize: `${nodeMetrics.tile.smallArtwork}px` },
  trigger: { ...shorthands.borderColor(tokens.colorPaletteSeafoamBorderActive), color: tokens.colorPaletteSeafoamForeground2 },
  action: { ...shorthands.borderColor(tokens.colorPaletteBlueBorderActive), color: tokens.colorPaletteBlueForeground2 },
  control: { ...shorthands.borderColor(tokens.colorPaletteLilacBorderActive), color: tokens.colorPaletteLilacForeground2 },
  agent: { ...shorthands.borderColor(tokens.colorPaletteCornflowerBorderActive), color: tokens.colorPaletteCornflowerForeground2 },
  teal: { ...shorthands.borderColor(tokens.colorPaletteTealBorderActive), color: tokens.colorPaletteTealForeground2 },
  green: { ...shorthands.borderColor(tokens.colorPaletteGreenBorderActive), color: tokens.colorPaletteGreenForeground2 },
  purple: { ...shorthands.borderColor(tokens.colorPalettePurpleBorderActive), color: tokens.colorPalettePurpleForeground2 },
  violet: { ...shorthands.borderColor(tokens.colorPaletteLavenderBorderActive), color: tokens.colorPaletteLavenderForeground2 },
  red: { ...shorthands.borderColor(tokens.colorPaletteRedBorderActive), color: tokens.colorPaletteRedForeground2 },
  blue: { ...shorthands.borderColor(tokens.colorPaletteBlueBorderActive), color: tokens.colorPaletteBlueForeground2 },
  pink: { ...shorthands.borderColor(tokens.colorPaletteBerryBorderActive), color: tokens.colorPaletteBerryForeground2 },
  neutral: { ...shorthands.borderColor(tokens.colorNeutralStroke1), color: tokens.colorNeutralForeground3 },
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
  /** Overrides the category color for a family-specific fallback glyph. */
  tone?: NodeIconTone;
  /** Marks `icon` as full-color host artwork (for example a connector logo) that must not be tinted. */
  artwork?: boolean;
}
export const NodeIconTile = forwardRef<HTMLSpanElement, NodeIconTileProps>(function NodeIconTile(
  { category, icon, selectedIcon, selected, size = 'medium', bordered = true, testData, tone, artwork, className, ...rest },
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
        artwork ? styles.artwork : tone && styles[tone],
        artwork && (size === 'small' ? styles.artworkSmall : styles.artworkMedium),
        testData && styles.testData,
        !bordered && styles.borderless,
        className
      )}
      data-category={category}
      data-test-data={testData || undefined}
      data-tone={artwork ? undefined : tone}
      data-artwork={artwork || undefined}
      aria-hidden="true"
    >
      <span className={styles.icon}>{selected ? (selectedIcon ?? icon) : icon}</span>
    </span>
  );
});
