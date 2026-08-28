'use client';
import { useState } from 'react';
import { ShoppingCart, Plus, Check, Trash2 } from 'lucide-react';

export default function GroceriesPage() {
  const [items, setItems] = useState([
    { id: '1', name: 'Rice Noodles', aisle: 'Asian Foods', checked: false },
    { id: '2', name: 'Fresh Tamarind Paste', aisle: 'Produce', checked: false },
    { id: '3', name: 'Firm Tofu', aisle: 'Refrigerated', checked: true }
  ]);
  const [newItem, setNewItem] = useState('');

  const toggleCheck = (id: string) => {
    setItems(items.map(it => it.id === id ? { ...it, checked: !it.checked } : it));
  };

  const addItem = () => {
    if (!newItem.trim()) return;
    setItems([...items, { id: Date.now().toString(), name: newItem, aisle: 'General', checked: false }]);
    setNewItem('');
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 text-slate-100">
      <div>
        <h1 className="text-3xl font-extrabold text-[#E05638]">Shopping List</h1>
        <p className="text-slate-400 text-xs mt-1">Smart aisle-categorized ingredients synced with your meal plan</p>
      </div>

      <div className="flex gap-2">
        <input
          type="text"
          placeholder="Add extra grocery item..."
          value={newItem}
          onChange={(e) => setNewItem(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && addItem()}
          className="bg-[#111726] border border-slate-800 text-white rounded-xl px-4 py-3 text-sm flex-1 outline-none focus:border-[#E05638]"
        />
        <button onClick={addItem} className="bg-[#E05638] hover:bg-[#c94529] text-white font-bold px-5 py-3 rounded-xl text-xs flex items-center gap-1.5">
          <Plus className="h-4 w-4" /> Add
        </button>
      </div>

      <div className="space-y-3">
        {items.map(it => (
          <div key={it.id} onClick={() => toggleCheck(it.id)} className="bg-[#111726] border border-slate-800 rounded-xl p-4 flex items-center justify-between cursor-pointer hover:border-slate-700 select-none">
            <div className="flex items-center gap-3">
              <div className={`w-5 h-5 rounded-md border flex items-center justify-center ${it.checked ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-slate-700'}`}>
                {it.checked && <Check className="h-3 w-3" />}
              </div>
              <span className={`text-sm ${it.checked ? 'line-through text-slate-500' : 'text-white font-medium'}`}>{it.name}</span>
            </div>
            <span className="text-[11px] text-slate-400 bg-[#0B101D] px-2.5 py-1 rounded-full">{it.aisle}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
