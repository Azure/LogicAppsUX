import * as React from 'react';

export interface BadgeProps {
  className?: string;
  tag?: string;
  text: string;
  title?: string;
  visible: boolean;
}

export const Badge: React.FC<BadgeProps> = (props) => {
  const { className, tag, text, title, visible } = props;

  return visible ? React.createElement(tag ?? 'span', { className, title }, text) : null;
};
