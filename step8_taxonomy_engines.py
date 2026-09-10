import os
import glob

# 1. Locate active App Router directory
candidates = ['apps/web/src/app', 'src/app', 'apps/web/app', 'app']
app_dir = next((c for c in candidates if os.path.exists(c)), None)

if not app_dir:
    matches = glob.glob('**/lib/auth.ts', recursive=True)
    if matches:
        app_dir = os.path.join(os.path.dirname(os.path.dirname(matches[0])), 'app')

if not app_dir:
    print("❌ Error: Could not locate active App Router directory.")
    exit(1)

# 2. Template Generator for Taxonomy Pages
def generate_taxonomy_page(title, icon_name, storage_key, entity_name):
    return f"""'use client';

import {{ useState, useEffect, useCallback }} from 'react';
import {{ Plus, Edit2, Trash2, Save, X, {icon_name}, AlertCircle, CheckCircle2 }} from 'lucide-react';

interface TaxonomyItem {{
  id: string;
  name: string;
  slug: string;
  description: string;
  status: 'active' | 'inactive';
}}

export default function TaxonomyPage() {{
  const [items, setItems] = useState<TaxonomyItem[]>([]);
  const [isDayMode, setIsDayMode] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  // Form State
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<'active' | 'inactive'>('active');
  
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const syncTheme = useCallback(() => {{
    try {{
      const mode = localStorage.getItem('zecratary_theme_mode');
      setIsDayMode(mode === 'light');
    }} catch (_) {{}}
  }}, []);

  const loadData = useCallback(() => {{
    try {{
      const raw = localStorage.getItem('{storage_key}');
      if (raw) setItems(JSON.parse(raw));
    }} catch (_) {{}}
  }}, []);

  useEffect(() => {{
    syncTheme();
    loadData();
    window.addEventListener('zecratary_theme_mode_changed', syncTheme);
    window.addEventListener('storage', syncTheme);
    return () => {{
      window.removeEventListener('zecratary_theme_mode_changed', syncTheme);
      window.removeEventListener('storage', syncTheme);
    }};
  }}, [syncTheme, loadData]);

  const generateSlug = (str: string) => str.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');

  const resetForm = () => {{
    setEditingId(null);
    setName('');
    setDescription('');
    setStatus('active');
    setError('');
  }};

  const handleSave = (e: React.FormEvent) => {{
    e.preventDefault();
    setError('');
    setSuccess('');

    const cleanName = name.trim();
    if (!cleanName) {{
      setError('{entity_name} name is required.');
      return;
    }}

    const slug = generateSlug(cleanName);
    const isDuplicate = items.some(i => i.slug === slug && i.id !== editingId);
    
    if (isDuplicate) {{
      setError('A {entity_name.toLowerCase()} with this name already exists.');
      return;
    }}

    let updatedItems = [...items];

    if (editingId) {{
      updatedItems = updatedItems.map(i => 
        i.id === editingId ? {{ ...i, name: cleanName, slug, description: description.trim(), status }} : i
      );
      setSuccess('{entity_name} updated successfully.');
    }} else {{
      const newItem: TaxonomyItem = {{
        id: 'tax_' + Date.now().toString(36),
        name: cleanName,
        slug,
        description: description.trim(),
        status
      }};
      updatedItems.unshift(newItem);
      setSuccess('{entity_name} created successfully.');
    }}

    setItems(updatedItems);
    localStorage.setItem('{storage_key}', JSON.stringify(updatedItems));
    window.dispatchEvent(new Event('{storage_key}_updated'));
    resetForm();
    setTimeout(() => setSuccess(''), 3000);
  }};

  const handleEdit = (item: TaxonomyItem) => {{
    setEditingId(item.id);
    setName(item.name);
    setDescription(item.description);
    setStatus(item.status);
    window.scrollTo({{ top: 0, behavior: 'smooth' }});
  }};

  const handleDelete = (id: string) => {{
    if (!confirm('Are you sure you want to delete this {entity_name.toLowerCase()}?')) return;
    const updatedItems = items.filter(i => i.id !== id);
    setItems(updatedItems);
    localStorage.setItem('{storage_key}', JSON.stringify(updatedItems));
    setSuccess('{entity_name} deleted.');
    setTimeout(() => setSuccess(''), 3000);
  }};

  return (
    <div 
      className="max-w-5xl mx-auto space-y-6 pb-20 px-2 sm:px-4 pt-2 font-sans transition-colors duration-200"
      style={{ color: isDayMode ? '#0f172a' : 'var(--color-text, #ffffff)' }}
    >
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-black tracking-tight flex items-center gap-2 text-[var(--color-primary)]">
            <{icon_name} className="h-6 w-6" /> {title}
          </h1>
          <p className="text-xs" style={{ color: isDayMode ? '#64748b' : 'var(--color-text-secondary, #94a3b8)' }}>
            Manage and organize your {entity_name.toLowerCase()} taxonomy parameters.
          </p>
        </div>
      </div>

      {{error && (
        <div className="p-3.5 bg-red-950/40 border border-red-800/80 rounded-2xl text-xs text-red-300 font-semibold flex items-center gap-2 shadow-sm">
          <AlertCircle className="h-4 w-4 shrink-0 text-red-400" />
          <span>{{error}}</span>
        </div>
      )}}

      {{success && (
        <div className="p-3.5 bg-emerald-950/40 border border-emerald-500/50 rounded-2xl text-xs text-emerald-300 font-semibold flex items-center gap-2 shadow-sm">
          <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
          <span>{{success}}</span>
        </div>
      )}}

      <div 
        className="border rounded-3xl p-6 shadow-xl transition-colors duration-200"
        style={{
          backgroundColor: isDayMode ? '#ffffff' : 'var(--color-card, #0b0f17)',
          borderColor: isDayMode ? '#e2e8f0' : 'var(--color-border, #1e293b)'
        }}
      >
        <div className="border-b pb-4 mb-4 flex items-center justify-between" style={{ borderColor: isDayMode ? '#e2e8f0' : 'var(--color-border, #1e293b)' }}>
          <h2 className="text-lg font-black" style={{ color: isDayMode ? '#0f172a' : '#ffffff' }}>
            {{editingId ? `Edit ${{{entity_name}}}` : `Add New ${{{entity_name}}}`}}
          </h2>
          {{editingId && (
            <button onClick={resetForm} className="p-1.5 rounded-lg border hover:bg-red-500/10 text-red-400 border-red-500/20 transition cursor-pointer">
              <X className="h-4 w-4" />
            </button>
          )}}
        </div>

        <form onSubmit={handleSave} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block font-bold mb-1.5" style={{ color: isDayMode ? '#334155' : '#cbd5e1' }}>Name *</label>
              <input
                type="text" required value={name} onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Vegan, Keto, Produce..."
                className="w-full border rounded-xl px-3.5 py-2.5 outline-none transition font-bold"
                style={{ backgroundColor: isDayMode ? '#f8fafc' : '#070b13', borderColor: isDayMode ? '#cbd5e1' : '#1e293b', color: isDayMode ? '#0f172a' : '#ffffff' }}
              />
            </div>
            <div>
              <label className="block font-bold mb-1.5" style={{ color: isDayMode ? '#334155' : '#cbd5e1' }}>Status</label>
              <select
                value={status} onChange={(e) => setStatus(e.target.value as 'active' | 'inactive')}
                className="w-full border rounded-xl px-3.5 py-2.5 outline-none transition font-bold cursor-pointer"
                style={{ backgroundColor: isDayMode ? '#f8fafc' : '#070b13', borderColor: isDayMode ? '#cbd5e1' : '#1e293b', color: isDayMode ? '#0f172a' : '#ffffff' }}
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block font-bold mb-1.5" style={{ color: isDayMode ? '#334155' : '#cbd5e1' }}>Description</label>
            <textarea
              value={description} onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief details about this classification..."
              className="w-full border rounded-xl px-3.5 py-2.5 outline-none transition resize-none min-h-[80px]"
              style={{ backgroundColor: isDayMode ? '#f8fafc' : '#070b13', borderColor: isDayMode ? '#cbd5e1' : '#1e293b', color: isDayMode ? '#0f172a' : '#ffffff' }}
            />
          </div>
          <div className="flex justify-end pt-2">
            <button
              type="submit"
              className="px-6 py-2.5 text-white font-extrabold rounded-xl shadow-lg transition flex items-center justify-center gap-2 cursor-pointer hover:opacity-90"
              style={{ backgroundColor: 'var(--color-primary, #E05638)' }}
            >
              {{editingId ? <Save className="h-4 w-4" /> : <Plus className="h-4 w-4" />}}
              {{editingId ? 'Save Changes' : 'Create'}}
            </button>
          </div>
        </form>
      </div>

      <div className="space-y-3">
        <h3 className="font-black text-sm uppercase tracking-wider pl-1" style={{ color: isDayMode ? '#64748b' : '#94a3b8' }}>Existing {{entity_name}}s</h3>
        {{items.length === 0 ? (
          <div className="p-8 text-center border rounded-3xl border-dashed" style={{ borderColor: isDayMode ? '#cbd5e1' : '#1e293b', color: isDayMode ? '#64748b' : '#94a3b8' }}>
            No records found. Create one above to get started.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {{items.map(item => (
              <div 
                key={item.id} 
                className="border rounded-2xl p-4 flex flex-col justify-between space-y-4 shadow-sm"
                style={{ backgroundColor: isDayMode ? '#ffffff' : 'var(--color-card, #0b0f17)', borderColor: isDayMode ? '#e2e8f0' : 'var(--color-border, #1e293b)' }}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h4 className="font-black text-base" style={{ color: isDayMode ? '#0f172a' : '#ffffff' }}>{{item.name}}</h4>
                    <span className="text-[10px] font-mono mt-0.5 block" style={{ color: isDayMode ? '#64748b' : '#94a3b8' }}>Slug: {{item.slug}}</span>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${{item.status === 'active' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 'bg-slate-500/10 text-slate-400 border-slate-500/20'}}`}>
                    {{item.status}}
                  </span>
                </div>
                {{item.description && <p className="text-xs line-clamp-2" style={{ color: isDayMode ? '#64748b' : '#94a3b8' }}>{{item.description}}</p>}}
                <div className="flex items-center gap-2 pt-2 border-t" style={{ borderColor: isDayMode ? '#e2e8f0' : 'var(--color-border, #1e293b)' }}>
                  <button onClick={() => handleEdit(item)} className="flex-1 py-1.5 border rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition hover:opacity-80" style={{ borderColor: isDayMode ? '#cbd5e1' : '#1e293b', color: isDayMode ? '#334155' : '#cbd5e1' }}>
                    <Edit2 className="h-3 w-3" /> Edit
                  </button>
                  <button onClick={() => handleDelete(item.id)} className="flex-1 py-1.5 border rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition bg-red-500/10 text-red-500 border-red-500/20 hover:bg-red-500/20">
                    <Trash2 className="h-3 w-3" /> Delete
                  </button>
                </div>
              </div>
            ))}}
          </div>
        )}}
      </div>
    </div>
  );
}}
"""

# 3. Provision /admin/recipe-type
recipe_type_dir = os.path.join(app_dir, 'admin', 'recipe-type')
os.makedirs(recipe_type_dir, exist_ok=True)
recipe_type_code = generate_taxonomy_page('Recipe Types', 'Utensils', 'zecratary_recipe_types', 'Recipe Type')

with open(os.path.join(recipe_type_dir, 'page.tsx'), 'w', encoding='utf-8') as f:
    f.write(recipe_type_code)
print(f"✓ Installed Recipe Types Engine at: {os.path.join(recipe_type_dir, 'page.tsx')}")

# 4. Provision /admin/ingredient-categories
ingredient_category_dir = os.path.join(app_dir, 'admin', 'ingredient-categories')
os.makedirs(ingredient_category_dir, exist_ok=True)
ingredient_category_code = generate_taxonomy_page('Ingredient Categories', 'Tag', 'zecratary_ingredient_categories', 'Ingredient Category')

with open(os.path.join(ingredient_category_dir, 'page.tsx'), 'w', encoding='utf-8') as f:
    f.write(ingredient_category_code)
print(f"✓ Installed Ingredient Categories Engine at: {os.path.join(ingredient_category_dir, 'page.tsx')}")

print("\n🚀 Option I Integration Complete!")
