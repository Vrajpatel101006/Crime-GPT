/* ============================================
   CRIMEGPT 2.0 — DOCUMENT CONTENT GENERATOR
   ============================================
   Generates court-ready legal document templates
   based on case data and document type.
   
   Each template follows official Gujarat Police
   formats and BNSS/BSA legal requirements.
   ============================================ */

import type { CaseRecord, DocumentType } from '../../types';
import { getLegalSections } from '../../store';

export interface GeneratedDocResult {
  content: string;
  errors: string[];
}

export function generateDocContent(caseData: CaseRecord, docType: DocumentType): GeneratedDocResult {
  const errors: string[] = [];
  if (!caseData.firNumber) errors.push('FIR Number is missing');
  if (!caseData.victim.name) errors.push('Victim name is missing');
  if (!caseData.incident.narrative) errors.push('Incident narrative is missing');

  const sections = caseData.legalSectionIds
    .map(id => getLegalSections().find(s => s.id === id))
    .filter(Boolean)
    .map(s => `${s!.act} Sec. ${s!.sectionNumber} — ${s!.title}`)
    .join('<br>');

  const sectionsShort = caseData.legalSectionIds
    .map(id => getLegalSections().find(s => s.id === id))
    .filter(Boolean)
    .map(s => `${s!.act} Sec. ${s!.sectionNumber}`)
    .join(', ');

  const today = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' });

  // eslint-disable-next-line no-useless-assignment
  let content = '';

  switch (docType) {
    case 'fir':
      content = generateFIR(caseData, today, sectionsShort);
      break;

    case 'remand_request':
      content = generateRemandRequest(caseData, today, sectionsShort);
      break;

    case 'chargesheet':
      content = generateChargesheet(caseData, today, sections, sectionsShort);
      break;

    case 'purvani_chargesheet':
      content = generatePurvaniChargesheet(caseData, today, sections, sectionsShort);
      break;

    case 'seizure_receipt':
      content = generateSeizureReceipt(caseData, today);
      break;

    case 'medical_letter':
      content = generateMedicalLetter(caseData, today, sectionsShort);
      break;

    case 'court_custody':
      content = generateCourtCustody(caseData, today, sectionsShort);
      break;

    case 'panchanama':
      content = generatePanchanama(caseData, today);
      break;

    case 'face_id_form':
      content = generateFaceIDForm(caseData, today);
      break;

    case 'lers_request':
      content = generateLERSRequest(caseData, today, sectionsShort);
      break;

    default:
      content = generateDefault(caseData, today);
  }

  // Append AI disclaimer footer to every generated document
  content += `
<div style="margin-top:32px;padding-top:12px;border-top:2px solid #f59e0b;font-size:0.78rem;color:#92400e;">
  <strong>⚠ AI Disclaimer:</strong> This document was generated with AI-assisted analysis. AI can make mistakes. Officers must verify all content against official records before submission to court or any statutory authority.
</div>`;

  return { content, errors };
}

// Individual document generator functions will be added here
// (Extracted from the original switch cases for better maintainability)

function generateFIR(caseData: CaseRecord, today: string, sectionsShort: string): string {
  return `
<div class="doc-header">
  <div class="doc-emblem">Government of Gujarat &bull; Gujarat Police</div>
  <div class="doc-title">First Information Report</div>
  <div class="doc-subtitle">(Under Section 173 of Bharatiya Nagarik Suraksha Sanhita, 2023)</div>
</div>
<div class="doc-meta">
  <div><span class="doc-field">FIR No.:</span> ${caseData.firNumber}</div>
  <div><span class="doc-field">Case No.:</span> ${caseData.caseNumber}</div>
  <div><span class="doc-field">District:</span> Ahmedabad</div>
  <div><span class="doc-field">Police Station:</span> ${caseData.policeStation}</div>
  <div><span class="doc-field">Date of Report:</span> ${caseData.incident.date}</div>
  <div><span class="doc-field">Time of Report:</span> ${caseData.incident.time}</div>
  <div><span class="doc-field">Year:</span> ${new Date().getFullYear()}</div>
</div>

<div class="doc-section">
  <div class="doc-section-title">1. Complainant / Informant Details</div>
  <dl class="doc-fields">
    <dt>Name:</dt><dd>${caseData.victim.name}</dd>
    ${caseData.victim.age ? `<dt>Age:</dt><dd>${caseData.victim.age}</dd>` : ''}
    ${caseData.victim.gender ? `<dt>Gender:</dt><dd>${caseData.victim.gender}</dd>` : ''}
    <dt>Address:</dt><dd>${caseData.victim.address}</dd>
    <dt>Mobile:</dt><dd>${caseData.victim.mobile}</dd>
    ${caseData.victim.email ? `<dt>Email:</dt><dd>${caseData.victim.email}</dd>` : ''}
  </dl>
</div>

<div class="doc-section">
  <div class="doc-section-title">2. Accused Details</div>
  <dl class="doc-fields">
    <dt>Name:</dt><dd>${caseData.accused.name}</dd>
    <dt>Address:</dt><dd>${caseData.accused.address || 'Unknown / Under Investigation'}</dd>
    <dt>Mobile:</dt><dd>${caseData.accused.mobile || 'N/A'}</dd>
  </dl>
</div>

<div class="doc-section">
  <div class="doc-section-title">3. Incident Details</div>
  <dl class="doc-fields">
    <dt>Date of Incident:</dt><dd>${caseData.incident.date}</dd>
    <dt>Time of Incident:</dt><dd>${caseData.incident.time}</dd>
    <dt>Place of Occurrence:</dt><dd>${caseData.incident.location}</dd>
    <dt>Crime Type:</dt><dd>${caseData.crimeType}</dd>
  </dl>
</div>

<div class="doc-section">
  <div class="doc-section-title">4. Brief Facts of the Case</div>
  <div class="doc-narrative">${caseData.incident.narrative}</div>
</div>

<div class="doc-section">
  <div class="doc-section-title">5. Legal Sections Applied</div>
  <p>${sectionsShort || 'To be determined upon investigation'}</p>
</div>

<div class="doc-section">
  <div class="doc-section-title">6. Action Taken</div>
  <ol class="doc-numbered">
    <li>Registered the case and commenced investigation.</li>
    <li>Visited the place of occurrence and prepared spot panchanama.</li>
    <li>Collected and preserved evidence with SHA-256 integrity verification.</li>
    <li>Commenced search for the accused.</li>
  </ol>
</div>

<div class="doc-section">
  <div class="doc-section-title">7. Investigation Officer Details</div>
  <dl class="doc-fields">
    <dt>Name:</dt><dd>${caseData.assignedOfficer}</dd>
    <dt>Badge No.:</dt><dd>GP-4521</dd>
    <dt>Police Station:</dt><dd>${caseData.policeStation}</dd>
    <dt>Date of FIR Registration:</dt><dd>${today}</dd>
    <dt>Place:</dt><dd>Ahmedabad, Gujarat</dd>
  </dl>
</div>

<div class="doc-signatures">
  <div class="doc-sig-block"><div class="doc-sig-line">Signature of Investigation Officer</div></div>
  <div class="doc-sig-block"><div class="doc-sig-line">Signature of Complainant</div></div>
</div>

<div class="doc-footer">
  <strong>Copy forwarded to:</strong><br>
  1. Superintendent of Police, Ahmedabad<br>
  2. Deputy Commissioner of Police, Cybercrime<br>
  3. Case File
</div>

<div class="doc-note">FIR read over to the complainant/informant, admitted to be correctly recorded and a copy given to the complainant free of cost.</div>
`;
}

// Placeholder functions for other document types
// (Will be filled in subsequent operations)
function generateRemandRequest(_caseData: CaseRecord, _today: string, _sectionsShort: string): string { return ''; }
function generateChargesheet(_caseData: CaseRecord, _today: string, _sections: string, _sectionsShort: string): string { return ''; }
function generatePurvaniChargesheet(_caseData: CaseRecord, _today: string, _sections: string, _sectionsShort: string): string { return ''; }
function generateSeizureReceipt(_caseData: CaseRecord, _today: string): string { return ''; }
function generateMedicalLetter(_caseData: CaseRecord, _today: string, _sectionsShort: string): string { return ''; }
function generateCourtCustody(_caseData: CaseRecord, _today: string, _sectionsShort: string): string { return ''; }
function generatePanchanama(_caseData: CaseRecord, _today: string): string { return ''; }
function generateFaceIDForm(_caseData: CaseRecord, _today: string): string { return ''; }
function generateLERSRequest(_caseData: CaseRecord, _today: string, _sectionsShort: string): string { return ''; }
function generateDefault(caseData: CaseRecord, today: string): string {
  return `<div class="doc-header"><div class="doc-title">Document</div></div>
<div class="doc-meta"><div><span class="doc-field">FIR No.:</span> ${caseData.firNumber}</div><div><span class="doc-field">Date:</span> ${today}</div></div>
<p>[Document content to be generated based on case details]</p>
<div class="doc-signatures"><div class="doc-sig-block"><div class="doc-sig-line">${caseData.assignedOfficer}<br>Investigation Officer</div></div></div>`;
}
