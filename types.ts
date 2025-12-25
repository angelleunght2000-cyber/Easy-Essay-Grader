
export interface EssayResult {
  id: string;
  fileName: string;
  score: number;
  reason: string;
  summary: string;
  isSuspectedAI: boolean;
  status: 'pending' | 'processing' | 'completed' | 'error';
  timestamp: number;
}

export interface ScoringRubric {
  contextWeight: number; // 20%
  logicWeight: number;   // 60%
  grammarWeight: number; // 20%
  companyValues: string[];
}

export const APP_RUBRIC: ScoringRubric = {
  contextWeight: 0.2,
  logicWeight: 0.6,
  grammarWeight: 0.2,
  companyValues: [
    'Leadership',
    'Versatility',
    'Safety',
    'Vision',
    'Innovation',
    'Customer-orientation',
    'Positive Communication',
    'Teamwork',
    'Result-driven performance'
  ]
};