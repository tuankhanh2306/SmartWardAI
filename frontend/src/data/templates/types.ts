export interface A4FormField {
  label: string;
  placeholder?: string;
  type?: 'text' | 'grid2' | 'textarea';
  isBold?: boolean;
  secondLabel?: string;
  secondPlaceholder?: string;
}

export interface A4FormSection {
  title?: string;
  fields: A4FormField[];
}

export interface A4FormSignature {
  role: string;
  note: string;
}

export interface A4FormTemplate {
  procedureCode: string;
  formCode: string;
  agencyType: 'POLICE' | 'COMMUNE_UBND';
  title: string;
  legalNote: string;
  recipient: string;
  sections: A4FormSection[];
  commitText: string;
  signatures: A4FormSignature[];
}
