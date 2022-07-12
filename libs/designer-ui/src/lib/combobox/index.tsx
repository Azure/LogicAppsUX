// import constants from '../constants';
// import type { Segment } from '../editor/base';
// import { useState } from 'react';

// export interface ComboBoxProps {
//   customValue: Segment[] | null;
// }

// export const Combobox: React.FC<ComboBoxProps> = ({ customValue }: ComboBoxProps): JSX.Element => {
//   const [expandDropdown, setExpandDropdown] = useState(false);
//   const [customVal, setCustomVal] = useState<Segment[] | null>(customValue);
//   let className = expandDropdown ? 'msla-combobox' : 'msla combobox msla-combobox-collapsed';
//   if (!customVal) {
//     className += ` ${constants.TOKEN_PICKER_CONTROL_CLASSES.DISMISSIBLE}`;
//   }

//   return <div className={className}></div>;
// };
