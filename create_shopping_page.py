import os

code = """'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  ShoppingCart, Plus, Trash2, CheckSquare, Square, Star, 
  Copy, Edit3, X, Save, Search, CheckCircle2 
} from 'lucide-react';

export default function ShoppingListPage() {
  const [items, setItems] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [showStaplesOnly, setShowStaplesOnly] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingItem, setEditingItem] = useState<any | null>(null);

  // Form states matching ingredient fields
  const [itemName, setItemName] = useState('');
  const [itemAmount, setItemAmount] = useState('1');
  const [itemUnit, setItemUnit] = useState('Unit');
  const [itemCategory, setItemCategory] = useState('Produce');

  useEffect(() => {
    document.title = 'Shopping List - FoodiePrep';
    const local = localStorage.getItem('zecratary_shopping_list');
    if (local) {
      let parsed = JSON.parse(local);
      // Automatically filter out completed items on browser load/refresh
      parsed = parsed.filter((i: any) => !i.checked);
      setItems(parsed);
      localStorage.setItem('zecratary_shopping_list', JSON.stringify(parsed));
    } else {
      const defaultItems = [
        { id: 's_1', name: 'cloves garlic', amount: '3', unit: '', category: 'Produce', staple: true, checked: false },
        { id: 's_2', name: 'roughly chopped shallots', amount: '¼', unit: 'cup', category: 'Produce', staple: false, checked: false },
        { id: 's_3', name: 'finely chopped sweet preserved daikon radish', amount: '3', unit: 'tbsp', category: 'Produce', staple: false, checked: false },
        { id: 's_4', name: 'bean sprouts loosely packed', amount: '2½', unit: 'cup', category: 'Produce', staple: false, checked: false },
        { id: 's_5', name: 'dried shrimp medium size roughly chopped', amount: '2', unit: 'tbsp', category: 'Meat and Seafood', staple: true, checked: false },
        { id: 's_6', name: 'pressed tofu', amount: '3', unit: 'oz', category: 'Meat and Seafood', staple: false, checked: false }
      ];
      setItems(defaultItems);
      localStorage.setItem('zecratary_shopping_list', JSON.stringify(defaultItems));
    }
  }, []);

  const saveList = (updated: any[]) => {
    setItems(updated);
    // Persist only uncompleted items, or keep them temporarily until refresh
    localStorage.setItem('zecratary_shopping_list', JSON.stringify(updated));
  };

  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!itemName.trim()) return;

    const newItem = {
      id: 's_' + Date.now(),
      name: itemName.trim(),
      amount: itemAmount || '1',
      unit: itemUnit || '',
      category: itemCategory,
      staple: false,
      checked: false
    };

    saveList([newItem, ...items]);
    setItemName('');
    setItemAmount('1');
    setItemUnit('Unit');
    setShowAddModal(false);
  };

  const handleUpdateItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem || !editingItem.name.trim()) return;

    const updated = items.map(i => i.id === editingItem.id ? editingItem : i);
    saveList(updated);
    setEditingItem(null);
  };

  const toggleCheck = (id: string) => {
    const updated = items.map(i => i.id === id ? { ...i, checked: !i.checked } : i);
    saveList(updated);
  };

  const toggleStaple = (id: string) => {
    const updated = items.map(i => i.id === id ? { ...i, staple: !i.staple } : i);
    saveList(updated);
  };

  const handleDeleteItem = (id: string) => {
    const updated = items.filter(i => i.id !== id);
    saveList(updated);
  };

  const handleCopyList = () => {
    const activeList = items.filter(i => !i.checked);
    if (activeList.length === 0) {
      alert('No active items to copy!');
      return;
    }

    const categories = Array.from(new Set(activeList.map(i => i.category || 'Pantry Staples'))).sort();
    
    let textLines: string[] = [];
    categories.forEach(cat => {
      textLines.push(`[${cat}]`);
      const catItems = activeList.filter(i => (i.category || 'Pantry Staples') === cat);
      catItems.forEach(item => {
        textLines.push(`- ${item.name}`);
      });
      textLines.push('');
    });

    const finalText = textLines.join('\\n').trim();
    navigator.clipboard.writeText(finalText);
    alert(`Successfully copied ${activeList.length} items to clipboard, sorted by category!`);
  };

  const completedCount = items.filter(i => i.checked).length;

  const filteredItems = items.filter(i => {
    const matchesSearch = !search.trim() || i.name.toLowerCase().includes(search.toLowerCase().trim());
    const matchesStaples = !showStaplesOnly || i.staple;
    return matchesSearch && matchesStaples;
  });

  const activeItems = filteredItems.filter(i => !i.checked);
  const completedItems = filteredItems.filter(i => i.checked);

  const categories = Array.from(new Set(activeItems.map(i => i.category || 'Pantry Staples')));

  return (
    <div className="max-w-4xl mx-auto space-y-6 text-slate-100 pb-16">
      
      {/* PAGE HEADER */}
      <div className="space-y-1">
        <h1 className="text-3xl font-black text-[#E05638] tracking-tight">Shopping List</h1>
        <p className="text-xs text-emerald-400 font-semibold">{completedCount} completed items</p>
      </div>

      {/* TOP CONTROLS */}
      <div className="flex flex-col sm:flex-row items-center gap-3 justify-between">
        <div className="relative flex-1 w-full">
          <Search className="h-4 w-4 text-emerald-500 absolute left-4 top-3.5" />
          <input
            type="text"
            placeholder="Search items..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-[#111726] border border-emerald-950 rounded-2xl pl-11 pr-4 py-3 text-sm text-white placeholder-slate-500 outline-none focus:border-emerald-500 shadow-inner"
          />
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <button
            onClick={handleCopyList}
            className="flex-1 sm:flex-initial bg-[#111726] hover:bg-[#1a2338] border border-emerald-900 text-emerald-400 font-bold text-xs px-4 py-3 rounded-2xl transition flex items-center justify-center gap-2 shadow-sm"
          >
            <Copy className="h-4 w-4" /> Copy List
          </button>
          
          <button
            onClick={() => setShowStaplesOnly(!showStaplesOnly)}
            className={`flex-1 sm:flex-initial border font-bold text-xs px-4 py-3 rounded-2xl transition flex items-center justify-center gap-2 shadow-sm ${
              showStaplesOnly
                ? 'bg-amber-500/20 border-amber-500 text-amber-300'
                : 'bg-[#111726] hover:bg-[#1a2338] border-amber-900/80 text-amber-400'
            }`}
          >
            <Star className={`h-4 w-4 ${showStaplesOnly ? 'fill-amber-400' : ''}`} /> 
            {showStaplesOnly ? 'Show All Items' : 'My Staples'}
          </button>

          <button
            onClick={() => setShowAddModal(true)}
            className="flex-1 sm:flex-initial bg-[#E05638] hover:bg-[#c94529] text-white font-bold text-xs px-5 py-3 rounded-2xl transition flex items-center justify-center gap-2 shadow-lg shadow-[#E05638]/20"
          >
            <Plus className="h-4 w-4" /> Add Item(s)
          </button>
        </div>
      </div>

      {/* ACTIVE CATEGORY SECTIONS */}
      <div className="space-y-6">
        {categories.map((cat) => {
          const catItems = activeItems.filter(i => (i.category || 'Pantry Staples') === cat);
          if (catItems.length === 0) return null;

          return (
            <div key={cat} className="bg-[#111726] border border-emerald-950 rounded-3xl p-6 space-y-4 shadow-md">
              <h2 className="text-base font-extrabold text-[#E05638] tracking-wide">{cat}</h2>

              <div className="space-y-3">
                {catItems.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => toggleCheck(item.id)}
                    className="flex items-center justify-between bg-[#0B101D] p-4 rounded-2xl border border-emerald-950/80 hover:border-emerald-800 transition cursor-pointer select-none"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-5 h-5 rounded-lg border border-slate-700 bg-slate-900 flex items-center justify-center transition">
                        {item.checked && <CheckSquare className="h-3.5 w-3.5 text-emerald-500" />}
                      </div>

                      <div>
                        <h4 className="font-extrabold text-sm capitalize text-white">
                          {item.name}
                        </h4>
                        <span className="text-xs text-slate-400 font-medium">
                          {item.amount} {item.unit}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => toggleStaple(item.id)}
                        className="p-2 transition text-slate-600 hover:text-amber-400"
                        title="Mark as Staple"
                      >
                        <Star className={`h-4 w-4 ${item.staple ? 'fill-amber-400 text-amber-400' : 'text-slate-600'}`} />
                      </button>
                      <button
                        onClick={() => setEditingItem(item)}
                        className="p-2 text-slate-400 hover:text-white transition bg-slate-900 rounded-xl border border-slate-800"
                        title="Edit item"
                      >
                        <Edit3 className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteItem(item.id)}
                        className="p-2 text-slate-500 hover:text-red-400 transition bg-slate-900 rounded-xl border border-slate-800"
                        title="Delete item"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}

        {/* COMPLETED ITEMS SECTION */}
        {completedItems.length > 0 && (
          <div className="bg-[#111726]/70 border border-slate-800 rounded-3xl p-6 space-y-4 shadow-md">
            <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Completed Items ({completedItems.length})</h2>

            <div className="space-y-3">
              {completedItems.map((item) => (
                <div
                  key={item.id}
                  onClick={() => toggleCheck(item.id)}
                  className="flex items-center justify-between bg-[#0B101D]/60 p-4 rounded-2xl border border-slate-800/80 transition cursor-pointer select-none opacity-60 line-through"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-5 h-5 rounded-lg border border-emerald-600 bg-emerald-600 text-white flex items-center justify-center transition">
                      <CheckSquare className="h-3.5 w-3.5" />
                    </div>

                    <div>
                      <h4 className="font-extrabold text-sm capitalize text-slate-400">
                        {item.name}
                      </h4>
                      <span className="text-xs text-slate-500 font-medium">
                        {item.amount} {item.unit} • {item.category}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => setEditingItem(item)}
                      className="p-2 text-slate-400 hover:text-white transition bg-slate-900 rounded-xl border border-slate-800"
                      title="Edit item"
                    >
                      <Edit3 className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => handleDeleteItem(item.id)}
                      className="p-2 text-slate-500 hover:text-red-400 transition bg-slate-900 rounded-xl border border-slate-800"
                      title="Delete item"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ADD ITEM MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#111726] border border-slate-800 rounded-3xl max-w-md w-full p-6 space-y-6 shadow-2xl relative">
            <button
              onClick={() => setShowAddModal(false)}
              className="absolute top-4 right-4 p-2 bg-slate-800 text-slate-300 hover:text-white rounded-full transition"
            >
              <X className="h-4 w-4" />
            </button>

            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Plus className="h-5 w-5 text-[#E05638]" /> Add Shopping Item
            </h2>

            <form onSubmit={handleAddItem} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-400 font-semibold mb-1">Item Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. cloves garlic..."
                  value={itemName}
                  onChange={(e) => setItemName(e.target.value)}
                  className="w-full bg-[#0B101D] border border-slate-800 rounded-xl p-3 text-sm text-white outline-none focus:border-[#E05638]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Amount / Qty</label>
                  <input
                    type="text"
                    placeholder="e.g. 3 or ¼"
                    value={itemAmount}
                    onChange={(e) => setItemAmount(e.target.value)}
                    className="w-full bg-[#0B101D] border border-slate-800 rounded-xl p-3 text-sm text-white outline-none focus:border-[#E05638]"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Unit</label>
                  <input
                    type="text"
                    placeholder="e.g. cup, tbsp, oz"
                    value={itemUnit}
                    onChange={(e) => setItemUnit(e.target.value)}
                    className="w-full bg-[#0B101D] border border-slate-800 rounded-xl p-3 text-sm text-white outline-none focus:border-[#E05638]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1">Category</label>
                <select
                  value={itemCategory}
                  onChange={(e) => setItemCategory(e.target.value)}
                  className="w-full bg-[#0B101D] border border-slate-800 rounded-xl p-3 text-sm text-white outline-none focus:border-[#E05638]"
                >
                  <option value="Produce">Produce</option>
                  <option value="Meat and Seafood">Meat and Seafood</option>
                  <option value="Pantry Staples">Pantry Staples</option>
                  <option value="Condiments and Sauces">Condiments and Sauces</option>
                  <option value="Grains and Pasta">Grains and Pasta</option>
                  <option value="Dairy">Dairy</option>
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-5 py-2.5 rounded-xl bg-slate-800 text-slate-300 font-bold hover:bg-slate-700 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-[#E05638] text-white font-bold hover:bg-[#c94529] transition shadow-lg shadow-[#E05638]/20"
                >
                  Add Item
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT ITEM MODAL */}
      {editingItem && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#111726] border border-slate-800 rounded-3xl max-w-md w-full p-6 space-y-6 shadow-2xl relative">
            <button
              onClick={() => setEditingItem(null)}
              className="absolute top-4 right-4 p-2 bg-slate-800 text-slate-300 hover:text-white rounded-full transition"
            >
              <X className="h-4 w-4" />
            </button>

            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Edit3 className="h-5 w-5 text-[#E05638]" /> Edit Shopping Item
            </h2>

            <form onSubmit={handleUpdateItem} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-400 font-semibold mb-1">Item Name *</label>
                <input
                  type="text"
                  required
                  value={editingItem.name}
                  onChange={(e) => setEditingItem({ ...editingItem, name: e.target.value })}
                  className="w-full bg-[#0B101D] border border-slate-800 rounded-xl p-3 text-sm text-white outline-none focus:border-[#E05638]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Amount</label>
                  <input
                    type="text"
                    value={editingItem.amount}
                    onChange={(e) => setEditingItem({ ...editingItem, amount: e.target.value })}
                    className="w-full bg-[#0B101D] border border-slate-800 rounded-xl p-3 text-sm text-white outline-none focus:border-[#E05638]"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Unit</label>
                  <input
                    type="text"
                    value={editingItem.unit}
                    onChange={(e) => setEditingItem({ ...editingItem, unit: e.target.value })}
                    className="w-full bg-[#0B101D] border border-slate-800 rounded-xl p-3 text-sm text-white outline-none focus:border-[#E05638]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1">Category</label>
                <select
                  value={editingItem.category}
                  onChange={(e) => setEditingItem({ ...editingItem, category: e.target.value })}
                  className="w-full bg-[#0B101D] border border-slate-800 rounded-xl p-3 text-sm text-white outline-none focus:border-[#E05638]"
                >
                  <option value="Produce">Produce</option>
                  <option value="Meat and Seafood">Meat and Seafood</option>
                  <option value="Pantry Staples">Pantry Staples</option>
                  <option value="Condiments and Sauces">Condiments and Sauces</option>
                  <option value="Grains and Pasta">Grains and Pasta</option>
                  <option value="Dairy">Dairy</option>
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setEditingItem(null)}
                  className="px-5 py-2.5 rounded-xl bg-slate-800 text-slate-300 font-bold hover:bg-slate-700 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-[#E05638] text-white font-bold hover:bg-[#c94529] transition flex items-center gap-1.5 shadow-lg shadow-[#E05638]/20"
                >
                  <Save className="h-4 w-4" /> Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
"""

os.makedirs("apps/web/src/app/shopping", exist_ok=True)
with open("apps/web/src/app/shopping/page.tsx", "w", encoding="utf-8") as f:
    f.write(code)

print("✅ Completed items will now automatically clear on browser refresh!")
