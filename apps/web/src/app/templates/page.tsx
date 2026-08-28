'use client';
import { useState } from 'react';
import { Plus, Edit2, Trash2, CalendarRange } from 'lucide-react';

export default function TemplatesPage() {
  const [templates, setTemplates] = useState([
    { id: '1', name: 'Template', mealsCount: 1 }
  ]);
  const [newTitle, setNewTitle] = useState('');
  const [modalOpen, setModalOpen] = useState(false);

  const addTemplate = () => {
    if (!newTitle.trim()) return;
    setTemplates([...templates, { id: Date.now().toString(), name: newTitle, mealsCount: 7 }]);
    setNewTitle('');
    setModalOpen(false);
  };

  const removeTemplate = (id: string) => {
    setTemplates(templates.filter(t => t.id !== id));
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 text-slate-100">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-extrabold text-[#E05638]">Templates</h1>
          <p className="text-slate-400 text-xs mt-1">Save reusable 7-day meal plans you can apply to any week.</p>
        </div>
        <button
          onClick={() => setModalOpen(true)}
          className="bg-[#E05638] hover:bg-[#c94529] text-white font-bold text-xs px-4 py-2.5 rounded-xl transition flex items-center gap-1.5 shadow-lg shadow-[#E05638]/20"
        >
          <Plus className="h-4 w-4" /> New Template
        </button>
      </div>

      <div className="space-y-3">
        {templates.map(t => (
          <div key={t.id} className="bg-[#111726] border border-slate-800 rounded-2xl p-5 flex items-center justify-between hover:border-slate-700 transition">
            <div>
              <h3 className="font-bold text-white text-base">{t.name}</h3>
              <span className="text-xs text-slate-400">{t.mealsCount} meal</span>
            </div>
            <div className="flex items-center gap-3">
              <button className="text-slate-400 hover:text-white p-2">
                <Edit2 className="h-4 w-4" />
              </button>
              <button onClick={() => removeTemplate(t.id)} className="text-slate-400 hover:text-red-400 p-2">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {modalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#111726] border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-4">
            <h3 className="font-bold text-white">Create Meal Plan Template</h3>
            <input
              type="text"
              placeholder="e.g. High-Protein Week or Busy Week"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              className="w-full bg-[#0B101D] border border-slate-800 rounded-xl p-3 text-sm text-white outline-none focus:border-[#E05638]"
            />
            <div className="flex gap-2">
              <button onClick={() => setModalOpen(false)} className="flex-1 bg-slate-800 text-slate-300 font-bold p-2.5 rounded-xl text-xs">Cancel</button>
              <button onClick={addTemplate} className="flex-1 bg-[#E05638] text-white font-bold p-2.5 rounded-xl text-xs">Create Template</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
