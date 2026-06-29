/* ============================================
   CRIMEGPT 2.0 — DOCUMENT TRANSLATIONS
   ============================================
   Translation dictionaries for legal document generation.
   Supports English, Gujarati, and Hindi.
   
   Legal section numbers (BNSS, BNS, BSA) remain in English.
   Names, addresses, and technical data remain as provided.
   ============================================ */

export interface DocFieldTranslations {
  title: string;
  subtitle: string;
  formNumber?: string;
  fields: Record<string, string>;
  sections: Record<string, string>;
  labels: Record<string, string>;
  declarations: string[];
  footers: string[];
}

export interface DocTranslationSet {
  fir: DocFieldTranslations;
  remandRequest: DocFieldTranslations;
  chargesheet: DocFieldTranslations;
  purvaniChargesheet: DocFieldTranslations;
  seizureReceipt: DocFieldTranslations;
  medicalLetter: DocFieldTranslations;
  courtCustody: DocFieldTranslations;
  panchanama: DocFieldTranslations;
  faceIdForm: DocFieldTranslations;
  lersRequest: DocFieldTranslations;
}

/* ─── LEGAL SECTION TRANSLATIONS ── */
export interface LegalSectionTranslation {
  title: string;
  description: string;
  punishment?: string;
  legacyReference?: string;
}

export type LegalSectionTranslations = Record<string, LegalSectionTranslation>;

/* ─── JUDGMENT TRANSLATIONS ─── */
export interface JudgmentTranslation {
  title: string;
  summary: string;
}

export type JudgmentTranslations = Record<string, JudgmentTranslation>;

/* ════════════════════════════════════════════
   GUJARATI TRANSLATIONS
   ════════════════════════════════════════════ */
export const GU_DOC_TRANSLATIONS: DocTranslationSet = {
  fir: {
    title: 'પ્રથમ માહિતી અહેવાળ',
    subtitle: 'ભારતીય નાગરિક સુરક્ષા સંહિતા, ૨૦૨૩ ની કલમ ૧૭૩ હેઠળ',
    formNumber: 'સ્વરૂપ-IF1 (એકીકૃત સ્વરૂપ)',
    fields: {
      firNumber: 'ફરિયાદ નં.',
      caseNumber: 'કેસ નં.',
      policeStation: 'પોલીસ સ્ટેશન',
      gdEntry: 'જનરલ ડાયરી એન્ટ્રી નં.',
      dateOfInfo: 'માહિતી મળવાની તારીખ',
      idProof: 'ઓળખ પુરાવો',
      victimName: 'ફરિયાદી/ભોગબનનારું નામ',
      victimFather: 'પિતા/પતિનું નામ',
      victimAddress: 'સંપૂર્ણ સરનામું',
      victimMobile: 'મોબાઈલ નં.',
      victimAadhar: 'આધાર નં.',
      accusedName: 'આરોપીનું નામ',
      accusedFather: 'પિતાનું નામ',
      accusedAddress: 'સરનામું',
      incidentDate: 'ઘટનાની તારીખ',
      incidentTime: 'સમય',
      incidentPlace: 'ઘટના સ્થળ',
      offenseSections: 'અપરાધની કલમો',
      complaint: 'ફરિયાદ/જાણની વિગતો',
      actionTaken: 'લીધેલ પગલાં',
      investigatingOfficer: 'તપાસ અધિકારી',
      officerRank: 'રેંક',
      officerBadge: 'બેજ નં.',
    },
    sections: {
      complainantDetails: '૧. ફરિયાદી/જાણ કરનારની વિગતો',
      accusedDetails: '૨. આરોપીની વિગતો',
      incidentDetails: '૩. ઘટનાની વિગતો',
      offenseDetails: '૪. અપરાધની વિગતો',
      complaintNarrative: '૫. ફરિયાદ/જાણ',
      actionTaken: '૬. લીધેલ પગલાં',
      propertyDetails: '૭. મિલકત/મુદ્દામાલની વિગતો',
      declaration: '૮. ઘોષણા',
    },
    labels: {
      propertyItem: 'આઈટમ',
      propertyValue: 'કિંમત',
      propertyRecovered: 'પુનઃપ્રાપ્ત',
      propertyStatus: 'સ્થિતિ',
      name: 'નામ',
      address: 'સરનામું',
      phone: 'ફોન',
      email: 'ઈમેઈલ',
      date: 'તારીખ',
      time: 'સમય',
      place: 'સ્થળ',
      description: 'વર્ણન',
    },
    declarations: [
      'હું પ્રમાણિત કરું છું કે ઉપરોક્ત માહિતી મારી શ્રેષ્ઠ જાણકારી અને વિશ્વાસ અનુસાર સાચી છે.',
      'આ ફરિયાદ સ્વૈચ્છિક રીતે આપવામાં આવી છે અને કોઈ દબાણ હેઠળ નથી.',
      'જાણ કરનારને BNSS 2023 ની કલમ 180 હેઠળ ખોટી માહિતી આપવાની જોગવાઈઓ વિશે સમજાવવામાં આવી છે.',
    ],
    footers: [
      'તપાસ અધિકારીની સહી',
      'અરજદારની સહી/અંગૂઠાની છાપ',
      'પોલીસ સ્ટેશનની મોહર',
    ],
  },

  remandRequest: {
    title: 'રિમાન્ડ અરજી',
    subtitle: 'ભારતીય નાગરિક સુરક્ષા સંહિતા, ૨૦૨૩ ની કલમ 187 હેઠળ',
    fields: {
      courtName: 'ન્યાયાલયનું નામ',
      caseNumber: 'કેસ નં.',
      firNumber: 'FIR નં.',
      policeStation: 'પોલીસ સ્ટેશન',
      accusedName: 'આરોપીનું નામ',
      arrestDate: 'ધરપકડની તારીખ',
      arrestTime: 'સમય',
      arrestPlace: 'ધરપકડ સ્થળ',
      custodyFrom: 'કસ્ટડી શરૂ',
      custodyTo: 'કસ્ટડી સમાપ્ત',
      remandDays: 'રિમાન્ડ દિવસો',
      reason: 'રિમાન્ડનું કારણ',
      investigationNeeded: 'તપાસની જરૂરિયાત',
    },
    sections: {
      subject: 'વિષય',
      factsOfCase: 'કેસના તથ્યો',
      arrestDetails: 'ધરપકડની વિગતો',
      reasonsForRemand: 'રિમાન્ડના કારણો',
      investigationProgress: 'તપાસની પ્રગતિ',
      prayer: 'પ્રાર્થના',
    },
    labels: {
      respectfully: 'આદરપૂર્વક',
      states: 'જણાવે છે',
      completed: 'પૂર્ણ',
      pending: 'બાકી',
    },
    declarations: [
      'ઉપરોક્ત તમામ તથ્યો મારી શ્રેષ્ઠ જાણકારી અનુસાર સાચા છે.',
      'આરોપીને કસ્ટડીમાં રાખવો તપાસ માટે આવશ્યક છે.',
    ],
    footers: [
      'તપાસ અધિકારી',
      'પોલીસ સ્ટેશનની મોહર',
    ],
  },

  chargesheet: {
    title: 'ચાર્જશીટ',
    subtitle: 'ભારતીય નાગરિક સુરક્ષા સંહિતા, ૨૦૨૩ ની કલમ 193 હેઠળ',
    formNumber: 'સ્વરૂપ-ચાર્જશીટ',
    fields: {
      courtName: 'ન્યાયાલય',
      caseNumber: 'કેસ નં.',
      firNumber: 'FIR નં.',
      policeStation: 'પોલીસ સ્ટેશન',
      accusedName: 'આરોપી',
      victimName: 'ભોગબનનારું',
      investigationOfficer: 'તપાસ અધિકારી',
      offenseSections: 'અપરાધની કલમો',
      summary: 'તપાસ સારાંશ',
      evidence: 'પુરાવા',
      witnesses: 'સાક્ષીઓ',
    },
    sections: {
      caseDetails: 'કેસની વિગતો',
      accusedParticulars: 'આરોપીની વિગતો',
      offenseCharges: 'અપરાધના આરોપો',
      investigationSummary: 'તપાસ સારાંશ',
      evidenceCollected: 'એકત્રિત પુરાવા',
      witnessList: 'સાક્ષીઓની યાદી',
      conclusion: 'નિષ્કર્ષ',
    },
    labels: {
      name: 'નામ',
      address: 'સરનામું',
      evidence: 'પુરાવા',
      statement: 'નિવેદન',
    },
    declarations: [
      'તપાસ પૂર્ણ કર્યા પછી, આ ચાર્જશીટ રજૂ કરવામાં આવે છે.',
      'પુરાવા અને સાક્ષીઓની યાદી संलग્ન છે.',
    ],
    footers: [
      'તપાસ અધિકારીની સહી',
      'પોલીસ સ્ટેશનની મોહર',
    ],
  },

  purvaniChargesheet: {
    title: 'પૂર્વની ચાર્જશીટ',
    subtitle: 'ભારતીય નાગરિક સુરક્ષા સંહિતા, ૨૦૨૩ ની કલમ 193',
    fields: {
      courtName: 'ન્યાયાલય',
      caseNumber: 'કેસ નં.',
      firNumber: 'FIR નં.',
      policeStation: 'પોલીસ સ્ટેશન',
      accusedName: 'આરોપી',
      preliminaryFindings: 'પ્રારંભિક તારણો',
    },
    sections: {
      preliminaryInvestigation: 'પ્રારંભિક તપાસ',
      findings: 'તારણો',
      furtherAction: 'વધુ કાર્યવાહી',
    },
    labels: {
      finding: 'તારણ',
      recommendation: 'ભલામણ',
    },
    declarations: [
      'પ્રારંભિક તપાસના આધારે આ અહેવાલ તૈયાર કરવામાં આવ્યો છે.',
    ],
    footers: [
      'તપાસ અધિકારી',
      'પોલીસ સ્ટેશન',
    ],
  },

  seizureReceipt: {
    title: 'જપ્તી રસીદ',
    subtitle: 'ભારતીય નાગરિક સુરક્ષા સંહિતા, ૨૦૨૩ ની કલમ 96-97',
    fields: {
      seizureDate: 'જપ્તીની તારીખ',
      seizureTime: 'સમય',
      seizurePlace: 'જપ્તી સ્થળ',
      seizedFrom: 'જેની પાસેથી જપ્ત કરી',
      seizedBy: 'જપ્ત કરનાર અધિકારી',
      witnessName: 'સાક્ષી',
      itemDescription: 'આઈટમનું વર્ણન',
      quantity: 'જથ્થો',
      condition: 'સ્થિતિ',
      storageLocation: 'સંગ્રહ સ્થળ',
    },
    sections: {
      seizureDetails: 'જપ્તીની વિગતો',
      itemsSeized: 'જપ્ત કરેલી વસ્તુઓ',
      chainOfCustody: 'કસ્ટડી ચેઈન',
      acknowledgments: 'સ્વીકૃતિ',
    },
    labels: {
      serialNo: 'ક્રમાંક',
      item: 'વસ્તુ',
      description: 'વર્ણન',
      quantity: 'જથ્થો',
      condition: 'સ્થિતિ',
      hash: 'SHA-256 હેશ',
    },
    declarations: [
      'ઉપરોક્ત વસ્તુઓ મારી હાજરીમાં જપ્ત કરવામાં આવી છે.',
      'જપ્તી પ્રક્રિયા કાયદાકીય પ્રક્રિયા મુજબ કરવામાં આવી છે.',
    ],
    footers: [
      'જપ્ત કરનાર અધિકારીની સહી',
      'સાક્ષીની સહી',
      'વ્યક્તિની સહી (જેની પાસેથી જપ્ત કરી)',
    ],
  },

  medicalLetter: {
    title: 'તબીબી પરીક્ષા માટે પત્ર',
    subtitle: 'ભારતીય નાગરિક સુરક્ષા સંહિતા, ૨૦૨૩',
    fields: {
      hospitalName: 'હોસ્પિટલ/તબીબનું નામ',
      patientName: 'દર્દીનું નામ',
      patientAge: 'ઉંમર',
      examinationType: 'પરીક્ષાનો પ્રકાર',
      urgency: 'તાત્કાલિકતા',
      caseReference: 'કેસ સંદર્ભ',
    },
    sections: {
      request: 'વિનંતી',
      examinationRequired: 'જરૂરી પરીક્ષા',
      observations: 'અવલોકનો',
    },
    labels: {
      kindly: 'કૃપા કરીને',
      submit: 'અહેવાલ સબમિટ કરો',
    },
    declarations: [
      'આ તબીબી પરીક્ષા કાનૂની કાર્યવાહી માટે જરૂરી છે.',
      'તબીબી અહેવાલ તાત્કાલિક મોકલવા વિનંતી.',
    ],
    footers: [
      'તપાસ અધિકારી',
      'પોલીસ સ્ટેશન',
    ],
  },

  courtCustody: {
    title: 'કોર્ટ કસ્ટડી પત્ર',
    subtitle: 'ભારતીય નાગરિક સુરક્ષા સંહિતા, ૨૦૨૩ ની કલમ 187',
    fields: {
      courtName: 'ન્યાયાલય',
      caseNumber: 'કેસ નં.',
      accusedName: 'આરોપી',
      currentCustody: 'વર્તમાન કસ્ટડી',
      custodyPeriod: 'કસ્ટડી સમયગાળો',
      remandReason: 'રિમાન્ડનું કારણ',
    },
    sections: {
      custodyStatus: 'કસ્ટડી સ્થિતિ',
      investigationProgress: 'તપાસ પ્રગતિ',
      reasonsForCustody: 'કસ્ટડીના કારણો',
      prayer: 'પ્રાર્થના',
    },
    labels: {
      completed: 'પૂર્ણ',
      pending: 'બાકી',
    },
    declarations: [
      'આરોપીને ન્યાયિક કસ્ટડીમાં રાખવો જરૂરી છે.',
    ],
    footers: [
      'તપાસ અધિકારી',
      'પોલીસ સ્ટેશનની મોહર',
    ],
  },

  panchanama: {
    title: 'પંચનામું',
    subtitle: 'ભારતીય નાગરિક સુરક્ષા સંહિતા, ૨૦૨૩ ની કલમ 96-97',
    fields: {
      date: 'તારીખ',
      time: 'સમય',
      place: 'સ્થળ',
      searchConductedBy: 'શોધ કરનાર',
      panchWitness1: 'પંચ સાક્ષી ૧',
      panchWitness2: 'પંચ સાક્ષી ૨',
      premisesDescription: 'જગ્યાનું વર્ણન',
      itemsFound: 'મળેલી વસ્તુઓ',
    },
    sections: {
      preliminaryDetails: 'પ્રારંભિક વિગતો',
      placeDescription: 'જગ્યાનું વર્ણન',
      searchProceedings: 'શોધ કાર્યવાહી',
      seizureList: 'જપ્તી યાદી',
      panchStatement: 'પંચ સાક્ષીઓનું નિવેદન',
      conclusion: 'નિષ્કર્ષ',
    },
    labels: {
      we: 'અમે',
      present: 'હાજર',
      witnessed: 'સાક્ષી પૂર્વક જોયું',
      found: 'મળી આવ્યું',
    },
    declarations: [
      'ઉપરોક્ત તમામ કાર્યવાહી અમારી હાજરીમાં પારદર્શક રીતે કરવામાં આવી.',
      'જપ્ત વસ્તુઓની યાદી સાચી અને પૂર્ણ છે.',
    ],
    footers: [
      'પંચ સાક્ષી ૧ ની સહી',
      'પંચ સાક્ષી ૨ ની સહી',
      'તપાસ અધિકારીની સહી',
    ],
  },

  faceIdForm: {
    title: 'ફેસ આઈડેન્ટિફિકેશન ફોર્મ (TIP)',
    subtitle: 'ભારતીય સાક્ષ્ય અધિનિયમ, ૨૦૨૩',
    fields: {
      magistrateName: 'મેજિસ્ટ્રેટનું નામ',
      courtName: 'ન્યાયાલય',
      caseNumber: 'કેસ નં.',
      witnessName: 'સાક્ષી/ઓળખ કરનાર',
      accusedName: 'આરોપી',
      paradeDate: 'પરેડની તારીખ',
      paradeLocation: 'પરેડ સ્થળ',
      identificationResult: 'ઓળખ પરિણામ',
    },
    sections: {
      paradeDetails: 'પરેડની વિગતો',
      participants: 'સહભાગીઓ',
      identificationProcess: 'ઓળખ પ્રક્રિયા',
      result: 'પરિણામ',
      magistrateCertification: 'મેજિસ્ટ્રેટ પ્રમાણપત્ર',
    },
    labels: {
      identified: 'ઓળખ્યું',
      notIdentified: 'ઓળખ્યું નથી',
      confidence: 'ખાતરી',
    },
    declarations: [
      'આ ઓળખ પરેડ મારી હાજરીમાં નિષ્પક્ષ રીતે કરવામાં આવી.',
      'પરિણામો સાચા અને વિશ્વસનીય છે.',
    ],
    footers: [
      'મેજિસ્ટ્રેટની સહી',
      'સાક્ષીની સહી',
      'તપાસ અધિકારી',
    ],
  },

  lersRequest: {
    title: 'LERS ડેટા રિક્વેસ્ટ (Meta)',
    subtitle: 'કાયદા અમલીકરણ વિનંતી',
    fields: {
      requestingOfficer: 'વિનંતી કરનાર અધિકારી',
      policeStation: 'પોલીસ સ્ટેશન',
      caseNumber: 'કેસ નં.',
      accountTarget: 'ટાર્ગેટ એકાઉન્ટ',
      platform: 'પ્લેટફોર્મ',
      dataRequested: 'ડેટા વિનંતી',
      legalBasis: 'કાયદાકીય આધાર',
      urgency: 'તાત્કાલિકતા',
    },
    sections: {
      requestDetails: 'વિનંતી વિગતો',
      legalAuthority: 'કાયદાકીય સત્તા',
      dataCategories: 'ડેટા કેટેગરી',
      preservation: 'સંરક્ષણ વિનંતી',
    },
    labels: {
      subscriberInfo: 'સબ્સ્ક્રાઈબર માહિતી',
      accessLogs: 'ઍક્સેસ લૉગ્સ',
      communications: 'સંચાર',
      metadata: 'મેટાડેટા',
      urgent: 'તાત્કાલિક',
    },
    declarations: [
      'આ વિનંતી કાયદાકીય રીતે અધિકૃત છે.',
      'ડેટા તપાસ માટે આવશ્યક છે.',
    ],
    footers: [
      'વિનંતી કરનાર અધિકારી',
      'પોલીસ સ્ટેશનની મોહર',
    ],
  },
};

/* ════════════════════════════════════════════
   HINDI TRANSLATIONS
   ════════════════════════════════════════════ */
export const HI_DOC_TRANSLATIONS: DocTranslationSet = {
  fir: {
    title: 'प्रथम सूचना रिपोर्ट',
    subtitle: 'भारतीय नागरिक सुरक्षा संहिता, 2023 की धारा 173 के अंतर्गत',
    formNumber: 'प्रपत्र-IF1 (एकीकृत प्रपत्र)',
    fields: {
      firNumber: 'एफआईआर नं.',
      caseNumber: 'केस नं.',
      policeStation: 'पुलिस स्टेशन',
      gdEntry: 'जनरल डायरी एंट्री नं.',
      dateOfInfo: 'सूचना प्राप्त दिनांक',
      idProof: 'पहचान प्रमाण',
      victimName: 'शिकायतकर्ता/पीड़ित का नाम',
      victimFather: 'पिता/पति का नाम',
      victimAddress: 'पूर्ण पता',
      victimMobile: 'मोबाइल नं.',
      victimAadhar: 'आधार नं.',
      accusedName: 'आरोपी का नाम',
      accusedFather: 'पिता का नाम',
      accusedAddress: 'पता',
      incidentDate: 'घटना की तारीख',
      incidentTime: 'समय',
      incidentPlace: 'घटना स्थल',
      offenseSections: 'अपराध की धाराएं',
      complaint: 'शिकायत/सूचना का विवरण',
      actionTaken: 'की गई कार्रवाई',
      investigatingOfficer: 'जांच अधिकारी',
      officerRank: 'रैंक',
      officerBadge: 'बैज नं.',
    },
    sections: {
      complainantDetails: '1. शिकायतकर्ता/सूचनाकर्ता का विवरण',
      accusedDetails: '2. आरोपी का विवरण',
      incidentDetails: '3. घटना का विवरण',
      offenseDetails: '4. अपराध का विवरण',
      complaintNarrative: '5. शिकायत/सूचना',
      actionTaken: '6. की गई कार्रवाई',
      propertyDetails: '7. संपत्ति/मुद्देमाल का विवरण',
      declaration: '8. घोषणा',
    },
    labels: {
      propertyItem: 'आइटम',
      propertyValue: 'मूल्य',
      propertyRecovered: 'पुनः प्राप्त',
      propertyStatus: 'स्थिति',
      name: 'नाम',
      address: 'पता',
      phone: 'फोन',
      email: 'ईमेल',
      date: 'तारीख',
      time: 'समय',
      place: 'स्थान',
      description: 'विवरण',
    },
    declarations: [
      'मैं प्रमाणित करता/करती हूं कि उपरोक्त जानकारी मेरी सर्वोत्तम जानकारी और विश्वास के अनुसार सत्य है।',
      'यह शिकायत स्वेच्छा से दी गई है और किसी दबाव के تحت नहीं।',
      'सूचनाकर्ता को BNSS 2023 की धारा 180 के तहत झूठी जानकारी देने के प्रावधानों के बारे में समझाया गया है।',
    ],
    footers: [
      'जांच अधिकारी के हस्ताक्षर',
      'शिकायतकर्ता के हस्ताक्षर/अंगूठा निशान',
      'पुलिस स्टेशन की मोहर',
    ],
  },

  remandRequest: {
    title: 'रिमांड प्रार्थना पत्र',
    subtitle: 'भारतीय नागरिक सुरक्षा संहिता, 2023 की धारा 187 के अंतर्गत',
    fields: {
      courtName: 'न्यायालय का नाम',
      caseNumber: 'केस नं.',
      firNumber: 'FIR नं.',
      policeStation: 'पुलिस स्टेशन',
      accusedName: 'आरोपी का नाम',
      arrestDate: 'गिरफ्तारी की तारीख',
      arrestTime: 'समय',
      arrestPlace: 'गिरफ्तारी स्थल',
      custodyFrom: 'कस्टडी शुरू',
      custodyTo: 'कस्टडी समाप्त',
      remandDays: 'रिमांड दिन',
      reason: 'रिमांड का कारण',
      investigationNeeded: 'जांच की आवश्यकता',
    },
    sections: {
      subject: 'विषय',
      factsOfCase: 'केस के तथ्य',
      arrestDetails: 'गिरफ्तारी का विवरण',
      reasonsForRemand: 'रिमांड के कारण',
      investigationProgress: 'जांच की प्रगति',
      prayer: 'प्रार्थना',
    },
    labels: {
      respectfully: 'सादर',
      states: 'बताता/बताती है',
      completed: 'पूर्ण',
      pending: 'लंबित',
    },
    declarations: [
      'उपरोक्त सभी तथ्य मेरी सर्वोत्तम जानकारी के अनुसार सत्य हैं।',
      'आरोपी को कस्टडी में रखना जांच के लिए आवश्यक है।',
    ],
    footers: [
      'जांच अधिकारी',
      'पुलिस स्टेशन की मोहर',
    ],
  },

  chargesheet: {
    title: 'चार्जशीट',
    subtitle: 'भारतीय नागरिक सुरक्षा संहिता, 2023 की धारा 193 के अंतर्गत',
    formNumber: 'प्रपत्र-चार्जशीट',
    fields: {
      courtName: 'न्यायालय',
      caseNumber: 'केस नं.',
      firNumber: 'FIR नं.',
      policeStation: 'पुलिस स्टेशन',
      accusedName: 'आरोपी',
      victimName: 'पीड़ित',
      investigationOfficer: 'जांच अधिकारी',
      offenseSections: 'अपराध की धाराएं',
      summary: 'जांच सारांश',
      evidence: 'साक्ष्य',
      witnesses: 'गवाह',
    },
    sections: {
      caseDetails: 'केस का विवरण',
      accusedParticulars: 'आरोपी का विवरण',
      offenseCharges: 'अपराध के आरोप',
      investigationSummary: 'जांच सारांश',
      evidenceCollected: 'एकत्रित साक्ष्य',
      witnessList: 'गवाहों की सूची',
      conclusion: 'निष्कर्ष',
    },
    labels: {
      name: 'नाम',
      address: 'पता',
      evidence: 'साक्ष्य',
      statement: 'बयान',
    },
    declarations: [
      'जांच पूर्ण करने के बाद, यह चार्जशीट प्रस्तुत की जाती है।',
      'साक्ष्य और गवाहों की सूची संलग्न है।',
    ],
    footers: [
      'जांच अधिकारी के हस्ताक्षर',
      'पुलिस स्टेशन की मोहर',
    ],
  },

  purvaniChargesheet: {
    title: 'प्रारंभिक चार्जशीट',
    subtitle: 'भारतीय नागरिक सुरक्षा संहिता, 2023 की धारा 193',
    fields: {
      courtName: 'न्यायालय',
      caseNumber: 'केस नं.',
      firNumber: 'FIR नं.',
      policeStation: 'पुलिस स्टेशन',
      accusedName: 'आरोपी',
      preliminaryFindings: 'प्रारंभिक निष्कर्ष',
    },
    sections: {
      preliminaryInvestigation: 'प्रारंभिक जांच',
      findings: 'निष्कर्ष',
      furtherAction: 'आगामी कार्रवाई',
    },
    labels: {
      finding: 'निष्कर्ष',
      recommendation: 'सिफारिश',
    },
    declarations: [
      'प्रारंभिक जांच के आधार पर यह रिपोर्ट तैयार की गई है।',
    ],
    footers: [
      'जांच अधिकारी',
      'पुलिस स्टेशन',
    ],
  },

  seizureReceipt: {
    title: 'जप्ती रसीद',
    subtitle: 'भारतीय नागरिक सुरक्षा संहिता, 2023 की धारा 96-97',
    fields: {
      seizureDate: 'जप्ती की तारीख',
      seizureTime: 'समय',
      seizurePlace: 'जप्ती स्थल',
      seizedFrom: 'जिससे जप्त किया',
      seizedBy: 'जप्त करने वाला अधिकारी',
      witnessName: 'गवाह',
      itemDescription: 'आइटम का विवरण',
      quantity: 'मात्रा',
      condition: 'स्थिति',
      storageLocation: 'भंडारण स्थान',
    },
    sections: {
      seizureDetails: 'जप्ती का विवरण',
      itemsSeized: 'जप्त की गई वस्तुएं',
      chainOfCustody: 'कस्टडी चेन',
      acknowledgments: 'स्वीकृति',
    },
    labels: {
      serialNo: 'क्रमांक',
      item: 'वस्तु',
      description: 'विवरण',
      quantity: 'मात्रा',
      condition: 'स्थिति',
      hash: 'SHA-256 हैश',
    },
    declarations: [
      'उपरोक्त वस्तुएं मेरी उपस्थिति में जप्त की गई हैं।',
      'जप्ती प्रक्रिया कानूनी प्रक्रिया के अनुसार की गई है।',
    ],
    footers: [
      'जप्त करने वाले अधिकारी के हस्ताक्षर',
      'गवाह के हस्ताक्षर',
      'व्यक्ति के हस्ताक्षर (जिससे जप्त किया)',
    ],
  },

  medicalLetter: {
    title: 'चिकित्सा परीक्षण हेतु पत्र',
    subtitle: 'भारतीय नागरिक सुरक्षा संहिता, 2023',
    fields: {
      hospitalName: 'अस्पताल/चिकित्सक का नाम',
      patientName: 'रोगी का नाम',
      patientAge: 'आयु',
      examinationType: 'परीक्षण का प्रकार',
      urgency: 'तत्कालता',
      caseReference: 'केस संदर्भ',
    },
    sections: {
      request: 'अनुरोध',
      examinationRequired: 'आवश्यक परीक्षण',
      observations: 'अवलोकन',
    },
    labels: {
      kindly: 'कृपया',
      submit: 'रिपोर्ट प्रस्तुत करें',
    },
    declarations: [
      'यह चिकित्सा परीक्षण कानूनी कार्रवाई के लिए आवश्यक है।',
      'चिकित्सा रिपोर्ट तुरंत भेजने का अनुरोध।',
    ],
    footers: [
      'जांच अधिकारी',
      'पुलिस स्टेशन',
    ],
  },

  courtCustody: {
    title: 'कोर्ट कस्टडी पत्र',
    subtitle: 'भारतीय नागरिक सुरक्षा संहिता, 2023 की धारा 187',
    fields: {
      courtName: 'न्यायालय',
      caseNumber: 'केस नं.',
      accusedName: 'आरोपी',
      currentCustody: 'वर्तमान कस्टडी',
      custodyPeriod: 'कस्टडी अवधि',
      remandReason: 'रिमांड का कारण',
    },
    sections: {
      custodyStatus: 'कस्टडी स्थिति',
      investigationProgress: 'जांच प्रगति',
      reasonsForCustody: 'कस्टडी के कारण',
      prayer: 'प्रार्थना',
    },
    labels: {
      completed: 'पूर्ण',
      pending: 'लंबित',
    },
    declarations: [
      'आरोपी को न्यायिक कस्टडी में रखना आवश्यक है।',
    ],
    footers: [
      'जांच अधिकारी',
      'पुलिस स्टेशन की मोहर',
    ],
  },

  panchanama: {
    title: 'पंचनामा',
    subtitle: 'भारतीय नागरिक सुरक्षा संहिता, 2023 की धारा 96-97',
    fields: {
      date: 'तारीख',
      time: 'समय',
      place: 'स्थान',
      searchConductedBy: 'खोज करने वाले',
      panchWitness1: 'पंच गवाह 1',
      panchWitness2: 'पंच गवाह 2',
      premisesDescription: 'परिसर का विवरण',
      itemsFound: 'मिली वस्तुएं',
    },
    sections: {
      preliminaryDetails: 'प्रारंभिक विवरण',
      placeDescription: 'परिसर का विवरण',
      searchProceedings: 'खोज कार्यवाही',
      seizureList: 'जप्ती सूची',
      panchStatement: 'पंच गवाहों का बयान',
      conclusion: 'निष्कर्ष',
    },
    labels: {
      we: 'हम',
      present: 'उपस्थित',
      witnessed: 'गवाही दी',
      found: 'मिला',
    },
    declarations: [
      'उपरोक्त सभी कार्यवाही हमारी उपस्थिति में पारदर्शी रूप से की गई।',
      'जप्त वस्तुओं की सूची सत्य और पूर्ण है।',
    ],
    footers: [
      'पंच गवाह 1 के हस्ताक्षर',
      'पंच गवाह 2 के हस्ताक्षर',
      'जांच अधिकारी के हस्ताक्षर',
    ],
  },

  faceIdForm: {
    title: 'फेस आइडेंटिफिकेशन फॉर्म (TIP)',
    subtitle: 'भारतीय साक्ष्य अधिनियम, 2023',
    fields: {
      magistrateName: 'मजिस्ट्रेट का नाम',
      courtName: 'न्यायालय',
      caseNumber: 'केस नं.',
      witnessName: 'गवाह/पहचानकर्ता',
      accusedName: 'आरोपी',
      paradeDate: 'परेड की तारीख',
      paradeLocation: 'परेड स्थल',
      identificationResult: 'पहचान परिणाम',
    },
    sections: {
      paradeDetails: 'परेड का विवरण',
      participants: 'प्रतिभागी',
      identificationProcess: 'पहचान प्रक्रिया',
      result: 'परिणाम',
      magistrateCertification: 'मजिस्ट्रेट प्रमाणपत्र',
    },
    labels: {
      identified: 'पहचाना',
      notIdentified: 'पहचाना नहीं',
      confidence: 'विश्वास',
    },
    declarations: [
      'यह पहचान परेड मेरी उपस्थिति में निष्पक्ष रूप से की गई।',
      'परिणाम सत्य और विश्वसनीय हैं।',
    ],
    footers: [
      'मजिस्ट्रेट के हस्ताक्षर',
      'गवाह के हस्ताक्षर',
      'जांच अधिकारी',
    ],
  },

  lersRequest: {
    title: 'LERS डेटा अनुरोध (Meta)',
    subtitle: 'कानून प्रवर्तन अनुरोध',
    fields: {
      requestingOfficer: 'अनुरोधकर्ता अधिकारी',
      policeStation: 'पुलिस स्टेशन',
      caseNumber: 'केस नं.',
      accountTarget: 'लक्ष्य खाता',
      platform: 'प्लेटफॉर्म',
      dataRequested: 'अनुरोधित डेटा',
      legalBasis: 'कानूनी आधार',
      urgency: 'तत्कालता',
    },
    sections: {
      requestDetails: 'अनुरोध विवरण',
      legalAuthority: 'कानूनी अधिकार',
      dataCategories: 'डेटा श्रेणियां',
      preservation: 'संरक्षण अनुरोध',
    },
    labels: {
      subscriberInfo: 'सब्सक्राइबर जानकारी',
      accessLogs: 'एक्सेस लॉग',
      communications: 'संचार',
      metadata: 'मेटाडेटा',
      urgent: 'तत्काल',
    },
    declarations: [
      'यह अनुरोध कानूनी रूप से अधिकृत है।',
      'डेटा जांच के लिए आवश्यक है।',
    ],
    footers: [
      'अनुरोधकर्ता अधिकारी',
      'पुलिस स्टेशन की मोहर',
    ],
  },
};

/* ════════════════════════════════════════════
   ENGLISH TRANSLATIONS
   ════════════════════════════════════════════ */
export const EN_DOC_TRANSLATIONS: DocTranslationSet = {
  fir: {
    title: 'FIRST INFORMATION REPORT',
    subtitle: 'Under Section 173 of Bharatiya Nagarik Suraksha Sanhita, 2023',
    formNumber: 'FORM-IF1 (Integrated Form)',
    fields: {
      firNumber: 'FIR No.',
      caseNumber: 'Case No.',
      policeStation: 'Police Station',
      gdEntry: 'General Diary Entry No.',
      dateOfInfo: 'Date of Information',
      idProof: 'ID Proof',
      victimName: 'Complainant/Victim Name',
      victimFather: "Father's/Husband's Name",
      victimAddress: 'Full Address',
      victimMobile: 'Mobile No.',
      victimAadhar: 'Aadhar No.',
      accusedName: 'Accused Name',
      accusedFather: "Father's Name",
      accusedAddress: 'Address',
      incidentDate: 'Date of Incident',
      incidentTime: 'Time',
      incidentPlace: 'Place of Incident',
      offenseSections: 'Offense Sections',
      complaint: 'Complaint/Information Details',
      actionTaken: 'Action Taken',
      investigatingOfficer: 'Investigating Officer',
      officerRank: 'Rank',
      officerBadge: 'Badge No.',
    },
    sections: {
      complainantDetails: '1. Complainant/Informant Details',
      accusedDetails: '2. Accused Details',
      incidentDetails: '3. Incident Details',
      offenseDetails: '4. Offense Details',
      complaintNarrative: '5. Complaint/Information',
      actionTaken: '6. Action Taken',
      propertyDetails: '7. Property/Stolen Goods Details',
      declaration: '8. Declaration',
    },
    labels: {
      propertyItem: 'Item',
      propertyValue: 'Value',
      propertyRecovered: 'Recovered',
      propertyStatus: 'Status',
      name: 'Name',
      address: 'Address',
      phone: 'Phone',
      email: 'Email',
      date: 'Date',
      time: 'Time',
      place: 'Place',
      description: 'Description',
    },
    declarations: [
      'I certify that the above information is true to the best of my knowledge and belief.',
      'This complaint is given voluntarily and without any coercion.',
      'The informant has been explained the provisions of giving false information under Section 180 of BNSS 2023.',
    ],
    footers: [
      'Investigating Officer Signature',
      'Complainant Signature/Thumb Impression',
      'Police Station Seal',
    ],
  },

  remandRequest: {
    title: 'REMAND APPLICATION',
    subtitle: 'Under Section 187 of Bharatiya Nagarik Suraksha Sanhita, 2023',
    fields: {
      courtName: 'Court Name',
      caseNumber: 'Case No.',
      firNumber: 'FIR No.',
      policeStation: 'Police Station',
      accusedName: 'Accused Name',
      arrestDate: 'Date of Arrest',
      arrestTime: 'Time',
      arrestPlace: 'Place of Arrest',
      custodyFrom: 'Custody From',
      custodyTo: 'Custody To',
      remandDays: 'Remand Days',
      reason: 'Reason for Remand',
      investigationNeeded: 'Investigation Required',
    },
    sections: {
      subject: 'Subject',
      factsOfCase: 'Facts of the Case',
      arrestDetails: 'Arrest Details',
      reasonsForRemand: 'Reasons for Remand',
      investigationProgress: 'Investigation Progress',
      prayer: 'Prayer',
    },
    labels: {
      respectfully: 'Respectfully',
      states: 'States',
      completed: 'Completed',
      pending: 'Pending',
    },
    declarations: [
      'All the above facts are true to the best of my knowledge.',
      'It is necessary to keep the accused in custody for investigation.',
    ],
    footers: [
      'Investigating Officer',
      'Police Station Seal',
    ],
  },

  chargesheet: {
    title: 'CHARGESHEET',
    subtitle: 'Under Section 193 of Bharatiya Nagarik Suraksha Sanhita, 2023',
    formNumber: 'Form-Chargesheet',
    fields: {
      courtName: 'Court',
      caseNumber: 'Case No.',
      firNumber: 'FIR No.',
      policeStation: 'Police Station',
      accusedName: 'Accused',
      victimName: 'Victim',
      investigationOfficer: 'Investigating Officer',
      offenseSections: 'Offense Sections',
      summary: 'Investigation Summary',
      evidence: 'Evidence',
      witnesses: 'Witnesses',
    },
    sections: {
      caseDetails: 'Case Details',
      accusedParticulars: 'Accused Particulars',
      offenseCharges: 'Offense Charges',
      investigationSummary: 'Investigation Summary',
      evidenceCollected: 'Evidence Collected',
      witnessList: 'Witness List',
      conclusion: 'Conclusion',
    },
    labels: {
      name: 'Name',
      address: 'Address',
      evidence: 'Evidence',
      statement: 'Statement',
    },
    declarations: [
      'After completing the investigation, this chargesheet is submitted.',
      'Evidence and witness list are enclosed.',
    ],
    footers: [
      'Investigating Officer Signature',
      'Police Station Seal',
    ],
  },

  purvaniChargesheet: {
    title: 'PRELIMINARY CHARGESHEET',
    subtitle: 'Under Section 193 of Bharatiya Nagarik Suraksha Sanhita, 2023',
    fields: {
      courtName: 'Court',
      caseNumber: 'Case No.',
      firNumber: 'FIR No.',
      policeStation: 'Police Station',
      accusedName: 'Accused',
      preliminaryFindings: 'Preliminary Findings',
    },
    sections: {
      preliminaryInvestigation: 'Preliminary Investigation',
      findings: 'Findings',
      furtherAction: 'Further Action',
    },
    labels: {
      finding: 'Finding',
      recommendation: 'Recommendation',
    },
    declarations: [
      'This report is prepared based on preliminary investigation.',
    ],
    footers: [
      'Investigating Officer',
      'Police Station',
    ],
  },

  seizureReceipt: {
    title: 'SEIZURE RECEIPT',
    subtitle: 'Under Sections 96-97 of Bharatiya Nagarik Suraksha Sanhita, 2023',
    fields: {
      seizureDate: 'Date of Seizure',
      seizureTime: 'Time',
      seizurePlace: 'Place of Seizure',
      seizedFrom: 'Seized From',
      seizedBy: 'Seized By',
      witnessName: 'Witness',
      itemDescription: 'Item Description',
      quantity: 'Quantity',
      condition: 'Condition',
      storageLocation: 'Storage Location',
    },
    sections: {
      seizureDetails: 'Seizure Details',
      itemsSeized: 'Items Seized',
      chainOfCustody: 'Chain of Custody',
      acknowledgments: 'Acknowledgments',
    },
    labels: {
      serialNo: 'Serial No.',
      item: 'Item',
      description: 'Description',
      quantity: 'Quantity',
      condition: 'Condition',
      hash: 'SHA-256 Hash',
    },
    declarations: [
      'The above items were seized in my presence.',
      'The seizure process was conducted according to legal procedure.',
    ],
    footers: [
      'Seizing Officer Signature',
      'Witness Signature',
      'Person Signature (From whom seized)',
    ],
  },

  medicalLetter: {
    title: 'MEDICAL EXAMINATION LETTER',
    subtitle: 'Under Bharatiya Nagarik Suraksha Sanhita, 2023',
    fields: {
      hospitalName: 'Hospital/Doctor Name',
      patientName: 'Patient Name',
      patientAge: 'Age',
      examinationType: 'Examination Type',
      urgency: 'Urgency',
      caseReference: 'Case Reference',
    },
    sections: {
      request: 'Request',
      examinationRequired: 'Examination Required',
      observations: 'Observations',
    },
    labels: {
      kindly: 'Kindly',
      submit: 'Submit Report',
    },
    declarations: [
      'This medical examination is required for legal proceedings.',
      'Kindly submit the medical report at the earliest.',
    ],
    footers: [
      'Investigating Officer',
      'Police Station',
    ],
  },

  courtCustody: {
    title: 'COURT CUSTODY LETTER',
    subtitle: 'Under Section 187 of Bharatiya Nagarik Suraksha Sanhita, 2023',
    fields: {
      courtName: 'Court',
      caseNumber: 'Case No.',
      accusedName: 'Accused',
      currentCustody: 'Current Custody',
      custodyPeriod: 'Custody Period',
      remandReason: 'Remand Reason',
    },
    sections: {
      custodyStatus: 'Custody Status',
      investigationProgress: 'Investigation Progress',
      reasonsForCustody: 'Reasons for Custody',
      prayer: 'Prayer',
    },
    labels: {
      completed: 'Completed',
      pending: 'Pending',
    },
    declarations: [
      'It is necessary to keep the accused in judicial custody.',
    ],
    footers: [
      'Investigating Officer',
      'Police Station Seal',
    ],
  },

  panchanama: {
    title: 'PANCHANAMA',
    subtitle: 'Under Sections 96-97 of Bharatiya Nagarik Suraksha Sanhita, 2023',
    fields: {
      date: 'Date',
      time: 'Time',
      place: 'Place',
      searchConductedBy: 'Search Conducted By',
      panchWitness1: 'Panch Witness 1',
      panchWitness2: 'Panch Witness 2',
      premisesDescription: 'Premises Description',
      itemsFound: 'Items Found',
    },
    sections: {
      preliminaryDetails: 'Preliminary Details',
      placeDescription: 'Place Description',
      searchProceedings: 'Search Proceedings',
      seizureList: 'Seizure List',
      panchStatement: 'Panch Witnesses Statement',
      conclusion: 'Conclusion',
    },
    labels: {
      we: 'We',
      present: 'Present',
      witnessed: 'Witnessed',
      found: 'Found',
    },
    declarations: [
      'All the above proceedings were conducted transparently in our presence.',
      'The list of seized items is true and complete.',
    ],
    footers: [
      'Panch Witness 1 Signature',
      'Panch Witness 2 Signature',
      'Investigating Officer Signature',
    ],
  },

  faceIdForm: {
    title: 'FACE IDENTIFICATION FORM (TIP)',
    subtitle: 'Under Bharatiya Sakshya Adhiniyam, 2023',
    fields: {
      magistrateName: 'Magistrate Name',
      courtName: 'Court',
      caseNumber: 'Case No.',
      witnessName: 'Witness/Identifier',
      accusedName: 'Accused',
      paradeDate: 'Parade Date',
      paradeLocation: 'Parade Location',
      identificationResult: 'Identification Result',
    },
    sections: {
      paradeDetails: 'Parade Details',
      participants: 'Participants',
      identificationProcess: 'Identification Process',
      result: 'Result',
      magistrateCertification: 'Magistrate Certification',
    },
    labels: {
      identified: 'Identified',
      notIdentified: 'Not Identified',
      confidence: 'Confidence',
    },
    declarations: [
      'This identification parade was conducted fairly in my presence.',
      'The results are true and reliable.',
    ],
    footers: [
      'Magistrate Signature',
      'Witness Signature',
      'Investigating Officer',
    ],
  },

  lersRequest: {
    title: 'LERS DATA REQUEST (Meta)',
    subtitle: 'Law Enforcement Request',
    fields: {
      requestingOfficer: 'Requesting Officer',
      policeStation: 'Police Station',
      caseNumber: 'Case No.',
      accountTarget: 'Target Account',
      platform: 'Platform',
      dataRequested: 'Data Requested',
      legalBasis: 'Legal Basis',
      urgency: 'Urgency',
    },
    sections: {
      requestDetails: 'Request Details',
      legalAuthority: 'Legal Authority',
      dataCategories: 'Data Categories',
      preservation: 'Preservation Request',
    },
    labels: {
      subscriberInfo: 'Subscriber Information',
      accessLogs: 'Access Logs',
      communications: 'Communications',
      metadata: 'Metadata',
      urgent: 'Urgent',
    },
    declarations: [
      'This request is legally authorized.',
      'The data is necessary for investigation.',
    ],
    footers: [
      'Requesting Officer',
      'Police Station Seal',
    ],
  },
};

/* ════════════════════════════════════════════
   LEGAL SECTION TRANSLATIONS — ENGLISH
   ════════════════════════════════════════════ */
export const EN_LEGAL_SECTIONS: LegalSectionTranslations = {
  'bns-303': { title: 'Theft', description: 'Whoever, intending to take dishonestly any moveable property out of the possession of any person without that person\'s consent, moves that property in order to such taking, is said to commit theft.', punishment: 'Imprisonment up to 3 years, or fine, or both' },
  'bns-101': { title: 'Murder', description: 'Culpable homicide is murder if the act by which the death is caused is done with the intention of causing death, or if it is done with the intention of causing such bodily injury as the offender knows to be likely to cause the death.', punishment: 'Death or imprisonment for life, and fine' },
  'bns-100': { title: 'Culpable Homicide', description: 'Whoever causes death by doing an act with the intention of causing death, or with the intention of causing such bodily injury as is likely to cause death, or with the knowledge that he is likely by such act to cause death, commits the offence of culpable homicide.', punishment: 'Imprisonment for life, or imprisonment up to 10 years and fine' },
  'bns-106': { title: 'Causing Death by Rash or Negligent Act', description: 'Whoever causes the death of any person by doing any rash or negligent act not amounting to culpable homicide shall be punished with imprisonment up to 5 years and fine.', punishment: 'Imprisonment up to 5 years and fine' },
  'bns-308': { title: 'Extortion', description: 'Whoever intentionally puts any person in fear of any injury to that person, or to any other, and thereby dishonestly induces the person so put in fear to deliver to any person any property or valuable security, commits extortion.', punishment: 'Imprisonment up to 3 years, or fine, or both' },
  'bns-309': { title: 'Robbery', description: 'In all robbery there is either theft or extortion. Theft is robbery if, in order to the committing of the theft, or in committing the theft, the offender voluntarily causes or attempts to cause death, hurt or wrongful restraint.', punishment: 'Imprisonment up to 7 years and fine' },
  'bns-310': { title: 'Dacoity', description: 'When five or more persons conjointly commit or attempt to commit a robbery, every person so committing, attempting or aiding, is said to commit dacoity.', punishment: 'Imprisonment for life, or imprisonment up to 10 years and fine' },
  'bns-318': { title: 'Cheating', description: 'Whoever, by deceiving any person, fraudulently or dishonestly induces the person so deceived to deliver any property to any person, or to consent that any person shall retain any property, commits cheating.', punishment: 'Imprisonment up to 3 years, or fine, or both' },
  'bns-63': { title: 'Rape', description: 'A man is said to commit rape who has sexual intercourse with a woman against her will, without her consent, or with her consent obtained under fear, misconception, or when she is unable to understand the nature of the act.', punishment: 'Imprisonment not less than 10 years, which may extend to life, and fine' },
  'bns-75': { title: 'Sexual Harassment', description: 'A man committing any act of sexual harassment including physical contact and advances involving unwelcome and explicit sexual overtures, or a demand or request for sexual favours, or showing pornography against the will of a woman.', punishment: 'Imprisonment up to 3 years, or fine, or both' },
  'bnss-173': { title: 'Information in Cognizable Cases (FIR)', description: 'Every information relating to the commission of a cognizable offence, if given orally to an officer in charge of a police station, shall be reduced to writing by him or under his direction, and be read over to the informant.' },
  'bnss-174': { title: 'Police Investigation', description: 'The police shall proceed to investigate the case and collect evidence both in favour of and against the accused.' },
  'bnss-193': { title: 'Report of Police Officer on Completion of Investigation (Chargesheet)', description: 'Every investigation shall be completed without unnecessary delay, and the report shall be forwarded to the Magistrate under Section 193.' },
  'bsa-3': { title: 'Evidence Defined', description: 'Evidence means and includes all statements which the Court permits or requires to be made before it by witnesses in relation to matters of fact under inquiry (oral evidence), and all documents including electronic records produced for inspection (documentary evidence).', punishment: 'Imprisonment up to 3 years, or fine, or both' },
  'bns-305': { title: 'Theft in Dwelling House', description: 'Whoever commits theft in any building, tent or vessel used as a human dwelling or for the custody of property shall be punished with imprisonment up to 7 years and fine.', punishment: 'Imprisonment up to 7 years and fine' },
  'bns-306': { title: 'Theft by Clerk or Servant', description: 'Whoever, being a clerk or servant, commits theft in respect of any property in the possession of his master or employer, shall be punished with imprisonment up to 7 years and fine.', punishment: 'Imprisonment up to 7 years and fine' },
  'bns-311': { title: 'Robbery or Dacoity with Attempt to Cause Death', description: 'If, at the time of committing robbery or dacoity, the offender uses any deadly weapon, or causes grievous hurt to any person, the imprisonment may be extended to imprisonment for life.', punishment: 'Imprisonment for life, or imprisonment up to 10 years and fine' },
  'bns-317': { title: 'Stolen Property', description: 'Property transferred by theft, extortion, robbery or dacoity is designated as stolen property. Whoever dishonestly receives or retains any stolen property knowing it to be stolen shall be punished.', punishment: 'Imprisonment up to 3 years, or fine, or both' },
  'bns-319': { title: 'Cheating by Personation', description: 'A person is said to cheat by personation if he cheats by pretending to be some other person, or by knowingly substituting one person for another.', punishment: 'Imprisonment up to 5 years, or fine, or both' },
  'bns-320': { title: 'Fraudulent Removal of Property', description: 'Whoever dishonestly or fraudulently removes or conceals any property to prevent distribution among creditors shall be punished.', punishment: 'Imprisonment up to 2 years, or fine, or both' },
  'bns-336': { title: 'Forgery', description: 'Whoever makes any false document or false electronic record with intent to cause damage or injury, or to support any claim or title.', punishment: 'Imprisonment up to 2 years, or fine, or both' },
  'bns-338': { title: 'Forgery for Purpose of Cheating', description: 'Whoever commits forgery, intending that the document forged shall be used for the purpose of cheating, shall be punished with imprisonment up to 7 years and fine.', punishment: 'Imprisonment up to 7 years and fine' },
  'bns-340': { title: 'Using Forged Document as Genuine', description: 'Whoever fraudulently or dishonestly uses any forged document as genuine shall be punished in the same manner as if he had forged such document.', punishment: 'Imprisonment up to 2 years, or fine, or both' },
  'bns-344': { title: 'Falsification of Accounts', description: 'Whoever, being a clerk or servant, wilfully and with intent to defraud, destroys, alters, mutilates or falsifies any book, electronic record, paper, writing or account belonging to his employer.', punishment: 'Imprisonment up to 7 years, or fine, or both' },
  'bns-356': { title: 'Defamation', description: 'Whoever, by words spoken or intended to be read, or by signs or visible representations, makes or publishes any imputation intending to harm the reputation of any person.', punishment: 'Simple imprisonment up to 2 years, or fine, or both' },
  'bns-351': { title: 'Criminal Intimidation', description: 'Whoever threatens another with any injury to his person, reputation or property with intent to cause alarm, or to cause that person to do any act which he is not legally bound to do.', punishment: 'Imprisonment up to 2 years, or fine, or both' },
  'bns-115': { title: 'Voluntarily Causing Hurt', description: 'Whoever does any act with the intention of thereby causing hurt to any person, or with the knowledge that he is likely thereby to cause hurt, and does thereby cause hurt.', punishment: 'Imprisonment up to 1 year, or fine up to ten thousand rupees, or both' },
  'bns-117': { title: 'Voluntarily Causing Grievous Hurt', description: 'Whoever voluntarily causes grievous hurt shall be punished. Grievous hurt includes emasculation, permanent privation of sight/hearing, fracture, disfigurement.', punishment: 'Imprisonment up to 7 years and fine' },
  'bns-126': { title: 'Wrongful Restraint', description: 'Whoever voluntarily obstructs any person so as to prevent that person from proceeding in any direction in which that person has a right to proceed.', punishment: 'Imprisonment up to 1 month, or fine up to 5000 rupees, or both' },
  'bns-127': { title: 'Wrongful Confinement', description: 'Whoever wrongfully restrains any person in such a manner as to prevent that person from proceeding beyond certain circumscribing limits.', punishment: 'Imprisonment up to 1 year, or fine up to 5000 rupees, or both' },
  'bns-70': { title: 'Gang Rape', description: 'Where a woman is raped by one or more persons constituting a group or acting in furtherance of a common intention, each shall be deemed to have committed gang rape.', punishment: 'Rigorous imprisonment not less than 20 years, which may extend to life, and fine' },
  'bns-79': { title: 'Word/Gesture/Act to Insult Modesty of Woman', description: 'Whoever, intending to insult the modesty of any woman, utters any words, makes any sound or gesture, or exhibits any object intending that such word or gesture shall be seen or heard by such woman.', punishment: 'Imprisonment up to 3 years, or fine, or both' },
  'bns-45': { title: 'Abetment', description: 'A person abets the doing of a thing who instigates any person to do that thing, or engages in conspiracy for the doing of that thing, or intentionally aids by any act or illegal omission.', punishment: 'Same as the offence abetted' },
  'bns-61': { title: 'Criminal Conspiracy', description: 'When two or more persons agree to do, or cause to be done, an illegal act, or an act which is not illegal by illegal means, such an agreement is designated a criminal conspiracy.', punishment: 'Imprisonment up to 6 months, or fine, or both (for conspiracy to commit offence); same as main offence otherwise' },
  'bns-191': { title: 'Rioting', description: 'Whenever force or violence is used by an unlawful assembly, or by any member thereof, in prosecution of the common object of such assembly, every member is guilty of rioting.', punishment: 'Imprisonment up to 2 years, or fine, or both' },
  'bnss-35': { title: 'When Police May Arrest Without Warrant', description: 'Any police officer may without an order from a Magistrate and without a warrant, arrest any person who commits a cognizable offence, or against whom reasonable complaint has been made or reasonable suspicion exists.', legacyReference: 'CrPC 41, 41A' },
  'bnss-49': { title: 'Search of Arrested Person', description: 'Whenever a person is arrested under a warrant or without a warrant, the police officer may search such person and place in safe custody all articles found upon him which may be used as evidence.', legacyReference: 'CrPC 51' },
  'bnss-175': { title: 'Power of Police Officer to Investigate Cognizable Case', description: 'Any officer in charge of a police station may, without the order of a Magistrate, investigate any cognizable case which a Court having jurisdiction would have power to inquire into or try.', legacyReference: 'CrPC 156' },
  'bnss-180': { title: 'Power of Police Officer to Examine Witnesses', description: 'Any police officer making an investigation may examine orally any person supposed to be acquainted with the circumstances and facts of the case.', legacyReference: 'CrPC 161' },
  'bnss-187': { title: 'Procedure When Investigation Cannot Be Completed in Twenty-Four Hours', description: 'Whenever any person is arrested and investigation cannot be completed within 24 hours, the officer shall transmit to the nearest Judicial Magistrate a copy of diary entries and forward the accused. Magistrate may authorise detention up to 15 days or 60/90 days.', legacyReference: 'CrPC 167' },
  'bnss-226': { title: 'Bail in Non-Bailable Offences', description: 'When any person accused of any non-bailable offence is arrested, he may be released on bail, but shall not be so released if there appear reasonable grounds for believing he has committed an offence punishable with death or life imprisonment.', legacyReference: 'CrPC 437' },
  'bsa-57': { title: 'Oral Evidence', description: 'All facts, except the contents of documents, may be proved by oral evidence. Oral evidence must in all cases be direct.', legacyReference: 'IEA 59, 60' },
  'bsa-58': { title: 'Documentary Evidence', description: 'Documents produced for the inspection of the Court are called documentary evidence. Primary evidence means the document itself produced for inspection.', legacyReference: 'IEA 61, 62' },
  'bsa-63': { title: 'Secondary Evidence', description: 'Secondary evidence includes certified copies, copies made by mechanical processes, counterparts of documents, and oral accounts of the contents of a document.', legacyReference: 'IEA 63, 65' },
  'bsa-85': { title: 'Admissibility of Electronic Records', description: 'Electronic records shall be admissible as evidence in any proceedings, subject to conditions regarding integrity, hash verification, and certification.', legacyReference: 'IEA 65A' },
  'bsa-88': { title: 'Proof of Electronic Records', description: 'For proving any electronic record, a certificate identifying the electronic record and describing how it was produced, signed by a responsible official, shall be evidence.', legacyReference: 'IEA 65B' },
  'bsa-15': { title: 'Admission Defined', description: 'An admission is a statement, oral or documentary or contained in electronic form, which suggests any inference as to any fact in issue or relevant fact. Admissions need not be conclusive.', legacyReference: 'IEA 17' },
  'bsa-22': { title: 'Confession Caused by Inducement When Irrelevant', description: 'A confession is irrelevant if caused by any inducement, threat, coercion or promise having reference to the charge, proceeding from a person in authority.', legacyReference: 'IEA 24' },
  'bsa-24': { title: 'Confession by Accused in Police Custody', description: 'No confession made by any person whilst in the custody of a police officer, unless made in the immediate presence of a Magistrate, shall be proved.', legacyReference: 'IEA 26' },
  'bsa-25': { title: 'Confession to Police Officer', description: 'No confession made to a police officer shall be proved as against a person accused of any offence.', legacyReference: 'IEA 25' },
  'bsa-94': { title: 'Opinion of Experts', description: 'When the Court has to form an opinion upon a point of foreign law, science, art, identity of handwriting or finger impressions, opinions of persons specially skilled are relevant.', legacyReference: 'IEA 45' },
};

/* ════════════════════════════════════════════
   LEGAL SECTION TRANSLATIONS — GUJARATI
   ════════════════════════════════════════════ */
export const GU_LEGAL_SECTIONS: LegalSectionTranslations = {
  'bns-303': { title: 'ચોરી', description: 'કોઈ વ્યક્તિની સંમતિ વિના, તેમની પાસેથી જંગમ મિલકત બેઈમાનીથી લઈ જવાની નિયત સાથે, તે મિલકતને તે રીતે ખસેડવી તે ચોરી કહેવાય છે.', punishment: '૩ વર્ષ સુધીની કેદ, અથવા દંડ, અથવા બંને' },
  'bns-101': { title: 'હત્યા', description: 'જો મૃત્યુનું કારણ બનતું કૃત્ય મૃત્યુની નિયત સાથે કરવામાં આવે, અથવા એવી શારીરિક ઈજા પહોંચાડવાની નિયત સાથે જે મૃત્યુનું કારણ બની શકે છે, તો તે હત્યા ગણાય છે.', punishment: 'મૃત્યુદંડ અથવા આજીવન કેદ, અને દંડ' },
  'bns-100': { title: 'ગુનેગાર નરસંહાર', description: 'જો કોઈ વ્યક્તિ મૃત્યુની નિયત સાથે, અથવા એવી શારીરિક ઈજા પહોંચાડવાની નિયત સાથે જે મૃત્યુનું કારણ બની શકે છે, અથવા એવી જાણકારી સાથે કે તેના કૃત્યથી મૃત્યુ થઈ શકે છે, તો તે ગુનેગાર નરસંહારનો ગુનો કરે છે.', punishment: 'આજીવન કેદ, અથવા ૧૦ વર્ષ સુધીની કેદ અને દંડ' },
  'bns-106': { title: 'અવિચારી અથવા બેદરકારી કૃત્યથી મૃત્યુ', description: 'જો કોઈ વ્યક્તિ ગુનેગાર નરસંહાર ન બને તેવા કોઈ અવિચારી અથવા બેદરકારી કૃત્ય દ્વારા કોઈ વ્યક્તિના મૃત્યુનું કારણ બને છે, તો તેને ૫ વર્ષ સુધીની કેદ અને દંડથી સજા થશે.', punishment: '૫ વર્ષ સુધીની કેદ અને દંડ' },
  'bns-308': { title: 'બ્લેકમેઈલ/વસૂલાવું', description: 'જો કોઈ વ્યક્તિ જાણીજોઈને કોઈ વ્યક્તિને ઈજાનો ડર પમાડે છે, અને તે ડરથી વ્યક્તિને કોઈ મિલકત આપવા પ્રેરે છે, તો તે બ્લેકમેઈલ ગણાય છે.', punishment: '૩ વર્ષ સુધીની કેદ, અથવા દંડ, અથવા બંને' },
  'bns-309': { title: 'લૂંટ', description: 'ચોરી કરતી વખતે અથવા ચોરી કરવા માટે, જો ગુનેગાર જાણીજોઈને મૃત્યુ, ઈજા અથવા ખોટી અટકાયતનું કારણ બને છે અથવા પ્રયાસ કરે છે, તો તે લૂંટ ગણાય છે.', punishment: '૭ વર્ષ સુધીની કેદ અને દંડ' },
  'bns-310': { title: 'ડકાઈતી', description: 'જ્યારે પાંચ કે તેથી વધુ વ્યક્તિઓ મળીને લૂંટ કરે છે અથવા કરવાનો પ્રયાસ કરે છે, ત્યારે તેમાંથી દરેક વ્યક્તિ ડકાઈતીનો ગુનો કરે છે ગણાય છે.', punishment: 'આજીવન કેદ, અથવા ૧૦ વર્ષ સુધીની કેદ અને દંડ' },
  'bns-318': { title: 'ફસવણી/ઠગાઈ', description: 'જો કોઈ વ્યક્તિ કોઈને છેતરીને, બેઈમાનીથી અથવા ફ્રોડથી તે વ્યક્તિને કોઈ મિલકત આપવા પ્રેરે છે, તો તે ફસવણી ગણાય છે.', punishment: '૩ વર્ષ સુધીની કેદ, અથવા દંડ, અથવા બંને' },
  'bns-63': { title: 'બળાત્કાર', description: 'જો કોઈ પુરુષ મહિલાની ઈચ્છા વિરુદ્ધ, તેની સંમતિ વિના, અથવા ડર હેઠળ મેળવેલી સંમતિ સાથે, અથવા જ્યારે તે કૃત્યની પ્રકૃતિ સમજવામાં અસમર્થ હોય ત્યારે, તેની સાથે શારીરિક સંબંધ બાંધે છે, તો તે બળાત્કાર ગણાય છે.', punishment: 'ઓછામાં ઓછી ૧૦ વર્ષની કેદ, જે આજીવન સુધી વિસ્તરી શકે છે, અને દંડ' },
  'bns-75': { title: 'લૈંગિક સતામણી', description: 'કોઈ પુરુષ દ્વારા લૈંગિક સતામણીનું કૃત્ય, જેમાં અનિચ્છનીય શારીરિક સંપર્ક અને અગ્રગામી, લૈંગિક સુખાકારીની માંગ, અથવા મહિલાની ઈચ્છા વિરુદ્ધ અશ્લીલ સામગ્રી બતાવવાનો સમાવેશ થાય છે.', punishment: '૩ વર્ષ સુધીની કેદ, અથવા દંડ, અથવા બંને' },
  'bnss-173': { title: 'સંજ્ઞેય ગુનાઓમાં માહિતી (FIR)', description: 'સંજ્ઞેય ગુનાની કમિશન સંબંધિત દરેક માહિતી, જો પોલીસ સ્ટેશનના ઈન્ચાર્જ અધિકારીને મૌખિક રીતે આપવામાં આવે, તો તેમના દ્વારા અથવા તેમના નિર્દેશન હેઠળ લેખિતમાં રેડ્યુસ કરવામાં આવશે, અને જાણકારને વાંચીને સંભળાવવામાં આવશે.' },
  'bnss-174': { title: 'પોલીસ તપાસ', description: 'પોલીસ કેસની તપાસ કરવા અને આરોપીની તરફેણમાં અને વિરુદ્ધ બંને પુરાવા એકઠા કરવા માટે આગળ વધશે.' },
  'bnss-193': { title: 'તપાસ પૂર્ણ થયા બાદ પોલીસ અધિકારીનો અહેવાળ (ચાર્જશીટ)', description: 'દરેક તપાસ અનાવશ્યક વિલંબ વિના પૂર્ણ કરવામાં આવશે, અને અહેવાળ કલમ ૧૯૩ હેઠળ મેજિસ્ટ્રેટને મોકલવામાં આવશે.' },
  'bsa-3': { title: 'પુરાવાની વ્યાખ્યા', description: 'પુરાવા એટલે તમામ નિવેદનો જે કોર્ટ તપાસ હેઠળના તથ્યો સંબંધિત સાક્ષીદ્વારા આપવાની મંજૂરી અથવા જરૂરિયાત છે (મૌખિક પુરાવા), અને તપાસ માટે ઉત્પન્ન કરવામાં આવેલા તમામ દસ્તાવેજો જેમાં ઈલેક્ટ્રોનિક રેકોર્ડનો સમાવેશ થાય છે (દસ્તાવેજી પુરાવા).' },
};

/* ════════════════════════════════════════════
   LEGAL SECTION TRANSLATIONS — HINDI
   ════════════════════════════════════════════ */
export const HI_LEGAL_SECTIONS: LegalSectionTranslations = {
  'bns-303': { title: 'चोरी', description: 'किसी व्यक्ति की सहमति के बिना, उस व्यक्ति के कब्जे से बेईमानी से चल संपत्ति लेने के इरादे से, उस संपत्ति को उस उद्देश्य के लिए हिलाना चोरी कहलाता है।', punishment: '३ वर्ष तक की कारावास, या जुर्माना, या दोनों' },
  'bns-101': { title: 'हत्या', description: 'यदि मृत्यु का कारण बनने वाला कार्य मृत्यु के इरादे से किया जाता है, या ऐसी शारीरिक चोट पहुंचाने के इरादे से जो मृत्यु का कारण बन सकती है, तो वह हत्या मानी जाती है।', punishment: 'मृत्युदंड या आजीवन कारावास, और जुर्माना' },
  'bns-100': { title: 'अपराधजनित नरसंहार', description: 'यदि कोई व्यक्ति मृत्यु के इरादे से, या ऐसी शारीरिक चोट पहुंचाने के इरादे से जो मृत्यु का कारण बन सकती है, या इस ज्ञान के साथ कि उसके कार्य से मृत्यु हो सकती है, तो वह अपराधजनित नरसंहार का अपराध करता है।', punishment: 'आजीवन कारावास, या १० वर्ष तक की कारावास और जुर्माना' },
  'bns-106': { title: 'लापरवाही या उतावलेपन के कार्य से मृत्यु', description: 'यदि कोई व्यक्ति किसी लापरवाह या उतावलेपन के कार्य द्वारा किसी की मृत्यु का कारण बनता है जो अपराधजनित नरसंहार के बराबर नहीं है, तो उसे ५ वर्ष तक की कारावास और जुर्माने से दंडित किया जाएगा।', punishment: '५ वर्ष तक की कारावास और जुर्माना' },
  'bns-308': { title: 'ब्लैकमेल/वसूली', description: 'यदि कोई व्यक्ति जानबूझकर किसी को चोट का भय दिखाता है, और उस भय से व्यक्ति को कोई संपत्ति देने के लिए प्रेरित करता है, तो वह ब्लैकमेल माना जाता है।', punishment: '३ वर्ष तक की कारावास, या जुर्माना, या दोनों' },
  'bns-309': { title: 'डकैती', description: 'चोरी करते समय या चोरी करने के लिए, यदि अपराधी जानबूझकर मृत्यु, चोट या गलत गिरफ्तारी का कारण बनता है या प्रयास करता है, तो वह डकैती मानी जाती है।', punishment: '७ वर्ष तक की कारावास और जुर्माना' },
  'bns-310': { title: 'डाकेती', description: 'जब पांच या अधिक व्यक्ति मिलकर डकैती करते हैं या प्रयास करते हैं, तो उनमें से प्रत्येक व्यक्ति डाकेती का अपराध करता है माना जाता है।', punishment: 'आजीवन कारावास, या १० वर्ष तक की कारावास और जुर्माना' },
  'bns-318': { title: 'धोखाधड़ी/ठगी', description: 'यदि कोई व्यक्ति किसी को धोखा देकर, बेईमानी से या धोखाधड़ी से उस व्यक्ति को कोई संपत्ति देने के लिए प्रेरित करता है, तो वह धोखाधड़ी मानी जाती है।', punishment: '३ वर्ष तक की कारावास, या जुर्माना, या दोनों' },
  'bns-63': { title: 'बलात्कार', description: 'यदि कोई पुरुष महिला की इच्छा के विरुद्ध, उसकी सहमति के बिना, या भय के तहत प्राप्त सहमति के साथ, या जब वह कार्य की प्रकृति समझने में असमर्थ हो, तो उसके साथ यौन संबंध बनाता है, तो वह बलात्कार माना जाता है।', punishment: 'कम से कम १० वर्ष की कारावास, जो आजीवन तक बढ़ सकती है, और जुर्माना' },
  'bns-75': { title: 'यौन उत्पीड़न', description: 'किसी पुरुष द्वारा यौन उत्पीड़न का कार्य, जिसमें अवांछित शारीरिक संपर्क और आगे बढ़ना, यौन अनुग्रह की मांग, या महिला की इच्छा के विरुद्ध अश्लील सामग्री दिखाना शामिल है।', punishment: '३ वर्ष तक की कारावास, या जुर्माना, या दोनों' },
  'bnss-173': { title: 'संज्ञेय अपराधों में सूचना (FIR)', description: 'संज्ञेय अपराध के कमीशन से संबंधित प्रत्येक सूचना, यदि पुलिस स्टेशन के प्रभारी अधिकारी को मौखिक रूप से दी जाती है, तो उनके द्वारा या उनके निर्देशन के तहत लिखित में कम की जाएगी, और सूचनादाता को पढ़कर सुनाई जाएगी।' },
  'bnss-174': { title: 'पुलिस जांच', description: 'पुलिस मामले की जांच करने और आरोपी के पक्ष में और विरुद्ध दोनों सबूत एकत्र करने के लिए आगे बढ़ेगी।' },
  'bnss-193': { title: 'जांच पूर्ण होने के बाद पुलिस अधिकारी की रिपोर्ट (चार्जशीट)', description: 'प्रत्येक जांच अनावश्यक विलंब के बिना पूरी की जाएगी, और रिपोर्ट धारा १९३ के तहत मजिस्ट्रेट को भेजी जाएगी।' },
  'bsa-3': { title: 'साक्ष्य की परिभाषा', description: 'साक्ष्य का अर्थ है और इसमें सभी कथन शामिल हैं जो अदालत जांच के तहत तथ्यों के संबंध में गवाहों द्वारा देने की अनुमति या आवश्यकता होती है (मौखिक साक्ष्य), और जांच के लिए उत्पादित सभी दस्तावेज जिनमें इलेक्ट्रॉनिक रिकॉर्ड शामिल हैं (दस्तावेजी साक्ष्य।' },
};

/* ════════════════════════════════════════════
   JUDGMENT TRANSLATIONS — ENGLISH
   ════════════════════════════════════════════ */
export const EN_JUDGMENTS: JudgmentTranslations = {
  'j1': { title: 'Iridium India Telecom Ltd vs Motorola Inc.', summary: 'The court held that cheating involves dishonest inducement causing delivery of property. Fraudulent misrepresentation via electronic means qualifies under relevant BNS provisions.' },
  'j2': { title: 'Shafhi Mohammad vs State of Himachal Pradesh', summary: 'Electronic evidence including WhatsApp messages, call records, and digital screenshots are admissible if their integrity can be verified through appropriate certification under Section 65B of the Evidence Act (now BSA Section 85).' },
  'j3': { title: 'Anvar P.V. vs P.K. Basheer', summary: 'Electronic records can only be proved in accordance with the procedure prescribed under Sec 65B of the Indian Evidence Act (now BSA Section 85). Certificate requirement is mandatory for admissibility of electronic evidence.' },
  'j10': { title: 'Arjun Panditrao Khotkar vs Kailash Kushanrao Gorantyal', summary: 'The requirement of certificate under Section 65B(4) of the Evidence Act (now BSA Section 85) is mandatory for admissibility of electronic evidence. The court clarified that oral evidence cannot substitute for the certificate.' },
  'j13': { title: 'Puttaswamy vs Union of India (Privacy Judgment)', summary: 'Right to privacy is a fundamental right. This landmark judgment affects how law enforcement can collect and use electronic evidence, digital data, and surveillance records in criminal investigations.' },
  'j23': { title: 'Bachan Singh vs State of Punjab', summary: 'Death penalty should be imposed only in the rarest of rare cases. This landmark judgment guides sentencing in murder cases and the investigation requirements for capital offences.' },
  'j25': { title: 'Lalita Kumari vs Government of UP', summary: 'Registration of FIR is mandatory under Section 154 CrPC (now BNSS Section 173) if the information discloses commission of a cognizable offence. Police cannot refuse to register FIR and must conduct preliminary inquiry only in specific cases.' },
  'j26': { title: 'Shreya Singhal vs Union of India', summary: 'The court struck down Section 66A of the IT Act as unconstitutional, holding that it violated Article 19(1)(a) of the Constitution. This is a landmark judgment for online free speech and has implications for all cyber law enforcement in India.' },
};

/* ════════════════════════════════════════════
   JUDGMENT TRANSLATIONS — GUJARATI
   ════════════════════════════════════════════ */
export const GU_JUDGMENTS: JudgmentTranslations = {
  'j1': { title: 'ઇરિડિયમ ઇન્ડિયા ટેલિકોમ લિ. vs મોટોરોલા ઇન્ક.', summary: 'અદાલતે જણાવ્યું હતું કે ઠગાઈમાં બેઈમાનીથી પ્રેરણા કરીને મિલકતનું વિતરણ કરાવવાનો સમાવેશ થાય છે. ઇલેક્ટ્રોનિક સાધનો દ્વારા બનાવટી રજૂઆત સંબંધિત BNS કલમો હેળ આવે છે.' },
  'j2': { title: 'શફહી મોહમ્મદ vs હિમાચલ પ્રદેશ રાજ્ય', summary: 'WhatsApp સંદેશાઓ, કલ રેકોર્ડ્સ અને ડિજિટલ સ્ક્રીનશોટ સહિત ઇલેક્ટ્રોનિક પુરાવા સ્વીકાર્ય છે જો તેમની અખંડિતતા એવિડન્સ એક્ટની કલમ 65B (હવે BSA કલમ 85) હેઠળ યોગ્ય પ્રમાણપત્ર દ્વારા ચકાસી શકાય.' },
  'j3': { title: 'અનવર P.V. vs P.K. બાશીર', summary: 'ઇલેક્ટ્રોનિક રેકોર્ડ્સ ફક્ત ઇન્ડિયન એવિડન્સ એક્ટની કલમ 65B (હવે BSA કલમ 85) હેઠળ નિર્ધારિત પ્રક્રિયા અનુસાર સાબિત કરી શકાય છે. ઇલેક્ટ્રોનિક પુરાવાની સ્વીકાર્યતા માટે પ્રમાણપત્રની જરૂરિયાત ફરજિયાત છે.' },
  'j10': { title: 'અર્જુન પંડિતરાવ ખોટકર vs कैलाश कुशनराव गोरंत्याल', summary: 'એવિડન્સ એક્ટની કલમ 65B(4) (હવે BSA કલમ 85) હેઠળ પ્રમાણપત્રની જરૂરિયાત લેક્ટ્રોનિક પુરાવાની સ્વીકાર્યતા માટે ફરજિયાત છે. અદાલતે સ્પષ્ટ કર્યું કે મખિક પુરાવા પ્રમાણપત્રનું સ્થાન લઈ શકતા નથી.' },
  'j13': { title: 'પુટ્ટાસ્વામી vs ભારત સંઘ (ગોપનીયતા ચુકાદો)', summary: 'ગોપનીયતાનો અધિકાર મૂળભૂત અધિકાર છે. આ મહત્વપૂર્ણ ચુકાદો અસર કરે છે કે કાયદો અમલવારી એજન્સીઓ કેવી રીતે ઇલેક્ટ્રોનિક પુરાવા, ડિજિટલ ડેટા અને સર્વેલન્સ રેકોર્ડ્સ એકત્રિત કરી શકે છે.' },
  'j23': { title: 'બચન સિંહ vs પંજાબ રાજ્ય', summary: 'મૃત્યુદંડ ફક્ત દુર્લભમાં દુર્લભ કેસોમાં આપવામાં આવવો જોઈએ. આ મહત્વપૂર્ણ ચુકાદો હત્યાના કેસોમાં સજા અને કેપિટલ ગુનાઓની તપાસ જરૂરિયાતોને માર્ગદર્શન આપે છે.' },
  'j25': { title: 'લલિતા કુમારી vs UP સરકાર', summary: 'જો માહિતી સંજ્ઞેય ગુનાનું કમિશન દર્શાવે છે તો FIR નોંધણી ફરજિયાત છે. પોલીસ FIR નોંધવાનો ઇનકાર કરી શકતી નથી અને ફક્ત ચોક્કસ કિસ્સાઓમાં પ્રાથમિક તપાસ કરી શકે છે.' },
  'j26': { title: 'શ્રેયા સિંઘલ vs ભારત સંઘ', summary: 'અદાલતે IT એક્ટની કલમ 66A ને બંધારણીય રીતે અમાન્ય જાહેર કરી, કારણ કે તે બંધારણના આર્ટિકલ 19(1)(a) નું ઉલ્લંઘન કરે છે. આ નલાઇન મુક્ત વાણી માટે મહત્વપૂર્ણ ચુકાદો છે.' },
};

/* ════════════════════════════════════════════
   JUDGMENT TRANSLATIONS — HINDI
   ════════════════════════════════════════════ */
export const HI_JUDGMENTS: JudgmentTranslations = {
  'j1': { title: 'इरिडियम इंडिया टेलीकॉम लि. vs मोटोरोला इंक.', summary: 'अदालत ने कहा कि धोखाधड़ी में बेईमानी से प्रेरित करके संपत्ति दिलाना शामिल है। इलेक्ट्रॉनिक माध्यमों से धोखाधड़ी संबंधित BNS प्रावधानों के तहत आती है।' },
  'j2': { title: 'शफही मोहम्मद vs हिमाचल प्रदेश राज्य', summary: 'WhatsApp संदेशों, कॉल रिकॉर्ड और डिजिटल स्क्रीनशॉट सहित इलेक्ट्रॉनिक सबूत स्वीकार्य हैं यदि उनकी अखंडता एविडेंस एक्ट की धारा 65B (अब BSA धारा 85) के तहत उचित प्रमाणन के माध्यम से सत्यापित की जा सकती है।' },
  'j3': { title: 'अनवर P.V. vs P.K. बशीर', summary: 'इलेक्ट्रॉनिक रिकॉर्ड केवल भारतीय साक्ष्य अधिनियम की धारा 65B (अब BSA धारा 85) के तहत निर्धारित प्रक्रिया के अनुसार ही साबित किए जा सकते हैं। इलेक्ट्रॉनिक सबूत की स्वीकार्यता के लिए प्रमाण पत्र अनिवार्य है।' },
  'j10': { title: 'अर्जुन पंदित्राव खोतकर vs कैलाश कुशनराव गोरंत्याल', summary: 'एविडेंस एक्ट की धारा 65B(4) (अब BSA धारा 85) के तहत प्रमाण पत्र की आवश्यकता इलेक्ट्रॉनिक सबूत की स्वीकार्यता के लिए अनिवार्य है। अदालत ने स्पष्ट किया कि मौखिक सबूत प्रमाण पत्र की जगह नहीं ले सकता।' },
  'j13': { title: 'पुट्टास्वामी vs भारत संघ (गोपनीयता निर्णय)', summary: 'गोपनीयता का अधिकार एक मौलिक अधिकार है। इस महत्वपूर्ण निर्णय से प्रभावित होता है कि कानून प्रवर्तन एजेंसियां इलेक्ट्रॉनिक सबूत, डिजिटल डेटा और निगरानी रिकॉर्ड कैसे एकत्र कर सकती हैं।' },
  'j23': { title: 'बचन सिंह vs पंजाब राज्य', summary: 'मृत्युदंड केवल दुर्लभ में दुर्लभ मामलों में दिया जाना चाहिए। इस महत्वपूर्ण निर्णय से हत्या मामलों में सजा और पूंजी अपराधों की जांच आवश्यकताओं का मार्गदर्शन होता है।' },
  'j25': { title: 'ललिता कुमारी vs UP सरकार', summary: 'यदि जानकारी संज्ञेय अपराध के कमिशन को दर्शाती है तो FIR पंजीकरण अनिवार्य है। पुलिस FIR पंजीकरण से इनकार नहीं कर सकती और केवल विशिष्ट मामलों में प्राथमिक जांच कर सकती है।' },
  'j26': { title: 'श्रेया सिंघल vs भारत संघ', summary: 'अदालत ने IT एक्ट की धारा 66A को असंवैधानिक करार दिया, क्योंकि यह संविधान के अनुच्छेद 19(1)(a) का उल्लंघन करती है। यह ऑनलाइन मुक्त भाषण के लिए एक महत्वपूर्ण निर्णय है।' },
};

/* ════════════════════════════════════════════
   EXPORT HELPER FUNCTION
   ════════════════════════════════════════════ */
export function getDocTranslations(language: 'en' | 'gu' | 'hi'): DocTranslationSet {
  switch (language) {
    case 'gu':
      return GU_DOC_TRANSLATIONS;
    case 'hi':
      return HI_DOC_TRANSLATIONS;
    case 'en':
    default:
      return EN_DOC_TRANSLATIONS;
  }
}

export function getLegalSectionTranslations(language: 'en' | 'gu' | 'hi'): LegalSectionTranslations {
  switch (language) {
    case 'gu':
      return GU_LEGAL_SECTIONS;
    case 'hi':
      return HI_LEGAL_SECTIONS;
    case 'en':
    default:
      return EN_LEGAL_SECTIONS;
  }
}

export function getJudgmentTranslations(language: 'en' | 'gu' | 'hi'): JudgmentTranslations {
  switch (language) {
    case 'gu':
      return GU_JUDGMENTS;
    case 'hi':
      return HI_JUDGMENTS;
    case 'en':
    default:
      return EN_JUDGMENTS;
  }
}
