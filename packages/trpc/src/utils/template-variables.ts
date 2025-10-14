/**
 * Template variable replacement utility
 * Supports multiple variable formats:
 * - {{variable}} - Standard format
 * - {variable} - Simple format
 * - ${variable} - ES6 format
 */

export interface TemplateVariableOptions {
  allowMissing?: boolean;
  defaultValue?: string;
  strict?: boolean;
}

/**
 * Replace variables in template with values
 */
export function replaceTemplateVariables(
  template: string,
  variables: Record<string, string>,
  options: TemplateVariableOptions = {},
): string {
  const { allowMissing = false, defaultValue = "", strict = false } = options;

  let result = template;

  // Replace {{variable}} format
  result = result.replace(/\{\{(\w+)\}\}/g, (match, key) => {
    if (key in variables) {
      return variables[key] || "";
    }
    if (strict) {
      throw new Error(`Variable {{${key}}} not found in template`);
    }
    return allowMissing ? match : defaultValue;
  });

  // Replace {variable} format (only if not already in {{}} format)
  result = result.replace(/(?<!\{)\{(\w+)\}(?!\})/g, (match, key) => {
    if (key in variables) {
      return variables[key] || "";
    }
    if (strict) {
      throw new Error(`Variable {${key}} not found in template`);
    }
    return allowMissing ? match : defaultValue;
  });

  // Replace ${variable} format
  result = result.replace(/\$\{(\w+)\}/g, (match, key) => {
    if (key in variables) {
      return variables[key] || "";
    }
    if (strict) {
      throw new Error(`Variable \${${key}} not found in template`);
    }
    return allowMissing ? match : defaultValue;
  });

  return result;
}

/**
 * Extract variables from template
 */
export function extractTemplateVariables(template: string): string[] {
  const variables = new Set<string>();

  // Extract {{variable}}
  const pattern1 = /\{\{(\w+)\}\}/g;
  let match1;
  while ((match1 = pattern1.exec(template)) !== null) {
    if (match1[1]) variables.add(match1[1]);
  }

  // Extract {variable}
  const pattern2 = /(?<!\{)\{(\w+)\}(?!\})/g;
  let match2;
  while ((match2 = pattern2.exec(template)) !== null) {
    if (match2[1]) variables.add(match2[1]);
  }

  // Extract ${variable}
  const pattern3 = /\$\{(\w+)\}/g;
  let match3;
  while ((match3 = pattern3.exec(template)) !== null) {
    if (match3[1]) variables.add(match3[1]);
  }

  return Array.from(variables);
}

/**
 * Validate that all required variables are provided
 */
export function validateTemplateVariables(
  template: string,
  variables: Record<string, string>,
): { valid: boolean; missing: string[] } {
  const required = extractTemplateVariables(template);
  const missing = required.filter((key) => !(key in variables));

  return {
    valid: missing.length === 0,
    missing,
  };
}

/**
 * Build variables from contact/recipient data
 */
export function buildContactVariables(contact: {
  name?: string | null;
  phoneNumber: string;
  language?: string | null;
  timezone?: string | null;
}): Record<string, string> {
  return {
    name: contact.name || "there",
    firstName: contact.name?.split(" ")[0] || "there",
    phone: contact.phoneNumber,
    language: contact.language || "en",
    timezone: contact.timezone || "UTC",
  };
}

/**
 * Add custom variables to contact variables
 */
export function mergeVariables(
  baseVariables: Record<string, string>,
  customVariables: Record<string, string> = {},
): Record<string, string> {
  return {
    ...baseVariables,
    ...customVariables,
  };
}
