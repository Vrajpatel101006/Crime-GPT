import { useState, useCallback } from 'react';
import {
  FileText, Plus, Download, Eye, X, CheckCircle2,
  AlertCircle, Loader2, FileCheck, Printer
} from 'lucide-react';
import {
  getAccessibleCases, getDocumentsForCase, addDocument, generateUniqueId,
  formatDateTime, showToast, getCurrentUser, addDiaryEntry, getLegalSections
} from '../store';
import type { CaseRecord, DocumentType, GeneratedDocument } from '../types';

const DOC_TYPES: { value: DocumentType; label: string; description: string }[] = [
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

function generateDocContent(caseData: CaseRecord, docType: DocumentType): { content: string; errors: string[] } {
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

  let content = '';

  switch (docType) {
    case 'fir':
      content = `
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
      break;

    case 'remand_request':
      content = `
<div class="doc-header">
  <div class="doc-emblem">In the Court of the Judicial Magistrate First Class</div>
  <div class="doc-title">Remand Application</div>
  <div class="doc-subtitle">(Under Section 187 of Bharatiya Nagarik Suraksha Sanhita, 2023)</div>
</div>
<div class="doc-meta">
  <div><span class="doc-field">FIR No.:</span> ${caseData.firNumber}</div>
  <div><span class="doc-field">Police Station:</span> ${caseData.policeStation}</div>
  <div><span class="doc-field">Case No.:</span> ${caseData.caseNumber}</div>
  <div><span class="doc-field">Date:</span> ${today}</div>
</div>

<p class="doc-salutation"><strong>To,</strong><br>The Honourable Judicial Magistrate First Class,<br>Ahmedabad, Gujarat</p>

<p><strong>Subject:</strong> Application for Police Custody Remand of Accused — ${caseData.accused.name}</p>

<p><strong>Reference:</strong> FIR No. ${caseData.firNumber}, P.S. ${caseData.policeStation}, dated ${caseData.incident.date}</p>

<p class="doc-salutation">Respected Sir/Madam,</p>

<div class="doc-section">
  <div class="doc-section-title">1. Grounds of Arrest</div>
  <div class="doc-narrative">It is respectfully submitted that in connection with the above-referenced FIR registered under ${sectionsShort || 'applicable sections'}, the accused <strong>${caseData.accused.name}</strong> was arrested on ${today}. The grounds of arrest have been read over to the accused as required under Section 59 of BNSS, 2023.</div>
</div>

<div class="doc-section">
  <div class="doc-section-title">2. Brief Facts of the Case</div>
  <div class="doc-narrative">${caseData.incident.narrative}</div>
</div>

<div class="doc-section">
  <div class="doc-section-title">3. Grounds for Seeking Police Custody Remand</div>
  <ol class="doc-numbered">
    <li>Recovery of stolen property / digital evidence / weapons</li>
    <li>Identification and arrest of co-accused</li>
    <li>Investigation of financial trail and linked transactions</li>
    <li>Forensic analysis of seized electronic devices</li>
    <li>Confrontation of accused with witnesses and evidence</li>
  </ol>
</div>

<div class="doc-section">
  <div class="doc-section-title">4. Progress of Investigation</div>
  <dl class="doc-fields">
    <dt>Total Evidence Items:</dt><dd>${caseData.evidenceIds.length}</dd>
    <dt>Case Diary Entries:</dt><dd>${caseData.diaryEntries.length}</dd>
    <dt>Readiness Score:</dt><dd>${caseData.readinessScore}%</dd>
  </dl>
</div>

<div class="doc-prayer">It is therefore prayed that the Honourable Court may be pleased to remand the accused <strong>${caseData.accused.name}</strong> to police custody for a period of <strong>7 (seven) days</strong> for the purpose of completing the investigation.</div>

<div class="doc-signatures">
  <div class="doc-sig-block"><div class="doc-sig-line">${caseData.assignedOfficer}<br>Investigation Officer<br>Badge No: GP-4521</div></div>
</div>
<p class="doc-ref doc-mt">Date: ${today}<br>Place: Ahmedabad, Gujarat</p>
`;
      break;

    case 'chargesheet':
      content = `
<div class="doc-header">
  <div class="doc-emblem">Government of Gujarat &bull; Gujarat Police</div>
  <div class="doc-title">Chargesheet / Final Report</div>
  <div class="doc-subtitle">(Under Section 193 of Bharatiya Nagarik Suraksha Sanhita, 2023)</div>
</div>
<div class="doc-meta">
  <div><span class="doc-field">Case No.:</span> ${caseData.caseNumber}</div>
  <div><span class="doc-field">FIR No.:</span> ${caseData.firNumber}</div>
  <div><span class="doc-field">Police Station:</span> ${caseData.policeStation}</div>
  <div><span class="doc-field">Date of FIR:</span> ${caseData.incident.date}</div>
  <div><span class="doc-field">Date of Report:</span> ${today}</div>
</div>

<p class="doc-center doc-mt"><strong>IN THE COURT OF THE METROPOLITAN MAGISTRATE, AHMEDABAD</strong></p>

<div class="doc-section">
  <div class="doc-section-title">I. Particulars of the Accused</div>
  <dl class="doc-fields">
    <dt>Name:</dt><dd>${caseData.accused.name}</dd>
    <dt>Address:</dt><dd>${caseData.accused.address || 'Under Investigation'}</dd>
    <dt>Mobile:</dt><dd>${caseData.accused.mobile || 'N/A'}</dd>
    <dt>Arrested on:</dt><dd>${today}</dd>
    <dt>Currently in:</dt><dd>Judicial / Police Custody</dd>
  </dl>
</div>

<div class="doc-section">
  <div class="doc-section-title">II. Particulars of the Complainant / Victim</div>
  <dl class="doc-fields">
    <dt>Name:</dt><dd>${caseData.victim.name}</dd>
    ${caseData.victim.age ? `<dt>Age:</dt><dd>${caseData.victim.age}</dd>` : ''}
    <dt>Address:</dt><dd>${caseData.victim.address}</dd>
    <dt>Mobile:</dt><dd>${caseData.victim.mobile}</dd>
  </dl>
</div>

<div class="doc-section">
  <div class="doc-section-title">III. Details of Offence</div>
  <dl class="doc-fields">
    <dt>Date:</dt><dd>${caseData.incident.date}</dd>
    <dt>Time:</dt><dd>${caseData.incident.time}</dd>
    <dt>Place:</dt><dd>${caseData.incident.location}</dd>
    <dt>Crime Type:</dt><dd>${caseData.crimeType}</dd>
  </dl>
</div>

<div class="doc-section">
  <div class="doc-section-title">IV. Brief Facts</div>
  <div class="doc-narrative">${caseData.incident.narrative}</div>
</div>

<div class="doc-section">
  <div class="doc-section-title">V. Applicable Legal Sections</div>
  <p>${sections || 'To be determined'}</p>
</div>

<div class="doc-section">
  <div class="doc-section-title">VI. Evidence Collected</div>
  <dl class="doc-fields">
    <dt>Total Evidence Items:</dt><dd>${caseData.evidenceIds.length}</dd>
    <dt>Case Diary Entries:</dt><dd>${caseData.diaryEntries.length}</dd>
    <dt>Investigation Readiness:</dt><dd>${caseData.readinessScore}%</dd>
  </dl>
  <p>All evidence has been collected, verified, and preserved with SHA-256 integrity hashing. Chain of custody for electronic devices documented as per Section 193(3)(i) BNSS.</p>
</div>

<div class="doc-section">
  <div class="doc-section-title">VII. List of Witnesses</div>
  <table class="doc-table">
    <thead><tr><th>Sr.</th><th>Name</th><th>Address</th><th>Statement U/s</th></tr></thead>
    <tbody>
      <tr><td>1</td><td>${caseData.victim.name}</td><td>${caseData.victim.address}</td><td>Sec. 180 BNSS</td></tr>
      <tr><td>2</td><td>Panch Witness 1</td><td>___________</td><td>Sec. 180 BNSS</td></tr>
      <tr><td>3</td><td>Panch Witness 2</td><td>___________</td><td>Sec. 180 BNSS</td></tr>
    </tbody>
  </table>
</div>

<div class="doc-section">
  <div class="doc-section-title">VIII. Investigation Officer's Opinion</div>
  <div class="doc-narrative">Based on the investigation conducted, the evidence collected, and the statements recorded, it is my considered opinion that the accused <strong>${caseData.accused.name}</strong> has committed the offence(s) described above and there is sufficient evidence to proceed with prosecution under the sections mentioned.</div>
</div>

<div class="doc-signatures">
  <div class="doc-sig-block"><div class="doc-sig-line">${caseData.assignedOfficer}<br>Investigation Officer<br>Badge No: GP-4521<br>P.S. ${caseData.policeStation}</div></div>
</div>
<p class="doc-ref doc-mt">Date: ${today}<br>Place: Ahmedabad, Gujarat</p>
`;
      break;

    case 'purvani_chargesheet':
      content = `
<div class="doc-header">
  <div class="doc-emblem">Government of Gujarat &bull; Gujarat Police</div>
  <div class="doc-title">Preliminary Report / Purvani Chargesheet</div>
  <div class="doc-subtitle">(Under Section 176 of Bharatiya Nagarik Suraksha Sanhita, 2023)</div>
</div>
<div class="doc-meta">
  <div><span class="doc-field">FIR No.:</span> ${caseData.firNumber}</div>
  <div><span class="doc-field">Case No.:</span> ${caseData.caseNumber}</div>
  <div><span class="doc-field">Police Station:</span> ${caseData.policeStation}</div>
  <div><span class="doc-field">District:</span> Ahmedabad</div>
  <div><span class="doc-field">Date of FIR:</span> ${caseData.incident.date}</div>
  <div><span class="doc-field">Date of Report:</span> ${today}</div>
</div>

<p class="doc-center doc-mt"><strong>IN THE COURT OF THE JUDICIAL MAGISTRATE FIRST CLASS, AHMEDABAD</strong></p>

<p class="doc-salutation"><strong>To,</strong><br>The Honourable Judicial Magistrate First Class,<br>Ahmedabad, Gujarat</p>

<p><strong>Subject:</strong> Preliminary Report regarding FIR No. ${caseData.firNumber} registered at P.S. ${caseData.policeStation} on ${caseData.incident.date} — Reg.</p>

<p><strong>Reference:</strong> Crime No. ${caseData.caseNumber}, P.S. ${caseData.policeStation}, Ahmedabad District</p>

<p class="doc-salutation">Respected Sir/Madam,</p>

<div class="doc-section">
  <div class="doc-section-title">I. Complainant / Informant Details</div>
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
  <div class="doc-section-title">II. Accused Details</div>
  <dl class="doc-fields">
    <dt>Name:</dt><dd>${caseData.accused.name}</dd>
    <dt>Father's Name:</dt><dd>${caseData.accused.fatherName || 'Not yet ascertained'}</dd>
    <dt>Address:</dt><dd>${caseData.accused.address || 'Not yet ascertained'}</dd>
    <dt>Mobile:</dt><dd>${caseData.accused.mobile || 'Not yet ascertained'}</dd>
  </dl>
</div>

<div class="doc-section">
  <div class="doc-section-title">III. Details of the Offence</div>
  <dl class="doc-fields">
    <dt>Date of Incident:</dt><dd>${caseData.incident.date}</dd>
    <dt>Time of Incident:</dt><dd>${caseData.incident.time}</dd>
    <dt>Place of Occurrence:</dt><dd>${caseData.incident.location}</dd>
    <dt>Crime Type:</dt><dd>${caseData.crimeType}</dd>
    <dt>Cognizable / Non-Cognizable:</dt><dd>Cognizable</dd>
  </dl>
</div>

<div class="doc-section">
  <div class="doc-section-title">IV. Legal Sections Invoked</div>
  <p>${sections || 'Investigation in progress; sections to be finalised upon completion of investigation.'}</p>
</div>

<div class="doc-section">
  <div class="doc-section-title">V. Brief Facts of the Case</div>
  <div class="doc-narrative">${caseData.incident.narrative}</div>
</div>

<div class="doc-section">
  <div class="doc-section-title">VI. Initial Investigation Steps Taken</div>
  <ol class="doc-numbered">
    <li>FIR registered at P.S. ${caseData.policeStation} on ${caseData.incident.date} at ${caseData.incident.time || 'recorded time'} under the above-referenced sections.</li>
    <li>Investigation commenced; spot visit conducted and scene of occurrence inspected.</li>
    <li>Initial statement of the complainant / victim recorded.</li>
    <li>Available physical and digital evidence identified, collected, and preserved with SHA-256 integrity hashing for chain-of-custody verification.</li>
    <li>Senior officers of the station and the concerned Superintendent of Police duly intimated of the registration of the case and commencement of investigation.</li>
    <li>Forensic expert visit arranged where required under Section 176(3) BNSS, 2023.</li>
  </ol>
</div>

<div class="doc-section">
  <div class="doc-section-title">VII. Evidence Identified / Seized So Far</div>
  <dl class="doc-fields">
    <dt>Total Evidence Items Collected:</dt><dd>${caseData.evidenceIds.length}</dd>
  </dl>
  <p>Further evidence, if any, shall be seized and documented in the course of ongoing investigation and reported in the final report under Section 193 BNSS.</p>
</div>

<div class="doc-section">
  <div class="doc-section-title">VIII. Witnesses Identified So Far</div>
  <table class="doc-table">
    <thead><tr><th>Sr.</th><th>Name</th><th>Relation / Role</th></tr></thead>
    <tbody>
      <tr><td>1</td><td>${caseData.victim.name}</td><td>Complainant / Victim</td></tr>
      <tr><td>2</td><td>Panch Witness 1 (to be identified)</td><td>Independent Witness</td></tr>
      <tr><td>3</td><td>Panch Witness 2 (to be identified)</td><td>Independent Witness</td></tr>
    </tbody>
  </table>
  <p>Statements of all material witnesses shall be recorded under Section 180 BNSS, 2023 and annexed with the final report.</p>
</div>

<div class="doc-section">
  <div class="doc-section-title">IX. Arrest Status</div>
  <dl class="doc-fields">
    <dt>Accused Arrested:</dt><dd>Investigation in progress — arrest status to be intimated separately.</dd>
    <dt>Custody:</dt><dd>N/A at this stage</dd>
  </dl>
</div>

<div class="doc-section">
  <div class="doc-section-title">X. Report of the Investigation Officer</div>
  <div class="doc-narrative">It is respectfully submitted that the investigation into the above-referenced FIR has been duly commenced and is being conducted diligently in accordance with the provisions of the Bharatiya Nagarik Suraksha Sanhita, 2023. The progress of investigation shall be intimated to the Honourable Court and the victim within ninety (90) days as mandated under Section 193(3)(ii) BNSS, 2023.

A detailed Final Report / Chargesheet under Section 193 BNSS, 2023 shall be submitted to this Honourable Court upon completion of the investigation, setting forth the evidence collected, statements recorded, and the opinion of the Investigation Officer regarding the commission of the offence and the culpability of the accused.</div>
</div>

<div class="doc-signatures">
  <div class="doc-sig-block"><div class="doc-sig-line">${caseData.assignedOfficer}<br>Investigation Officer<br>Badge No: GP-4521<br>P.S. ${caseData.policeStation}</div></div>
  <div class="doc-sig-block"><div class="doc-sig-line">Signature of Officer-in-Charge<br>P.S. ${caseData.policeStation}</div></div>
</div>
<p class="doc-ref doc-mt">Date: ${today}<br>Place: Ahmedabad, Gujarat</p>

<div class="doc-footer">
  <strong>Copy forwarded to:</strong><br>
  1. The Honourable Judicial Magistrate First Class, Ahmedabad (Original)<br>
  2. Superintendent of Police, Ahmedabad (For information)<br>
  3. Deputy Commissioner of Police, Cyber Crime Cell (For information)<br>
  4. Case File / Station Record
</div>

<div class="doc-note">This Preliminary Report is submitted under Section 176 of the Bharatiya Nagarik Suraksha Sanhita, 2023, corresponding to Section 157 of the Code of Criminal Procedure, 1973 (since repealed). The contents of this report are preliminary and subject to revision upon completion of investigation.</div>
`;
      break;

    case 'seizure_receipt':
      content = `
<div class="doc-header">
  <div class="doc-emblem">Government of Gujarat &bull; Gujarat Police &bull; FORM IF-4</div>
  <div class="doc-title">Property Seizure Memo</div>
  <div class="doc-subtitle">(Search / Production / Recovery)</div>
</div>
<div class="doc-meta">
  <div><span class="doc-field">District:</span> Ahmedabad</div>
  <div><span class="doc-field">Police Station:</span> ${caseData.policeStation}</div>
  <div><span class="doc-field">FIR No.:</span> ${caseData.firNumber}</div>
  <div><span class="doc-field">Case No.:</span> ${caseData.caseNumber}</div>
  <div><span class="doc-field">Date of Seizure:</span> ${today}</div>
  <div><span class="doc-field">Year:</span> ${new Date().getFullYear()}</div>
</div>

<div class="doc-section">
  <div class="doc-section-title">Items Seized</div>
  <table class="doc-table">
    <thead><tr><th>Sr. No.</th><th>Description of Item</th><th>Make / Model</th><th>Serial / IMEI</th><th>Qty</th></tr></thead>
    <tbody>
      <tr><td>1</td><td>Mobile Phone</td><td>___________</td><td>___________</td><td>1</td></tr>
      <tr><td>2</td><td>SIM Card</td><td>${caseData.accused.mobile || '___________'}</td><td>___________</td><td>1</td></tr>
      <tr><td>3</td><td>Bank Documents</td><td>As per annexure</td><td>N/A</td><td>—</td></tr>
      <tr><td>4</td><td>Digital Screenshots / Evidence</td><td>SHA-256 verified</td><td>${caseData.evidenceIds.length} files</td><td>—</td></tr>
      <tr><td>5</td><td>Other items</td><td>___________</td><td>___________</td><td>—</td></tr>
    </tbody>
  </table>
</div>

<div class="doc-section">
  <div class="doc-section-title">Seized From</div>
  <dl class="doc-fields">
    <dt>Name:</dt><dd>${caseData.accused.name}</dd>
    <dt>Location:</dt><dd>${caseData.incident.location}</dd>
  </dl>
</div>

<div class="doc-section">
  <div class="doc-section-title">Panch Witnesses</div>
  <table class="doc-table">
    <thead><tr><th>Sr.</th><th>Name</th><th>Address</th><th>Aadhaar No.</th><th>Signature</th></tr></thead>
    <tbody>
      <tr><td>1</td><td>___________</td><td>___________</td><td>___________</td><td>___________</td></tr>
      <tr><td>2</td><td>___________</td><td>___________</td><td>___________</td><td>___________</td></tr>
    </tbody>
  </table>
</div>

<p>All items have been sealed with the official seal of P.S. ${caseData.policeStation} and SHA-256 hash computed for all digital evidence items.</p>

<div class="doc-section">
  <div class="doc-section-title">Zimma Nama (Acknowledgment)</div>
  <div class="doc-narrative">I, the undersigned, hereby acknowledge receipt of this seizure memo and undertake to produce the seized articles before the Court or Investigating Agency whenever required.</div>
</div>

<div class="doc-signatures">
  <div class="doc-sig-block"><div class="doc-sig-line">Signature of person<br>from whom seized</div></div>
  <div class="doc-sig-block"><div class="doc-sig-line">Panch Witness 1</div></div>
  <div class="doc-sig-block"><div class="doc-sig-line">Panch Witness 2</div></div>
  <div class="doc-sig-block"><div class="doc-sig-line">${caseData.assignedOfficer}<br>IO, Badge: GP-4521</div></div>
</div>
<p class="doc-ref doc-mt">Date: ${today} &nbsp;&nbsp;&nbsp; Place: Ahmedabad</p>
`;
      break;

    case 'medical_letter':
      content = `
<div class="doc-header">
  <div class="doc-emblem">Government of Gujarat &bull; Gujarat Police &bull; FORM XXIV</div>
  <div class="doc-title">Request for Medical Examination</div>
</div>
<div class="doc-meta">
  <div><span class="doc-field">FIR No.:</span> ${caseData.firNumber}</div>
  <div><span class="doc-field">Police Station:</span> ${caseData.policeStation}</div>
  <div><span class="doc-field">Case No.:</span> ${caseData.caseNumber}</div>
  <div><span class="doc-field">Date:</span> ${today}</div>
</div>

<p class="doc-salutation"><strong>To,</strong><br>The Medical Officer,<br>Civil Hospital / Government Hospital,<br>Ahmedabad, Gujarat</p>

<p><strong>Subject:</strong> Request for Medical Examination of Victim in connection with FIR No. ${caseData.firNumber}</p>

<p class="doc-salutation">Respected Sir/Madam,</p>

<p>This is to request the medical examination of the following person in connection with the above-referenced criminal case:</p>

<div class="doc-section">
  <div class="doc-section-title">Patient Details</div>
  <dl class="doc-fields">
    <dt>Name:</dt><dd>${caseData.victim.name}</dd>
    ${caseData.victim.age ? `<dt>Age:</dt><dd>${caseData.victim.age} years</dd>` : ''}
    ${caseData.victim.gender ? `<dt>Gender:</dt><dd>${caseData.victim.gender}</dd>` : ''}
    <dt>Address:</dt><dd>${caseData.victim.address}</dd>
  </dl>
</div>

<div class="doc-section">
  <div class="doc-section-title">Case Details</div>
  <dl class="doc-fields">
    <dt>FIR No.:</dt><dd>${caseData.firNumber}</dd>
    <dt>Crime Type:</dt><dd>${caseData.crimeType}</dd>
    <dt>Date of Incident:</dt><dd>${caseData.incident.date}</dd>
    <dt>Place of Incident:</dt><dd>${caseData.incident.location}</dd>
    <dt>Sections Applied:</dt><dd>${sectionsShort || 'Under investigation'}</dd>
  </dl>
</div>

<div class="doc-section">
  <div class="doc-section-title">Examination Requested</div>
  <ol class="doc-numbered">
    <li>General physical examination and documentation of injuries</li>
    <li>Detailed injury report with photographs (if applicable)</li>
    <li>Treatment as deemed necessary</li>
    <li>Fitness certificate (if applicable)</li>
    <li>Collection of biological samples for FSL analysis</li>
    <li>Toxicology screening (if required)</li>
  </ol>
</div>

<p>The medical examination report will form part of the investigation record and may be used as evidence in court proceedings under the provisions of the Bharatiya Sakshya Adhiniyam, 2023.</p>

<p><strong>Please treat this as URGENT.</strong></p>

<div class="doc-signatures">
  <div class="doc-sig-block"><div class="doc-sig-line">${caseData.assignedOfficer}<br>Investigation Officer<br>Badge No: GP-4521<br>P.S. ${caseData.policeStation}<br>Contact: cybercrime.ahd@gujpol.gov.in</div></div>
</div>
<p class="doc-ref doc-mt">Date: ${today} &nbsp;&nbsp;&nbsp; Place: Ahmedabad, Gujarat</p>
`;
      break;

    case 'court_custody':
      content = `
<div class="doc-header">
  <div class="doc-emblem">Application for Extension of Custody</div>
  <div class="doc-title">Court Custody Extension Letter</div>
  <div class="doc-subtitle">(Under Section 187 of Bharatiya Nagarik Suraksha Sanhita, 2023)</div>
</div>

<p class="doc-center doc-mt"><strong>IN THE COURT OF THE METROPOLITAN MAGISTRATE,<br>AHMEDABAD, GUJARAT</strong></p>

<div class="doc-meta">
  <div><span class="doc-field">Case No.:</span> ${caseData.caseNumber}</div>
  <div><span class="doc-field">FIR No.:</span> ${caseData.firNumber}</div>
  <div><span class="doc-field">Police Station:</span> ${caseData.policeStation}</div>
  <div><span class="doc-field">Date:</span> ${today}</div>
</div>

<p><strong>Subject:</strong> Application for Extension of Judicial/Police Custody of Accused — ${caseData.accused.name}</p>

<p class="doc-salutation">Respected Sir/Madam,</p>

<div class="doc-narrative">It is respectfully submitted that in connection with FIR No. ${caseData.firNumber} registered under ${sectionsShort || 'applicable sections'}, the accused <strong>${caseData.accused.name}</strong> (address: ${caseData.accused.address || 'Under Investigation'}) is currently in custody since _______________ and the existing custody period is due to expire on _______________.</div>

<div class="doc-section">
  <div class="doc-section-title">Grounds for Extension</div>
  <ol class="doc-numbered">
    <li>Investigation is still ongoing and requires further custodial interrogation.</li>
    <li>Recovery of additional evidence / digital devices is pending.</li>
    <li>Forensic Science Laboratory (FSL) analysis reports are awaited.</li>
    <li>Further interrogation of the accused is required based on new leads.</li>
    <li>Co-accused identification and confrontation is pending.</li>
  </ol>
</div>

<div class="doc-section">
  <div class="doc-section-title">Brief Progress of Investigation</div>
  <div class="doc-narrative">${caseData.incident.narrative}</div>
  <dl class="doc-fields doc-mt">
    <dt>Total Evidence Collected:</dt><dd>${caseData.evidenceIds.length} items</dd>
    <dt>Case Diary Entries:</dt><dd>${caseData.diaryEntries.length}</dd>
    <dt>Investigation Readiness:</dt><dd>${caseData.readinessScore}%</dd>
  </dl>
</div>

<div class="doc-prayer">It is therefore prayed that the Honourable Court may be pleased to extend the custody of the accused <strong>${caseData.accused.name}</strong> for a further period of _______ days in the interest of justice and completion of investigation.</div>

<div class="doc-signatures">
  <div class="doc-sig-block"><div class="doc-sig-line">${caseData.assignedOfficer}<br>Investigation Officer<br>Badge No: GP-4521<br>P.S. ${caseData.policeStation}</div></div>
</div>
<p class="doc-ref doc-mt">Date: ${today} &nbsp;&nbsp;&nbsp; Place: Ahmedabad, Gujarat</p>
`;
      break;

    case 'panchanama':
      content = `
<div class="doc-header">
  <div class="doc-emblem">Government of Gujarat &bull; Gujarat Police</div>
  <div class="doc-title">Panchanama</div>
  <div class="doc-subtitle">(Record of Observation and Seizure)</div>
</div>
<div class="doc-meta">
  <div><span class="doc-field">FIR No.:</span> ${caseData.firNumber}</div>
  <div><span class="doc-field">Case No.:</span> ${caseData.caseNumber}</div>
  <div><span class="doc-field">Police Station:</span> ${caseData.policeStation}</div>
  <div><span class="doc-field">Date:</span> ${today}</div>
</div>

<div class="doc-narrative">Today on <strong>${today}</strong>, at approximately <strong>${caseData.incident.time}</strong>, a panchanama was drawn at the place of occurrence / investigation site at <strong>${caseData.incident.location}</strong>.</div>

<div class="doc-section">
  <div class="doc-section-title">1. Present</div>
  <p>The undersigned Investigation Officer along with the following independent Panch witnesses:</p>
  <table class="doc-table">
    <thead><tr><th>Panch Witness</th><th>Name</th><th>Address</th><th>Aadhaar No.</th></tr></thead>
    <tbody>
      <tr><td>1</td><td>___________</td><td>___________</td><td>___________</td></tr>
      <tr><td>2</td><td>___________</td><td>___________</td><td>___________</td></tr>
    </tbody>
  </table>
</div>

<div class="doc-section">
  <div class="doc-section-title">2. Observations</div>
  <div class="doc-narrative">In connection with FIR No. ${caseData.firNumber} pertaining to <strong>${caseData.crimeType}</strong>, the following observations were made at the scene:</div>
  <div class="doc-narrative">${caseData.incident.narrative}</div>
</div>

<div class="doc-section">
  <div class="doc-section-title">3. Items Seized / Recovered</div>
  <p>The following items were found, seized, and sealed in the presence of Panch witnesses:</p>
  <table class="doc-table">
    <thead><tr><th>Sr.</th><th>Item Description</th><th>Make / Model</th><th>IMEI / Serial</th><th>Remarks</th></tr></thead>
    <tbody>
      <tr><td>1</td><td>Mobile Phone</td><td>_______</td><td>_______</td><td>Sealed</td></tr>
      <tr><td>2</td><td>SIM Card</td><td>${caseData.accused.mobile || '_______'}</td><td>_______</td><td>Sealed</td></tr>
      <tr><td>3</td><td>Bank Documents</td><td>_______</td><td>_______</td><td>Sealed</td></tr>
      <tr><td>4</td><td>Digital Screenshots</td><td>${caseData.evidenceIds.length} files</td><td>SHA-256 verified</td><td>Sealed</td></tr>
      <tr><td>5</td><td>Other</td><td>_______</td><td>_______</td><td>_______</td></tr>
    </tbody>
  </table>
  <p>All items were sealed with the official seal and labeled with case reference: <strong>${caseData.caseNumber}</strong></p>
</div>

<div class="doc-section">
  <div class="doc-section-title">4. Photographs / Videography</div>
  <ul class="doc-list">
    <li>Photographs taken at the scene</li>
    <li>Videography conducted</li>
    <li>Sketch map prepared</li>
  </ul>
</div>

<div class="doc-section">
  <div class="doc-section-title">5. Declaration</div>
  <div class="doc-narrative">We, the undersigned Panch witnesses, confirm that the above proceedings were conducted in our presence and the items listed above were seized / recovered from the location mentioned herein. The proceedings were fair and transparent.</div>
</div>

<div class="doc-signatures">
  <div class="doc-sig-block"><div class="doc-sig-line">Panch Witness 1</div></div>
  <div class="doc-sig-block"><div class="doc-sig-line">Panch Witness 2</div></div>
  <div class="doc-sig-block"><div class="doc-sig-line">${caseData.assignedOfficer}<br>IO, Badge: GP-4521</div></div>
</div>
<p class="doc-ref doc-mt">Date: ${today} &nbsp;&nbsp; Time: ___________ &nbsp;&nbsp; Place: ${caseData.incident.location}</p>
`;
      break;

    case 'face_id_form':
      content = `
<div class="doc-header">
  <div class="doc-emblem">Government of Gujarat &bull; Judicial Department</div>
  <div class="doc-title">Test Identification Parade</div>
  <div class="doc-subtitle">(Face Identification Record — Under Section 7 of Bharatiya Sakshya Adhiniyam, 2023)</div>
</div>
<div class="doc-meta">
  <div><span class="doc-field">FIR No.:</span> ${caseData.firNumber}</div>
  <div><span class="doc-field">Case No.:</span> ${caseData.caseNumber}</div>
  <div><span class="doc-field">Police Station:</span> ${caseData.policeStation}</div>
  <div><span class="doc-field">Date:</span> ${today}</div>
</div>

<div class="doc-section">
  <div class="doc-section-title">1. Parade Details</div>
  <dl class="doc-fields">
    <dt>Place of Parade:</dt><dd>${caseData.policeStation}</dd>
    <dt>Date &amp; Time:</dt><dd>${today}</dd>
    <dt>Conducted by:</dt><dd>Judicial Magistrate / Authorized Officer</dd>
  </dl>
</div>

<div class="doc-section">
  <div class="doc-section-title">2. Suspect Details</div>
  <dl class="doc-fields">
    <dt>Name:</dt><dd>${caseData.accused.name}</dd>
    <dt>Address:</dt><dd>${caseData.accused.address || 'Under Investigation'}</dd>
    <dt>Build:</dt><dd>___________</dd>
    <dt>Complexion:</dt><dd>___________</dd>
    <dt>Distinguishing Marks:</dt><dd>___________</dd>
  </dl>
</div>

<div class="doc-section">
  <div class="doc-section-title">3. Identification Procedure</div>
  <div class="doc-narrative">The suspect was placed among <strong>${Math.floor(Math.random() * 4) + 5} other persons</strong> of similar age, build, and appearance. All participants were arranged in a numbered line. The identifier(s) were brought in one at a time. The identifier was not allowed to see the accused prior to the parade.</div>
</div>

<div class="doc-section">
  <div class="doc-section-title">4. Identifier Details</div>
  <dl class="doc-fields">
    <dt>Name:</dt><dd>${caseData.victim.name}</dd>
    <dt>Relation to Case:</dt><dd>Complainant / Witness</dd>
  </dl>
</div>

<div class="doc-section">
  <div class="doc-section-title">5. Identification Result</div>
  <table class="doc-table">
    <thead><tr><th>Question</th><th>Response</th></tr></thead>
    <tbody>
      <tr><td>Did the identifier identify the suspect?</td><td>&#9744; YES &mdash; Position No. ____<br>&#9744; NO &mdash; Could not identify</td></tr>
      <tr><td>Identifier's Statement:</td><td>_______________________________________</td></tr>
    </tbody>
  </table>
</div>

<div class="doc-section">
  <div class="doc-section-title">6. Lineup Participants</div>
  <table class="doc-table">
    <thead><tr><th>Position</th><th>Name</th><th>Role</th></tr></thead>
    <tbody>
      <tr><td>1</td><td>___________</td><td>Dummy</td></tr>
      <tr><td>2</td><td>___________</td><td>Dummy</td></tr>
      <tr><td>3</td><td>${caseData.accused.name}</td><td><strong>Suspect</strong></td></tr>
      <tr><td>4</td><td>___________</td><td>Dummy</td></tr>
      <tr><td>5</td><td>___________</td><td>Dummy</td></tr>
      <tr><td>6</td><td>___________</td><td>Dummy</td></tr>
    </tbody>
  </table>
</div>

<div class="doc-section">
  <div class="doc-section-title">7. Magistrate's Certification</div>
  <div class="doc-narrative">I hereby certify that the identification parade was conducted fairly and without any prompting or assistance to the identifier. The proceedings were conducted in accordance with the provisions of Section 7 of the Bharatiya Sakshya Adhiniyam, 2023.</div>
</div>

<div class="doc-signatures">
  <div class="doc-sig-block"><div class="doc-sig-line">Magistrate</div></div>
  <div class="doc-sig-block"><div class="doc-sig-line">Witness 1</div></div>
  <div class="doc-sig-block"><div class="doc-sig-line">Witness 2</div></div>
  <div class="doc-sig-block"><div class="doc-sig-line">${caseData.assignedOfficer}<br>IO, Badge: GP-4521</div></div>
</div>
<p class="doc-ref doc-mt">Date: ${today}</p>
<div class="doc-note">This document is admissible as corroborative evidence under Section 7 of the Bharatiya Sakshya Adhiniyam, 2023.</div>
`;
      break;

    case 'lers_request':
      content = `
<div class="doc-header">
  <div class="doc-emblem">Government of Gujarat &bull; Gujarat Police &bull; Cybercrime Cell</div>
  <div class="doc-title">Law Enforcement Request</div>
  <div class="doc-subtitle">(Under the Information Technology Act, 2000 and applicable BNS provisions)</div>
</div>
<div class="doc-meta">
  <div><span class="doc-field">From:</span> ${caseData.policeStation}</div>
  <div><span class="doc-field">Date:</span> ${today}</div>
  <div><span class="doc-field">FIR No.:</span> ${caseData.firNumber}</div>
  <div><span class="doc-field">Offences:</span> ${sectionsShort || 'Under investigation'}</div>
</div>

<p class="doc-salutation"><strong>To,</strong><br>Meta Platforms, Inc. / WhatsApp Legal Team<br>Law Enforcement Response Team</p>

<p><strong>Subject:</strong> Request for User Data and Account Records in connection with Criminal Investigation</p>

<p class="doc-salutation">Dear Sir/Madam,</p>

<div class="doc-narrative">In connection with the above-referenced criminal investigation being conducted by P.S. ${caseData.policeStation}, we request the following information pertaining to the suspect's account(s):</div>

<div class="doc-section">
  <div class="doc-section-title">Target Account Details</div>
  <dl class="doc-fields">
    <dt>Phone Number:</dt><dd>${caseData.accused.mobile || 'To be provided'}</dd>
    <dt>Name (if known):</dt><dd>${caseData.accused.name}</dd>
    <dt>Platform:</dt><dd>WhatsApp / Instagram / Facebook</dd>
  </dl>
</div>

<div class="doc-section">
  <div class="doc-section-title">Data Requested</div>
  <ol class="doc-numbered">
    <li>Basic subscriber records (name, email, signup date, phone)</li>
    <li>Login / logout IP address logs</li>
    <li>Message metadata (not content) for the relevant period</li>
    <li>Account creation and registration details</li>
    <li>Linked accounts and connected profiles</li>
    <li>Device information and session logs</li>
  </ol>
</div>

<div class="doc-section">
  <div class="doc-section-title">Time Period</div>
  <dl class="doc-fields">
    <dt>From:</dt><dd>${caseData.incident.date}</dd>
    <dt>To:</dt><dd>${today}</dd>
  </dl>
</div>

<div class="doc-section">
  <div class="doc-section-title">Legal Authority</div>
  <p>This request is made under the provisions of the Information Technology Act, 2000, the Bharatiya Nyaya Sanhita, 2023, and applicable provisions of the Bharatiya Nagarik Suraksha Sanhita, 2023.</p>
</div>

<div class="doc-section">
  <div class="doc-section-title">Preservation Request</div>
  <p>We request that all relevant data be preserved for a period of <strong>90 days</strong> pending our receipt of formal legal process, as per your Law Enforcement Guidelines.</p>
</div>

<div class="doc-signatures">
  <div class="doc-sig-block"><div class="doc-sig-line">Authorized by:<br>Station House Officer<br>P.S. ${caseData.policeStation}</div></div>
  <div class="doc-sig-block"><div class="doc-sig-line">${caseData.assignedOfficer}<br>Investigation Officer<br>Badge: GP-4521<br>Contact: cybercrime.ahd@gujpol.gov.in</div></div>
</div>
<p class="doc-ref doc-mt">Date: ${today} &nbsp;&nbsp;&nbsp; Place: Ahmedabad, Gujarat</p>
`;
      break;

    default:
      content = `<div class="doc-header"><div class="doc-title">Document</div></div>
<div class="doc-meta"><div><span class="doc-field">FIR No.:</span> ${caseData.firNumber}</div><div><span class="doc-field">Date:</span> ${today}</div></div>
<p>[Document content to be generated based on case details]</p>
<div class="doc-signatures"><div class="doc-sig-block"><div class="doc-sig-line">${caseData.assignedOfficer}<br>Investigation Officer</div></div></div>`;
  }

  // Append AI disclaimer footer to every generated document
  content += `
<div style="margin-top:32px;padding-top:12px;border-top:2px solid #f59e0b;font-size:0.78rem;color:#92400e;">
  <strong>⚠ AI Disclaimer:</strong> This document was generated with AI-assisted analysis. AI can make mistakes. Officers must verify all content against official records before submission to court or any statutory authority.
</div>`;

  return { content, errors };
}

export default function Documents() {
  const cases = getAccessibleCases();
  const [selectedCase, setSelectedCase] = useState(cases[0]?.id || '');
  const [showGenerate, setShowGenerate] = useState(false);
  const [defaultDocType, setDefaultDocType] = useState<DocumentType>('fir');
  const [previewDoc, setPreviewDoc] = useState<GeneratedDocument | null>(null);
  const [, setTick] = useState(0);

  const currentCase = cases.find(c => c.id === selectedCase);
  const docs = selectedCase ? getDocumentsForCase(selectedCase) : [];

  const refresh = () => setTick(t => t + 1);

  return (
    <div className="fade-in">
      <div className="page-header">
        <div>
          <h1><FileText size={28} style={{ color: 'var(--brand-primary-light)' }} /> Document Generator</h1>
          <p className="text-sm text-muted" style={{ marginTop: 4 }}>Generate court-ready legal documents from case data</p>
        </div>
        <div className="page-header-actions">
          <select className="form-select" style={{ width: 280 }} value={selectedCase} onChange={e => setSelectedCase(e.target.value)}>
            {cases.map(c => <option key={c.id} value={c.id}>{c.firNumber} — {c.crimeType}</option>)}
          </select>
          <button className="btn btn-primary" onClick={() => { setDefaultDocType('fir'); setShowGenerate(true); }}>
            <Plus size={16} /> Generate Document
          </button>
        </div>
      </div>

      {/* Document Type Grid */}
      <div className="section-header">
        <div className="section-title">Available Document Templates</div>
      </div>
      <div className="grid-4 stagger" style={{ marginBottom: 'var(--space-xl)' }}>
        {DOC_TYPES.map(dt => (
          <div
            key={dt.value}
            className="card fade-in-up"
            style={{ cursor: 'pointer', textAlign: 'center' }}
            onClick={() => { setDefaultDocType(dt.value); setShowGenerate(true); }}
          >
            <div style={{
              width: 44, height: 44, borderRadius: 'var(--radius-md)',
              background: 'rgba(99,102,241,0.12)', color: 'var(--brand-primary-light)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto var(--space-sm)',
            }}>
              <FileText size={22} />
            </div>
            <div style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-primary)', marginBottom: 4 }}>{dt.label}</div>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{dt.description}</p>
          </div>
        ))}
      </div>

      {/* Generated Documents */}
      <div className="section-header">
        <div className="section-title">Generated Documents for {currentCase?.firNumber || 'Selected Case'}</div>
        <span className="badge badge-primary">{docs.length} documents</span>
      </div>

      {docs.length > 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
          {docs.map(doc => (
            <div key={doc.id} className="card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{
                  width: 40, height: 40, borderRadius: 'var(--radius-md)',
                  background: doc.status === 'approved' ? 'rgba(16,185,129,0.12)' : 'rgba(99,102,241,0.12)',
                  color: doc.status === 'approved' ? 'var(--brand-success)' : 'var(--brand-primary-light)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <FileCheck size={20} />
                </div>
                <div>
                  <div style={{ fontWeight: 600, fontSize: '0.88rem', color: 'var(--text-primary)' }}>{doc.title}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    v{doc.version} • {formatDateTime(doc.generatedAt)}
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span className={`badge ${doc.status === 'approved' ? 'badge-success' : doc.status === 'validated' ? 'badge-info' : 'badge-neutral'}`}>
                  {doc.status}
                </span>
                <button className="btn btn-ghost btn-sm" onClick={() => setPreviewDoc(doc)}>
                  <Eye size={14} /> Preview
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <FileText className="empty-state-icon" />
          <h3>No documents generated yet</h3>
          <p>Select a case and generate your first court-ready document.</p>
        </div>
      )}

      {/* Generate Modal */}
      {showGenerate && currentCase && (
        <GenerateModal caseData={currentCase} defaultDocType={defaultDocType} onClose={() => { setShowGenerate(false); refresh(); }} />
      )}

      {/* Preview Modal */}
      {previewDoc && <PreviewModal doc={previewDoc} onClose={() => setPreviewDoc(null)} />}
    </div>
  );
}

function GenerateModal({ caseData, defaultDocType, onClose }: { caseData: CaseRecord; defaultDocType: DocumentType; onClose: () => void }) {
  const user = getCurrentUser();
  const [docType, setDocType] = useState<DocumentType>(defaultDocType);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generated, setGenerated] = useState<{ content: string; errors: string[] } | null>(null);

  const handleGenerate = useCallback(() => {
    setIsGenerating(true);
    setTimeout(() => {
      const result = generateDocContent(caseData, docType);
      setGenerated(result);
      setIsGenerating(false);
    }, 1200);
  }, [caseData, docType]);

  const handleSave = useCallback(() => {
    if (!generated) return;
    const docTypeInfo = DOC_TYPES.find(d => d.value === docType);
    const doc: GeneratedDocument = {
      id: `doc-${generateUniqueId()}`,
      caseId: caseData.id,
      type: docType,
      title: docTypeInfo?.label || 'Document',
      content: generated.content,
      generatedAt: new Date().toISOString(),
      generatedBy: user.id,
      status: generated.errors.length > 0 ? 'draft' : 'validated',
      validationErrors: generated.errors,
      version: 1,
    };
    addDocument(doc);
    addDiaryEntry(caseData.id, {
      id: generateUniqueId(),
      caseId: caseData.id,
      timestamp: new Date().toISOString(),
      action: `${docTypeInfo?.label || 'Document'} Generated`,
      description: `Generated ${docTypeInfo?.label} for case ${caseData.firNumber}. ${generated.errors.length > 0 ? `${generated.errors.length} validation warning(s).` : 'All validations passed.'}`,
      performedBy: user.name,
      category: 'document',
    });
    showToast(`${docTypeInfo?.label} generated successfully!`, 'success');
    onClose();
  }, [generated, docType, caseData, user, onClose]);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal-lg" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <FileText size={20} style={{ color: 'var(--brand-primary-light)' }} /> Generate Document
          </h3>
          <button className="btn btn-ghost btn-icon" onClick={onClose}><X size={18} /></button>
        </div>
        <div className="modal-body">
          {!generated ? (
            <div className="fade-in">
              <div className="form-group" style={{ marginBottom: 'var(--space-lg)' }}>
                <label className="form-label">Document Type</label>
                <select className="form-select" value={docType} onChange={e => setDocType(e.target.value as DocumentType)}>
                  {DOC_TYPES.map(dt => (
                    <option key={dt.value} value={dt.value}>{dt.label}</option>
                  ))}
                </select>
              </div>

              <div className="card" style={{ background: 'var(--surface-1)', marginBottom: 'var(--space-md)' }}>
                <div className="card-title" style={{ marginBottom: 8 }}>Case Data Summary</div>
                <div style={{ fontSize: '0.82rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  <div><strong>FIR:</strong> {caseData.firNumber}</div>
                  <div><strong>Crime:</strong> {caseData.crimeType}</div>
                  <div><strong>Victim:</strong> {caseData.victim.name}</div>
                  <div><strong>Accused:</strong> {caseData.accused.name}</div>
                  <div><strong>Evidence:</strong> {caseData.evidenceIds.length} files</div>
                  <div><strong>Sections:</strong> {caseData.legalSectionIds.length} applied</div>
                </div>
              </div>
            </div>
          ) : (
            <div className="fade-in">
              {generated.errors.length > 0 && (
                <div style={{ marginBottom: 'var(--space-md)' }}>
                  {generated.errors.map((err, i) => (
                    <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'center', padding: '8px 12px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 'var(--radius-md)', marginBottom: 4, fontSize: '0.82rem', color: 'var(--brand-danger)' }}>
                      <AlertCircle size={14} /> {err}
                    </div>
                  ))}
                </div>
              )}
              <div className="doc-preview" dangerouslySetInnerHTML={{ __html: generated.content }} />
            </div>
          )}
        </div>
        <div className="modal-footer">
          {!generated ? (
            <button className="btn btn-primary" onClick={handleGenerate} disabled={isGenerating}>
              {isGenerating ? <><Loader2 size={16} className="spin" /> Generating...</> : <><FileText size={16} /> Generate Document</>}
            </button>
          ) : (
            <>
              <button className="btn btn-secondary" onClick={() => setGenerated(null)}>Back</button>
              <button className="btn btn-success" onClick={handleSave}>
                <CheckCircle2 size={16} /> Save Document
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function PreviewModal({ doc, onClose }: { doc: GeneratedDocument; onClose: () => void }) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal-lg" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <h3>{doc.title}</h3>
            <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
              <span className={`badge ${doc.status === 'approved' ? 'badge-success' : 'badge-info'}`}>{doc.status}</span>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>v{doc.version} • {formatDateTime(doc.generatedAt)}</span>
            </div>
          </div>
          <button className="btn btn-ghost btn-icon" onClick={onClose}><X size={18} /></button>
        </div>
        <div className="modal-body">
          <div className="doc-preview" dangerouslySetInnerHTML={{ __html: doc.content || '<p>[Document content — Generated from case data using verified templates]</p>' }} />
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={() => showToast('PDF export simulated', 'info')}>
            <Download size={16} /> Export PDF
          </button>
          <button className="btn btn-secondary" onClick={() => showToast('DOCX export simulated', 'info')}>
            <Download size={16} /> Export DOCX
          </button>
          <button className="btn btn-ghost" onClick={() => showToast('Print dialog simulated', 'info')}>
            <Printer size={16} /> Print
          </button>
        </div>
      </div>
    </div>
  );
}
