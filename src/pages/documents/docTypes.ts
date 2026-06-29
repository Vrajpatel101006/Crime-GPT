/* ============================================
   CRIMEGPT 2.0 — DOCUMENT TYPES
   ============================================
   Available document types for generation.
   Each type has a label and description for UI display.
   ============================================ */

import type { DocumentType } from '../../types';

export interface DocTypeInfo {
  value: DocumentType;
  label: string;
  description: string;
}

export const DOC_TYPES: DocTypeInfo[] = [
  { value: 'fir', label: 'First Information Report', description: 'Official FIR document for case registration' },
  { value: 'remand_request', label: 'Remand Request Letter', description: 'Request for judicial custody of accused' },
  { value: 'chargesheet', label: 'Chargesheet Draft', description: 'Complete chargesheet for court submission' },
  { value: 'purvani_chargesheet', label: 'Purvani Chargesheet (Preliminary Report)', description: 'Preliminary intimation report to the Judicial Magistrate under Section 176 BNSS' },
  { value: 'seizure_receipt', label: 'Seizure Receipt', description: 'Receipt for seized evidence items' },
  { value: 'medical_letter', label: 'Medical Treatment Letter', description: 'Letter for victim medical examination' },
  { value: 'court_custody', label: 'Court Custody Letter', description: 'Letter for court custody extension' },
  { value: 'panchanama', label: 'Panchanama', description: 'Detailed panchanama document' },
  { value: 'face_id_form', label: 'Face Identification Form', description: 'Test Identification Parade (TIP) form for suspect identification' },
  { value: 'lers_request', label: 'LERS Request', description: 'Law enforcement request for social media platforms' },
];
