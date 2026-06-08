import * as fse from 'fs-extra';
import { autoRuntimeDependenciesPathSettingKey, defaultDependencyPathValue } from '../../constants';
import { getGlobalSetting, updateGlobalSetting } from './vsCodeConfig/settings';

export async function ensureRuntimeDependenciesPath(): Promise<string> {
  const configuredPath = getGlobalSetting<string>(autoRuntimeDependenciesPathSettingKey);
  const dependenciesPath = configuredPath || defaultDependencyPathValue;

  if (!configuredPath) {
    await updateGlobalSetting(autoRuntimeDependenciesPathSettingKey, dependenciesPath);
  }

  await fse.ensureDir(dependenciesPath);
  return dependenciesPath;
}
