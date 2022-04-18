import { SettingsSection } from "@microsoft/designer-ui";
// eslint-disable-next-line @nrwl/nx/enforce-module-boundaries
import { ReactiveToggle } from '../../../../../../designer-ui/src/lib/settings/settingsection/settingreactiveinput';

export const SettingsTab = () => {
    const settingSectionProps = {
        id: 'textFieldandToggle',
        title:'Reactive Toggle',
        expanded:false,
        textFieldValue:'',
        renderContent:ReactiveToggle,
        isInverted:false,
        isReadOnly:false
    }
    return <SettingsSection {...settingSectionProps}/>;
};