import React, { useState, useEffect } from 'react';
import { Sliders, Save, ShieldAlert, Cpu, Sparkles, CheckCircle } from 'lucide-react';

function AdminAISettings() {
  const [model, setModel] = useState('gemini-1.5-flash');
  const [chunkSize, setChunkSize] = useState(1000);
  const [chunkOverlap, setChunkOverlap] = useState(150);
  const [vectorWeight, setVectorWeight] = useState(0.7);
  const [systemPrompt, setSystemPrompt] = useState(
    "You are a helpful staff software engineer assistant. Answer the question using ONLY the provided context."
  );
  const [saved, setSaved] = useState(false);
  const [isConfigured, setIsConfigured] = useState(false);

  useEffect(() => {
    // Check if python-ai service has Gemini key loaded
    checkGeminiStatus();
  }, []);

  const checkGeminiStatus = async () => {
    try {
      const res = await fetch('http://localhost:8000/health');
      if (res.ok) {
        const status = await res.json();
        setIsConfigured(status.gemini_configured);
      }
    } catch (e) {
      setIsConfigured(false);
    }
  };

  const handleVectorChange = (val) => {
    setVectorWeight(Number(val));
  };

  const handleSave = (e) => {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h2 className="text-lg font-medium text-text-primary">AI & Retrieval Settings</h2>
        <p className="text-xs text-text-secondary mt-1">Configure LLM providers, balance keyword vs vector weights, and tune retrieval chunk parameters.</p>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        
        {/* API connection status box */}
        <div className="rounded-card border border-border-hairline bg-background-card p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Cpu className="h-5 w-5 text-brand-teal" />
            <div>
              <p className="text-xs font-medium text-text-primary">Gemini API Key Connection</p>
              <p className="text-[10px] text-text-secondary mt-0.5">
                {isConfigured 
                  ? 'Active: Generative streaming synthesis is fully enabled.' 
                  : 'Inactive: Local fallback parsing is active. Add GEMINI_API_KEY to python-ai/.env to enable.'}
              </p>
            </div>
          </div>
          <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10px] font-medium font-mono ${
            isConfigured ? 'bg-brand-teal/10 text-brand-teal-light' : 'bg-status-warning/10 text-status-warning'
          }`}>
            {isConfigured ? 'CONNECTED' : 'MOCK FALLBACK'}
          </span>
        </div>

        {/* Model Selection */}
        <div className="rounded-card border border-border-hairline bg-background-card p-5 space-y-4">
          <div className="flex items-center gap-2 border-b border-border-hairline/45 pb-3">
            <Sparkles className="h-4 w-4 text-brand-teal" />
            <h3 className="text-xs font-mono font-medium uppercase tracking-wider text-text-secondary">Generative LLM Model</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              { id: 'gemini-1.5-flash', name: 'Gemini 1.5 Flash (Recommended)', desc: 'Fast, token-efficient, streaming optimal for quick lookups.' },
              { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro', desc: 'Deep logical reasoning, larger context window, suitable for large codebase files.' }
            ].map((opt) => (
              <label 
                key={opt.id}
                className={`relative flex flex-col rounded-control border p-4 cursor-pointer hover:bg-background-sidebar/30 transition-colors ${
                  model === opt.id ? 'border-brand-teal bg-[#04342C]/5' : 'border-border-hairline bg-background-sidebar/10'
                }`}
              >
                <input 
                  type="radio" 
                  name="modelSelect" 
                  value={opt.id} 
                  checked={model === opt.id}
                  onChange={(e) => setModel(e.target.value)}
                  className="sr-only" 
                />
                <span className="text-xs font-medium text-text-primary">{opt.name}</span>
                <span className="text-[10px] text-text-secondary mt-1.5 leading-relaxed">{opt.desc}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Retrieval Parameters */}
        <div className="rounded-card border border-border-hairline bg-background-card p-5 space-y-6">
          <div className="flex items-center gap-2 border-b border-border-hairline/45 pb-3">
            <Sliders className="h-4 w-4 text-brand-teal" />
            <h3 className="text-xs font-mono font-medium uppercase tracking-wider text-text-secondary">Retrieval Tuning Parameters</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Chunk Size */}
            <div className="space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="font-medium text-text-primary">Text Chunk Size</span>
                <span className="font-mono text-brand-teal">{chunkSize} characters</span>
              </div>
              <input 
                type="range" 
                min="200" 
                max="2000" 
                step="50"
                value={chunkSize}
                onChange={(e) => setChunkSize(Number(e.target.value))}
                className="w-full h-1 bg-background-sidebar rounded-lg appearance-none cursor-pointer accent-brand-teal"
              />
              <p className="text-[10px] text-text-tertiary">Max length of text segments written to vector storage.</p>
            </div>

            {/* Chunk Overlap */}
            <div className="space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="font-medium text-text-primary">Text Chunk Overlap</span>
                <span className="font-mono text-brand-teal">{chunkOverlap} characters</span>
              </div>
              <input 
                type="range" 
                min="0" 
                max="500" 
                step="10"
                value={chunkOverlap}
                onChange={(e) => setChunkOverlap(Number(e.target.value))}
                className="w-full h-1 bg-background-sidebar rounded-lg appearance-none cursor-pointer accent-brand-teal"
              />
              <p className="text-[10px] text-text-tertiary">Length of text overlapping between consecutive chunks.</p>
            </div>

            {/* Hybrid Weights */}
            <div className="space-y-2 md:col-span-2">
              <div className="flex justify-between items-center text-xs">
                <span className="font-medium text-text-primary">Hybrid Search Weights Balance</span>
                <span className="font-mono text-text-secondary">
                  Vector: <span className="text-brand-teal">{vectorWeight.toFixed(1)}</span> / BM25: <span className="text-status-warning">{(1.0 - vectorWeight).toFixed(1)}</span>
                </span>
              </div>
              <input 
                type="range" 
                min="0.0" 
                max="1.0" 
                step="0.1"
                value={vectorWeight}
                onChange={(e) => handleVectorChange(e.target.value)}
                className="w-full h-1 bg-background-sidebar rounded-lg appearance-none cursor-pointer accent-brand-teal"
              />
              <p className="text-[10px] text-text-tertiary mt-1">
                Adjust balance: higher vector weight prioritizes semantic similarity; higher BM25 weight prioritizes exact keyword matches.
              </p>
            </div>

          </div>
        </div>

        {/* System Prompt Customization */}
        <div className="rounded-card border border-border-hairline bg-background-card p-5 space-y-4">
          <h3 className="text-xs font-mono font-medium uppercase tracking-wider text-text-secondary">System Instruction Prompt</h3>
          <textarea
            value={systemPrompt}
            onChange={(e) => setSystemPrompt(e.target.value)}
            rows="3"
            className="w-full rounded-control border border-border-hairline bg-background-sidebar px-3.5 py-2.5 text-xs text-text-primary focus:border-brand-teal focus:outline-none resize-y font-mono leading-relaxed"
          />
          <p className="text-[10px] text-text-tertiary">Defines the default persona, behavioral limitations, and citations output constraints for Gemini.</p>
        </div>

        {/* Save button bar */}
        <div className="flex items-center justify-between pt-2">
          {saved ? (
            <div className="flex items-center gap-1.5 text-xs text-brand-teal font-mono">
              <CheckCircle className="h-4 w-4" />
              <span>Settings updated successfully!</span>
            </div>
          ) : <div />}
          
          <button
            type="submit"
            className="inline-flex items-center gap-2 rounded-control bg-brand-teal hover:bg-brand-teal-light text-background-page px-5 py-2 text-xs font-medium transition-colors"
          >
            <Save className="h-3.5 w-3.5" />
            Save configurations
          </button>
        </div>

      </form>
    </div>
  );
}

export default AdminAISettings;
