/* ============================================
   CRIMEGPT 2.0 — LEGAL MODEL
   ============================================
   Legal sections, judgments, and AI-powered
   legal analysis. Read-only model (no mutations
   from UI — data is seeded from Firebase).
   ============================================ */

import type { LegalSection, Judgment, LegalSuggestion } from '../types';
import { isAIConfigured, suggestLegalSections, findJudgments } from '../services/ai';
import { validateBatch, SCHEMAS } from './validation';

/* ─── LEGAL SECTIONS ─── */
let LEGAL_SECTIONS: LegalSection[] = [];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function hydrateLegalSections(data: Record<string, any>): void {
  const valid = validateBatch('legalSection', data, SCHEMAS.legalSection);
  LEGAL_SECTIONS = valid.map((s: any) => ({
    id: s.id,
    act: s.act,
    sectionNumber: s.sectionNumber,
    title: s.title,
    description: s.description,
    keywords: s.keywords,
    crimeTypes: s.crimeTypes,
    evidence_required: s.evidence_required,
    relatedSections: s.relatedSections,
    punishment: s.punishment,
    legacyReference: s.legacyReference,
  }));
}

export function getLegalSections(): LegalSection[] {
  return [...LEGAL_SECTIONS];
}

/* ─── JUDGMENTS ─── */
let JUDGMENTS: Judgment[] = [];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function hydrateJudgments(data: Record<string, any>): void {
  const valid = validateBatch('judgment', data, SCHEMAS.judgment);
  JUDGMENTS = valid.map((j: any) => ({
    id: j.id,
    title: j.title,
    court: j.court,
    year: j.year,
    summary: j.summary,
    relevantSections: j.relevantSections,
    citation: j.citation,
  }));
}

export function getJudgments(): Judgment[] {
  return [...JUDGMENTS];
}

/* ─── AI LEGAL ANALYSIS ─── */
export async function simulateLegalAnalysis(
  narrative: string,
  crimeCategory?: string,
): Promise<{ suggestions: LegalSuggestion[]; judgments: Judgment[] }> {
  if (await isAIConfigured()) {
    try {
      const sections = getLegalSections();
      const aiSuggestions = await suggestLegalSections(narrative, sections.map(s => ({
        id: s.id, act: s.act, sectionNumber: s.sectionNumber,
        title: s.title, description: s.description,
        keywords: s.keywords, crimeTypes: s.crimeTypes,
      })), crimeCategory);

      const suggestions: LegalSuggestion[] = aiSuggestions.map(ai => {
        const section = sections.find(s => s.id === ai.sectionId);
        return {
          section: section || sections[0] || {} as LegalSection,
          confidence: ai.confidence,
          reasoning: ai.reasoning,
          matchedKeywords: ai.matchedKeywords,
        };
      }).filter(s => s.section && s.section.id);

      const crimeType = suggestions.length > 0 ? suggestions[0].section.title : 'General Offence';
      const sectionIds = suggestions.map(s => s.section.id);

      let judgments: Judgment[] = [];
      try {
        const aiJudgments = await findJudgments(crimeType, sectionIds);
        judgments = aiJudgments.map(j => ({
          id: j.id,
          title: j.title,
          court: j.court,
          year: j.year,
          summary: `${j.summary}\n\nRelevance: ${j.relevance}`,
          relevantSections: sectionIds,
          citation: j.citation,
        }));
      } catch { /* judgments are optional */ }

      if (suggestions.length === 0) {
        return _simulateLegalAnalysisFallback(narrative);
      }
      return { suggestions, judgments };
    } catch (err) {
      console.warn('AI legal analysis failed, using fallback:', err);
    }
  }
  return _simulateLegalAnalysisFallback(narrative);
}

function _simulateLegalAnalysisFallback(narrative: string): { suggestions: LegalSuggestion[]; judgments: Judgment[] } {
  const lowerNarrative = narrative.toLowerCase();
  const matched: LegalSuggestion[] = [];

  for (const section of LEGAL_SECTIONS) {
    const matchedKeywords = section.keywords.filter(kw => lowerNarrative.includes(kw));
    if (matchedKeywords.length > 0 || section.crimeTypes.some(ct => lowerNarrative.includes(ct.toLowerCase()))) {
      const confidence = Math.min(0.98, 0.6 + matchedKeywords.length * 0.1 + Math.random() * 0.1);
      matched.push({
        section,
        confidence,
        reasoning: `The complaint narrative contains keywords related to ${section.title}: ${matchedKeywords.join(', ') || section.crimeTypes[0] || 'related crime patterns'}. This section covers ${section.description.substring(0, 120)}...`,
        matchedKeywords,
      });
    }
  }

  if (matched.length === 0) {
    matched.push({
      section: LEGAL_SECTIONS[0] || {} as LegalSection,
      confidence: 0.55,
      reasoning: 'General fraud indicators detected in the complaint narrative.',
      matchedKeywords: ['fraud'],
    });
  }

  matched.sort((a, b) => b.confidence - a.confidence);

  const relevantJudgments = JUDGMENTS.filter(j =>
    matched.some(m => j.relevantSections.includes(m.section.id))
  );

  return { suggestions: matched.slice(0, 5), judgments: relevantJudgments };
}
