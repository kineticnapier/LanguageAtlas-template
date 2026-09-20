let contextPromise;

async function defaultFetchJson(path) {
  const response = await fetch(path);
  if (!response.ok) throw new Error(`Failed to load ${path}`);
  return response.json();
}

export function localized(value, locale, fallbackLocale = 'ja') {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value[locale] ?? value[fallbackLocale] ?? Object.values(value)[0] ?? '';
  }
  return String(value ?? '');
}

export function storageKey(config, suffix) {
  return `${config.storagePrefix}-${suffix}`;
}

export async function loadTemplateContext(fetchJson = defaultFetchJson) {
  if (!contextPromise || fetchJson !== defaultFetchJson) {
    const load = async () => {
      const [config, types, topics] = await Promise.all([
        fetchJson('/language.config.json'),
        fetchJson('/content/types.json'),
        fetchJson('/content/topics.json')
      ]);
      validateConfig(config);
      validateDefinitions(types, 'type');
      validateDefinitions(topics, 'topic');
      return { config, types, topics };
    };
    if (fetchJson === defaultFetchJson) contextPromise = load();
    else return load();
  }
  return contextPromise;
}

function validateConfig(config) {
  const required = [config?.id, config?.name, config?.storagePrefix, config?.site?.title, config?.syntax?.prismLanguage];
  if (required.some(value => typeof value !== 'string' || !value.trim())) {
    throw new Error('language.config.json is incomplete');
  }
}

function validateDefinitions(definitions, kind) {
  if (!Array.isArray(definitions) || definitions.some(item => !item?.id || !item?.labels?.ja || !item?.labels?.en)) {
    throw new Error(`Invalid ${kind} definitions`);
  }
}
