import { getBrandColorRgbA } from '../../card/utils';
import Constants from '../../constants';
import { ValueDownload } from './valuedownload';
import { ValueLink } from './valuelink';
import { ValueList } from './valuelist';
import type { BoundParameters } from '@microsoft/logic-apps-designer';
import React from 'react';

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
    borderColor: getBrandColorRgbA(brandColor, 0.7),
  };

  return (
    <section className="msla-trace-inputs-outputs">
      <div className="msla-trace-inputs-outputs-header">
        <div className="msla-trace-inputs-outputs-header-text" id={labelledBy} style={borderStyle}>
          {headerText}
        </div>
        {linkText ? <ValueLink linkText={linkText} visible={showLink} onLinkClick={onLinkClick} /> : null}
      </div>
      {isDownload && link ? (
        <ValueDownload href={link} />
      ) : (
        <ValueList labelledBy={labelledBy} noValuesText={noValuesText} showMore={showMore} values={values} onMoreClick={onMoreClick} />
      )}
    </section>
  );
};
