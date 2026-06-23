/* ============================================
   CRIMEGPT 2.0 — GROQ AI SERVICE
   ============================================
   Uses Groq (Llama 3.3 70B) for intelligent
   complaint analysis, entity extraction, and
   legal section mapping.

   SECURITY: All AI calls are routed through the
   serverless proxy at /api/analyze. The Groq API
   key lives server-side only and is never embedded
   in the client bundle.

   AUTH: Each request includes the user's Firebase
   ID token in the Authorization header. The proxy
   validates this token before processing.
   ============================================ */

import { firebaseAuth } from './firebase';

const PROXY_URL = '/api/analyze';
const GROQ_MODEL = 'llama-3.3-70b-versatile';

/**
 * Checks whether the AI proxy is available and
 * has a server-side API key configured.
 */
export async function isAIConfigured(): Promise<boolean> {
  try {
    const res = await fetch(PROXY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ systemPrompt: 'ping', userPrompt: 'ping' }),
    });
    // 503 = proxy exists but no API key configured
    // 200/400/502 = proxy is operational
    return res.status !== 503;
  } catch {
    return false;
  }
}

/* ─── Generic AI caller (via serverless proxy) ─── */
async function callGroq<T = Record<string, unknown>>(
  systemPrompt: string,
  userPrompt: string,
  temperature = 0.15,
  maxTokens = 2048,
): Promise<T> {
  // Get Firebase ID token for authentication
  const user = firebaseAuth.currentUser;
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (user) {
    try {
      const token = await user.getIdToken();
      headers['Authorization'] = `Bearer ${token}`;
    } catch (err) {
      console.warn('[CrimeGPT] Failed to get ID token:', err);
    }
  }

  const response = await fetch(PROXY_URL, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      systemPrompt,
      userPrompt,
      temperature,
      maxTokens,
      model: GROQ_MODEL,
    }),
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    console.error('AI proxy error:', response.status, errData);
    throw new Error(`AI service error: ${response.status} — ${errData.error || 'Unknown error'}`);
  }

  const data = await response.json();
  const content = data.content;
  if (!content) throw new Error('Empty response from AI service');

  return JSON.parse(content) as T;
}

/* ════════════════════════════════════════════
   1. COMPREHENSIVE COMPLAINT ANALYSIS
   ════════════════════════════════════════════ */

export interface AIAnalysisResult {
  crimeType: string;
  crimeDescription: string;
  victim: {
    name: string;
    fatherName?: string;
    age?: string;
    gender?: string;
    address: string;
    mobile: string;
    email?: string;
    occupation?: string;
  };
  accused: {
    name: string;
    fatherName?: string;
    age?: string;
    gender?: string;
    address: string;
    mobile: string;
    email?: string;
    description?: string;
  };
  incident: {
    date: string;
    time: string;
    location: string;
    description: string;
  };
  entities: Array<{ type: string; value: string; confidence: number }>;
  witnesses: Array<{ name: string; details?: string }>;
  evidence: string[];
  summary: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

const ANALYSIS_SYSTEM_PROMPT = `You are CrimeGPT 2.0, an advanced AI assistant for the Gujarat Police Cyber Crime Division, India. Your job is to analyze crime complaints and extract structured information with extremely high accuracy.

CRITICAL RULES:
1. Extract ALL entities mentioned in the narrative — names, phone numbers, addresses, dates, amounts, account numbers, vehicle numbers, UPI IDs, emails, Aadhaar, PAN, etc.
2. Distinguish clearly between VICTIM (the person who suffered) and ACCUSED (the person who committed the crime). If the narrative uses "I" or "my", that refers to the victim/complainant.
3. For dates: convert to YYYY-MM-DD ONLY when the narrative provides a specific day (e.g., "15 January 2025" → "2025-01-15"). If only month/year is given (no specific day), preserve the original text as-is (e.g., "January 2025" → "January 2025"). Do NOT fabricate a specific day. If no date is mentioned at all, use empty string.
4. For phone numbers: extract with country code if available, format as +91XXXXXXXXXX for Indian numbers.
5. For monetary amounts: ONLY use entity type "amount" if the number has a currency symbol (₹, $, €, £, etc.) or is explicitly described as money/payment/loss/gain/value/price. Format with currency symbol and full value (e.g., "₹2,00,000" or "$50,000").
5a. For counts of affected people: If a number is followed by "people", "consumers", "users", "customers", "individuals", "victims", "persons", or similar terms, use entity type "affected_individuals" instead of "amount".
5b. For counts of records/data: If a number is followed by "records", "files", "documents", "entries", "accounts", or similar terms, use entity type "records_exposed" instead of "amount".
5c. For data volume: If a number is followed by "GB", "MB", "TB", "KB", or describes data size, use entity type "data_volume".
5d. CRITICAL: Never classify a count of people/records as "amount" just because it is a large number. Always check the semantic context.
5e. CRITICAL: Always extract the PRIMARY financial loss/investment amount as a separate entity. If the narrative mentions a total amount lost, invested, or defrauded (e.g., "lost ₹12 lakh", "invested ₹12,40,000", "defrauded of ₹X"), it MUST be captured as a distinct "amount" entity — even if smaller amounts (demands, fees, installments) are also mentioned. Never skip the largest monetary figure.
6. Crime classification must be specific — not just "General Offence". Use specific categories like: Cyber Fraud, Online Banking Fraud, UPI Payment Fraud, Identity Theft, Phishing Attack, Ransomware, Data Breach, Theft, Burglary, Housebreaking, Assault, Criminal Intimidation, Forgery, Cheating, Murder, Attempt to Murder, Kidnapping, Sexual Harassment, Domestic Violence, Property Dispute, Narcotics Offence, Money Laundering, Corruption, Dowry Death, Eve Teasing, Stalking, Criminal Breach of Trust, Criminal Defamation, Rioting, Unlawful Assembly, etc.
7. If a field is not mentioned in the narrative, use empty string "" for strings and empty arrays [] for lists. NEVER invent or hallucinate data that is not in the narrative.
8. The "summary" should be a concise 2-3 sentence factual summary of the crime.
9. Severity: low (minor offences), medium (moderate crimes), high (serious crimes), critical (heinous/organized crime/large-scale).
10. For "witnesses": extract any person mentioned who saw or can testify about the incident.
11. For "evidence": list any physical or digital evidence mentioned (screenshots, bank statements, CCTV footage, weapons, documents, etc.).
12. Handle narratives in English, Hindi, or Gujarati — extract entities regardless of language.
13. Entity type examples for clarity:
    - "147 million consumers affected" → type: "affected_individuals", value: "147 million"
    - "₹2 lakh lost" → type: "amount", value: "₹2,00,000"
    - "500 GB of data stolen" → type: "data_volume", value: "500 GB"
    - "10,000 records compromised" → type: "records_exposed", value: "10,000"
    - "$50,000 transferred" → type: "amount", value: "$50,000"
    - "5 companies affected" → type: "organizations_affected", value: "5"

OUTPUT FORMAT (strict JSON):
{
  "crimeType": "specific crime category",
  "crimeDescription": "brief 1-line description of what happened",
  "victim": {
    "name": "full name",
    "fatherName": "father/husband name if mentioned",
    "age": "age if mentioned",
    "gender": "male/female/other if determinable",
    "address": "full address",
    "mobile": "phone number with country code",
    "email": "email if mentioned",
    "occupation": "job/occupation if mentioned"
  },
  "accused": {
    "name": "full name or 'Unknown'",
    "fatherName": "if mentioned",
    "age": "if mentioned",
    "gender": "if determinable",
    "address": "if mentioned",
    "mobile": "if mentioned",
    "email": "if mentioned",
    "description": "physical description or identifying details if name unknown"
  },
  "incident": {
    "date": "YYYY-MM-DD format",
    "time": "HH:MM in 24h format if mentioned",
    "location": "specific place/address/area",
    "description": "detailed description of what happened at the incident"
  },
  "entities": [
    {"type": "phone", "value": "+919876543210", "confidence": 0.95},
    {"type": "amount", "value": "₹2,00,000", "confidence": 0.98},
    {"type": "affected_individuals", "value": "147 million", "confidence": 0.95},
    {"type": "records_exposed", "value": "50,000 records", "confidence": 0.92},
    {"type": "data_volume", "value": "500 GB", "confidence": 0.9},
    {"type": "bank_account", "value": "SBI A/C 1234567890", "confidence": 0.9},
    {"type": "upi_id", "value": "user@paytm", "confidence": 0.95},
    {"type": "email", "value": "test@gmail.com", "confidence": 0.92},
    {"type": "vehicle", "value": "GJ-01-AB-1234", "confidence": 0.88},
    {"type": "aadhaar", "value": "1234-5678-9012", "confidence": 0.85},
    {"type": "url", "value": "https://scam-website.com", "confidence": 0.9},
    {"type": "organization", "value": "HDFC Bank", "confidence": 0.95},
    {"type": "document", "value": "PAN Card", "confidence": 0.88},
    {"type": "vulnerability", "value": "Apache Struts CVE-2017-5638", "confidence": 0.9}
  ],
  "witnesses": [
    {"name": "witness name", "details": "relationship or role"}
  ],
  "evidence": ["CCTV footage", "Bank statement", "WhatsApp screenshots"],
  "summary": "Concise factual summary of the crime in 2-3 sentences.",
  "severity": "low|medium|high|critical"
}`;

export async function analyzeComplaint(narrative: string): Promise<AIAnalysisResult> {
  const result = await callGroq<Partial<AIAnalysisResult>>(
    ANALYSIS_SYSTEM_PROMPT,
    `Analyze the following crime complaint narrative and extract all information:\n\n---\n${narrative}\n---`,
    0.1,
    2048,
  );

  // Ensure all fields exist with defaults
  return {
    crimeType: result.crimeType || 'General Offence',
    crimeDescription: result.crimeDescription || '',
    victim: {
      name: result.victim?.name || '',
      fatherName: result.victim?.fatherName || '',
      age: result.victim?.age || '',
      gender: result.victim?.gender || '',
      address: result.victim?.address || '',
      mobile: result.victim?.mobile || '',
      email: result.victim?.email || '',
      occupation: result.victim?.occupation || '',
    },
    accused: {
      name: result.accused?.name || 'Unknown',
      fatherName: result.accused?.fatherName || '',
      age: result.accused?.age || '',
      gender: result.accused?.gender || '',
      address: result.accused?.address || '',
      mobile: result.accused?.mobile || '',
      email: result.accused?.email || '',
      description: result.accused?.description || '',
    },
    incident: {
      date: result.incident?.date || '',
      time: result.incident?.time || '',
      location: result.incident?.location || '',
      description: result.incident?.description || '',
    },
    entities: Array.isArray(result.entities) ? result.entities : [],
    witnesses: Array.isArray(result.witnesses) ? result.witnesses : [],
    evidence: Array.isArray(result.evidence) ? result.evidence : [],
    summary: result.summary || '',
    severity: result.severity || 'medium',
  };
}

/* ════════════════════════════════════════════
   2. LEGAL SECTION MAPPING
   ════════════════════════════════════════════ */

export interface AILegalSuggestion {
  sectionId: string;
  sectionNumber: string;
  act: string;
  title: string;
  confidence: number;
  reasoning: string;
  matchedKeywords: string[];
}

const LEGAL_SYSTEM_PROMPT = `You are a legal intelligence AI trained on Indian criminal law — specifically the Bharatiya Nyaya Sanhita (BNS) 2023, Bharatiya Nagarik Suraksha Sanhita (BNSS) 2023, and Bharatiya Sakshya Adhiniyam (BSA) 2023.

Your task: Given a crime complaint narrative and a list of available legal sections, identify which sections apply to this case.

RULES:
1. You MUST only recommend sections from the provided list below. Do NOT invent sections that don't exist in the list.
2. For each recommended section, provide:
   - sectionId: the exact ID from the provided list
   - confidence: a score between 0.0 and 1.0 indicating how strongly this section applies
   - reasoning: a clear explanation of WHY this section applies to this specific case
   - matchedKeywords: keywords/phrases from the narrative that triggered this match
3. Rank by confidence (highest first). Return maximum 6 sections.
4. Consider the FULL narrative context — not just individual keywords. Understand the overall crime scenario.
5. Consider related/connected offences. For example, a cyber fraud case may involve both cheating (BNS-318) and forgery (BNS-336) sections.
6. Confidence scoring guide:
   - 0.90-0.98: Direct, strong match — the narrative clearly describes this offence
   - 0.75-0.89: Strong indicators — very likely applicable
   - 0.60-0.74: Possible match — some indicators present
   - Below 0.60: Do NOT include

OUTPUT FORMAT (strict JSON):
{
  "suggestions": [
    {
      "sectionId": "exact-id-from-list",
      "sectionNumber": "section number",
      "act": "BNS/BNSS/BSA",
      "title": "section title",
      "confidence": 0.92,
      "reasoning": "The narrative describes... which directly falls under this section because...",
      "matchedKeywords": ["keyword1", "keyword2"]
    }
  ]
}`;

/* ─── Semantic Matching Infrastructure ─── */

const CONCEPT_THESAURUS: Record<string, string[]> = {
  data_breach: ['data breach', 'data leak', 'information leak', 'exposed data', 'compromised data', 'unauthorized disclosure', 'data theft', 'data compromise', 'personal data breach', 'security breach'],
  hacking: ['hacking', 'hacked', 'unauthorized access', 'system breach', 'computer intrusion', 'cyber intrusion', 'break-in', 'cyber attack', 'cyberattack'],
  fraud: ['fraud', 'fraudulent', 'cheating', 'deception', 'scam', 'misrepresentation', 'defrauding', 'swindling', 'duping', 'fraudster', 'fraudulently'],
  identity_theft: ['identity theft', 'impersonation', 'fake identity', 'pretending to be', 'personation', 'identity fraud', 'stolen identity', 'cheating by personation'],
  financial_loss: ['money lost', 'financial loss', 'monetary loss', 'defrauded', 'cheated of money', 'siphoned', 'transferred fraudulently', 'wrongful loss', 'wrongful gain'],
  phishing: ['phishing', 'phishing email', 'fake email', 'malicious email', 'credential harvesting', 'spear phishing', 'phishing link'],
  ransomware: ['ransomware', 'ransom', 'encryption attack', 'locked files', 'crypto-lock', 'extortion', 'ransom demand', 'decrypt'],
  cyberstalking: ['stalking', 'cyberstalking', 'online harassment', 'trolling', 'threatening messages', 'online threats', 'harassment online'],
  child_abuse: ['child abuse', 'child pornography', 'child sexual abuse', 'minor exploitation', 'csam', 'child exploitation', 'obscene material child'],
  narcotics: ['drugs', 'narcotics', 'cannabis', 'marijuana', 'cocaine', 'heroin', 'drug trafficking', 'drug possession', 'drug peddling', 'contraband'],
  forgery: ['forgery', 'forged document', 'fake document', 'counterfeiting', 'tampering', 'fabricated document', 'false document'],
  defamation: ['defamation', 'libel', 'slander', 'false statement', 'reputation damage', 'character assassination', 'defamatory'],
  sexual_harassment: ['sexual harassment', 'molestation', 'assault', 'voyeurism', 'outraging modesty', 'sexual assault', 'unwelcome sexual'],
  theft: ['theft', 'stealing', 'stolen', 'thief', 'pilferage', 'shoplifting', 'pickpocketing'],
  property_damage: ['property damage', 'vandalism', 'mischief', 'arson', 'damaged property', 'destruction of property', 'sabotage'],
  criminal_intimidation: ['threat', 'intimidation', 'criminal intimidation', 'death threat', 'threatening', 'blackmail', 'coercion'],
  cybercrime: ['cybercrime', 'cyber crime', 'online crime', 'internet crime', 'computer crime', 'digital crime', 'cyber offence'],
  money_laundering: ['money laundering', 'layering', 'placement', 'integration', 'proceeds of crime', 'dirty money'],
  data_protection: ['data protection', 'privacy violation', 'privacy breach', 'personal data', 'consent', 'data fiduciary', 'data principal', 'data processor'],
  denial_of_service: ['denial of service', 'dos attack', 'ddos', 'distributed denial', 'service disruption', 'network flood'],
  online_gambling: ['online gambling', 'betting', 'wager', 'gambling app', 'online betting', 'satta', 'fantasy gaming'],
  software_piracy: ['software piracy', 'pirated software', 'copyright violation', 'unlicensed software', 'cracked software'],
  obscenity: ['obscene', 'pornography', 'pornographic', 'indecent', 'vulgar content', 'obscene material', 'obscene publication'],
  breach_of_trust: ['breach of trust', 'criminal breach of trust', 'misappropriation', 'embezzlement', 'defalcation', 'entrusted property'],
  kidnapping: ['kidnapping', 'abduction', 'forcible abduction', 'hostage', 'wrongful confinement', 'ransom kidnapping'],
  dowry: ['dowry', 'dowry death', 'dowry demand', 'dowry harassment', 'bride burning', 'dowry prohibition'],
  domestic_violence: ['domestic violence', 'cruelty by husband', 'matrimonial cruelty', 'dowry harassment', 'intimate partner violence'],
  rioting: ['rioting', 'riot', 'unlawful assembly', 'mob violence', 'communal violence', 'affray'],
  corruption: ['corruption', 'bribery', 'bribe', 'gratification', 'public servant misconduct', 'disproportionate assets'],
  conspiracy: ['conspiracy', 'criminal conspiracy', 'planned together', 'conspired', 'coordinated scheme', 'acted in concert', 'joint plan', 'premeditated plan', 'organized fraud', 'planned fraud', 'multiple accused planned', 'collusion', 'colluded'],
};

// Simple English stemmer (Porter-style suffix stripping)
function stem(word: string): string {
  if (word.length < 4) return word;
  let w = word.toLowerCase();
  // Step 1: plurals
  if (w.endsWith('ies') && w.length > 4) w = w.slice(0, -3) + 'y';
  else if (w.endsWith('es') && w.length > 4) w = w.slice(0, -2);
  else if (w.endsWith('s') && !w.endsWith('ss') && w.length > 3) w = w.slice(0, -1);
  // Step 2: -ed, -ing
  if (w.endsWith('ied') && w.length > 4) w = w.slice(0, -3) + 'y';
  else if (w.endsWith('ed') && w.length > 4) w = w.slice(0, -2);
  else if (w.endsWith('ing') && w.length > 5) w = w.slice(0, -3);
  // Step 3: -tion, -ness, -ment, -able
  if (w.endsWith('ation') && w.length > 6) w = w.slice(0, -5);
  else if (w.endsWith('tion') && w.length > 5) w = w.slice(0, -4);
  else if (w.endsWith('ness') && w.length > 5) w = w.slice(0, -4);
  else if (w.endsWith('ment') && w.length > 5) w = w.slice(0, -4);
  return w;
}

// Levenshtein distance for fuzzy matching
function levenshtein(a: string, b: string): number {
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;
  const matrix: number[][] = [];
  for (let i = 0; i <= b.length; i++) matrix[i] = [i];
  for (let j = 0; j <= a.length; j++) matrix[0][j] = j;
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      const cost = b.charAt(i - 1) === a.charAt(j - 1) ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost,
      );
    }
  }
  return matrix[b.length][a.length];
}

function semanticScore(
  section: { keywords: string[]; crimeTypes: string[]; title: string; description: string },
  narrativeLower: string,
  narrativeWords: string[],
  narrativeStems: Set<string>,
  matchedConcepts: Set<string>,
): number {
  let score = 0;
  const sectionText = [
    ...section.keywords,
    ...(section.crimeTypes || []),
    section.title,
  ].join(' ').toLowerCase();
  const sectionWords = sectionText.split(/\s+/).filter(w => w.length > 2);

  // 1. Concept group matches (strongest semantic signal)
  for (const concept of matchedConcepts) {
    const synonyms = CONCEPT_THESAURUS[concept];
    if (!synonyms) continue;
    for (const synonym of synonyms) {
      if (sectionText.includes(synonym)) {
        score += 10;
        break; // One match per concept is enough
      }
    }
  }

  // 2. Synonym cross-matching (narrative terms → section synonyms)
  for (const word of narrativeWords) {
    if (word.length < 3) continue;
    for (const synonyms of Object.values(CONCEPT_THESAURUS)) {
      const isSynonym = synonyms.some(s => s.includes(word));
      if (isSynonym) {
        for (const synonym of synonyms) {
          if (synonym !== word && sectionText.includes(synonym)) {
            score += 7;
            break;
          }
        }
      }
    }
  }

  // 3. Stemmed word matches (handles word variations)
  for (const textWord of sectionWords) {
    if (narrativeStems.has(stem(textWord))) {
      score += 6;
    }
  }

  // 4. Fuzzy matching for typos (only words > 4 chars)
  for (const textWord of sectionWords) {
    if (textWord.length < 5) continue;
    for (const nWord of narrativeWords) {
      if (nWord.length < 5) continue;
      const dist = levenshtein(textWord, nWord);
      const maxLen = Math.max(textWord.length, nWord.length);
      if (dist === 1 && maxLen > 5) score += 4;
      else if (dist === 2 && maxLen > 7) score += 2;
    }
  }

  // 5. Direct phrase matches
  for (const keyword of section.keywords) {
    if (narrativeLower.includes(keyword.toLowerCase())) score += 5;
  }
  for (const ct of section.crimeTypes || []) {
    if (narrativeLower.includes(ct.toLowerCase())) score += 8;
  }

  // 6. Title word matches
  const titleWords = section.title.toLowerCase().split(/\s+/).filter(w => w.length > 2);
  for (const tw of titleWords) {
    if (narrativeLower.includes(tw)) score += 2;
  }

  return score;
}

export async function suggestLegalSections(
  narrative: string,
  sections: Array<{ id: string; act: string; sectionNumber: string; title: string; description: string; keywords: string[]; crimeTypes: string[] }>,
  crimeCategory?: string,
): Promise<AILegalSuggestion[]> {
  // Step 1: Semantic pre-filtering to reduce catalog size
  // Uses concept groups, synonyms, stemming, and fuzzy matching
  const narrativeLower = narrative.toLowerCase();
  const narrativeWords = narrativeLower.split(/\s+/).filter(w => w.length > 2);
  const narrativeStems = new Set(narrativeWords.map(w => stem(w)));

  // Pre-compute which concept groups are activated by the narrative
  const matchedConcepts = new Set<string>();
  for (const [concept, synonyms] of Object.entries(CONCEPT_THESAURUS)) {
    for (const synonym of synonyms) {
      if (narrativeLower.includes(synonym)) {
        matchedConcepts.add(concept);
        break;
      }
    }
  }

  // Category-based boost: give +15 to sections commonly associated with the selected crime category
  const CATEGORY_BOOSTS: Record<string, string[]> = {
    'Cyber Fraud': ['bns-318', 'bns-319', 'bns-336', 'it-66d', 'it-66', 'bns-340'],
    'Identity Theft': ['bns-319', 'it-66c', 'it-66d', 'dpdp-9', 'it-66'],
    'Financial Fraud': ['bns-318', 'bns-340', 'bns-338', 'it-66d', 'bns-336'],
    'Hacking': ['it-43', 'it-66', 'it-66b', 'it-72', 'it-66d'],
    'Drug Offence': ['ndps-8', 'ndps-15', 'ndps-20', 'ndps-21', 'bns-61'],
  };
  const boostedIds = crimeCategory && CATEGORY_BOOSTS[crimeCategory] ? CATEGORY_BOOSTS[crimeCategory] : [];

  const scoredSections = sections.map(section => {
    let score = semanticScore(section, narrativeLower, narrativeWords, narrativeStems, matchedConcepts);
    if (boostedIds.includes(section.id)) score += 15;
    return { section, score };
  });

  // Take top 20 by score
  const withMatches = scoredSections.filter(s => s.score > 0);
  const topFiltered = withMatches.length >= 15
    ? withMatches.sort((a, b) => b.score - a.score).slice(0, 20)
    : [
        ...withMatches.sort((a, b) => b.score - a.score),
        ...scoredSections.filter(s => s.score === 0).slice(0, Math.max(0, 15 - withMatches.length)),
      ];

  // Always include at least some general/common sections as fallback
  const selectedIds = new Set(topFiltered.map(s => s.section.id));
  const generalSectionIds = ['bns-318', 'bns-336', 'bns-351', 'bns-61', 'it-66', 'it-66d'];
  for (const gid of generalSectionIds) {
    if (!selectedIds.has(gid)) {
      const gs = sections.find(s => s.id === gid);
      if (gs) {
        topFiltered.push({ section: gs, score: 0 });
        selectedIds.add(gid);
      }
    }
  }

  // Step 2: Build compact catalog from pre-filtered sections only
  const sectionCatalog = topFiltered.map(({ section: s }) =>
    `[ID:${s.id}] ${s.act}-${s.sectionNumber}: ${s.title} | Keywords: ${s.keywords.slice(0, 8).join(', ')} | Crimes: ${(s.crimeTypes || []).slice(0, 3).join(', ')}`
  ).join('\n');

  const userPrompt = `Analyze this crime complaint and identify applicable legal sections:\n\n--- NARRATIVE ---\n${narrative}\n\n--- AVAILABLE SECTIONS (pre-filtered for relevance) ---\n${sectionCatalog}\n\nReturn the top matching sections as JSON.`;

  const result = await callGroq<{ suggestions: Array<Record<string, unknown>> }>(
    LEGAL_SYSTEM_PROMPT,
    userPrompt,
    0.2,
    2048,
  );

  const suggestions: AILegalSuggestion[] = [];
  if (Array.isArray(result.suggestions)) {
    for (const s of result.suggestions) {
      // Verify the section exists in our database
      const matchedSection = sections.find(sec => sec.id === s.sectionId);
      if (matchedSection) {
        suggestions.push({
          sectionId: String(s.sectionId),
          sectionNumber: String(s.sectionNumber || matchedSection.sectionNumber),
          act: String(s.act || matchedSection.act),
          title: String(s.title || matchedSection.title),
          confidence: Math.min(0.98, Math.max(0.5, Number(s.confidence) || 0.7)),
          reasoning: String(s.reasoning || 'Matched by AI analysis of complaint narrative.'),
          matchedKeywords: Array.isArray(s.matchedKeywords) ? (s.matchedKeywords as string[]) : [],
        });
      }
    }
  }

  return suggestions.sort((a, b) => b.confidence - a.confidence).slice(0, 6);
}

/* ════════════════════════════════════════════
   3. RELEVANT JUDGMENTS
   ════════════════════════════════════════════ */

export interface AIJudgmentResult {
  id: string;
  title: string;
  court: string;
  year: number;
  citation: string;
  summary: string;
  relevance: string;
}

const JUDGMENT_SYSTEM_PROMPT = `You are a legal research AI specializing in Indian criminal case law. Given a crime type and applicable legal sections, identify relevant landmark judgments from Indian courts.

RULES:
1. Only suggest REAL, well-known Indian Supreme Court or High Court judgments. Do NOT invent fake cases.
2. If you're not sure about a specific judgment, provide the most well-known cases for that crime category.
3. Include: case title, court name, year, citation (if known), a brief summary, and why it's relevant.
4. Return maximum 4 judgments, ranked by relevance.
5. Focus on judgments that set important precedents for the specific crime type.

OUTPUT FORMAT (strict JSON):
{
  "judgments": [
    {
      "title": "Case Name vs Case Name",
      "court": "Supreme Court of India",
      "year": 2023,
      "citation": "AIR 2023 SC 1234 or (2023) X SCC 123",
      "summary": "Brief 2-3 sentence summary of the judgment and its holding",
      "relevance": "Why this judgment is relevant to the current case"
    }
  ]
}`;

export async function findJudgments(crimeType: string, sectionIds: string[]): Promise<AIJudgmentResult[]> {
  const userPrompt = `Crime Type: ${crimeType}\nApplicable Sections: ${sectionIds.join(', ')}\n\nFind relevant Indian court judgments for this case.`;

  try {
    const result = await callGroq<{ judgments: Array<Record<string, unknown>> }>(
      JUDGMENT_SYSTEM_PROMPT,
      userPrompt,
      0.3,
      1500,
    );

    if (Array.isArray(result.judgments)) {
      return result.judgments.map((j: Record<string, unknown>, i: number) => ({
        id: `ai-judgment-${i}`,
        title: String(j.title || 'Unknown Case'),
        court: String(j.court || 'Supreme Court of India'),
        year: Number(j.year) || 2023,
        citation: String(j.citation || ''),
        summary: String(j.summary || ''),
        relevance: String(j.relevance || ''),
      }));
    }
    return [];
  } catch {
    return [];
  }
}
