/**
 * Centralized machinery product catalog for LeadNova CRM.
 * Used for product interest tracking across lead conversions, enquiries, and pipeline analytics.
 */

export const MACHINERY_PRODUCTS = [
  'File Making Machine',
  'Cake Board Making Machine',
  'Automatic File Making Machine',
  'Hard Case Making Machine',
  'Automatic Hard Case Making Machine',
  'Paper Bag Making Machine',
  'Binding Machine',
  'Cutting Machine',
  'Creasing Machine',
  'Laminating Machine',
  'Packaging Machine',
  'Other',
] as const;

export type MachineryProduct = (typeof MACHINERY_PRODUCTS)[number];
