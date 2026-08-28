'use client';
import { useState, useEffect } from 'react';
import { Cpu, CheckCircle2, Key, Save } from 'lucide-react';

export default function AdminEnginePage() {
  const [provider, setProvider] = useState<'gemini' | 'openai'>('gemini');
  const [saved, setSaved] = useState(false);

  return (
    <div className="max-w-4xl mx-auto space-y-6 text-slate-100">
      <div>
        <h1 className="text-3xl font-extrabold text-[#E05638] flex items-center gap-3">
          <Cpu className="h-8 w-8 text-[#E05638]" /> AI Engine & Inference Control
        </h1>
        <p className="text-slate-400 text-sm mt-1">
          Switch runtime AI models dynamically between Google Gemini and OpenAI with live key injection.
        </p>
      </div>

      <div className="bg-[#111726] border border-slate-800 rounded-2xl p-6 space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <button
            onClick={() => setProvider('gemini')}
            className={`p-4 rounded-xl border text-left flex items-center justify-between ${
              provider === 'gemini' ? 'border-[#E05638] bg-[#E05638]/10' : 'border-slate-800'
            }`}
          >
            <div>
              <span className="font-bold text-white block">Google Gemini</span>
              <span className="text-xs text-slate-400">Gemini 1.5 Pro / Flash</span>
            </div>
            {provider === 'gemini' && <CheckCircle2 className="h-5 w-5 text-[#E05638]" />}
          </button>

          <button
            onClick={() => setProvider('openai')}
            className={`p-4 rounded-xl border text-left flex items-center justify-between ${
              provider === 'openai' ? 'border-[#E05638] bg-[#E05638]/10' : 'border-slate-800'
            }`}
          >
            <div>
              <span className="font-bold text-white block">OpenAI</span>
              <span className="text-xs text-slate-400">GPT-4o / GPT-4o-mini</span>
            </div>
            {provider === 'openai' && <CheckCircle2 className="h-5 w-5 text-[#E05638]" />}
          </button>
        </div>

        <button
          onClick={() => { setSaved(true); setTimeout(() => setSaved(false), 2000); }}
          className="bg-[#E05638] hover:bg-[#c94529] text-white font-bold text-xs px-6 py-3 rounded-xl transition flex items-center gap-2"
        >
          <Save className="h-4 w-4" /> {saved ? 'Configuration Saved!' : 'Save Engine Settings'}
        </button>
      </div>
    </div>
  );
}
