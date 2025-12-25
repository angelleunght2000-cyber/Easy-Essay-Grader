
import React from 'react';
import { EssayResult } from '../types';

interface ScoreCardProps {
  result: EssayResult;
}

export const ScoreCard: React.FC<ScoreCardProps> = ({ result }) => {
  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-blue-600';
    if (score >= 40) return 'text-orange-600';
    return 'text-red-600';
  };

  return (
    <div className={`bg-white p-6 rounded-xl border ${result.isSuspectedAI ? 'border-red-200' : 'border-blue-100'} shadow-sm hover:shadow-md transition-shadow group relative overflow-hidden`}>
      {result.isSuspectedAI && (
        <div className="absolute top-0 right-0">
          <div className="bg-red-500 text-white text-[10px] font-bold px-3 py-1 uppercase tracking-tighter rotate-0 rounded-bl-lg flex items-center gap-1 shadow-sm">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            AI Detected
          </div>
        </div>
      )}

      <div className="flex justify-between items-start mb-4">
        <div className="max-w-[70%]">
          <h3 className="font-semibold text-slate-800 truncate" title={result.fileName}>
            {result.fileName}
          </h3>
          <p className="text-xs text-slate-400 mt-1">Processed at {new Date(result.timestamp).toLocaleTimeString()}</p>
        </div>
        <div className={`text-3xl font-bold ${getScoreColor(result.score)}`}>
          {result.score}<span className="text-sm text-slate-400 font-normal">/100</span>
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <h4 className={`text-xs font-bold uppercase tracking-wider ${result.isSuspectedAI ? 'text-red-500' : 'text-blue-500'} mb-1`}>
            Reasoning
          </h4>
          <p className={`text-sm ${result.isSuspectedAI ? 'text-red-700 font-medium' : 'text-slate-600 italic'}`}>
            "{result.reason}"
          </p>
        </div>
        
        <div>
          <h4 className="text-xs font-bold uppercase tracking-wider text-blue-500 mb-1">Context Summary</h4>
          <p className="text-sm text-slate-700 leading-relaxed">
            {result.summary}
          </p>
        </div>
      </div>
    </div>
  );
};
