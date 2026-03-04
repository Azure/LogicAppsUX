import { type IDropdownOption } from '@fluentui/react';
import { type ManagedIdentity } from '@microsoft/logic-apps-shared';
interface LegacyManagedIdentityDropdownProps {
    identity?: ManagedIdentity;
    onChange: (event: any, item?: IDropdownOption<any>) => void;
    disabled?: boolean;
}
declare const LegacyManagedIdentityDropdown: (props: LegacyManagedIdentityDropdownProps) => import("react/jsx-runtime").JSX.Element;
export default LegacyManagedIdentityDropdown;
