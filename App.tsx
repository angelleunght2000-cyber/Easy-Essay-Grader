
import React, { useState, useRef } from 'react';
import { Button } from './components/Button';
import { ScoreCard } from './components/ScoreCard';
import { EssayResult } from './types';
import { scoreEssay } from './services/geminiService';
import { exportToCSV } from './utils/export';
import { trackEvent } from './services/analytics';

const App: React.FC = () => {
  const [step, setStep] = useState(1);
  const [files, setFiles] = useState<File[]>([]);
  const [results, setResults] = useState<EssayResult[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentProcessingIndex, setCurrentProcessingIndex] = useState(-1);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selectedFiles = Array.from(e.target.files);
      setFiles(prev => [...prev, ...selectedFiles]);
      trackEvent('files_selected', 'Engagement', 'Count', selectedFiles.length);
      // Reset input value so the same file can be selected again if removed
      e.target.value = '';
    }
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const processBatch = async () => {
    if (files.length === 0) return;
    
    setIsProcessing(true);
    setStep(3);
    trackEvent('batch_processing_started', 'Analysis', 'FileCount', files.length);
    
    // We store the length here because we will clear the files array after processing
    const totalFiles = files.length;
    
    for (let i = 0; i < totalFiles; i++) {
      setCurrentProcessingIndex(i);
      const file = files[i];
      
      try {
        const result = await scoreEssay(file.name, file, file.type);
        
        const finalResult: EssayResult = {
          id: Math.random().toString(36).substr(2, 9),
          fileName: file.name,
          score: result.score || 0,
          reason: result.reason || "Processed successfully.",
          summary: result.summary || "No summary generated.",
          isSuspectedAI: result.isSuspectedAI || false,
          status: result.status as any,
          timestamp: Date.now(),
        };
        
        setResults(prev => [finalResult, ...prev]);
      } catch (err) {
        console.error(`Error processing ${file.name}:`, err);
        trackEvent('processing_error', 'Error', file.name);
      }
    }
    
    setIsProcessing(false);
    setCurrentProcessingIndex(-1);
    setFiles([]); // Automatically clear documents for the next batch
    trackEvent('batch_processing_completed', 'Analysis', 'FileCount', totalFiles);
  };

  const handleExport = () => {
    exportToCSV(results);
    trackEvent('results_exported', 'Engagement', 'CSV');
  };

  const reset = () => {
    setStep(1);
    setFiles([]);
    setResults([]);
    setIsProcessing(false);
  };

  return (
    <div className="min-h-screen flex flex-col selection:bg-blue-100">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-md border-b border-blue-100 px-8 py-4 flex justify-between items-center sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center text-white shadow-lg">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-800 tracking-tight">Easy essay grader</h1>
          </div>
        </div>
        
        {results.length > 0 && (
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={reset}>Reset All</Button>
            <Button onClick={handleExport}>Download CSV Report</Button>
          </div>
        )}
      </header>

      <main className="flex-1 flex flex-col md:flex-row p-6 gap-6 max-w-[1600px] mx-auto w-full">
        {/* Left Side: Interaction Panel */}
        <div className="flex-1 max-w-2xl">
          <div className="bg-white rounded-3xl shadow-2xl shadow-blue-100 border border-blue-50 overflow-hidden h-full flex flex-col transition-all">
            
            {/* Step Indicators */}
            <div className="flex p-6 bg-slate-50/50 border-b border-slate-100">
              {[1, 2, 3].map((s) => (
                <div key={s} className="flex items-center flex-1">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-500 ${
                    step >= s ? 'bg-blue-600 text-white scale-110 shadow-lg' : 'bg-slate-200 text-slate-500'
                  }`}>
                    {s}
                  </div>
                  {s < 3 && <div className={`flex-1 h-0.5 mx-2 rounded-full transition-all duration-500 ${step > s ? 'bg-blue-600' : 'bg-slate-200'}`} />}
                </div>
              ))}
            </div>

            <div className="flex-1 p-8 overflow-y-auto custom-scrollbar">
              {step === 1 && (
                <div className="animate-fadeIn space-y-6">
                  <h2 className="text-4xl font-extrabold text-slate-800 leading-tight">Objective analysis for high-stakes hiring.</h2>
                  <p className="text-slate-600 leading-relaxed text-lg">
                    This tool evaluates candidate essays against our 9 core values with absolute mathematical consistency. 
                    Upload up to 100 documents in English or Chinese.
                  </p>
                  
                  <div className="grid grid-cols-2 gap-4">
                    {[
                      { icon: "🧠", label: "60% Logic & Flow", desc: "Critical reasoning metric" },
                      { icon: "🎯", label: "20% Context (Values)", desc: "9 core company pillars" },
                      { icon: "✍️", label: "20% Grammar", desc: "Professional tone" },
                      { icon: "🤖", label: "AI Sentry", desc: "Flags generated content" }
                    ].map((metric, i) => (
                      <div key={i} className="bg-blue-50/50 p-4 rounded-2xl border border-blue-100 hover:bg-blue-50 transition-colors">
                        <span className="text-2xl block mb-2">{metric.icon}</span>
                        <div className="text-sm font-bold text-blue-900">{metric.label}</div>
                        <div className="text-[10px] text-blue-600 font-medium uppercase mt-1">{metric.desc}</div>
                      </div>
                    ))}
                  </div>

                  <Button onClick={() => setStep(2)} className="w-full py-5 text-lg rounded-2xl">
                    Begin New Session
                  </Button>
                </div>
              )}

              {step === 2 && (
                <div className="animate-fadeIn space-y-6">
                  <div className="flex justify-between items-center">
                    <h2 className="text-2xl font-bold text-slate-800">Queue Documents</h2>
                    <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-xs font-bold">
                      {files.length} Selected
                    </span>
                  </div>

                  <div 
                    onClick={handleUploadClick}
                    className="border-2 border-dashed border-blue-200 rounded-3xl p-12 text-center bg-blue-50/30 hover:bg-blue-50 transition-all cursor-pointer relative group"
                  >
                    <input 
                      ref={fileInputRef}
                      type="file" 
                      multiple 
                      accept=".jpg,.jpeg,.png,.pdf,.txt,.docx"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                    <div className="flex flex-col items-center">
                      <div className="w-16 h-16 bg-blue-600/10 rounded-full flex items-center justify-center text-blue-600 mb-4 group-hover:scale-110 transition-transform">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                        </svg>
                      </div>
                      <p className="text-slate-800 font-bold mb-1">Upload Documents</p>
                      <p className="text-slate-500 text-sm">DOCX, PDF, JPG, PNG, or TXT (Max 100 files)</p>
                    </div>
                  </div>

                  {files.length > 0 && (
                    <div className="max-h-[300px] overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                      {files.map((file, idx) => (
                        <div key={idx} className="bg-white border border-slate-100 p-4 rounded-xl flex justify-between items-center group hover:border-blue-200 transition-colors">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-slate-50 rounded-lg flex items-center justify-center text-slate-400">
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
                              </svg>
                            </div>
                            <span className="text-sm font-semibold text-slate-700 truncate max-w-[250px]">{file.name}</span>
                          </div>
                          <button onClick={() => removeFile(idx)} className="text-slate-300 hover:text-red-500 transition-colors p-2">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                            </svg>
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="flex gap-4 pt-4">
                    <Button variant="outline" className="flex-1 rounded-xl" onClick={() => setStep(1)}>Back</Button>
                    <Button className="flex-[2] rounded-xl" disabled={files.length === 0} onClick={processBatch}>
                      Process {files.length} Candidates
                    </Button>
                  </div>
                </div>
              )}

              {step === 3 && (
                <div className="animate-fadeIn text-center space-y-8 py-12">
                  <div className="relative inline-block">
                    {/* The spin animation is now conditional on isProcessing */}
                    <div className={`w-40 h-40 border-[6px] border-blue-50 border-t-blue-600 rounded-full transition-all duration-700 ${isProcessing ? 'animate-spin' : ''}`}></div>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="text-center">
                        <span className="text-3xl font-black text-blue-600 block">
                          {isProcessing ? Math.round(((currentProcessingIndex + 1) / (currentProcessingIndex + 1 + (isProcessing ? 1 : 0))) * 100) : 100}%
                        </span>
                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                          {isProcessing ? 'Analyzing' : 'Complete'}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <h2 className="text-3xl font-bold text-slate-800">
                      {isProcessing ? 'Objective Assessment...' : 'Session Finalized'}
                    </h2>
                    <p className="text-slate-500 max-w-sm mx-auto leading-relaxed">
                      {isProcessing 
                        ? `Applying evaluation criteria to current submission.` 
                        : `All documents evaluated. The upload queue has been cleared for your next batch.`}
                    </p>
                  </div>

                  {!isProcessing && (
                    <div className="flex flex-col gap-3">
                      <Button className="w-full py-4 rounded-xl" onClick={handleExport}>
                        Export Batch Report
                      </Button>
                      <Button variant="ghost" onClick={() => setStep(2)}>
                        Upload More Documents
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Status Bar */}
            <div className="px-6 py-3 bg-slate-800 text-white flex justify-between items-center">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                <span className="text-[10px] font-bold uppercase tracking-wider">Logic-First Sentry Active</span>
              </div>
              <span className="text-[10px] text-slate-400 font-medium">VERSION 2.4.0 • AUTO-QUEUE RESET</span>
            </div>
          </div>
        </div>

        {/* Right Side: Score Board */}
        <div className="w-full md:w-[450px] lg:w-[550px] flex flex-col gap-4">
          <div className="flex justify-between items-center px-4">
            <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              </div>
              Candidate Rankings
            </h2>
          </div>
          
          <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-4">
            {results.length === 0 ? (
              <div className="h-full bg-white/40 border-2 border-dashed border-slate-200 rounded-3xl flex flex-col items-center justify-center p-12 text-center text-slate-400">
                <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mb-6">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 opacity-30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                </div>
                <p className="font-bold text-slate-500">Awaiting Submissions</p>
                <p className="text-xs mt-2 max-w-[200px]">Results will appear here in real-time as analysis completes.</p>
              </div>
            ) : (
              results.map((result) => (
                <div key={result.id} className="animate-slideInRight">
                  <ScoreCard result={result} />
                </div>
              ))
            )}
          </div>
        </div>
      </main>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes slideInRight {
          from { opacity: 0; transform: translateX(30px); }
          to { opacity: 1; transform: translateX(0); }
        }
        .animate-fadeIn { animation: fadeIn 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        .animate-slideInRight { animation: slideInRight 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
      `}</style>
    </div>
  );
};

export default App;
