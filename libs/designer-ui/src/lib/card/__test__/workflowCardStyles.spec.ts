import { tokens } from '@fluentui/react-components';
import { describe, expect, it } from 'vitest';
import { workflowCardStyles } from '../workflowCardStyles';

describe('workflowCardStyles', () => {
  it('preserves the designer card geometry and surface without interaction rules', () => {
    expect(Object.keys(workflowCardStyles)).toEqual(['root', 'icon', 'title']);
    expect(workflowCardStyles.root).toEqual({
      margin: '0px auto',
      position: 'relative',
      border: '2px solid transparent',
      boxSizing: 'border-box',
      fontSize: '12px',
      borderRadius: '6px',
      width: '200px',
      padding: '8px 10px',
      webkitUserSelect: 'none',
      userSelect: 'none',
      backgroundColor: tokens.colorNeutralBackground1,
      cursor: 'default',
      display: 'flex',
      alignItems: 'center',
      gap: '10px',
      boxShadow: '0 0 2px rgba(0,0,0,0.24), 0 2px 4px rgba(0,0,0,0.28)',
    });
  });

  it('preserves the designer 24px connector icon and image fitting', () => {
    expect(workflowCardStyles.icon).toEqual({
      alignSelf: 'flex-start',
      height: '24px',
      width: '24px',
      borderRadius: '2px',
      overflow: 'hidden',
      flexShrink: 0,
      '& > img': {
        width: '100%',
        height: '100%',
        objectFit: 'contain',
      },
    });
  });

  it('preserves the designer title typography', () => {
    expect(workflowCardStyles.title).toEqual({
      fontSize: '14px',
      fontWeight: '600',
      color: tokens.colorNeutralForeground1,
      lineHeight: '20px',
      flexGrow: 1,
      wordBreak: 'break-word',
    });
  });
});
