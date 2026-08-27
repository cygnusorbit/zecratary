'use client';
import { useState } from 'react';
import { Link2, FileText, Image as ImageIcon, Sparkles, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function ImportPage() {
  const [activeTab, setActiveTab] = useState<'url' | 'text' | 'image'>('url');
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);
  const router = useRouter();

  const handleIngest = async () => {
    if (!url.trim()) return;
    setLoading(true);
    setStatus(null);
    try {
      const res = await fetch('/api/recipes/ingest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      });
      const result = await res.json();
      if (result.success && result.data) {
        // Sync to client local storage as immediate backup
        const existing = JSON.parse(localStorage.getItem('zecratary_recipes') || '[]');
        const updated = [result.data, ...existing.filter((r: any) => r.title !== result.data.title)];
        localStorage.setItem('zecratary_recipes', JSON.stringify(updated));

        setStatus({
          type: 'success',
          msg: `Successfully imported "${result.data.title}"! Redirecting to your recipe library...`,
        });
        setUrl('');
        setTimeout(() => {
          router.push('/recipes');
        }, 1200);
      } else {
        setStatus({ type: 'error', msg: result.error || 'Failed to extract recipe.' });
      }
    } catch (e: any) {
      setStatus({ type: 'error', msg: e.message || 'Network failure during import.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 text-slate-100">
      <div>
        <h1 className="text-3xl font-extrabold text-[#E05638]">Import Recipe</h1>
        <p className="text-emerald-400 text-sm mt-1">Import your favorite recipes from websites and social media</p>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {/* Left Importer Card */}
        <div className="md:col-span-2 bg-[#111726] border border-slate-800 rounded-2xl p-6 space-y-6">
          <div className="flex bg-[#0B101D] p-1.5 rounded-xl border border-slate-800">
            {[
              { id: 'url', label: 'URL', icon: Link2 },
              { id: 'text', label: 'Text', icon: FileText },
              { id: 'image', label: 'Image', icon: ImageIcon },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex-1 py-2.5 text-xs font-bold rounded-lg flex items-center justify-center gap-2 transition ${
                  activeTab === tab.id
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <tab.icon className="h-4 w-4" /> {tab.label}
              </button>
            ))}
          </div>

          {activeTab === 'url' && (
            <div className="space-y-4">
              <label className="block text-xs font-semibold text-slate-300">Recipe URL</label>
              <input
                type="text"
                placeholder="Paste recipe website, YouTube, Instagram, TikTok, or Facebook URL"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleIngest()}
                className="w-full bg-[#0B101D] border border-slate-800 rounded-xl px-4 py-3 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-[#E05638]"
              />
              <button
                onClick={handleIngest}
                disabled={loading || !url.trim()}
                className="w-full bg-[#E05638] hover:bg-[#c94529] disabled:opacity-50 text-white font-bold py-3.5 rounded-xl transition flex items-center justify-center gap-2 text-sm shadow-lg shadow-[#E05638]/20"
              >
                <Sparkles className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                {loading ? 'Extracting & Saving...' : 'Import Recipe'}
              </button>
            </div>
          )}

          {status && (
            <div
              className={`p-4 rounded-xl border text-sm font-semibold flex items-center gap-2 ${
                status.type === 'success'
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                  : 'bg-red-500/10 border-red-500/30 text-red-400'
              }`}
            >
              {status.type === 'success' ? <CheckCircle2 className="h-4 w-4 shrink-0" /> : <AlertCircle className="h-4 w-4 shrink-0" />}
              <span>{status.msg}</span>
            </div>
          )}
        </div>

        {/* Right Tips Card */}
        <div className="bg-[#111726] border border-slate-800 rounded-2xl p-6 space-y-4">
          <h3 className="text-[#E05638] font-bold text-base">URL Import Tips</h3>
          <ul className="space-y-3 text-xs text-slate-300 leading-relaxed">
            <li>🌐 <strong>Supported Websites:</strong> AllRecipes, Food Network, Bon Appétit, and standard schema blogs.</li>
            <li>📺 <strong>YouTube Recipe Videos:</strong> Video descriptions and cooking chapters are parsed automatically.</li>
            <li>📱 <strong>Social Media:</strong> Instagram Reels, TikTok video links, and Facebook posts.</li>
            <li>✅ <strong>Best Practices:</strong> Use direct recipe links (not category overviews) without paywalls.</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
