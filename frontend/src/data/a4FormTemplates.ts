// Modularized 40 A4 Administrative Document Templates (Decree 30/2020/ND-CP)
import type { A4FormTemplate } from './templates/types';
import { SOCIAL_AND_RESIDENCE_TEMPLATES } from './templates/socialAndResidence.templates';
import { CIVIL_REGISTRY_TEMPLATES } from './templates/civilRegistry.templates';
import { CERTIFICATION_AND_LAND_TEMPLATES } from './templates/certificationAndLand.templates';
import { BUSINESS_AND_CONSTRUCTION_TEMPLATES } from './templates/businessAndConstruction.templates';

export type { A4FormField, A4FormSection, A4FormSignature, A4FormTemplate } from './templates/types';

export const A4_FORM_TEMPLATES: Record<string, A4FormTemplate> = {
  ...SOCIAL_AND_RESIDENCE_TEMPLATES,
  ...CIVIL_REGISTRY_TEMPLATES,
  ...CERTIFICATION_AND_LAND_TEMPLATES,
  ...BUSINESS_AND_CONSTRUCTION_TEMPLATES,
};

export const getA4TemplateByCode = (code: string): A4FormTemplate | undefined => {
  return A4_FORM_TEMPLATES[code];
};
