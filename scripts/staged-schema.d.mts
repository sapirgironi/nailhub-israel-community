type Query = (
  strings: TemplateStringsArray,
  ...values: unknown[]
) => Promise<Record<string, unknown>[]>;

export function productionBlockers(tx: Query): Promise<string[]>;
export function schemaFingerprint(tx: Query, detailed?: false): Promise<string>;
export function schemaFingerprint(tx: Query, detailed: true): Promise<Record<string, string>>;
export function schemaFingerprint(
  tx: Query,
  detailed: "rows",
): Promise<Record<string, Record<string, unknown>[]>>;
