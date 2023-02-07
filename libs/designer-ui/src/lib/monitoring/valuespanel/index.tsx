import Constants from '../../constants';
import type { BoundParameters } from './types';
import { ValueLink } from './valuelink';
import { ValueList } from './valuelist';
import { hexToRgbA } from '@microsoft/utils-logic-apps';
import React from 'react';

export interface ValuesPanelProps {
  brandColor?: string;
  headerText: string;
  labelledBy: string;
  linkText?: string;
  noValuesText: string;
  showLink?: boolean;
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
}) => {
  const borderStyle = {
    borderColor: hexToRgbA(brandColor, 0.7),
  };

  return (
    <section className="msla-trace-inputs-outputs">
      <div className="msla-trace-inputs-outputs-header">
        <div className="msla-trace-inputs-outputs-header-text" id={labelledBy} style={borderStyle}>
          {headerText}
        </div>
        {linkText ? <ValueLink linkText={linkText} visible={showLink} onLinkClick={onLinkClick} /> : null}
      </div>
      <ValueList labelledBy={labelledBy} noValuesText={noValuesText} showMore={showMore} values={values} onMoreClick={onMoreClick} />
    </section>
  );
};

export { BoundParameters };
