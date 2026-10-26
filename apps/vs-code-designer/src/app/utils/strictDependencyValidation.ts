import { e2eStrictDependencyValidationSettingKey } from '../../constants';
import { getGlobalSetting } from './vsCodeConfig/settings';

export function shouldRequireStrictDependencyValidation(): boolean {
  return (
    process.env.LA_E2E_STRICT_DEPENDENCY_VALIDATION === '1' || getGlobalSetting<boolean>(e2eStrictDependencyValidationSettingKey) === true
  );
}
