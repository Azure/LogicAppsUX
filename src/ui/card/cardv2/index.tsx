import { CardProps } from "../card";

export interface CardV2Props extends CardProps {
  /**
   * @member {boolean} [active=true] - True if the card should render activated in the monitoring view, i.e., it is an action which can execute.
   */
  active?: boolean;

  cloned?: boolean;
  describedBy?: string;
  rootRef?: React.RefObject<HTMLDivElement>;
  supportCollapsing?: boolean;
}
