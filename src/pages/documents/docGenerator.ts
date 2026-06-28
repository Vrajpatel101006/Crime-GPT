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
import { getDocTranslations, getLegalSectionTranslations, type DocFieldTranslations, type LegalSectionTranslations } from './docTranslations';

export interface GeneratedDocResult {
  content: string;
  errors: string[];
}

export function generateDocContent(
  caseData: CaseRecord, 
  docType: DocumentType,
  language: 'en' | 'gu' | 'hi' = 'en'
): GeneratedDocResult {
  const errors: string[] = [];
  if (!caseData.firNumber) errors.push('FIR Number is missing');
  if (!caseData.victim.name) errors.push('Victim name is missing');
  if (!caseData.incident.narrative) errors.push('Incident narrative is missing');

  const sections = caseData.legalSectionIds
    .map(id => getLegalSections().find(s => s.id === id))
    .filter(Boolean)
    .map(s => {
      const translation = getLegalSectionTranslations(language)[s!.id];
      const title = translation?.title || s!.title;
      return `${s!.act} Sec. ${s!.sectionNumber} — ${title}`;
    })
    .join('<br>');

  const sectionsShort = caseData.legalSectionIds
    .map(id => getLegalSections().find(s => s.id === id))
    .filter(Boolean)
    .map(s => {
      const translation = getLegalSectionTranslations(language)[s!.id];
      const title = translation?.title || s!.title;
      return `${s!.act} Sec. ${s!.sectionNumber} — ${title}`;
    })
    .join(', ');

  const today = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' });
  const t = getDocTranslations(language);
  const legalT = getLegalSectionTranslations(language);

  // eslint-disable-next-line no-useless-assignment
  let content = '';

  switch (docType) {
    case 'fir':
      content = generateFIR(caseData, today, sectionsShort, t.fir, language, legalT);
      break;

    case 'remand_request':
      content = generateRemandRequest(caseData, today, sectionsShort, t.remandRequest, language, legalT);
      break;

    case 'chargesheet':
      content = generateChargesheet(caseData, today, sections, sectionsShort, t.chargesheet, language, legalT);
      break;

    case 'purvani_chargesheet':
      content = generatePurvaniChargesheet(caseData, today, sections, sectionsShort, t.purvaniChargesheet, language);
      break;

    case 'seizure_receipt':
      content = generateSeizureReceipt(caseData, today, t.seizureReceipt, language);
      break;

    case 'medical_letter':
      content = generateMedicalLetter(caseData, today, sectionsShort, t.medicalLetter, language);
      break;

    case 'court_custody':
      content = generateCourtCustody(caseData, today, sectionsShort, t.courtCustody, language);
      break;

    case 'panchanama':
      content = generatePanchanama(caseData, today, t.panchanama, language);
      break;

    case 'face_id_form':
      content = generateFaceIDForm(caseData, today, t.faceIdForm, language);
      break;

    case 'lers_request':
      content = generateLERSRequest(caseData, today, sectionsShort, t.lersRequest, language);
      break;

    default:
      content = generateDefault(caseData, today);
  }

  // Document content generated without AI disclaimer
  // (AI warning is displayed in UI, not embedded in document)

  return { content, errors };
}

// Individual document generator functions will be added here
// (Extracted from the original switch cases for better maintainability)

function generateFIR(
  caseData: CaseRecord,
  today: string,
  sectionsShort: string,
  t: DocFieldTranslations,
  language: 'en' | 'gu' | 'hi' = 'en',
  _legalT?: LegalSectionTranslations
): string {
  return `
<div class="doc-header">
  <div class="doc-emblem">Government of Gujarat &bull; Gujarat Police</div>
  <div class="doc-title">${t.title}</div>
  <div class="doc-subtitle">(${t.subtitle})</div>
  ${t.formNumber ? `<div style="font-size:11px;color:#666;margin-top:4px;">${t.formNumber}</div>` : ''}
</div>

<div class="doc-meta">
  <div><span class="doc-field">${t.fields.policeStation}:</span> ${caseData.policeStation}</div>
  <div><span class="doc-field">${t.fields.firNumber}:</span> ${caseData.firNumber}</div>
  <div><span class="doc-field">${t.fields.dateOfInfo}:</span> ${caseData.incident.date}</div>
</div>

<div class="doc-section">
  <div class="doc-section-title">${t.fields.offenseSections}</div>
  <p>${sectionsShort || 'As per investigation'}</p>
</div>

<div class="doc-section">
  <div class="doc-section-title">${t.sections.incidentDetails}</div>
  <dl class="doc-fields">
    <dt>${t.fields.incidentDate} & ${t.fields.incidentTime}:</dt><dd>${caseData.incident.date} at ${caseData.incident.time}</dd>
    <dt>${t.fields.incidentPlace}:</dt><dd>${caseData.incident.location}</dd>
  </dl>
</div>

<div class="doc-section">
  <div class="doc-section-title">${t.sections.complainantDetails}</div>
  <dl class="doc-fields">
    <dt>${t.fields.victimName}:</dt><dd>${caseData.victim.name}</dd>
    <dt>${t.fields.victimFather}:</dt><dd>${caseData.victim.fatherName || 'Not Available'}</dd>
    <dt>${t.fields.victimAddress}:</dt><dd>${caseData.victim.address}</dd>
    <dt>${t.fields.victimMobile}:</dt><dd>${caseData.victim.mobile}</dd>
  </dl>
</div>

<div class="doc-section">
  <div class="doc-section-title">${t.sections.accusedDetails}</div>
  <dl class="doc-fields">
    <dt>${t.fields.accusedName}:</dt><dd>${caseData.accused.name || 'Unknown'}</dd>
    <dt>${t.fields.accusedFather}:</dt><dd>${caseData.accused.fatherName || 'Not Available'}</dd>
    <dt>${t.fields.accusedAddress}:</dt><dd>${caseData.accused.address || 'Unknown / Under Investigation'}</dd>
  </dl>
</div>

<div class="doc-section">
  <div class="doc-section-title">${t.sections.complaintNarrative}</div>
  <div class="doc-narrative">${caseData.incident.narrative}</div>
</div>

<div class="doc-section">
  <div class="doc-section-title">${t.sections.actionTaken}</div>
  <ol class="doc-numbered">
    <li>Registered the case and commenced investigation.</li>
    <li>Visited the place of occurrence and prepared spot panchanama.</li>
    <li>Collected and preserved evidence with SHA-256 integrity verification.</li>
    <li>Commenced search for the accused.</li>
    <li>Witnesses identified and statements to be recorded under Section 180 BNSS.</li>
  </ol>
</div>

<div class="doc-section">
  <div class="doc-section-title">${t.sections.declaration}</div>
  <ol class="doc-numbered">
    ${t.declarations.map(d => `<li>${d}</li>`).join('')}
  </ol>
</div>

<div class="doc-section">
  <div class="doc-section-title">${t.fields.investigatingOfficer}</div>
  <dl class="doc-fields">
    <dt>${t.fields.investigatingOfficer}:</dt><dd>${caseData.assignedOfficer}</dd>
    <dt>${t.fields.policeStation}:</dt><dd>${caseData.policeStation}</dd>
    <dt>${t.labels.date}:</dt><dd>${today}</dd>
  </dl>
</div>

<div class="doc-signatures">
  ${t.footers.map(f => `<div class="doc-sig-block"><div class="doc-sig-line">${f}</div></div>`).join('')}
</div>

<div style="margin-top:24px;padding:16px;background:#f1f5f9;border:1px solid #cbd5e1;border-radius:8px;">
  <strong>${t.fields.policeStation} ${t.labels.description}:</strong><br><br>
  [Official Stamp]<br><br>
  ${t.labels.date}: ${today}
</div>

<div class="doc-note">${t.title} - ${t.subtitle}</div>
`;
}

// Placeholder functions for other document types
// (Will be filled in subsequent operations)
function generateRemandRequest(
  caseData: CaseRecord,
  today: string,
  sectionsShort: string,
  t: DocFieldTranslations,
  _language: 'en' | 'gu' | 'hi' = 'en',
  _legalT?: LegalSectionTranslations
): string {
  const arrestDate = caseData.diaryEntries?.find(e => e.action.toLowerCase().includes('arrest'))?.timestamp;
  const arrestDateFormatted = arrestDate ? new Date(arrestDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' }) : today;
  
  return `
<div class="doc-header">
  <div class="doc-emblem">Government of Gujarat &bull; Gujarat Police</div>
  <div class="doc-title">${t.title}</div>
  <div class="doc-subtitle">(${t.subtitle})</div>
</div>

<div class="doc-meta">
  <div><span class="doc-field">${t.labels.to || 'To'},</span></div>
  <div><span class="doc-field">${t.labels.judicialMagistrate || 'The Judicial Magistrate First Class'},</span></div>
  <div><span class="doc-field">${caseData.policeStation.includes('/') ? caseData.policeStation.split('/')[0] : 'Ahmedabad'}, Gujarat</span></div>
</div>

<div class="doc-meta" style="margin-top:20px;">
  <div><span class="doc-field">${t.fields.firNumber}:</span> ${caseData.firNumber}</div>
  <div><span class="doc-field">${t.fields.caseNumber}:</span> ${caseData.caseNumber}</div>
  <div><span class="doc-field">${t.fields.policeStation}:</span> ${caseData.policeStation}</div>
  <div><span class="doc-field">${t.labels.date}:</span> ${today}</div>
</div>

<div class="doc-section">
  <div class="doc-section-title">${t.sections.accusedDetails || '1. Accused Details'}</div>
  <dl class="doc-fields">
    <dt>${t.fields.accusedName}:</dt><dd>${caseData.accused.name}</dd>
    <dt>${t.fields.accusedAddress}:</dt><dd>${caseData.accused.address || 'Not Available'}</dd>
    <dt>${t.fields.accusedMobile || 'Mobile'}:</dt><dd>${caseData.accused.mobile || 'N/A'}</dd>
  </dl>
</div>

<div class="doc-section">
  <div class="doc-section-title">${t.sections.arrestDetails || '2. Arrest Information'}</div>
  <dl class="doc-fields">
    <dt>${t.fields.arrestDate}:</dt><dd>${arrestDateFormatted}</dd>
    <dt>${t.fields.arrestTime || 'Time of Arrest'}:</dt><dd>${arrestDate ? new Date(arrestDate).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : 'Not Recorded'}</dd>
    <dt>${t.fields.arrestPlace || 'Place of Arrest'}:</dt><dd>${caseData.incident.location || 'Not Specified'}</dd>
  </dl>
</div>

<div class="doc-section">
  <div class="doc-section-title">${t.sections.offenseDetails || '3. Offence Details'}</div>
  <dl class="doc-fields">
    <dt>${t.labels.crimeType || 'Crime Type'}:</dt><dd>${caseData.crimeType}</dd>
    <dt>${t.fields.offenseSections}:</dt><dd>${sectionsShort || 'As per FIR'}</dd>
    <dt>${t.labels.natureOfOffence || 'Nature of Offence'}:</dt><dd>${caseData.classification === 'confidential' ? 'Serious/Cognizable' : 'Cognizable'}</dd>
  </dl>
</div>

<div class="doc-section">
  <div class="doc-section-title">${t.sections.reasonsForRemand || '4. Reason for Remand Request'}</div>
  <p>${t.labels.respectfully || 'Respectfully'} ${t.labels.submitted || 'Submitted'},</p>
  <p>${(t.sections.remandNarrative || 'The accused named above has been arrested in connection with FIR No. {firNumber} registered at {policeStation} for the offences mentioned above.').replace('{firNumber}', caseData.firNumber).replace('{policeStation}', caseData.policeStation)}</p>
  <p>${t.sections.investigationPending || 'The investigation is still in progress and cannot be completed within 24 hours of arrest. The following investigative actions are pending:'}</p>
  <ol class="doc-numbered">
    <li>${t.sections.pendingActions?.[0] || 'Recording of statements of witnesses under Section 180 BNSS'}</li>
    <li>${t.sections.pendingActions?.[1] || 'Collection and forensic analysis of digital evidence'}</li>
    <li>${t.sections.pendingActions?.[2] || 'Verification of financial transactions and bank records'}</li>
    <li>${t.sections.pendingActions?.[3] || 'Cross-verification of alibi and timeline of events'}</li>
    <li>${t.sections.pendingActions?.[4] || 'Recovery of additional evidence/property'}</li>
  </ol>
</div>

<div class="doc-section">
  <div class="doc-section-title">${t.sections.custodyRequested || '5. Custody Requested'}</div>
  <dl class="doc-fields">
    <dt>${t.labels.typeOfCustody || 'Type of Custody'}:</dt><dd>${t.labels.policeRemand || 'Police Remand'}</dd>
    <dt>${t.labels.periodRequested || 'Period Requested'}:</dt><dd>7 ${t.labels.days || 'days'} ${t.labels.from || 'from'} ${arrestDateFormatted}</dd>
    <dt>${t.labels.purpose || 'Purpose'}:</dt><dd>${t.labels.investigationPurpose || 'Thorough investigation, evidence collection, and witness examination'}</dd>
  </dl>
</div>

<div class="doc-section">
  <div class="doc-section-title">${t.labels.prayer || '7. Prayer'}</div>
  <p>${t.labels.prayerIntro || 'In view of the above, it is most respectfully prayed that this Hon\'ble Court may be pleased to:'}</p>
  <ol class="doc-numbered">
    <li>${t.labels.prayerItem1 || 'Authorize detention of the accused in police custody for a period of 7 days'}</li>
    <li>${t.labels.prayerItem2 || 'Permit the investigating officer to interrogate the accused for collection of evidence'}</li>
    <li>${t.labels.prayerItem3 || 'Pass such other orders as this Hon\'ble Court may deem fit in the interest of justice'}</li>
  </ol>
</div>

<div class="doc-section">
  <div class="doc-section-title">${t.fields.investigatingOfficer}</div>
  <dl class="doc-fields">
    <dt>${t.fields.investigatingOfficer}:</dt><dd>${caseData.assignedOfficer}</dd>
    <dt>${t.fields.policeStation}:</dt><dd>${caseData.policeStation}</dd>
    <dt>${t.labels.date}:</dt><dd>${today}</dd>
  </dl>
</div>

<div class="doc-signatures">
  ${t.footers.map(f => `<div class="doc-sig-block"><div class="doc-sig-line">${f}</div></div>`).join('')}
</div>

<div class="doc-footer">
  <strong>${t.labels.enclosures || 'Enclosures'}:</strong><br>
  1. ${t.labels.copyOfFIR || 'Copy of FIR'}<br>
  2. ${t.labels.caseDiaryExtract || 'Case Diary extract'}<br>
  3. ${t.labels.arrestMemo || 'Arrest memo'}<br>
  4. ${t.labels.initialEvidence || 'Initial evidence collected'}
</div>
`;
}
function generateChargesheet(
  caseData: CaseRecord,
  today: string,
  sections: string,
  sectionsShort: string,
  t: DocFieldTranslations,
  _language: 'en' | 'gu' | 'hi' = 'en',
  _legalT?: LegalSectionTranslations
): string {
  const evidenceList = caseData.evidenceIds?.length > 0 
    ? caseData.evidenceIds.map((id, idx) => {
        const ev = { id, fileName: `Evidence File ${idx + 1}`, fileType: 'document', sha256Hash: 'SHA256-PENDING' }; // Placeholder - real data from evidence store
        return `<li><strong>${ev.fileName}</strong> (${ev.fileType}) — Hash: <code style="font-size:10px;">${ev.sha256Hash.substring(0, 16)}...</code></li>`;
      }).join('')
    : '<li>Evidence files to be annexed during investigation</li>';

  return `
<div class="doc-header">
  <div class="doc-emblem">Government of Gujarat &bull; Gujarat Police</div>
  <div class="doc-title">${t.title}</div>
  <div class="doc-subtitle">(${t.subtitle})</div>
</div>

<div class="doc-meta">
  <div><span class="doc-label">${t.labels.to || 'To'},</span></div>
  <div><span class="doc-label">${t.labels.chiefJudicialMagistrate || 'The Chief Judicial Magistrate,'}</span></div>
  <div><span class="doc-label">${caseData.policeStation.includes('/') ? caseData.policeStation.split('/')[0] : 'Ahmedabad'}, Gujarat</span></div>
</div>

<div class="doc-meta" style="margin-top:20px;">
  <div><span class="doc-field">${t.fields.firNumber}:</span> ${caseData.firNumber}</div>
  <div><span class="doc-field">${t.fields.caseNumber}:</span> ${caseData.caseNumber}</div>
  <div><span class="doc-field">${t.fields.policeStation}:</span> ${caseData.policeStation}</div>
  <div><span class="doc-field">${t.fields.dateOfReport}:</span> ${today}</div>
  <div><span class="doc-field">${t.fields.underSections}:</span> ${sectionsShort || 'As per investigation'}</div>
</div>

<div class="doc-section">
  <div class="doc-section-title">${t.sections.accusedParticulars || '1. Accused Particulars'}</div>
  <dl class="doc-fields">
    <dt>${t.fields.accusedName}:</dt><dd>${caseData.accused.name}</dd>
    <dt>${t.fields.fathersName || 'Father\'s Name'}:</dt><dd>${caseData.accused.fatherName || 'Not Available'}</dd>
    <dt>${t.fields.address}:</dt><dd>${caseData.accused.address || 'Not Available'}</dd>
    <dt>${t.fields.age || 'Age'}:</dt><dd>${caseData.accused.age || 'Not Recorded'}</dd>
    <dt>${t.fields.gender || 'Gender'}:</dt><dd>${caseData.accused.gender || 'Not Recorded'}</dd>
    <dt>${t.fields.mobile || 'Mobile'}:</dt><dd>${caseData.accused.mobile || 'N/A'}</dd>
  </dl>
</div>

<div class="doc-section">
  <div class="doc-section-title">${t.sections.victimParticulars || '2. Complainant/Victim Particulars'}</div>
  <dl class="doc-fields">
    <dt>${t.fields.victimName || 'Name'}:</dt><dd>${caseData.victim.name}</dd>
    <dt>${t.fields.address}:</dt><dd>${caseData.victim.address}</dd>
    <dt>${t.fields.mobile || 'Mobile'}:</dt><dd>${caseData.victim.mobile}</dd>
    <dt>${t.fields.email || 'Email'}:</dt><dd>${caseData.victim.email || 'N/A'}</dd>
  </dl>
</div>

<div class="doc-section">
  <div class="doc-section-title">${t.sections.briefFacts || '3. Brief Facts of the Case'}</div>
  <div class="doc-narrative">${caseData.incident.narrative}</div>
  <dl class="doc-fields" style="margin-top:12px;">
    <dt>${t.fields.dateOfIncident || 'Date of Incident'}:</dt><dd>${caseData.incident.date}</dd>
    <dt>${t.fields.timeOfIncident || 'Time of Incident'}:</dt><dd>${caseData.incident.time}</dd>
    <dt>${t.fields.placeOfOccurrence || 'Place of Occurrence'}:</dt><dd>${caseData.incident.location}</dd>
    <dt>${t.fields.crimeType || 'Crime Type'}:</dt><dd>${caseData.crimeType}</dd>
  </dl>
</div>

<div class="doc-section">
  <div class="doc-section-title">${t.sections.legalSections || '4. Legal Sections Applied'}</div>
  <p>${sections || sectionsShort || 'As per investigation findings'}</p>
</div>

<div class="doc-section">
  <div class="doc-section-title">${t.sections.investigationSummary || '5. Investigation Summary'}</div>
  <p>${t.fields.investigationSummaryIntro || 'The investigation was carried out by the undersigned and the following steps were taken:'}</p>
  <ol class="doc-numbered">
    <li>${t.fields.visitedPlace || 'Visited the place of occurrence and prepared spot panchanama'}</li>
    <li>${t.fields.recordedStatements || 'Recorded statements of witnesses under Section 180 BNSS'}</li>
    <li>${t.fields.collectedEvidence || 'Collected and preserved physical and digital evidence'}</li>
    <li>${t.fields.forensicExam || 'Obtained forensic examination reports where applicable'}</li>
    <li>${t.fields.verifiedTrails || 'Verified financial trails and documentary evidence'}</li>
    <li>${t.fields.arrestedAccused || 'Arrested the accused and completed interrogation'}</li>
  </ol>
</div>

<div class="doc-section">
  <div class="doc-section-title">${t.sections.evidenceCollected || '6. Evidence Collected'}</div>
  <ul class="doc-numbered">
    ${evidenceList}
  </ul>
  <p style="margin-top:8px;font-size:11px;color:#666;"><em>${t.fields.evidenceHashNote || 'All evidence items have been preserved with SHA-256 integrity verification and chain of custody maintained.'}</em></p>
</div>

<div class="doc-section">
  <div class="doc-section-title">${t.sections.witnessStatements || '7. Witness Statements'}</div>
  <p>${t.fields.witnessStatementsIntro || 'Statements of the following witnesses have been recorded under Section 180 BNSS:'}</p>
  <ol class="doc-numbered">
    <li>${caseData.victim.name} (${t.labels.victim || 'Victim'}/${t.labels.complainant || 'Complainant'})</li>
    <li>${t.fields.witnessesAsPerDiary || 'Witnesses as per case diary entries'}</li>
  </ol>
  <p style="margin-top:8px;">${t.fields.witnessStatementsNote || 'All witness statements are recorded in the Case Diary and are available for court examination.'}</p>
</div>

<div class="doc-section">
  <div class="doc-section-title">${t.sections.conclusion || '8. Conclusion & Recommendations'}</div>
  <p>${t.fields.conclusionText || 'Based on the evidence collected and investigation carried out, there are sufficient grounds to proceed against the accused for the offences mentioned above.'}</p>
  <p><strong>${t.labels.recommendation || 'Recommendation:'}</strong> ${t.fields.recommendationText || 'The case be taken up for trial and the accused be summoned to face trial under the applicable sections.'}</p>
</div>

<div class="doc-section">
  <div class="doc-section-title">${t.sections.ioDetails || '9. Investigation Officer Details'}</div>
  <dl class="doc-fields">
    <dt>${t.fields.ioName || 'Name'}:</dt><dd>${caseData.assignedOfficer}</dd>
    <dt>${t.fields.designation || 'Designation'}:</dt><dd>${t.labels.investigationOfficer || 'Investigation Officer'}</dt>
    <dt>${t.fields.policeStation}:</dt><dd>${caseData.policeStation}</dd>
    <dt>${t.fields.badgeNo || 'Badge No.'}:</dt><dd>GP-4521</dd>
    <dt>${t.fields.dateOfSubmission || 'Date of Submission'}:</dt><dd>${today}</dd>
    <dt>${t.fields.place || 'Place'}:</dt><dd>${caseData.policeStation.includes('/') ? caseData.policeStation.split('/')[0] : 'Ahmedabad'}, Gujarat</dd>
  </dl>
</div>

<div class="doc-signatures">
  <div class="doc-sig-block"><div class="doc-sig-line">${t.labels.signatureIO || 'Signature of Investigation Officer'}</div></div>
</div>

<div class="doc-footer">
  <strong>${t.labels.enclosures || 'Enclosures:'}</strong><br>
  1. ${t.labels.originalFIR || 'Original FIR'}<br>
  2. ${t.labels.caseDiary || 'Case Diary'}<br>
  3. ${t.labels.evidenceItems || 'Evidence items (as listed above)'}<br>
  4. ${t.labels.witnessStatementsEnc || 'Witness statements'}<br>
  5. ${t.labels.forensicReports || 'Forensic reports (if any)'}<br>
  6. ${t.labels.panchanamaDocs || 'Panchanama documents'}
</div>

<div class="doc-note">${t.fields.submissionNote || 'Submitted for taking cognizance and proceeding with trial as per law.'}</div>
`;
}
function generatePurvaniChargesheet(
  caseData: CaseRecord,
  today: string,
  sections: string,
  sectionsShort: string,
  t: DocFieldTranslations,
  _language: 'en' | 'gu' | 'hi' = 'en'
): string {
  return `
<div class="doc-header">
  <div class="doc-emblem">Government of Gujarat &bull; Gujarat Police</div>
  <div class="doc-title">${t.title}</div>
  <div class="doc-subtitle">(${t.subtitle})</div>
</div>

<div class="doc-meta">
  <div><span class="doc-field">${t.labels.to || 'To'},</span></div>
  <div><span class="doc-field">${t.labels.judicialMagistrate || 'The Judicial Magistrate First Class,'}</span></div>
  <div><span class="doc-field">${caseData.policeStation.includes('/') ? caseData.policeStation.split('/')[0] : 'Ahmedabad'}, Gujarat</span></div>
</div>

<div class="doc-meta" style="margin-top:20px;">
  <div><span class="doc-field">${t.fields.firNumber}:</span> ${caseData.firNumber}</div>
  <div><span class="doc-field">${t.fields.caseNumber}:</span> ${caseData.caseNumber}</div>
  <div><span class="doc-field">${t.fields.policeStation}:</span> ${caseData.policeStation}</div>
  <div><span class="doc-field">${t.fields.dateOfReport || 'Date of Report'}:</span> ${caseData.incident.date}</div>
  <div><span class="doc-field">${t.fields.timeOfReport || 'Time of Report'}:</span> ${caseData.incident.time}</div>
</div>

<div class="doc-section">
  <div class="doc-section-title">${t.sections.informationReceived || '1. Information Received'}</div>
  <p>${t.fields.informationReceivedDesc || 'Information was received at this police station regarding commission of a cognizable offence as detailed below:'}</p>
  <dl class="doc-fields">
    <dt>${t.fields.informantVictim || 'Informant/Victim'}:</dt><dd>${caseData.victim.name}</dd>
    <dt>${t.fields.dateTimeInfo || 'Date & Time of Information'}:</dt><dd>${caseData.incident.date} at ${caseData.incident.time}</dd>
    <dt>${t.fields.placeOfOccurrence || 'Place of Occurrence'}:</dt><dd>${caseData.incident.location}</dd>
  </dl>
</div>

<div class="doc-section">
  <div class="doc-section-title">${t.sections.briefDescription || '2. Brief Description of Offence'}</div>
  <div class="doc-narrative">${caseData.incident.narrative.substring(0, 500)}${caseData.incident.narrative.length > 500 ? '...' : ''}</div>
</div>

<div class="doc-section">
  <div class="doc-section-title">${t.sections.legalSectionsPreliminary || '3. Legal Sections (Preliminary)'}</div>
  <p>${sectionsShort || 'To be finalized upon detailed investigation'}</p>
  <p style="margin-top:8px;font-size:12px;color:#666;"><em>${t.fields.legalSectionsNote || 'These sections are based on preliminary information and may be modified during investigation.'}</em></p>
</div>

<div class="doc-section">
  <div class="doc-section-title">${t.sections.accusedDetails || '4. Accused Details (If Known)'}</div>
  <dl class="doc-fields">
    <dt>${t.fields.accusedName || 'Name'}:</dt><dd>${caseData.accused.name || 'To be identified'}</dd>
    <dt>${t.fields.address || 'Address'}:</dt><dd>${caseData.accused.address || 'Under investigation'}</dd>
    <dt>${t.fields.status || 'Status'}:</dt><dd>${caseData.accused.name !== 'Unknown' ? 'Identified' : 'To be identified during investigation'}</dd>
  </dl>
</div>

<div class="doc-section">
  <div class="doc-section-title">${t.sections.actionTaken || '5. Action Taken So Far'}</div>
  <ol class="doc-numbered">
    <li>${t.fields.firRegistered || 'FIR registered under applicable sections'}</li>
    <li>${t.fields.investigationCommenced || 'Investigation commenced immediately'}</li>
    <li>${t.fields.placeVisited || 'Place of occurrence visited'}</li>
    <li>${t.fields.evidenceCollectionInit || 'Initial evidence collection initiated'}</li>
    <li>${t.fields.witnessIdentification || 'Witness identification in progress'}</li>
  </ol>
</div>

<div class="doc-section">
  <div class="doc-section-title">${t.sections.investigationStatus || '6. Investigation Status'}</div>
  <p>${t.fields.investigationStatusDesc || 'Investigation is currently in progress. This preliminary report is being submitted within 24 hours of receiving information as required under Section 176 BNSS.'}</p>
  <p>${t.fields.detailedChargesheetNote || 'A detailed chargesheet will be submitted upon completion of investigation under Section 193 BNSS.'}</p>
</div>

<div class="doc-section">
  <div class="doc-section-title">${t.sections.officerReporting || '7. Officer Reporting'}</div>
  <dl class="doc-fields">
    <dt>${t.fields.ioName || 'Name'}:</dt><dd>${caseData.assignedOfficer}</dd>
    <dt>${t.fields.designation || 'Designation'}:</dt><dd>${t.labels.officerInCharge || 'Officer In-Charge'}</dd>
    <dt>${t.fields.policeStation}:</dt><dd>${caseData.policeStation}</dd>
    <dt>${t.fields.date || 'Date'}:</dt><dd>${today}</dd>
    <dt>${t.fields.place || 'Place'}:</dt><dd>${caseData.policeStation.includes('/') ? caseData.policeStation.split('/')[0] : 'Ahmedabad'}, Gujarat</dd>
  </dl>
</div>

<div class="doc-signatures">
  <div class="doc-sig-block"><div class="doc-sig-line">${t.labels.signatureOIC || 'Signature of Officer In-Charge'}</div></div>
</div>

<div class="doc-footer">
  <strong>${t.labels.copyForwarded || 'Copy forwarded to:'}</strong><br>
  1. ${t.labels.superintendentPolice || 'Superintendent of Police for information'}<br>
  2. ${t.labels.caseFile || 'Case file'}
</div>

<div class="doc-note">${t.fields.preliminaryReportNote || 'This is a preliminary intimation report as required under Section 176 BNSS. Detailed investigation report will follow.'}</div>
`;
}
function generateSeizureReceipt(
  caseData: CaseRecord,
  today: string,
  t: DocFieldTranslations,
  _language: 'en' | 'gu' | 'hi' = 'en'
): string {
  return `
<div class="doc-header">
  <div class="doc-emblem">Government of Gujarat &bull; Gujarat Police</div>
  <div class="doc-title">${t.title}</div>
  <div class="doc-subtitle">(${t.subtitle})</div>
</div>

<div class="doc-meta">
  <div><span class="doc-field">${t.fields.firNumber}:</span> ${caseData.firNumber}</div>
  <div><span class="doc-field">${t.fields.caseNumber}:</span> ${caseData.caseNumber}</div>
  <div><span class="doc-field">${t.fields.policeStation}:</span> ${caseData.policeStation}</div>
  <div><span class="doc-field">${t.fields.dateOfSeizure || 'Date of Seizure'}:</span> ${caseData.incident.date}</div>
  <div><span class="doc-field">${t.fields.timeOfSeizure || 'Time of Seizure'}:</span> ${caseData.incident.time}</div>
  <div><span class="doc-field">${t.fields.placeOfSeizure || 'Place of Seizure'}:</span> ${caseData.incident.location}</div>
</div>

<div class="doc-section">
  <div class="doc-section-title">${t.sections.seizureDetails || '1. Seizure Details'}</div>
  <dl class="doc-fields">
    <dt>${t.fields.seizedFrom || 'Seized From'}:</dt><dd>${caseData.accused.name || 'Accused / Premises'}</dd>
    <dt>${t.fields.address || 'Address'}:</dt><dd>${caseData.accused.address || caseData.incident.location}</dd>
    <dt>${t.fields.seizureBy || 'Seizure Conducted By'}:</dt><dd>${caseData.assignedOfficer}</dd>
  </dl>
</div>

<div class="doc-section">
  <div class="doc-section-title">${t.sections.panchWitnesses || '2. Panch Witnesses Present'}</div>
  <p>${t.fields.panchWitnessesDesc || 'The following panch witnesses were present during the seizure:'}</p>
  <dl class="doc-fields">
    <dt>${t.fields.panchWitness1 || 'Panch Witness 1'}:</dt><dd>${t.fields.panchWitness1Placeholder || 'Name: _________________ Address: _________________'}</dd>
    <dt>${t.fields.panchWitness2 || 'Panch Witness 2'}:</dt><dd>${t.fields.panchWitness2Placeholder || 'Name: _________________ Address: _________________'}</dd>
  </dl>
</div>

<div class="doc-section">
  <div class="doc-section-title">${t.sections.seizedItems || '3. List of Seized Items'}</div>
  <table style="width:100%;border-collapse:collapse;margin-top:12px;font-size:12px;">
    <thead>
      <tr style="background:#f1f5f9;">
        <th style="border:1px solid #cbd5e1;padding:8px;text-align:left;">${t.fields.srNo || 'Sr. No.'}</th>
        <th style="border:1px solid #cbd5e1;padding:8px;text-align:left;">${t.fields.itemDescription || 'Description of Item'}</th>
        <th style="border:1px solid #cbd5e1;padding:8px;text-align:left;">${t.fields.quantity || 'Quantity'}</th>
        <th style="border:1px solid #cbd5e1;padding:8px;text-align:left;">${t.fields.condition || 'Condition'}</th>
        <th style="border:1px solid #cbd5e1;padding:8px;text-align:left;">${t.fields.marksIdentification || 'Marks/Identification'}</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td style="border:1px solid #cbd5e1;padding:8px;">1</td>
        <td style="border:1px solid #cbd5e1;padding:8px;">[${t.fields.itemDescPlaceholder || 'Item description to be filled'}]</td>
        <td style="border:1px solid #cbd5e1;padding:8px;">[${t.fields.qty || 'Qty'}]</td>
        <td style="border:1px solid #cbd5e1;padding:8px;">[${t.fields.goodDamaged || 'Good/Damaged'}]</td>
        <td style="border:1px solid #cbd5e1;padding:8px;">[${t.fields.idMarks || 'Identification marks'}]</td>
      </tr>
      <tr>
        <td style="border:1px solid #cbd5e1;padding:8px;">2</td>
        <td style="border:1px solid #cbd5e1;padding:8px;">[${t.fields.itemDescPlaceholder || 'Item description to be filled'}]</td>
        <td style="border:1px solid #cbd5e1;padding:8px;">[${t.fields.qty || 'Qty'}]</td>
        <td style="border:1px solid #cbd5e1;padding:8px;">[${t.fields.goodDamaged || 'Good/Damaged'}]</td>
        <td style="border:1px solid #cbd5e1;padding:8px;">[${t.fields.idMarks || 'Identification marks'}]</td>
      </tr>
      <tr>
        <td style="border:1px solid #cbd5e1;padding:8px;">3</td>
        <td style="border:1px solid #cbd5e1;padding:8px;">[${t.fields.itemDescPlaceholder || 'Item description to be filled'}]</td>
        <td style="border:1px solid #cbd5e1;padding:8px;">[${t.fields.qty || 'Qty'}]</td>
        <td style="border:1px solid #cbd5e1;padding:8px;">[${t.fields.goodDamaged || 'Good/Damaged'}]</td>
        <td style="border:1px solid #cbd5e1;padding:8px;">[${t.fields.idMarks || 'Identification marks'}]</td>
      </tr>
    </tbody>
  </table>
  <p style="margin-top:8px;font-size:11px;color:#666;"><em>${t.fields.seizedItemsNote || 'Note: Complete list of seized items with SHA-256 hashes for digital evidence is maintained in evidence register.'}</em></p>
</div>

<div class="doc-section">
  <div class="doc-section-title">${t.sections.digitalEvidence || '4. Digital Evidence (If Any)'}</div>
  <p>${t.fields.digitalEvidenceDesc || 'The following digital devices/items were seized and their SHA-256 hashes have been computed for integrity verification:'}</p>
  <ul class="doc-numbered">
    ${caseData.evidenceIds && caseData.evidenceIds.length > 0 
      ? caseData.evidenceIds.map((_, idx) => `<li>${t.fields.digitalEvidenceItem || 'Digital Evidence'} #${idx + 1}: ${t.fields.hashComputed || 'Hash computed and recorded in evidence log'}</li>`).join('')
      : `<li>${t.fields.digitalEvidencePlaceholder || 'Digital evidence items to be recorded with SHA-256 hashes'}</li>`}
  </ul>
</div>

<div class="doc-section">
  <div class="doc-section-title">${t.sections.chainOfCustody || '5. Chain of Custody'}</div>
  <p>${t.fields.chainOfCustodyDesc || 'All seized items have been sealed in the presence of panch witnesses and chain of custody has been initiated. Items will be stored in police malkhana (store room) until required for court proceedings.'}</p>
</div>

<div class="doc-section">
  <div class="doc-section-title">${t.sections.declaration || '6. Declaration'}</div>
  <p>${t.fields.declarationText || 'I hereby certify that the above list of seized items is correct and was prepared in the presence of the panch witnesses whose signatures are appended below.'}</p>
</div>

<div class="doc-signatures">
  <div class="doc-sig-block">
    <div class="doc-sig-line">${caseData.assignedOfficer}<br>${t.labels.investigationOfficer || 'Investigation Officer'}</div>
  </div>
  <div class="doc-sig-block">
    <div class="doc-sig-line">${t.labels.panchWitness1 || 'Panch Witness 1'}</div>
  </div>
  <div class="doc-sig-block">
    <div class="doc-sig-line">${t.labels.panchWitness2 || 'Panch Witness 2'}</div>
  </div>
  <div class="doc-sig-block">
    <div class="doc-sig-line">${t.labels.personSeized || 'Person from whom seized (if willing)'}</div>
  </div>
</div>

<div class="doc-footer">
  <strong>${t.labels.custodySeizedItems || 'Custody of Seized Items:'}</strong><br>
  ${t.fields.itemsDeposited || 'Items deposited in Police Malkhana on'} ${today}<br>
  ${t.fields.malkhanjiSignature || 'Malkhanji Signature: _________________'}
</div>

<div class="doc-note">${t.fields.receiptNote || 'This receipt has been issued to the person from whom the items were seized. A copy is retained in the case file.'}</div>
`;
}
function generateMedicalLetter(
  caseData: CaseRecord,
  today: string,
  sectionsShort: string,
  t: DocFieldTranslations,
  _language: 'en' | 'gu' | 'hi' = 'en'
): string {
  return `
<div class="doc-header">
  <div class="doc-emblem">Government of Gujarat &bull; Gujarat Police</div>
  <div class="doc-title">${t.title}</div>
  <div class="doc-subtitle">(${t.subtitle})</div>
</div>

<div class="doc-meta">
  <div><span class="doc-field">${t.labels.to || 'To'},</span></div>
  <div><span class="doc-field">${t.labels.medicalOfficer || 'The Medical Officer / Civil Surgeon,'}</span></div>
  <div><span class="doc-field">${t.labels.govtHospital || 'Government Hospital,'}</span></div>
  <div><span class="doc-field">${caseData.policeStation.includes('/') ? caseData.policeStation.split('/')[0] : 'Ahmedabad'}, Gujarat</span></div>
</div>

<div class="doc-meta" style="margin-top:20px;">
  <div><span class="doc-field">${t.fields.firNumber}:</span> ${caseData.firNumber}</div>
  <div><span class="doc-field">${t.fields.caseNumber}:</span> ${caseData.caseNumber}</div>
  <div><span class="doc-field">${t.fields.policeStation}:</span> ${caseData.policeStation}</div>
  <div><span class="doc-field">${t.fields.date || 'Date'}:</span> ${today}</div>
  <div><span class="doc-field">${t.fields.underSections || 'Under Sections'}:</span> ${sectionsShort || 'As per FIR'}</div>
</div>

<div class="doc-section">
  <div class="doc-section-title">${t.sections.patientDetails || '1. Patient Details'}</div>
  <dl class="doc-fields">
    <dt>${t.fields.patientName || 'Name'}:</dt><dd>${caseData.victim.name}</dd>
    <dt>${t.fields.age || 'Age'}:</dt><dd>${caseData.victim.age || 'Not Specified'}</dd>
    <dt>${t.fields.gender || 'Gender'}:</dt><dd>${caseData.victim.gender || 'Not Specified'}</dd>
    <dt>${t.fields.address || 'Address'}:</dt><dd>${caseData.victim.address}</dd>
    <dt>${t.fields.mobile || 'Mobile'}:</dt><dd>${caseData.victim.mobile}</dd>
    <dt>${t.fields.relationToCase || 'Relation to Case'}:</dt><dd>${t.labels.victimComplainant || 'Victim / Complainant'}</dd>
  </dl>
</div>

<div class="doc-section">
  <div class="doc-section-title">${t.sections.caseBackground || '2. Case Background'}</div>
  <p>${t.fields.caseBackgroundDesc || 'A case has been registered at this police station under the aforementioned FIR number for the offence of'} <strong>${caseData.crimeType}</strong>.</p>
  <p style="margin-top:8px;"><strong>${t.fields.briefIncident || 'Brief Incident:'}</strong></p>
  <div class="doc-narrative">${caseData.incident.narrative.substring(0, 300)}${caseData.incident.narrative.length > 300 ? '...' : ''}</div>
</div>

<div class="doc-section">
  <div class="doc-section-title">${t.sections.medicalExamRequested || '3. Medical Examination Requested'}</div>
  <p>${t.fields.medicalExamRequestedDesc || 'You are requested to conduct a thorough medical examination of the above-named person and provide a detailed medical report covering the following:'}</p>
  <ol class="doc-numbered">
    <li>${t.fields.generalPhysicalExam || 'General physical examination and vital signs'}</li>
    <li>${t.fields.documentationInjuries || 'Documentation of any injuries, marks, or signs of trauma'}</li>
    <li>${t.fields.photographicDoc || 'Photographic documentation of injuries (if any)'}</li>
    <li>${t.fields.ageVerification || 'Age verification (if age is in dispute)'}</li>
    <li>${t.fields.mentalHealthAssessment || 'Mental health assessment (if applicable)'}</li>
    <li>${t.fields.forensicSamples || 'Collection of forensic samples (blood, hair, etc.) if required'}</li>
    <li>${t.fields.otherFindings || 'Any other relevant medical findings'}</li>
  </ol>
</div>

<div class="doc-section">
  <div class="doc-section-title">${t.sections.urgency || '4. Urgency'}</div>
  <dl class="doc-fields">
    <dt>${t.fields.priority || 'Priority'}:</dt><dd style="color:#dc2626;font-weight:600;">${t.labels.urgent || 'URGENT'} — ${t.fields.urgentReason || 'Immediate examination requested'}</dd>
    <dt>${t.fields.reason || 'Reason'}:</dt><dd>${t.fields.urgencyReason || 'Medical evidence is crucial for investigation and may be time-sensitive'}</dd>
  </dl>
</div>

<div class="doc-section">
  <div class="doc-section-title">${t.sections.legalAuthority || '5. Legal Authority'}</div>
  <p>${t.fields.legalAuthorityDesc || 'This requisition is made under the powers vested in the police under the Bharatiya Nagarik Suraksha Sanhita, 2023 for the purpose of investigation and collection of evidence.'}</p>
  <p style="margin-top:8px;">${t.fields.medicalReportUse || 'The medical report will be used as evidence in the investigation and subsequent court proceedings.'}</p>
</div>

<div class="doc-section">
  <div class="doc-section-title">${t.sections.ioDetails || '6. Investigating Officer Details'}</div>
  <dl class="doc-fields">
    <dt>${t.fields.ioName || 'Name'}:</dt><dd>${caseData.assignedOfficer}</dd>
    <dt>${t.fields.designation || 'Designation'}:</dt><dd>${t.labels.investigationOfficer || 'Investigation Officer'}</dd>
    <dt>${t.fields.policeStation}:</dt><dd>${caseData.policeStation}</dd>
    <dt>${t.fields.badgeNo || 'Badge No.'}:</dt><dd>GP-4521</dd>
    <dt>${t.fields.mobile || 'Mobile'}:</dt><dd>[${t.fields.officerContact || 'Officer contact number'}]</dd>
    <dt>${t.fields.date || 'Date'}:</dt><dd>${today}</dd>
    <dt>${t.fields.place || 'Place'}:</dt><dd>${caseData.policeStation.includes('/') ? caseData.policeStation.split('/')[0] : 'Ahmedabad'}, Gujarat</dd>
  </dl>
</div>

<div class="doc-signatures">
  <div class="doc-sig-block">
    <div class="doc-sig-line">${caseData.assignedOfficer}<br>${t.labels.investigationOfficer || 'Investigation Officer'}</div>
  </div>
  <div class="doc-sig-block">
    <div class="doc-sig-line">${t.labels.medicalOfficerSignature || 'Medical Officer\'s Signature'}<br>(${t.fields.uponCompletion || 'Upon completion of examination'})</div>
  </div>
</div>

<div class="doc-footer">
  <strong>${t.labels.enclosures || 'Enclosures:'}</strong><br>
  1. ${t.labels.copyFIR || 'Copy of FIR'}<br>
  2. ${t.fields.patientIDProof || 'Patient\'s identity proof (if available)'}<br>
  3. ${t.fields.referralLetter || 'Referral letter from hospital (if any)'}
</div>

<div class="doc-note">${t.fields.medicalReportNote || 'The medical report should be submitted to the Investigating Officer at the earliest for incorporation in the investigation.'}</div>
`;
}
function generateCourtCustody(
  caseData: CaseRecord,
  today: string,
  sectionsShort: string,
  t: DocFieldTranslations,
  _language: 'en' | 'gu' | 'hi' = 'en'
): string {
  return `
<div class="doc-header">
  <div class="doc-emblem">Government of Gujarat &bull; Gujarat Police</div>
  <div class="doc-title">${t.title}</div>
  <div class="doc-subtitle">(${t.subtitle})</div>
</div>

<div class="doc-meta">
  <div><span class="doc-field">${t.labels.to || 'To'},</span></div>
  <div><span class="doc-field">${t.labels.judicialMagistrate || 'The Judicial Magistrate First Class,'}</span></div>
  <div><span class="doc-field">${caseData.policeStation.includes('/') ? caseData.policeStation.split('/')[0] : 'Ahmedabad'}, Gujarat</span></div>
</div>

<div class="doc-meta" style="margin-top:20px;">
  <div><span class="doc-field">${t.fields.firNumber}:</span> ${caseData.firNumber}</div>
  <div><span class="doc-field">${t.fields.caseNumber}:</span> ${caseData.caseNumber}</div>
  <div><span class="doc-field">${t.fields.policeStation}:</span> ${caseData.policeStation}</div>
  <div><span class="doc-field">${t.fields.date || 'Date'}:</span> ${today}</div>
  <div><span class="doc-field">${t.fields.underSections || 'Under Sections'}:</span> ${sectionsShort || 'As per FIR'}</div>
</div>

<div class="doc-section">
  <div class="doc-section-title">${t.sections.accusedParticulars || '1. Accused Particulars'}</div>
  <dl class="doc-fields">
    <dt>${t.fields.accusedName || 'Name'}:</dt><dd>${caseData.accused.name}</dd>
    <dt>${t.fields.fathersName || 'Father\'s Name'}:</dt><dd>${caseData.accused.fatherName || 'Not Available'}</dd>
    <dt>${t.fields.address || 'Address'}:</dt><dd>${caseData.accused.address || 'Not Available'}</dd>
    <dt>${t.fields.age || 'Age'}:</dt><dd>${caseData.accused.age || 'Not Recorded'}</dd>
    <dt>${t.fields.gender || 'Gender'}:</dt><dd>${caseData.accused.gender || 'Not Recorded'}</dd>
  </dl>
</div>

<div class="doc-section">
  <div class="doc-section-title">${t.sections.custodyStatus || '2. Current Custody Status'}</div>
  <dl class="doc-fields">
    <dt>${t.fields.dateOfArrest || 'Date of Arrest'}:</dt><dd>${caseData.incident.date}</dd>
    <dt>${t.fields.custodyType || 'Current Custody Type'}:</dt><dd>${t.labels.policeCustody || 'Police Custody'}</dd>
    <dt>${t.fields.custodyPeriod || 'Police Custody Period'}:</dt><dd>${t.fields.asPerPrevOrder || 'As per previous court order'}</dd>
    <dt>${t.fields.custodyEndsOn || 'Police Custody Ends On'}:</dt><dd>[${t.fields.dateToBeFilled || 'Date to be filled'}]</dd>
  </dl>
</div>

<div class="doc-section">
  <div class="doc-section-title">${t.sections.offenceDetails || '3. Offence Details'}</div>
  <dl class="doc-fields">
    <dt>${t.fields.crimeType || 'Crime Type'}:</dt><dd>${caseData.crimeType}</dd>
    <dt>${t.fields.legalSections || 'Legal Sections'}:</dt><dd>${sectionsShort || 'As per investigation'}</dd>
    <dt>${t.fields.natureOfOffence || 'Nature of Offence'}:</dt><dd>${caseData.classification === 'confidential' ? 'Serious/Cognizable' : 'Cognizable'}</dd>
  </dl>
</div>

<div class="doc-section">
  <div class="doc-section-title">${t.sections.custodyReason || '4. Reason for Judicial Custody Request'}</div>
  <p>${t.labels.respectedSirMadam || 'Respected Sir/Madam,'}</p>
  <p>${t.fields.custodyReasonDesc || 'The accused named above has been in police custody since'} ${caseData.incident.date} ${t.fields.forInterrogation || 'for interrogation and investigation purposes. The police custody period is expiring on'} [${t.fields.date || 'date'}].</p>
  <p style="margin-top:8px;">${t.fields.investigationStillProgress || 'The investigation is still in progress and the accused needs to be kept in custody for the following reasons:'}</p>
  <ol class="doc-numbered">
    <li>${t.fields.investigationPending || 'Further investigation and evidence collection pending'}</li>
    <li>${t.fields.riskTampering || 'Risk of accused tampering with evidence if released on bail'}</li>
    <li>${t.fields.influencingWitnesses || 'Possibility of accused influencing witnesses'}</li>
    <li>${t.fields.flightRisk || 'Flight risk - accused may abscond'}</li>
    <li>${t.fields.continuedInterrogation || 'Need for continued interrogation and verification of facts'}</li>
  </ol>
</div>

<div class="doc-section">
  <div class="doc-section-title">${t.sections.investigationProgress || '5. Investigation Progress'}</div>
  <p>${t.fields.investigativeActionsCompleted || 'The following investigative actions have been completed so far:'}</p>
  <ol class="doc-numbered">
    <li>${t.fields.firRegistered || 'FIR registered and investigation commenced'}</li>
    <li>${t.fields.placeVisitedPanch || 'Place of occurrence visited and panchanama prepared'}</li>
    <li>${t.fields.evidenceCollected || 'Initial evidence collected and preserved'}</li>
    <li>${t.fields.witnessStatementsRecorded || 'Witness statements recorded under Section 180 BNSS'}</li>
    <li>${t.fields.accusedArrested || 'Accused arrested and interrogated'}</li>
  </ol>
  <p style="margin-top:8px;"><strong>${t.labels.pendingActions || 'Pending Actions:'}</strong></p>
  <ol class="doc-numbered">
    <li>${t.fields.forensicAnalysis || 'Forensic analysis of evidence'}</li>
    <li>${t.fields.verificationFinancial || 'Verification of financial transactions'}</li>
    <li>${t.fields.crossExaminationAlibi || 'Cross-examination of alibi'}</li>
    <li>${t.fields.additionalDocEvidence || 'Collection of additional documentary evidence'}</li>
  </ol>
</div>

<div class="doc-section">
  <div class="doc-section-title">${t.sections.prayer || '6. Prayer'}</div>
  <p>${t.fields.prayerIntro || 'In view of the above, it is most respectfully prayed that this Hon\'ble Court may be pleased to:'}</p>
  <ol class="doc-numbered">
    <li>${t.fields.remandJudicialCustody || 'Remand the accused to judicial custody for a period of [15/30/60] days'}</li>
    <li>${t.fields.accusedProduced || 'Ensure the accused is produced before this Hon\'ble Court as required by law'}</li>
    <li>${t.fields.otherOrders || 'Pass such other orders as this Hon\'ble Court may deem fit in the interest of justice'}</li>
  </ol>
</div>

<div class="doc-section">
  <div class="doc-section-title">${t.sections.ioDetails || '7. Investigation Officer Details'}</div>
  <dl class="doc-fields">
    <dt>${t.fields.ioName || 'Name'}:</dt><dd>${caseData.assignedOfficer}</dd>
    <dt>${t.fields.designation || 'Designation'}:</dt><dd>${t.labels.investigationOfficer || 'Investigation Officer'}</dd>
    <dt>${t.fields.policeStation}:</dt><dd>${caseData.policeStation}</dd>
    <dt>${t.fields.badgeNo || 'Badge No.'}:</dt><dd>GP-4521</dd>
    <dt>${t.fields.date || 'Date'}:</dt><dd>${today}</dd>
    <dt>${t.fields.place || 'Place'}:</dt><dd>${caseData.policeStation.includes('/') ? caseData.policeStation.split('/')[0] : 'Ahmedabad'}, Gujarat</dd>
  </dl>
</div>

<div class="doc-signatures">
  <div class="doc-sig-block"><div class="doc-sig-line">${t.labels.signatureIO || 'Signature of Investigation Officer'}</div></div>
</div>

<div class="doc-footer">
  <strong>${t.labels.enclosures || 'Enclosures:'}</strong><br>
  1. ${t.labels.copyFIR || 'Copy of FIR'}<br>
  2. ${t.fields.caseDiaryExtract || 'Case Diary extract'}<br>
  3. ${t.fields.prevRemandOrders || 'Previous remand orders'}<br>
  4. ${t.fields.arrestMemo || 'Arrest memo'}
</div>
`;
}
function generatePanchanama(
  caseData: CaseRecord,
  today: string,
  t: DocFieldTranslations,
  _language: 'en' | 'gu' | 'hi' = 'en'
): string {
  return `
<div class="doc-header">
  <div class="doc-emblem">Government of Gujarat &bull; Gujarat Police</div>
  <div class="doc-title">Panchanama (Search/Seizure Memo)</div>
  <div class="doc-subtitle">(Under Section 96-97 of Bharatiya Nagarik Suraksha Sanhita, 2023)</div>
</div>

<div class="doc-meta">
  <div><span class="doc-field">FIR No.:</span> ${caseData.firNumber}</div>
  <div><span class="doc-field">Case No.:</span> ${caseData.caseNumber}</div>
  <div><span class="doc-field">Police Station:</span> ${caseData.policeStation}</div>
</div>

<div class="doc-meta" style="margin-top:20px;">
  <div><span class="doc-field">Date of Panchanama:</span> ${caseData.incident.date}</div>
  <div><span class="doc-field">Time of Commencement:</span> ${caseData.incident.time}</div>
  <div><span class="doc-field">Time of Completion:</span> [Time to be recorded]</div>
  <div><span class="doc-field">Place of Panchanama:</span> ${caseData.incident.location}</div>
</div>

<div class="doc-section">
  <div class="doc-section-title">1. Purpose of Panchanama</div>
  <p>This panchanama is being conducted for the purpose of:</p>
  <ol class="doc-numbered">
    <li>Search of the place of occurrence/premises of accused</li>
    <li>Seizure of evidence/property related to the offence</li>
    <li>Documentation of scene inspection and recovery of items</li>
  </ol>
</div>

<div class="doc-section">
  <div class="doc-section-title">2. Panch Witnesses</div>
  <p>The following respectable inhabitants have been called to witness this panchanama:</p>
  <dl class="doc-fields">
    <dt>Panch Witness 1:</dt>
    <dd>
      Name: _________________ Father's Name: _________________<br>
      Age: _______ Occupation: _________________<br>
      Address: _________________<br>
      Mobile: _________________ ID Proof: _________________
    </dd>
    <dt>Panch Witness 2:</dt>
    <dd>
      Name: _________________ Father's Name: _________________<br>
      Age: _______ Occupation: _________________<br>
      Address: _________________<br>
      Mobile: _________________ ID Proof: _________________
    </dd>
  </dl>
</div>

<div class="doc-section">
  <div class="doc-section-title">3. Description of Place</div>
  <p><strong>Location:</strong> ${caseData.incident.location}</p>
  <p><strong>Description:</strong> [Detailed description of premises - rooms, entrances, exits, surroundings]</p>
  <p style="margin-top:8px;"><strong>Sketch/Map Reference:</strong> [Site plan/sketch annexed - Yes/No]</p>
  <p>The place was inspected in the presence of panch witnesses from [Start Time] to [End Time].</p>
</div>

<div class="doc-section">
  <div class="doc-section-title">4. Search Procedure</div>
  <p>After informing the panch witnesses about the purpose of search, the following procedure was adopted:</p>
  <ol class="doc-numbered">
    <li>The entire premises was searched systematically room by room</li>
    <li>All articles, documents, and items were examined</li>
    <li>Relevant items related to the offence were identified for seizure</li>
    <li>Digital devices (if any) were handled as per forensic protocol</li>
    <li>All findings were documented in presence of panch witnesses</li>
  </ol>
</div>

<div class="doc-section">
  <div class="doc-section-title">5. List of Seized Items</div>
  <table style="width:100%;border-collapse:collapse;margin-top:12px;font-size:12px;">
    <thead>
      <tr style="background:#f1f5f9;">
        <th style="border:1px solid #cbd5e1;padding:8px;text-align:left;">Sr. No.</th>
        <th style="border:1px solid #cbd5e1;padding:8px;text-align:left;">Description</th>
        <th style="border:1px solid #cbd5e1;padding:8px;text-align:left;">Quantity</th>
        <th style="border:1px solid #cbd5e1;padding:8px;text-align:left;">Condition</th>
        <th style="border:1px solid #cbd5e1;padding:8px;text-align:left;">Identification Marks</th>
        <th style="border:1px solid #cbd5e1;padding:8px;text-align:left;">Seized From</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td style="border:1px solid #cbd5e1;padding:8px;">1</td>
        <td style="border:1px solid #cbd5e1;padding:8px;">[Item description]</td>
        <td style="border:1px solid #cbd5e1;padding:8px;">[Qty]</td>
        <td style="border:1px solid #cbd5e1;padding:8px;">[Good/Damaged]</td>
        <td style="border:1px solid #cbd5e1;padding:8px;">[Marks]</td>
        <td style="border:1px solid #cbd5e1;padding:8px;">[Location]</td>
      </tr>
      <tr>
        <td style="border:1px solid #cbd5e1;padding:8px;">2</td>
        <td style="border:1px solid #cbd5e1;padding:8px;">[Item description]</td>
        <td style="border:1px solid #cbd5e1;padding:8px;">[Qty]</td>
        <td style="border:1px solid #cbd5e1;padding:8px;">[Good/Damaged]</td>
        <td style="border:1px solid #cbd5e1;padding:8px;">[Marks]</td>
        <td style="border:1px solid #cbd5e1;padding:8px;">[Location]</td>
      </tr>
      <tr>
        <td style="border:1px solid #cbd5e1;padding:8px;">3</td>
        <td style="border:1px solid #cbd5e1;padding:8px;">[Item description]</td>
        <td style="border:1px solid #cbd5e1;padding:8px;">[Qty]</td>
        <td style="border:1px solid #cbd5e1;padding:8px;">[Good/Damaged]</td>
        <td style="border:1px solid #cbd5e1;padding:8px;">[Marks]</td>
        <td style="border:1px solid #cbd5e1;padding:8px;">[Location]</td>
      </tr>
    </tbody>
  </table>
</div>

<div class="doc-section">
  <div class="doc-section-title">6. Digital Evidence (If Any)</div>
  ${caseData.evidenceIds && caseData.evidenceIds.length > 0 ? `
  <p>The following digital devices/items were seized and SHA-256 hashes computed:</p>
  <ul class="doc-numbered">
    ${caseData.evidenceIds.map((_, idx) => `<li>Digital Device #${idx + 1}: [Type/Make/Model] — SHA-256: [Hash to be computed in presence of panch]</li>`).join('')}
  </ul>
  ` : '<p>No digital evidence seized during this panchanama.</p>'}
</div>

<div class="doc-section">
  <div class="doc-section-title">7. Recovery Details</div>
  <p>All seized items were recovered from:</p>
  <dl class="doc-fields">
    <dt>Recovered From:</dt><dd>${caseData.accused.name || 'Accused premises'}</dd>
    <dt>Exact Location:</dt><dd>[Specific room/area within premises]</dd>
    <dt>Recovered By:</dt><dd>${caseData.assignedOfficer}</dd>
  </dl>
</div>

<div class="doc-section">
  <div class="doc-section-title">8. Declaration by Panch Witnesses</div>
  <p>We, the undersigned panch witnesses, hereby certify that:</p>
  <ol class="doc-numbered">
    <li>We were called to witness this panchanama by the police</li>
    <li>The entire search and seizure was conducted in our presence</li>
    <li>The list of seized items is accurate and prepared in our presence</li>
    <li>We have no personal interest in this case</li>
    <li>We were treated with courtesy and cooperation by the police</li>
  </ol>
</div>

<div class="doc-section">
  <div class="doc-section-title">9. Chain of Custody</div>
  <p>All seized items have been sealed in the presence of panch witnesses and will be deposited in the police malkhana (store room). Chain of custody has been initiated and will be maintained throughout the investigation.</p>
</div>

<div class="doc-signatures">
  <div class="doc-sig-block">
    <div class="doc-sig-line">${caseData.assignedOfficer}<br>Investigation Officer</div>
  </div>
  <div class="doc-sig-block">
    <div class="doc-sig-line">Panch Witness 1<br>(Signature & Name)</div>
  </div>
  <div class="doc-sig-block">
    <div class="doc-sig-line">Panch Witness 2<br>(Signature & Name)</div>
  </div>
  <div class="doc-sig-block">
    <div class="doc-sig-line">Person from whose possession seized<br>(if willing to sign)</div>
  </div>
</div>

<div class="doc-footer">
  <strong>Custody of Seized Items:</strong><br>
  Items deposited in Police Malkhana on ${today}<br>
  Malkhanji Signature: _________________
</div>

<div class="doc-note">This panchanama was read over to the panch witnesses and they admitted it to be correct. A copy has been provided to the person from whom items were seized (if applicable).</div>
`;
}
function generateFaceIDForm(
  caseData: CaseRecord,
  today: string,
  t: DocFieldTranslations,
  _language: 'en' | 'gu' | 'hi' = 'en'
): string {
  return `
<div class="doc-header">
  <div class="doc-emblem">Government of Gujarat &bull; Gujarat Police</div>
  <div class="doc-title">Test Identification Parade (TIP) Memo</div>
  <div class="doc-subtitle">(Under Bharatiya Sakshya Adhiniyam, 2023)</div>
</div>

<div class="doc-meta">
  <div><span class="doc-field">FIR No.:</span> ${caseData.firNumber}</div>
  <div><span class="doc-field">Case No.:</span> ${caseData.caseNumber}</div>
  <div><span class="doc-field">Police Station:</span> ${caseData.policeStation}</div>
  <div><span class="doc-field">Under Sections:</span> ${caseData.crimeType}</div>
</div>

<div class="doc-meta" style="margin-top:20px;">
  <div><span class="doc-field">Date of Parade:</span> ${caseData.incident.date}</div>
  <div><span class="doc-field">Time of Parade:</span> ${caseData.incident.time}</div>
  <div><span class="doc-field">Place of Parade:</span> [Venue to be filled - Usually Court/Jail]</div>
  <div><span class="doc-field">Conducted Before:</span> Judicial Magistrate First Class</div>
</div>

<div class="doc-section">
  <div class="doc-section-title">1. Witness Identifier Details</div>
  <dl class="doc-fields">
    <dt>Name of Witness:</dt><dd>${caseData.victim.name}</dd>
    <dt>Father's Name:</dt><dd>${caseData.victim.fatherName || 'Not Available'}</dd>
    <dt>Age:</dt><dd>${caseData.victim.age || 'Not Recorded'}</dd>
    <dt>Gender:</dt><dd>${caseData.victim.gender || 'Not Recorded'}</dd>
    <dt>Address:</dt><dd>${caseData.victim.address}</dd>
    <dt>Mobile:</dt><dd>${caseData.victim.mobile}</dd>
    <dt>Relation to Case:</dt><dd>Victim / Eye Witness</dd>
  </dl>
</div>

<div class="doc-section">
  <div class="doc-section-title">2. Suspect/Accused to be Identified</div>
  <dl class="doc-fields">
    <dt>Name:</dt><dd>${caseData.accused.name}</dd>
    <dt>Father's Name:</dt><dd>${caseData.accused.fatherName || 'Not Available'}</dd>
    <dt>Age:</dt><dd>${caseData.accused.age || 'Not Recorded'}</dd>
    <dt>Gender:</dt><dd>${caseData.accused.gender || 'Not Recorded'}</dd>
    <dt>Height:</dt><dd>[To be measured]</dd>
    <dt>Complexion:</dt><dd>[To be recorded]</dd>
    <dt>Identification Marks:</dt><dd>[To be recorded]</dd>
    <dt>Distinctive Features:</dt><dd>[Scars, tattoos, etc. - To be recorded]</dd>
  </dl>
</div>

<div class="doc-section">
  <div class="doc-section-title">3. Parade Procedure</div>
  <p>The Test Identification Parade was conducted as follows:</p>
  <ol class="doc-numbered">
    <li>The witness was brought to the parade venue at [Time]</li>
    <li>The magistrate explained the purpose and procedure to the witness</li>
    <li>The suspect was asked to take position among [8-11] other persons of similar appearance</li>
    <li>Other persons in parade: [Names/Details to be recorded]</li>
    <li>The witness was asked to identify the suspect from the lineup</li>
    <li>The witness was not prompted or influenced in any manner</li>
    <li>The entire procedure was supervised by the Judicial Magistrate</li>
  </ol>
</div>

<div class="doc-section">
  <div class="doc-section-title">4. Details of Other Persons in Parade</div>
  <table style="width:100%;border-collapse:collapse;margin-top:12px;font-size:12px;">
    <thead>
      <tr style="background:#f1f5f9;">
        <th style="border:1px solid #cbd5e1;padding:8px;">Sr. No.</th>
        <th style="border:1px solid #cbd5e1;padding:8px;">Name</th>
        <th style="border:1px solid #cbd5e1;padding:8px;">Age</th>
        <th style="border:1px solid #cbd5e1;padding:8px;">Height</th>
        <th style="border:1px solid #cbd5e1;padding:8px;">Complexion</th>
        <th style="border:1px solid #cbd5e1;padding:8px;">Occupation</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td style="border:1px solid #cbd5e1;padding:8px;">1</td>
        <td style="border:1px solid #cbd5e1;padding:8px;">[Name]</td>
        <td style="border:1px solid #cbd5e1;padding:8px;">[Age]</td>
        <td style="border:1px solid #cbd5e1;padding:8px;">[Height]</td>
        <td style="border:1px solid #cbd5e1;padding:8px;">[Complexion]</td>
        <td style="border:1px solid #cbd5e1;padding:8px;">[Occupation]</td>
      </tr>
      <tr>
        <td style="border:1px solid #cbd5e1;padding:8px;">2</td>
        <td style="border:1px solid #cbd5e1;padding:8px;">[Name]</td>
        <td style="border:1px solid #cbd5e1;padding:8px;">[Age]</td>
        <td style="border:1px solid #cbd5e1;padding:8px;">[Height]</td>
        <td style="border:1px solid #cbd5e1;padding:8px;">[Complexion]</td>
        <td style="border:1px solid #cbd5e1;padding:8px;">[Occupation]</td>
      </tr>
      <tr>
        <td style="border:1px solid #cbd5e1;padding:8px;">3</td>
        <td style="border:1px solid #cbd5e1;padding:8px;">[Name]</td>
        <td style="border:1px solid #cbd5e1;padding:8px;">[Age]</td>
        <td style="border:1px solid #cbd5e1;padding:8px;">[Height]</td>
        <td style="border:1px solid #cbd5e1;padding:8px;">[Complexion]</td>
        <td style="border:1px solid #cbd5e1;padding:8px;">[Occupation]</td>
      </tr>
      <tr>
        <td style="border:1px solid #cbd5e1;padding:8px;">4</td>
        <td style="border:1px solid #cbd5e1;padding:8px;">[Name]</td>
        <td style="border:1px solid #cbd5e1;padding:8px;">[Age]</td>
        <td style="border:1px solid #cbd5e1;padding:8px;">[Height]</td>
        <td style="border:1px solid #cbd5e1;padding:8px;">[Complexion]</td>
        <td style="border:1px solid #cbd5e1;padding:8px;">[Occupation]</td>
      </tr>
      <tr>
        <td style="border:1px solid #cbd5e1;padding:8px;">5</td>
        <td style="border:1px solid #cbd5e1;padding:8px;">[Name]</td>
        <td style="border:1px solid #cbd5e1;padding:8px;">[Age]</td>
        <td style="border:1px solid #cbd5e1;padding:8px;">[Height]</td>
        <td style="border:1px solid #cbd5e1;padding:8px;">[Complexion]</td>
        <td style="border:1px solid #cbd5e1;padding:8px;">[Occupation]</td>
      </tr>
    </tbody>
  </table>
  <p style="margin-top:8px;font-size:11px;color:#666;"><em>Note: Suspect's position in lineup to be randomized. Minimum 8-11 persons required.</em></p>
</div>

<div class="doc-section">
  <div class="doc-section-title">5. Identification Result</div>
  <dl class="doc-fields">
    <dt>Did the witness identify the suspect?</dt><dd>☐ Yes &nbsp;&nbsp; ☐ No</dd>
    <dt>If yes, position in lineup:</dt><dd>Sr. No. _______</dd>
    <dt>Confidence level:</dt><dd>☐ Certain &nbsp;&nbsp; ☐ Probable &nbsp;&nbsp; ☐ Doubtful</dd>
    <dt>Time taken for identification:</dt><dd>_______ minutes</dd>
  </dl>
</div>

<div class="doc-section">
  <div class="doc-section-title">6. Witness Statement</div>
  <p>The witness stated: "[Exact words of the witness to be recorded verbatim]"</p>
  <p style="margin-top:8px;">The witness identified the accused named above in the Test Identification Parade conducted before me.</p>
</div>

<div class="doc-section">
  <div class="doc-section-title">7. Precautions Taken</div>
  <ol class="doc-numbered">
    <li>The witness was kept separate from the accused before the parade</li>
    <li>The accused was not shown to the witness prior to the parade</li>
    <li>Other persons in the parade were of similar age, height, and appearance</li>
    <li>No prompting or suggestion was given to the witness</li>
    <li>The parade was conducted in adequate lighting conditions</li>
    <li>The entire procedure was supervised by the Judicial Magistrate</li>
  </ol>
</div>

<div class="doc-section">
  <div class="doc-section-title">8. Magistrate Certification</div>
  <p>I, the undersigned Judicial Magistrate First Class, hereby certify that:</p>
  <ol class="doc-numbered">
    <li>The Test Identification Parade was conducted under my supervision</li>
    <li>Due precautions were taken to ensure fairness</li>
    <li>The witness identified the suspect voluntarily and without prompting</li>
    <li>The result recorded above is accurate</li>
  </ol>
</div>

<div class="doc-signatures">
  <div class="doc-sig-block">
    <div class="doc-sig-line">Judicial Magistrate First Class<br>Name: _________________<br>Court: _________________<br>Date: ${today}</div>
  </div>
  <div class="doc-sig-block">
    <div class="doc-sig-line">${caseData.assignedOfficer}<br>Investigation Officer</div>
  </div>
  <div class="doc-sig-block">
    <div class="doc-sig-line">Witness Identifier<br>(Signature & Name)</div>
  </div>
</div>

<div class="doc-footer">
  <strong>Enclosures:</strong><br>
  1. Photographs of parade (if taken)<br>
  2. Sketch of lineup arrangement<br>
  3. Video recording (if available)<br>
  4. Details of other persons in parade
</div>

<div class="doc-note">This memo has been read over to the witness and admitted to be correct. Copy to be annexed to chargesheet.</div>
`;
}
function generateLERSRequest(
  caseData: CaseRecord,
  today: string,
  sectionsShort: string,
  t: DocFieldTranslations,
  _language: 'en' | 'gu' | 'hi' = 'en'
): string {
  return `
<div class="doc-header">
  <div class="doc-emblem">Government of Gujarat &bull; Gujarat Police</div>
  <div class="doc-title">Law Enforcement Request (LERS)</div>
  <div class="doc-subtitle">Request for User Data from Social Media Platform</div>
</div>

<div class="doc-meta">
  <div><span class="doc-field">To,</span></div>
  <div><span class="doc-field">The Nodal Officer / Law Enforcement Liaison,</span></div>
  <div><span class="doc-field">Meta Platforms, Inc. / Instagram / WhatsApp</span></div>
  <div><span class="doc-field">1601 Willow Road, Menlo Park, CA 94025, USA</span></div>
  <div><span class="doc-field">OR</span></div>
  <div><span class="doc-field">Meta Platforms Ireland Limited</span></div>
  <div><span class="doc-field">4 Grand Canal Square, Grand Canal Harbour, Dublin 2, Ireland</span></div>
</div>

<div class="doc-meta" style="margin-top:20px;">
  <div><span class="doc-field">FIR No.:</span> ${caseData.firNumber}</div>
  <div><span class="doc-field">Case No.:</span> ${caseData.caseNumber}</div>
  <div><span class="doc-field">Police Station:</span> ${caseData.policeStation}</div>
  <div><span class="doc-field">Date of Request:</span> ${today}</div>
  <div><span class="doc-field">Legal Authority:</span> Section 96-97 BNSS, 2023</div>
  <div><span class="doc-field">Under Sections:</span> ${sectionsShort || 'As per FIR'}</div>
  <div><span class="doc-field">Request Type:</span> ☐ Standard &nbsp;&nbsp; ☐ Emergency Preservation</div>
</div>

<div class="doc-section">
  <div class="doc-section-title">1. Investigating Agency Details</div>
  <dl class="doc-fields">
    <dt>Agency Name:</dt><dd>Gujarat Police - ${caseData.policeStation}</dd>
    <dt>Investigating Officer:</dt><dd>${caseData.assignedOfficer}</dd>
    <dt>Designation:</dt><dd>Investigation Officer</dd>
    <dt>Badge Number:</dt><dd>GP-4521</dd>
    <dt>Official Email:</dt><dd>[Official police email]</dd>
    <dt>Official Phone:</dt><dd>[Contact number]</dd>
    <dt>Agency Address:</dt><dd>${caseData.policeStation}, Ahmedabad, Gujarat, India</dd>
  </dl>
</div>

<div class="doc-section">
  <div class="doc-section-title">2. Case Information</div>
  <dl class="doc-fields">
    <dt>FIR Number:</dt><dd>${caseData.firNumber}</dd>
    <dt>Case Number:</dt><dd>${caseData.caseNumber}</dd>
    <dt>Date of FIR:</dt><dd>${caseData.incident.date}</dd>
    <dt>Crime Type:</dt><dd>${caseData.crimeType}</dd>
    <dt>Applicable Laws:</dt><dd>${sectionsShort || 'As per investigation'}</dd>
  </dl>
  <p style="margin-top:8px;"><strong>Case Summary:</strong></p>
  <div class="doc-narrative">${caseData.incident.narrative.substring(0, 400)}${caseData.incident.narrative.length > 400 ? '...' : ''}</div>
</div>

<div class="doc-section">
  <div class="doc-section-title">3. Account/Target Details</div>
  <p>We are requesting data pertaining to the following account(s):</p>
  <dl class="doc-fields">
    <dt>Platform:</dt><dd>☐ Facebook &nbsp; ☐ Instagram &nbsp; ☐ WhatsApp &nbsp; ☐ Other: _______</dd>
    <dt>Username/Handle:</dt><dd>[@username or profile URL]</dd>
    <dt>Email Address:</dt><dd>[Associated email if known]</dd>
    <dt>Phone Number:</dt><dd>[Associated phone if known]</dd>
    <dt>User ID:</dt><dd>[Platform user ID if known]</dd>
    <dt>Profile URL:</dt><dd>[Full URL to profile/page]</dd>
  </dl>
</div>

<div class="doc-section">
  <div class="doc-section-title">4. Data Requested</div>
  <p>Pursuant to the above-mentioned criminal investigation, we hereby request the following data:</p>
  
  <p style="margin-top:12px;"><strong>A. Basic Subscriber Information:</strong></p>
  <ul class="doc-numbered">
    <li>Account holder name and registered email</li>
    <li>Phone number(s) associated with account</li>
    <li>Registration date and IP address at registration</li>
    <li>Profile information (bio, profile picture, etc.)</li>
    <li>Account status (active/suspended/deleted)</li>
  </ul>

  <p style="margin-top:12px;"><strong>B. Access Logs:</strong></p>
  <ul class="doc-numbered">
    <li>IP addresses used to access account (with timestamps)</li>
    <li>Login/logout history</li>
    <li>Device information (type, OS, browser)</li>
    <li>Geolocation data (if available)</li>
  </ul>

  <p style="margin-top:12px;"><strong>C. Communications/Content (if applicable):</strong></p>
  <ul class="doc-numbered">
    <li>Direct messages (sent and received)</li>
    <li>Posts, comments, and reactions</li>
    <li>Photos, videos, and media shared</li>
    <li>Stories and temporary content (if archived)</li>
    <li>Group memberships and activities</li>
  </ul>

  <p style="margin-top:12px;"><strong>D. Metadata:</strong></p>
  <ul class="doc-numbered">
    <li>Friends/contacts list</li>
    <li>Page/admin information</li>
    <li>Transaction/payment history (if applicable)</li>
    <li>Connected apps and third-party integrations</li>
  </ul>

  <dl class="doc-fields" style="margin-top:12px;">
    <dt>Time Period for Data:</dt><dd>From ${caseData.incident.date} to Present (or specify: _________)</dd>
  </dl>
</div>

<div class="doc-section">
  <div class="doc-section-title">5. Legal Authority & Compliance</div>
  <p>This request is made under the following legal provisions:</p>
  <ol class="doc-numbered">
    <li><strong>Section 96-97, Bharatiya Nagarik Suraksha Sanhita (BNSS), 2023:</strong> Power to issue search warrants and collect evidence</li>
    <li><strong>Section 65, Bharatiya Sakshya Adhiniyam (BSA), 2023:</strong> Admissibility of electronic records</li>
    <li><strong>Section 69, Information Technology Act, 2000:</strong> Power to issue directions for interception/monitoring</li>
    <li><strong>Information Technology (Intermediary Guidelines) Rules, 2021:</strong> Obligations of social media intermediaries</li>
  </ol>
  <p style="margin-top:8px;">The requested data is essential for the investigation of the aforementioned criminal case and will be used solely for law enforcement purposes.</p>
</div>

<div class="doc-section">
  <div class="doc-section-title">6. Data Preservation Request</div>
  <p>Pending formal legal process, we hereby request immediate preservation of all data pertaining to the above-mentioned account(s) to prevent loss, alteration, or destruction of evidence.</p>
  <p style="margin-top:8px;"><strong>Preservation Period:</strong> 90 days from the date of this request (extendable upon further request)</p>
</div>

<div class="doc-section">
  <div class="doc-section-title">7. Point of Contact</div>
  <p>All responses and clarifications may be directed to:</p>
  <dl class="doc-fields">
    <dt>Name:</dt><dd>${caseData.assignedOfficer}</dd>
    <dt>Designation:</dt><dd>Investigation Officer</dd>
    <dt>Email:</dt><dd>[Official email with @police.gov.in domain]</dd>
    <dt>Phone:</dt><dd>[Official contact number]</dd>
    <dt>Address:</dt><dd>${caseData.policeStation}, Ahmedabad, Gujarat, India</dd>
  </dl>
</div>

<div class="doc-section">
  <div class="doc-section-title">8. Declaration</div>
  <p>I hereby declare that:</p>
  <ol class="doc-numbered">
    <li>This request is made in connection with a bona fide criminal investigation</li>
    <li>The information sought is relevant and material to the investigation</li>
    <li>The data will be used only for law enforcement purposes</li>
    <li>All information received will be treated as confidential</li>
    <li>This request complies with applicable Indian laws and regulations</li>
  </ol>
</div>

<div class="doc-signatures">
  <div class="doc-sig-block">
    <div class="doc-sig-line">${caseData.assignedOfficer}<br>Investigation Officer<br>${caseData.policeStation}</div>
  </div>
  <div class="doc-sig-block">
    <div class="doc-sig-line">Station House Officer<br>${caseData.policeStation}<br>(Countersignature)</div>
  </div>
</div>

<div style="margin-top:24px;padding:16px;background:#f1f5f9;border:1px solid #cbd5e1;border-radius:8px;">
  <strong>Official Seal:</strong><br><br>
  [Police Station Seal/Stamp]<br><br>
  Date: ${today}
</div>

<div class="doc-footer">
  <strong>Enclosures:</strong><br>
  1. Copy of FIR<br>
  2. IO Identity Proof<br>
  3. Authorization Letter from SHO/Superintendent<br>
  4. Court Order (if applicable)
</div>

<div class="doc-note">This request is submitted through the Law Enforcement Online Request System (LERS) at facebook.com/records. Response may be sent to the official email address mentioned above.</div>
`;
}
function generateDefault(caseData: CaseRecord, today: string): string {
  return `<div class="doc-header"><div class="doc-title">Document</div></div>
<div class="doc-meta"><div><span class="doc-field">FIR No.:</span> ${caseData.firNumber}</div><div><span class="doc-field">Date:</span> ${today}</div></div>
<p>[Document content to be generated based on case details]</p>
<div class="doc-signatures"><div class="doc-sig-block"><div class="doc-sig-line">${caseData.assignedOfficer}<br>Investigation Officer</div></div></div>`;
}
