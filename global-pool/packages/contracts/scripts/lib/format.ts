import * as prettier from 'prettier';

/** Serialises `value` as JSON formatted with the workspace Prettier config (so `prettier --check` stays green). */
export async function formatJson(value: unknown, filePath: string): Promise<string> {
  const config = (await prettier.resolveConfig(filePath)) ?? {};
  return prettier.format(JSON.stringify(value), { ...config, parser: 'json', filepath: filePath });
}
