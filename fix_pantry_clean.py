import os

pantry_code = """'use client';
import { useState, useEffect } from 'react';
import { Package, Plus, Trash2, Camera, Search, ArrowUpDown, Check, Edit3, X, Save, ChefHat } from 'lucide-react';

export default function PantryPage() {
  const [pantryItems, setPantryItems] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [sortAsc, setSortAsc] = useState(true);
  
  const [showAddModal, setShowAddModal] = useState(false);
  const [itemName, setItemName] = useState('');
  const [itemCategory, setItemCategory] = useState('Produce');
  const [itemQuantity, setItemQuantity] = useState('1');
  const [itemUnit, setItemUnit] = useState('Unit');
  const [expiryDate, setExpiryDate] = useState('');

  const [editingItem, setEditingItem] = useState<any | null>(null);

  useEffect(() => {
    document.title = 'Pantry Inventory - FoodiePrep';
    const local = localStorage.getItem('zecratary_pantry_items');
    if (local) {
      setPantryItems(JSON.parse(local));
    } else {
      const defaultItems = [
        { id: 'p_1', name: 'eggs', quantity: '4', unit: 'units', category: 'Dairy', expiryDate: '2026-09-02' },
        { id: 'p_2', name: 'Jasmine Rice', quantity: '5', unit: 'kg', category: 'Grains and Pasta', expiryDate: '2026-12-31' },
        { id: 'p_3', name: 'Fish Sauce', quantity: '1', unit: 'bottle', category: 'Condiments and Sauces', expiryDate: '2027-06-15' }
      ];
      setPantryItems(defaultItems);
      localStorage.setItem('zecratary_pantry_items', JSON.stringify(defaultItems));
    }
  }, []);

  const savePantry = (updated: any[]) => {
    setPantryItems(updated);
    localStorage.setItem('zecratary_pantry_items', JSON.stringify(updated));
  };

  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!itemName.trim()) return;

    const newItem = {
      id: 'p_' + Date.now(),
      name: itemName.trim(),
      quantity: itemQuantity || '1',
      unit: itemUnit || 'Unit',
      category: itemCategory,
      expiryDate: expiryDate || ''
    };

    const updated = [newItem, ...pantryItems];
    savePantry(updated);
    setItemName('');
    setItemQuantity('1');
    setExpiryDate('');
    setShowAddModal(false);
  };

  const handleUpdateItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem || !editingItem.name.trim()) return;

    const updated = pantryItems.map(item => item.id === editingItem.id ? editingItem : item);
    savePantry(updated);
    setEditingItem(null);
  };

  const handleDeleteItem = (id: string) => {
    const updated = pantryItems.filter(item => item.id !== id);
    savePantry(updated);
    setSelectedIds(selectedIds.filter(selectedId => selectedId !== id));
  };

  const handleDeleteSelected = () => {
    if (selectedIds.length === 0) return;
    if (!confirm('Are you sure you want to delete selected ingredients?')) return;
    const updated = pantryItems.filter(item => !selectedIds.includes(item.id));
    savePantry(updated);
    setSelectedIds([]);
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === filteredItems.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredItems.map(i => i.id));
    }
  };

  const toggleSelectOne = (id: string) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter(i => i !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  const calculateDaysLeft = (dateStr: string) => {
    if (!dateStr) return null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const target = new Date(dateStr);
    target.setHours(0, 0, 0, 0);
    const diffTime = target.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const filteredItems = pantryItems
    .filter(item => !search.trim() || item.name.toLowerCase().includes(search.toLowerCase().trim()))
    .sort((a, b) => {
      const res = a.name.localeCompare(b.name);
      return sortAsc ? res : -res;
    });

  return (
    <div className="max-w-5xl mx-auto space-y-6 text-slate-100 pb-16">
      
      {/* PAGE HEADER & DESCRIPTION */}
      <div className="space-y-1">
        <h1 className="text-3xl font-black text-white tracking-tight">Pantry Inventory</h1>
        <p className="text-xs text-slate-400">Manage available ingredients, track expiry dates, and discover matching recipes instantly.</p>
      </div>

      {/* TOP CONTROLS */}
      <div className="flex flex-col sm:flex-row items-center gap-3 justify-between">
        <div className="relative flex-1 w-full">
          <Search className="h-4 w-4 text-emerald-500 absolute left-4 top-3.5" />
          <input
            type="text"
            placeholder="Search ingredients..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-[#111726] border border-emerald-950 rounded-2xl pl-11 pr-4 py-3 text-sm text-white placeholder-slate-500 outline-none focus:border-emerald-500 shadow-inner"
          />
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <button
            onClick={() => alert('Camera photo scan activated!')}
            className="flex-1 sm:flex-initial bg-[#111726] hover:bg-[#1a2338] border border-emerald-900 text-emerald-400 font-bold text-xs px-5 py-3 rounded-2xl transition flex items-center justify-center gap-2 shadow-sm"
          >
            <Camera className="h-4 w-4" /> Take Photo
          </button>
          
          <button
            onClick={() => setShowAddModal(true)}
            className="flex-1 sm:flex-initial bg-[#E05638] hover:bg-[#c94529] text-white font-bold text-xs px-5 py-3 rounded-2xl transition flex items-center justify-center gap-2 shadow-lg shadow-[#E05638]/20"
          >
            <Plus className="h-4 w-4" /> Add Ingredient(s)
          </button>
        </div>
      </div>

      {/* ACTION BANNER */}
      <div className="bg-[#111726] border border-emerald-950 rounded-3xl p-5 space-y-4 shadow-md">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <button
            onClick={() => alert(`Discovering recipes with ${selectedIds.length} selected ingredients!`)}
            className={`font-bold text-xs px-5 py-3 rounded-2xl transition flex items-center gap-2 shadow-md ${
              selectedIds.length > 0
                ? 'bg-[#E05638] hover:bg-[#c94529] text-white shadow-[#E05638]/20'
                : 'bg-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            <ChefHat className="h-4 w-4" /> Discover Recipes with {selectedIds.length} Selected
          </button>

          <div className="flex items-center gap-6 text-xs font-bold">
            <button
              onClick={() => setSortAsc(!sortAsc)}
              className="flex items-center gap-1.5 text-emerald-400 hover:text-emerald-300 transition"
              title="Toggle sorting direction"
            >
              <ArrowUpDown className="h-3.5 w-3.5" /> {sortAsc ? 'A-Z' : 'Z-A'}
            </button>
            <button
              onClick={handleDeleteSelected}
              className="flex items-center gap-1.5 text-red-400 hover:text-red-300 transition"
            >
              <Trash2 className="h-3.5 w-3.5" /> Delete All
            </button>
            <button
              onClick={toggleSelectAll}
              className="text-slate-300 hover:text-white transition"
            >
              {selectedIds.length === filteredItems.length && filteredItems.length > 0 ? 'Deselect All' : 'Select All'}
            </button>
          </div>
        </div>

        {/* INGREDIENTS LIST */}
        <div className="space-y-3 pt-2">
          {filteredItems.length === 0 ? (
            <div className="p-12 text-center space-y-2 bg-[#0B101D] rounded-2xl border border-slate-800">
              <Package className="h-8 w-8 text-slate-600 mx-auto" />
              <h4 className="text-sm font-bold text-white">No ingredients found</h4>
              <p className="text-xs text-slate-400">Add ingredients to your pantry or adjust your search.</p>
            </div>
          ) : (
            filteredItems.map((item) => {
              const daysLeft = calculateDaysLeft(item.expiryDate);
              const isSelected = selectedIds.includes(item.id);
              return (
                <div
                  key={item.id}
                  onClick={() => toggleSelectOne(item.id)}
                  className={`flex items-center justify-between bg-[#0B101D] p-4 rounded-2xl border transition cursor-pointer select-none ${
                    isSelected ? 'border-[#E05638] bg-[#161219]' : 'border-emerald-950/80 hover:border-emerald-800'
                  }`}
                >
                  <div className="flex items-center gap-3.5">
                    <div className={`w-5 h-5 rounded-lg border flex items-center justify-center transition ${
                      isSelected ? 'bg-[#E05638] border-[#E05638] text-white' : 'border-slate-700 bg-slate-900'
                    }`}>
                      {isSelected && <Check className="h-3 w-3" />}
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="font-extrabold text-white text-sm capitalize">{item.name}</span>
                      {daysLeft !== null && (
                        <span className={`px-2.5 py-0.5 rounded-full font-bold text-[10px] ${
                          daysLeft < 0
                            ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                            : daysLeft <= 3
                            ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                            : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                        }`}>
                          {daysLeft < 0 ? `Expired ${Math.abs(daysLeft)}d ago` : daysLeft === 0 ? 'Expires Today!' : `${daysLeft}d left`}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-3" onClick={(e) => e.stopPropagation()}>
                    <span className="text-xs text-slate-400 font-medium">
                      {item.quantity} {item.unit}
                    </span>
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
              );
            })
          )}
        </div>
      </div>

      {/* ADD INGREDIENT MODAL */}
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
              <Plus className="h-5 w-5 text-[#E05638]" /> Add Pantry Ingredient(s)
            </h2>

            <form onSubmit={handleAddItem} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-400 font-semibold mb-1">Ingredient Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Eggs, Olive Oil..."
                  value={itemName}
                  onChange={(e) => setItemName(e.target.value)}
                  className="w-full bg-[#0B101D] border border-slate-800 rounded-xl p-3 text-sm text-white outline-none focus:border-[#E05638]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Quantity</label>
                  <input
                    type="text"
                    value={itemQuantity}
                    onChange={(e) => setItemQuantity(e.target.value)}
                    className="w-full bg-[#0B101D] border border-slate-800 rounded-xl p-3 text-sm text-white outline-none focus:border-[#E05638]"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Unit</label>
                  <input
                    type="text"
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
                  <option value="Dairy">Dairy</option>
                  <option value="Meat and Seafood">Meat and Seafood</option>
                  <option value="Bakery">Bakery</option>
                  <option value="Baking Supplies">Baking Supplies</option>
                  <option value="Pantry Staples">Pantry Staples</option>
                  <option value="Frozen Foods">Frozen Foods</option>
                  <option value="Snacks and Sweets">Snacks and Sweets</option>
                  <option value="Beverages">Beverages</option>
                  <option value="Deli">Deli</option>
                  <option value="Condiments and Sauces">Condiments and Sauces</option>
                  <option value="Grains and Pasta">Grains and Pasta</option>
                  <option value="Spices and Seasonings">Spices and Seasonings</option>
                  <option value="Ready Meals">Ready Meals</option>
                  <option value="International Foods">International Foods</option>
                  <option value="Household Items">Household Items</option>
                  <option value="Personal Care">Personal Care</option>
                  <option value="Pet Supplies">Pet Supplies</option>
                  <option value="Baby Products">Baby Products</option>
                  <option value="Miscellaneous">Miscellaneous</option>
                </select>
              </div>

              <div>
                <div>
                  <input
                    type="date"
                    value={expiryDate}
                    onChange={(e) => setExpiryDate(e.target.value)}
                    className="w-full bg-[#0B101D] border border-slate-800 rounded-xl p-3 text-slate-500 outline-none focus:text-slate-200"
                    title="Expiry Date"
                  />
                </div>
                <span className="block text-[10px] text-slate-500 mt-1 pl-1 font-medium">Expiry Date</span>
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
                  Add Ingredient
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT INGREDIENT MODAL */}
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
              <Edit3 className="h-5 w-5 text-[#E05638]" /> Edit Pantry Ingredient
            </h2>

            <form onSubmit={handleUpdateItem} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-400 font-semibold mb-1">Ingredient Name *</label>
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
                  <label className="block text-slate-400 font-semibold mb-1">Quantity</label>
                  <input
                    type="text"
                    value={editingItem.quantity}
                    onChange={(e) => setEditingItem({ ...editingItem, quantity: e.target.value })}
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
                  <option value="Dairy">Dairy</option>
                  <option value="Meat and Seafood">Meat and Seafood</option>
                  <option value="Bakery">Bakery</option>
                  <option value="Baking Supplies">Baking Supplies</option>
                  <option value="Pantry Staples">Pantry Staples</option>
                  <option value="Frozen Foods">Frozen Foods</option>
                  <option value="Snacks and Sweets">Snacks and Sweets</option>
                  <option value="Beverages">Beverages</option>
                  <option value="Deli">Deli</option>
                  <option value="Condiments and Sauces">Condiments and Sauces</option>
                  <option value="Grains and Pasta">Grains and Pasta</option>
                  <option value="Spices and Seasonings">Spices and Seasonings</option>
                  <option value="Ready Meals">Ready Meals</option>
                  <option value="International Foods">International Foods</option>
                  <option value="Household Items">Household Items</option>
                  <option value="Personal Care">Personal Care</option>
                  <option value="Pet Supplies">Pet Supplies</option>
                  <option value="Baby Products">Baby Products</option>
                  <option value="Miscellaneous">Miscellaneous</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1">Expiry Date</label>
                <input
                  type="date"
                  value={editingItem.expiryDate || ''}
                  onChange={(e) => setEditingItem({ ...editingItem, expiryDate: e.target.value })}
                  className="w-full bg-[#0B101D] border border-slate-800 rounded-xl p-3 text-sm text-slate-300 outline-none focus:border-[#E05638]"
                />
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

os.makedirs("apps/web/src/app/pantry", exist_ok=True)
with open("apps/web/src/app/pantry/page.tsx", "w", encoding="utf-8") as f:
    f.write(pantry_code)

print("✅ Pantry page successfully cleaned and fully restored!")
