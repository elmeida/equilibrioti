const DEFAULT_AUTH_SCHEMA = 'equilibrio_ti';

export function getAuthSchemaName(value = process.env.AUTH_DB_SCHEMA) {
  const schemaName = value || DEFAULT_AUTH_SCHEMA;
  return /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(schemaName) ? schemaName : DEFAULT_AUTH_SCHEMA;
}
