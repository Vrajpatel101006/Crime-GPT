import type { CaseStatus, CaseClassification } from '../../types';

/* ─── STATUS COLORS ─── */
export const STATUS_COLORS: Record<CaseStatus, string> = {
  draft: 'badge-neutral',
  active: 'badge-primary',
  under_review: 'badge-warning',
  approved: 'badge-success',
  closed: 'badge-neutral',
  returned: 'badge-danger',
};

export const CLASSIFICATION_COLORS: Record<CaseClassification, { bg: string; border: string; text: string; icon: string }> = {
  public: { bg: 'rgba(16,185,129,0.08)', border: 'rgba(16,185,129,0.3)', text: '#10b981', icon: 'PUBLIC' },
  confidential: { bg: 'rgba(245,158,11,0.08)', border: 'rgba(245,158,11,0.3)', text: '#f59e0b', icon: 'CONFIDENTIAL' },
  secret: { bg: 'rgba(239,68,68,0.08)', border: 'rgba(239,68,68,0.3)', text: '#ef4444', icon: 'SECRET' },
};

/* ─── CRIME CATEGORY TEMPLATES ─── */
export const CRIME_TEMPLATES: Record<string, { prompt: string; boostedSections: string[]; entityPriority: string }> = {
  'Cyber Fraud': {
    prompt: 'Complaint under Cyber Fraud.\n\nVictim: [Full Name], [Age] years, resident of [City/Area].\n\nComplaint: On [date], the victim received a [WhatsApp message/email/phone call/Instagram DM] from an unknown person claiming to offer [investment opportunity/lottery prize/job offer/crypto trading platform]. The victim was instructed to [transfer money to bank account/download trading app/share OTP and bank details]. The victim transferred a total of ₹[amount] via [UPI/bank transfer/crypto] to account/UPI ID [details]. After the transfer, the accused [became unreachable/deleted the account/demanded more money].\n\nSuspect details (if known): Name/Phone/UPI ID/Website/App: [details]\n\nEvidence available: [WhatsApp chat screenshots/bank statements/transaction IDs/call recordings/app screenshots]',
    boostedSections: ['bns-318', 'bns-319', 'bns-336', 'it-66d', 'it-66'],
    entityPriority: 'phone, upi, bank_account, amount, url, email, name, date',
  },
  'Identity Theft': {
    prompt: 'Complaint under Identity Theft.\n\nVictim: [Full Name], [Age] years, resident of [City/Area]. Mobile: [number].\n\nComplaint: The victim discovered that an unknown person has created a fake [social media profile/bank account/loan application] using the victim\'s [name/photograph/Aadhaar number/PAN number] without consent. The fake profile/account was found on [platform - Instagram/Facebook/WhatsApp/loan app] with [username/account details]. The impersonator has been [sending messages to victim\'s contacts/taking loans in victim\'s name/posting defamatory content].\n\nVictim\'s Aadhaar/PAN (if compromised): [number]\n\nEvidence available: [Screenshots of fake profile/loan rejection letters/threatening messages]',
    boostedSections: ['bns-319', 'it-66c', 'it-66d', 'dpdp-9'],
    entityPriority: 'name, phone, email, aadhaar, pan, url',
  },
  'Financial Fraud': {
    prompt: 'Complaint under Financial Fraud.\n\nVictim: [Full Name], [Age] years, resident of [City/Area]. Mobile: [number].\n\nComplaint: The victim was approached by [person/company name] offering [fake investment scheme/ponzi scheme/chit fund/fixed deposit with high returns]. The victim invested ₹[amount] over the period [start date] to [end date] via [bank transfer/cheque/cash/UPI]. The accused provided fake [receipts/account statements/certificates]. When the victim requested withdrawal/returns, the accused [refused/absconded/demanded additional fees].\n\nBank account used by accused: [account number, IFSC, bank name]\nTotal amount defrauded: ₹[amount]\n\nEvidence available: [Bank statements/investment receipts/WhatsApp chats/email correspondence]',
    boostedSections: ['bns-318', 'bns-340', 'bns-338', 'it-66d'],
    entityPriority: 'bank_account, amount, name, phone, date, email',
  },
  'Hacking': {
    prompt: 'Complaint under Hacking / Unauthorized Access.\n\nVictim: [Full Name/Organization Name]. Mobile: [number]. Email: [email].\n\nComplaint: On [date], the victim discovered that their [email account/social media account/website/server/bank account] was accessed by an unauthorized person. The victim noticed [unusual login from unknown IP/password changed/data deleted/unauthorized transactions/unauthorized posts]. The victim\'s [Gmail/Instagram/Facebook/website admin panel] showed login activity from [IP address/location/device] that the victim does not recognize.\n\nAffected accounts/systems: [email/social media handles/website URL/server IP]\nData compromised: [personal data/financial records/official documents/customer database]\n\nEvidence available: [Login history screenshots/IP logs/email headers/server logs]',
    boostedSections: ['it-43', 'it-66', 'it-66b', 'it-72'],
    entityPriority: 'email, url, phone, name, date',
  },
  'Drug Offence': {
    prompt: 'Complaint under Drug Offence.\n\nInformant: [Full Name/Badge Number], [Rank], P.S. [Station].\n\nComplaint: On [date] at approximately [time], during [patrolling/checking/specific intelligence], the accused was found in possession of [type of drug - cannabis/ganja/brown sugar/MDMA/cocaine/heroin] near [location]. The quantity seized was approximately [weight in grams/kg]. The accused was found [concealing the substance in a bag/selling to customers/consuming on the spot].\n\nAccused: [Name if known], [Age], resident of [area].\nDrug type seized: [substance name]\nQuantity: [weight]\n\nEvidence available: [Seized substance/photographs of seizure spot/witness statements/FSL report]',
    boostedSections: ['ndps-8', 'ndps-15', 'ndps-20', 'ndps-21', 'bns-61'],
    entityPriority: 'name, amount, date, vehicle, phone',
  },
};

/* ─── STATUS LIFECYCLE STAGES ─── */
export const STATUS_STAGES: { key: CaseStatus; label: string }[] = [
  { key: 'draft', label: 'Draft' },
  { key: 'active', label: 'Active' },
  { key: 'under_review', label: 'Under Review' },
  { key: 'approved', label: 'Approved' },
  { key: 'closed', label: 'Closed' },
];

/* ─── DOCUMENT TYPE / STATUS LABELS ─── */
export const DOC_TYPE_LABELS: Record<string, string> = {
  fir: 'FIR', remand_request: 'Remand Request', chargesheet: 'Chargesheet',
  purvani_chargesheet: 'Purvani Chargesheet', seizure_receipt: 'Seizure Receipt',
  medical_letter: 'Medical Letter', court_custody: 'Court Custody',
  panchanama: 'Panchanama', face_id_form: 'Face ID Form', lers_request: 'LERS Request',
};

export const DOC_STATUS_COLORS: Record<string, string> = {
  draft: 'badge-neutral', validated: 'badge-primary', approved: 'badge-success', exported: 'badge-warning',
};
