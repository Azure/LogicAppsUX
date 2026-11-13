import { isCallbackInfoWithRelativePath, type CallbackInfo } from '@microsoft/logic-apps-shared';

const RELATIVE_PATH_PARAMETER = /\{(.*?)\}/g;

/**
 * Parameter names declared by a request-trigger relative path such as `/subscription/{subscriptionId}`.
 * Names are returned once, in first-seen order, matching the URI-template tokens the designer already
 * exposes as trigger outputs.
 */
export function getRelativePathParameterNames(relativePath: string | undefined): string[] {
  if (!relativePath) {
    return [];
  }

  const names: string[] = [];
  const seen = new Set<string>();
  const matcher = new RegExp(RELATIVE_PATH_PARAMETER.source, 'g');
  let match = matcher.exec(relativePath);
  while (match) {
    const name = match[1];
    if (name && !seen.has(name)) {
      seen.add(name);
      names.push(name);
    }
    match = matcher.exec(relativePath);
  }
  return names;
}

export function readRelativePathTemplate(parameter: { value?: Array<{ value?: string }> } | undefined): string {
  if (!parameter?.value?.length) {
    return '';
  }
  return parameter.value.map((segment) => segment.value ?? '').join('');
}

/**
 * Substitutes every `{name}` token when each declared parameter has a value.
 * Returns undefined when the template has no tokens or a required value is still empty,
 * so a partial entry does not rewrite the run URL.
 */
export function resolveRelativePath(template: string | undefined, values: Record<string, string> | undefined): string | undefined {
  const names = getRelativePathParameterNames(template);
  if (!template || names.length === 0) {
    return undefined;
  }
  if (names.some((name) => !(values?.[name] ?? '').trim())) {
    return undefined;
  }

  return template.replace(new RegExp(RELATIVE_PATH_PARAMETER.source, 'g'), (token, name: string) => {
    const value = values?.[name];
    if (!value?.trim()) {
      return token;
    }
    return encodeURIComponent(value.trim());
  });
}

function substituteTemplateInUrl(url: string, template: string, resolved: string): string | undefined {
  if (url.includes(template)) {
    return url.replace(template, resolved);
  }

  const encodedTemplate = template.replace(new RegExp(RELATIVE_PATH_PARAMETER.source, 'g'), (_token, name: string) => `%7B${name}%7D`);
  if (encodedTemplate !== template && url.includes(encodedTemplate)) {
    return url.replace(encodedTemplate, resolved);
  }

  return undefined;
}

/**
 * Appends a resolved relative path to a trigger run or callback URL.
 * Callback URLs that already contain the template (raw or percent-encoded) are substituted in place
 * so the query string stays intact. Management `/run` URLs get the path appended before any query.
 */
export function appendResolvedRelativePath(url: string, template: string | undefined, values: Record<string, string> | undefined): string {
  const resolved = resolveRelativePath(template, values);
  if (!resolved || !url || url.includes(resolved)) {
    return url;
  }

  if (template) {
    const substituted = substituteTemplateInUrl(url, template, resolved);
    if (substituted) {
      return substituted;
    }
  }

  const queryIndex = url.indexOf('?');
  const path = queryIndex === -1 ? url : url.slice(0, queryIndex);
  const query = queryIndex === -1 ? undefined : url.slice(queryIndex);
  const suffix = resolved.startsWith('/') ? resolved : `/${resolved}`;
  const nextPath = path.endsWith('/') ? `${path.slice(0, -1)}${suffix}` : `${path}${suffix}`;
  return query ? `${nextPath}${query}` : nextPath;
}

export function applyRelativePathToCallback<T extends CallbackInfo | { value?: string; method?: string; relativePath?: string }>(
  callbackInfo: T,
  template: string | undefined,
  values: Record<string, string> | undefined
): T {
  const templateSource = isCallbackInfoWithRelativePath(callbackInfo) ? callbackInfo.relativePath : template;
  const resolved = resolveRelativePath(templateSource, values);
  if (!resolved) {
    return callbackInfo;
  }

  if (isCallbackInfoWithRelativePath(callbackInfo)) {
    return { ...callbackInfo, relativePath: resolved };
  }

  if (!('value' in callbackInfo) || !callbackInfo.value) {
    return callbackInfo;
  }

  return {
    ...callbackInfo,
    value: appendResolvedRelativePath(callbackInfo.value, templateSource, values),
  };
}
