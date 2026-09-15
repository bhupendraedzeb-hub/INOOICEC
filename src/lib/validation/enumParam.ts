// Validates a raw query-string value against a known set of allowed values
// before it reaches Prisma — an invalid value (typo, probing, garbage input)
// is treated as "no filter" rather than being cast unchecked and reaching
// the query engine, which would otherwise surface as an opaque 500 instead
// of the filter being safely ignored.
export function parseEnumParam<T extends string>(value: string | null, allowed: readonly T[]): T | undefined {
  if (value && (allowed as readonly string[]).includes(value)) return value as T;
  return undefined;
}
