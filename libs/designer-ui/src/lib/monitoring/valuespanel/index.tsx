import { Button, Divider } from '@fluentui/react-components';
import Constants from '../../constants';
import { ValueDownload } from './valuedownload';
import { ValueLink } from './valuelink';
import { ValueList } from './valuelist';
import type { BoundParameters } from '@microsoft/logic-apps-shared';
import React from 'react';

import { bundleIcon, ChevronDown24Filled, ChevronDown24Regular, ChevronRight24Filled, ChevronRight24Regular } from '@fluentui/react-icons';

const ExpandIcon = bundleIcon(ChevronRight24Filled, ChevronRight24Regular);
const CollapseIcon = bundleIcon(ChevronDown24Filled, ChevronDown24Regular);

export interface ValuesPanelProps {
  brandColor?: string;
  headerText: string;
  labelledBy: string;
  linkText?: string;
  noValuesText: string;
  showLink?: boolean;
  isDownload?: boolean;
  link?: string;
  showMore: boolean;
  values: BoundParameters;
  onLinkClick?(): void;
  onMoreClick?(): void;
}

export const ValuesPanel: React.FC<ValuesPanelProps> = ({
  brandColor = Constants.DEFAULT_BRAND_COLOR,
  headerText,
  labelledBy,
  linkText,
  noValuesText,
  showLink,
  showMore,
  values,
  onLinkClick,
  onMoreClick,
  link,
  isDownload,
}) => {
  const borderStyle = {
    borderRadius: '8px',
    background: brandColor,
    minHeight: '32px',
    minWidth: '6px',
  };

  const [expanded, setExpanded] = React.useState(true);
  const handleToggleExpand = (): void => {
    setExpanded(!expanded);
  };

  return (
    <div className={'msla-trace-inputs-outputs'}>
      <div className={'msla-trace-inputs-outputs-header'}>
        <div style={borderStyle} />
        <Button
          appearance="subtle"
          onClick={handleToggleExpand}
          icon={expanded ? <CollapseIcon /> : <ExpandIcon />}
          aria-expanded={expanded}
          style={{ justifyContent: 'flex-start', flexGrow: 1 }}
        >
          {headerText}
        </Button>
        {linkText ? <ValueLink linkText={linkText} visible={showLink} onLinkClick={onLinkClick} /> : null}
      </div>
      {expanded ? (
        <>
          {isDownload && link ? (
            <ValueDownload href={link} />
          ) : (
            <ValueList labelledBy={labelledBy} noValuesText={noValuesText} showMore={showMore} values={values} onMoreClick={onMoreClick} />
          )}
          <Divider />
        </>
      ) : null}
    </div>
  );
};
