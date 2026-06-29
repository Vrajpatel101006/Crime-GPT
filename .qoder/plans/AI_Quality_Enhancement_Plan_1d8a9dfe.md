# AI Quality Enhancement Plan

## Problem Statement
The current AI implementation has several weaknesses:
1. Entity extraction is incomplete - missing indirect/implied information
2. Case understanding is shallow - doesn't provide officers with actionable insights
3. Legal section recommendations lack reasoning quality
4. Only 15 judgments in database (need 100+ for comprehensive coverage)
5. AI doesn't explain what it understands about the case to help officers

## Solution Architecture

### Phase 1: Enhanced Complaint Analysis (ai.ts)
**File**: `src/services/ai.ts`

**Current Issue**: The `ANALYSIS_SYSTEM_PROMPT` (lines 126-206) is good but lacks:
- Deep contextual understanding
- Indirect entity extraction (implied relationships, patterns)
- Case complexity assessment
- Investigation recommendations
- Risk factors identification

**Enhancement**:
Replace the current prompt with a comprehensive multi-stage analysis prompt that:
1. **First-pass**: Extract all explicit entities (existing functionality)
2. **Second-pass**: Infer implicit entities (relationships, patterns, connections)
3. **Third-pass**: Generate case understanding summary for officers
4. **Fourth-pass**: Identify investigation recommendations and risk factors

**New Interface** (`AIAnalysisResult`):
```typescript
export interface AIAnalysisResult {
  // Existing fields (kept as-is)
  crimeType: string;
  crimeDescription: string;
  victim: { name, fatherName, age, gender, address, mobile, email, occupation };
  accused: { name, fatherName, age, gender, address, mobile, email, description };
  incident: { date, time, location, description };
  entities: Array<{ type, value, confidence }>;
  witnesses: Array<{ name, details }>;
  evidence: string[];
  summary: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  
  // NEW FIELDS
  caseUnderstanding: string;        // 3-5 paragraph detailed analysis
  modus_operandi: string;           // How the crime was executed
  investigationRecommendations: string[];  // Specific actionable steps
  riskFactors: string[];            // Escalation risks, evidence destruction risks
  connectedCrimes: string[];        // Potential related offences
  evidenceGap: string[];            // What evidence is missing but needed
  financialTrail: string;           // Money flow analysis if applicable
  timeline: Array<{ date: string; event: string }>; // Chronological sequence
}
```

**New System Prompt Strategy**:
- Use chain-of-thought reasoning (but output only structured JSON)
- Add explicit instruction to extract INDIRECT entities
- Include pattern recognition (e.g., "investment scam" → implies fake website, social media ads, multiple victims)
- Add crime-specific analysis templates

### Phase 2: Expand Judgment Database to 100+ Real Cases
**File**: `src/data/seed.ts`

**Current State**: Only 15 judgments (j1-j15)

**Action**: Add 85+ real Indian Supreme Court and High Court judgments covering:
- **Cyber Crimes** (20 judgments): Phishing, hacking, data breaches, IT Act offences
- **Financial Fraud** (15 judgments): Cheating, forgery, money laundering, banking fraud
- **Violent Crimes** (15 judgments): Murder, assault, kidnapping, sexual offences
- **Property Crimes** (10 judgments): Theft, robbery, dacoity, extortion
- **Evidence & Procedure** (15 judgments): Electronic evidence admissibility, FIR procedures, arrest powers
- **Women & Child Protection** (10 judgments): POCSO, domestic violence, harassment

**Quality Standards**:
- All judgments must be REAL (verified from Indian Kanoon, SCC Online, or Supreme Court website)
- Include: case title, court, year, citation, summary (2-3 sentences), relevant sections
- Map to actual BNS/BNSS/BSA/IT Act sections in our database

**Example additions**:
```typescript
{ id: 'j16', title: 'State of Andhra Pradesh vs Rayavarapu Punnayya', court: 'Supreme Court of India', year: 1976, summary: 'Landmark judgment distinguishing culpable homicide from murder. The court established that all murders are culpable homicide but not all culpable homicides are murder.', relevantSections: ['bns-100', 'bns-101'], citation: '(1976) 4 SCC 382' },
// ... 84 more real judgments
```

### Phase 3: Enhanced Legal Section Recommendations
**File**: `src/services/ai.ts`

**Current Issue**: The `LEGAL_SYSTEM_PROMPT` (lines 268-301) provides section matching but lacks:
- Deep case understanding context
- Explanation of HOW sections apply (not just that they apply)
- Prioritization guidance for officers
- Related offence analysis

**Enhancement**:
1. **Pass case understanding to legal AI**: Include the detailed case analysis from Phase 1 in the legal section recommendation prompt
2. **Add section application reasoning**: For each section, AI must explain:
   - What facts from the case trigger this section
   - What elements need to be proved
   - What evidence is required
   - Potential defenses the accused might raise
3. **Add section hierarchy**: Primary sections (direct match) vs Secondary sections (connected offences)

**New Interface** (`AILegalSuggestion`):
```typescript
export interface AILegalSuggestion {
  // Existing fields
  sectionId: string;
  sectionNumber: string;
  act: string;
  title: string;
  confidence: number;
  reasoning: string;
  matchedKeywords: string[];
  
  // NEW FIELDS
  elementsToProve: string[];        // What must be established in court
  requiredEvidence: string[];        // Specific evidence needed
  potentialDefenses: string[];       // Likely defenses accused may raise
  sectionPriority: 'primary' | 'secondary' | 'ancillary';
  punishment: string;                // From legal section database
  relatedSections: string[];         // Connected sections to consider
}
```

**New Legal Prompt Strategy**:
- Include caseUnderstanding from Phase 1
- Include extracted entities and financial trail
- Ask AI to think like a prosecutor building a case
- Require element-by-element analysis

### Phase 4: Enhanced Judgment Recommendations
**File**: `src/services/ai.ts`

**Current Issue**: The `findJudgments` function (lines 590-616) asks Groq to hallucinate judgments from its training data, which may include fake citations.

**Solution**: Hybrid approach
1. **Pre-filter**: Use semantic matching to find top 15 relevant judgments from our 100+ database
2. **AI enrichment**: Ask Groq to:
   - Explain WHY each judgment is relevant to THIS specific case
   - Extract the legal principle/precedent from the judgment
   - Suggest how to cite it in court
3. **Verification**: Only return judgments that exist in our database (no hallucination)

**New Interface** (`AIJudgmentResult`):
```typescript
export interface AIJudgmentResult {
  id: string;              // From database
  title: string;
  court: string;
  year: number;
  citation: string;
  summary: string;
  
  // NEW FIELDS
  relevance: string;       // Why it applies to THIS case
  legalPrinciple: string;  // The precedent established
  howToCite: string;       // How to reference in court filings
  similarity: number;      // 0-1 score of case similarity
}
```

### Phase 5: Create Case Module Improvements
**File**: `src/pages/cases/CreateCaseModal.tsx`

**Enhancements**:
1. **Step 2 (AI Review) improvements**:
   - Display caseUnderstanding in a prominent card
   - Show investigation recommendations as actionable checklist
   - Highlight evidence gaps in red
   - Display timeline visually
   - Show financial trail if applicable
   
2. **Auto-fill improvements**:
   - Pre-fill ALL extracted entities (not just victim/accused)
   - Add witness section pre-populated from AI
   - Add evidence section with AI-suggested evidence list
   - Pre-select legal sections with confidence scores visible

3. **Officer guidance**:
   - Add "What this means" tooltip for each legal section
   - Show precedent cases that support each section
   - Display next steps checklist based on case type

### Phase 6: Groq Model Optimization
**File**: `src/services/ai.ts`, `api/analyze.js`

**Optimizations**:
1. **Increase max_tokens**: From 2048 → 4096 for detailed analysis
2. **Adjust temperature**: 
   - Entity extraction: 0.1 (very deterministic)
   - Case understanding: 0.2 (slightly creative but factual)
   - Legal reasoning: 0.15 (precise legal analysis)
3. **Add retry logic**: If Groq returns malformed JSON, retry once with clearer prompt
4. **Add response validation**: Verify all required fields exist before returning

## Implementation Order

1. **Expand judgment database** (Phase 2) - Foundation first
2. **Enhance complaint analysis** (Phase 1) - Core AI improvement
3. **Enhance legal section recommendations** (Phase 3) - Builds on Phase 1
4. **Enhance judgment recommendations** (Phase 4) - Uses expanded database
5. **Improve Create Case UI** (Phase 5) - Display new data
6. **Optimize Groq calls** (Phase 6) - Performance tuning

## Testing Strategy

After implementation:
1. Test with simple complaint: "Victim lost ₹50,000 in UPI scam"
2. Test with complex complaint: Multi-layered investment fraud with conspiracy
3. Verify entity extraction accuracy (direct and indirect)
4. Verify legal section recommendations match expected sections
5. Verify judgments are real and relevant
6. Test case understanding quality with legal professional review

## Risk Mitigation

- **Hallucination prevention**: All judgments verified from real sources, AI only enriches (doesn't create)
- **Quality control**: Confidence scores on all AI recommendations
- **Fallback mechanism**: If Groq fails, use semantic matching fallback (existing)
- **Rate limiting**: Already implemented in api/analyze.js (10 req/min)

## Files to Modify

1. `src/services/ai.ts` - All AI prompts and interfaces (major changes)
2. `src/data/seed.ts` - Add 85+ judgments (data addition)
3. `src/pages/cases/CreateCaseModal.tsx` - Enhanced UI display
4. `api/analyze.js` - Increase max_tokens limit
5. `scripts/seed-firebase.ts` - Update to include new judgments

## Estimated Impact

- Entity extraction accuracy: 60% → 90%+
- Legal section recommendation relevance: 70% → 95%+
- Judgment database coverage: 15 → 100+ real cases
- Officer understanding: Basic fields → Comprehensive case analysis with actionable insights
- Overall case quality: Significantly improved with investigation guidance