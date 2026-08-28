import os

code = """'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  Book, Plus, Utensils, Trash2, Edit3, Save, X, 
  ArrowRight, Palette, Check, Clock, Timer, Share2, 
  CheckCircle2, Type, CalendarPlus, ShoppingCart, 
  BookmarkPlus, Heart, Star, ChevronDown
} from 'lucide-react';

const COVER_GRADIENTS = [
  { label: 'Rose & Pink', value: 'bg-gradient-to-r from-pink-600 via-rose-500 to-rose-600' },
  { label: 'Emerald Green', value: 'bg-gradient-to-r from-emerald-600 to-teal-700' },
  { label: 'Sunset Orange', value: 'bg-gradient-to-r from-orange-500 to-amber-600' },
  { label: 'Royal Purple', value: 'bg-gradient-to-r from-purple-600 to-indigo-800' },
  { label: 'Ocean Blue', value: 'bg-gradient-to-r from-blue-600 to-cyan-600' },
  { label: 'Slate Charcoal', value: 'bg-gradient-to-r from-slate-700 to-slate-900' },
];

export default function BooksPage() {
  const [books, setBooks] = useState<any[]>([]);
  const [recipes, setRecipes] = useState<any[]>([]);
  
  // Modal States
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingBook, setEditingBook] = useState<any | null>(null);
  const [selectedBook, setSelectedBook] = useState<any | null>(null);

  // Form States for Create
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newCoverColor, setNewCoverColor] = useState(COVER_GRADIENTS[0].value);

  // Form States for Edit
  const [editTitle, setEditTitle] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editCoverColor, setEditCoverColor] = useState(COVER_GRADIENTS[0].value);

  // Specific Recipe Popup Modal State
  const [viewingRecipe, setViewingRecipe] = useState<any | null>(null);
  const [servingsMultiplier, setServingsMultiplier] = useState(1);
  const [fontSizeScale, setFontSizeScale] = useState(100);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  const [noteText, setNoteText] = useState('');
  const [isNoteOpen, setIsNoteOpen] = useState(false);

  const loadData = () => {
    try {
      const localBooks = localStorage.getItem('zecratary_recipe_books');
      const localRecipes = localStorage.getItem('zecratary_saved_recipes') || localStorage.getItem('zecratary_recipes');
      
      let parsedRecipes = localRecipes ? JSON.parse(localRecipes) : [];
      setRecipes(parsedRecipes);

      if (localBooks) {
        let parsedBooks = JSON.parse(localBooks);
        parsedBooks = parsedBooks.map((b: any) => ({
          ...b,
          recipeCount: parsedRecipes.filter((r: any) => r.bookId === b.id).length
        }));
        setBooks(parsedBooks);
      } else {
        const defaultBooks = [
          {
            id: 'cb_1',
            title: 'test',
            description: 'Custom recipe collection',
            coverColor: 'bg-gradient-to-r from-pink-600 via-rose-500 to-rose-600',
            recipeCount: 2
          },
          {
            id: 'cb_2',
            title: 'Baking & Desserts',
            description: 'Cakes, pastries, sweet treats, and weekend baking projects.',
            coverColor: 'bg-gradient-to-r from-emerald-600 to-teal-700',
            recipeCount: 1
          }
        ];
        setBooks(defaultBooks);
        localStorage.setItem('zecratary_recipe_books', JSON.stringify(defaultBooks));
      }
    } catch (e) {
      console.error('Failed to load books data', e);
    }
  };

  useEffect(() => {
    loadData();
    window.addEventListener('storage', loadData);
    window.addEventListener('zecratary_recipes_updated', loadData);
    return () => {
      window.removeEventListener('storage', loadData);
      window.removeEventListener('zecratary_recipes_updated', loadData);
    };
  }, []);

  const saveBooks = (updated: any[]) => {
    setBooks(updated);
    localStorage.setItem('zecratary_recipe_books', JSON.stringify(updated));
    window.dispatchEvent(new Event('storage'));
  };

  const handleCreateBook = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    const newBook = {
      id: 'book_' + Date.now(),
      title: newTitle.trim(),
      description: newDesc.trim() || 'Custom recipe collection',
      recipeCount: 0,
      coverColor: newCoverColor,
    };

    const updated = [...books, newBook];
    saveBooks(updated);
    setNewTitle('');
    setNewDesc('');
    setNewCoverColor(COVER_GRADIENTS[0].value);
    setShowAddModal(false);
  };

  const openEditModal = (e: React.MouseEvent, book: any) => {
    e.stopPropagation();
    setEditingBook(book);
    setEditTitle(book.title || '');
    setEditDesc(book.description || '');
    setEditCoverColor(book.coverColor || COVER_GRADIENTS[0].value);
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBook || !editTitle.trim()) return;

    const updated = books.map((b) =>
      b.id === editingBook.id
        ? {
            ...b,
            title: editTitle.trim(),
            description: editDesc.trim(),
            coverColor: editCoverColor,
          }
        : b
    );

    saveBooks(updated);

    if (selectedBook?.id === editingBook.id) {
      setSelectedBook({
        ...selectedBook,
        title: editTitle.trim(),
        description: editDesc.trim(),
        coverColor: editCoverColor,
      });
    }

    setEditingBook(null);
  };

  const handleDeleteBook = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this recipe book?')) return;
    const updated = books.filter((b) => b.id !== id);
    saveBooks(updated);
    if (selectedBook?.id === id) setSelectedBook(null);
  };

  // Viewing Recipe Actions
  const handleOpenRecipePopup = (rec: any) => {
    setViewingRecipe(rec);
    setServingsMultiplier(1);
    setFontSizeScale(100);
    setCompletedSteps([]);
    setNoteText(rec.note || '');
    setIsNoteOpen(false);
  };

  const updateViewingRecipeState = (key: string, val: any) => {
    if (!viewingRecipe) return;
    const updatedRec = { ...viewingRecipe, [key]: val };
    setViewingRecipe(updatedRec);

    const updatedList = recipes.map(r => r.id === updatedRec.id ? updatedRec : r);
    setRecipes(updatedList);
    localStorage.setItem('zecratary_saved_recipes', JSON.stringify(updatedList));
    localStorage.setItem('zecratary_recipes', JSON.stringify(updatedList));
    window.dispatchEvent(new Event('zecratary_recipes_updated'));
  };

  const toggleStepComplete = (idx: number) => {
    if (completedSteps.includes(idx)) {
      setCompletedSteps(completedSteps.filter(i => i !== idx));
    } else {
      setCompletedSteps([...completedSteps, idx]);
    }
  };

  const calculateScaledAmount = (baseAmount: any, baseServings: number, currentServings: number) => {
    if (!baseAmount || isNaN(Number(baseAmount))) return baseAmount;
    const num = Number(baseAmount);
    const scaled = (num / (baseServings || 4)) * currentServings;
    return Number.isInteger(scaled) ? scaled : Number(scaled.toFixed(2));
  };

  const baseServings = viewingRecipe?.servings || 4;
  const currentTotalServings = baseServings * servingsMultiplier;

  return (
    <div className="max-w-6xl mx-auto space-y-6 text-slate-100 pb-16 px-4">
      {/* Page Header */}
      <div className="flex items-center justify-between pt-2">
        <div>
          <h1 className="text-3xl font-black text-[#E05638] tracking-tight">Recipe Books</h1>
          <p className="text-slate-400 text-xs mt-1">Organize your saved recipes into curated digital cookbooks</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="bg-[#E05638] hover:bg-[#c94529] text-white font-bold text-xs px-4 py-2.5 rounded-xl transition flex items-center gap-2 shadow-lg shadow-[#E05638]/20"
        >
          <Plus className="h-4 w-4" /> Create Recipe Book
        </button>
      </div>

      {/* Books Grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {books.map((book) => {
          const count = recipes.filter((r: any) => r.bookId === book.id).length || book.recipeCount || 0;
          return (
            <div
              key={book.id}
              onClick={() => setSelectedBook(book)}
              className="bg-[#0c101d] border border-slate-800 hover:border-slate-700 rounded-3xl overflow-hidden transition cursor-pointer group flex flex-col justify-between shadow-xl"
            >
              {/* Top Banner with Background Color */}
              <div className={`h-36 w-full ${book.coverColor || COVER_GRADIENTS[0].value} p-5 flex flex-col justify-between relative overflow-hidden shadow-inner`}>
                <div className="flex items-center justify-between z-10">
                  <span className="text-[10px] font-black uppercase tracking-widest text-white/90 bg-black/25 backdrop-blur-md px-3 py-1 rounded-full border border-white/10">
                    COOKBOOK
                  </span>
                  <div className="w-8 h-8 rounded-xl bg-black/25 backdrop-blur-md flex items-center justify-center text-white border border-white/10">
                    <Book className="h-4 w-4" />
                  </div>
                </div>

                <h3 className="font-black text-white text-xl leading-snug drop-shadow-md z-10 truncate">
                  {book.title}
                </h3>
              </div>

              {/* Card Body */}
              <div className="p-5 space-y-4 flex-1 flex flex-col justify-between">
                <p className="text-xs text-slate-300 leading-relaxed line-clamp-2 min-h-[32px]">
                  {book.description || 'Custom recipe collection'}
                </p>

                {/* Card Footer with Edit & Delete Actions */}
                <div className="flex items-center justify-between pt-3 border-t border-slate-800/80 text-xs">
                  <span className="text-slate-400 font-bold flex items-center gap-1.5">
                    <Utensils className="h-3.5 w-3.5 text-[#E05638]" /> {count} recipes inside
                  </span>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={(e) => openEditModal(e, book)}
                      className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
                      title="Edit Cookbook"
                    >
                      <Edit3 className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => handleDeleteBook(e, book.id)}
                      className="p-2 rounded-xl text-slate-400 hover:text-red-400 hover:bg-slate-800 transition"
                      title="Delete Cookbook"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* EDIT BOOK MODAL */}
      {editingBook && (
        <div 
          onClick={() => setEditingBook(null)}
          className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4 cursor-pointer"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="bg-[#0b0e14] border border-slate-800/90 rounded-3xl max-w-md w-full p-6 space-y-5 shadow-2xl relative text-xs animate-in fade-in cursor-default"
          >
            <button
              onClick={() => setEditingBook(null)}
              className="absolute top-4 right-4 p-2 bg-[#172033] text-slate-300 hover:text-white rounded-xl transition"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="space-y-1 pr-6">
              <h2 className="text-lg font-black text-white flex items-center gap-2">
                <Edit3 className="h-5 w-5 text-[#E05638]" /> Edit Recipe Book
              </h2>
              <p className="text-slate-400 text-xs">Update your cookbook title, description, and cover color.</p>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-4">
              <div>
                <label className="block text-slate-300 font-bold mb-1.5 text-xs">Book Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Baking & Desserts"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full bg-[#070b13] border border-slate-800 rounded-xl p-3 text-xs text-white placeholder-slate-600 outline-none focus:border-[#E05638]"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1.5 text-xs">Description</label>
                <textarea
                  rows={3}
                  placeholder="Short summary of this cookbook collection..."
                  value={editDesc}
                  onChange={(e) => setEditDesc(e.target.value)}
                  className="w-full bg-[#070b13] border border-slate-800 rounded-xl p-3 text-xs text-white placeholder-slate-600 outline-none focus:border-[#E05638] resize-none leading-relaxed"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-2 text-xs flex items-center gap-1.5">
                  <Palette className="h-4 w-4 text-[#E05638]" /> Background Color
                </label>
                <div className="grid grid-cols-3 gap-2.5">
                  {COVER_GRADIENTS.map((g) => {
                    const isSelected = editCoverColor === g.value;
                    return (
                      <button
                        key={g.label}
                        type="button"
                        onClick={() => setEditCoverColor(g.value)}
                        className={`h-11 rounded-xl ${g.value} flex items-center justify-center transition border-2 ${
                          isSelected ? 'border-white scale-105 shadow-md ring-2 ring-[#E05638]/40' : 'border-transparent opacity-75 hover:opacity-100'
                        }`}
                        title={g.label}
                      >
                        {isSelected && <Check className="h-4 w-4 text-white stroke-[3]" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingBook(null)}
                  className="px-4 py-2.5 rounded-xl bg-[#172033] hover:bg-slate-700 text-slate-300 font-bold transition text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-[#E05638] hover:bg-[#c94529] text-white font-bold transition flex items-center gap-1.5 shadow-lg shadow-[#E05638]/20 text-xs"
                >
                  <Save className="h-4 w-4" /> Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CREATE BOOK MODAL */}
      {showAddModal && (
        <div 
          onClick={() => setShowAddModal(false)}
          className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4 cursor-pointer"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="bg-[#0b0e14] border border-slate-800/90 rounded-3xl max-w-md w-full p-6 space-y-5 shadow-2xl relative text-xs animate-in fade-in cursor-default"
          >
            <button
              onClick={() => setShowAddModal(false)}
              className="absolute top-4 right-4 p-2 bg-[#172033] text-slate-300 hover:text-white rounded-xl transition"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="space-y-1 pr-6">
              <h2 className="text-lg font-black text-white flex items-center gap-2">
                <Book className="h-5 w-5 text-[#E05638]" /> Create Recipe Book
              </h2>
              <p className="text-slate-400 text-xs">Create a new curated recipe collection.</p>
            </div>

            <form onSubmit={handleCreateBook} className="space-y-4">
              <div>
                <label className="block text-slate-300 font-bold mb-1.5 text-xs">Book Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Weekend Baking & Desserts"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full bg-[#070b13] border border-slate-800 rounded-xl p-3 text-xs text-white placeholder-slate-600 outline-none focus:border-[#E05638]"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1.5 text-xs">Description</label>
                <textarea
                  rows={3}
                  placeholder="Short summary of this cookbook collection..."
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  className="w-full bg-[#070b13] border border-slate-800 rounded-xl p-3 text-xs text-white placeholder-slate-600 outline-none focus:border-[#E05638] resize-none leading-relaxed"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-2 text-xs flex items-center gap-1.5">
                  <Palette className="h-4 w-4 text-[#E05638]" /> Background Color
                </label>
                <div className="grid grid-cols-3 gap-2.5">
                  {COVER_GRADIENTS.map((g) => {
                    const isSelected = newCoverColor === g.value;
                    return (
                      <button
                        key={g.label}
                        type="button"
                        onClick={() => setNewCoverColor(g.value)}
                        className={`h-11 rounded-xl ${g.value} flex items-center justify-center transition border-2 ${
                          isSelected ? 'border-white scale-105 shadow-md ring-2 ring-[#E05638]/40' : 'border-transparent opacity-75 hover:opacity-100'
                        }`}
                        title={g.label}
                      >
                        {isSelected && <Check className="h-4 w-4 text-white stroke-[3]" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2.5 rounded-xl bg-[#172033] hover:bg-slate-700 text-slate-300 font-bold transition text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-[#E05638] hover:bg-[#c94529] text-white font-bold transition flex items-center gap-1.5 shadow-lg shadow-[#E05638]/20 text-xs"
                >
                  Create Book
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* VIEW BOOK DETAILS MODAL */}
      {selectedBook && (
        <div 
          onClick={() => setSelectedBook(null)}
          className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4 cursor-pointer"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="bg-[#0b0e14] border border-slate-800/90 rounded-3xl max-w-2xl w-full p-6 space-y-6 shadow-2xl relative max-h-[85vh] overflow-y-auto cursor-default"
          >
            <button
              onClick={() => setSelectedBook(null)}
              className="absolute top-4 right-4 p-2 bg-[#172033] text-slate-300 hover:text-white rounded-xl transition"
            >
              <X className="h-4 w-4" />
            </button>

            <div className={`h-32 w-full ${selectedBook.coverColor || COVER_GRADIENTS[0].value} rounded-2xl p-6 flex flex-col justify-between text-white shadow-md`}>
              <div className="flex justify-between items-start">
                <span className="text-[10px] font-black uppercase tracking-widest bg-black/30 backdrop-blur-md px-3 py-1 rounded-full border border-white/10">
                  Cookbook Details
                </span>
                <button
                  onClick={(e) => openEditModal(e, selectedBook)}
                  className="bg-black/40 hover:bg-black/70 backdrop-blur-md px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition border border-white/10"
                >
                  <Edit3 className="h-3.5 w-3.5" /> Edit Book
                </button>
              </div>
              <div>
                <h2 className="text-2xl font-black">{selectedBook.title}</h2>
                <p className="text-xs text-white/90 mt-0.5 line-clamp-1">{selectedBook.description}</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold uppercase tracking-wider text-[#E05638]">
                  Recipes in this Book ({recipes.filter((r: any) => r.bookId === selectedBook.id).length})
                </h3>
                <Link
                  href="/recipes"
                  className="text-xs text-emerald-400 font-bold hover:underline flex items-center gap-1"
                >
                  Browse Recipes <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>

              {recipes.filter((r: any) => r.bookId === selectedBook.id).length === 0 ? (
                <div className="p-8 border border-slate-800 bg-[#070b13] rounded-2xl text-center space-y-2">
                  <Utensils className="h-8 w-8 text-slate-600 mx-auto" />
                  <h4 className="text-sm font-bold text-white">No recipes in this book yet</h4>
                  <p className="text-xs text-slate-400">Open any saved recipe and assign it to this cookbook.</p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {recipes
                    .filter((r: any) => r.bookId === selectedBook.id)
                    .map((rec: any) => (
                      <div key={rec.id} className="flex items-center justify-between bg-[#070b13] p-3 rounded-xl border border-slate-800 text-xs">
                        <div className="flex items-center gap-3">
                          <img src={rec.imageUrl || rec.image || 'https://images.unsplash.com/photo-1559847844-5315695dadae?auto=format&fit=crop&w=200&q=80'} alt={rec.title || rec.name} className="w-10 h-10 rounded-lg object-cover" />
                          <div>
                            <h4 className="font-bold text-white">{rec.title || rec.name}</h4>
                            <span className="text-[10px] text-slate-400">{rec.recipeType || rec.tags?.[0] || 'Main Dish'} • {rec.servings || 4} servings</span>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleOpenRecipePopup(rec)}
                          className="bg-[#172033] hover:bg-slate-700 text-white font-bold px-3 py-1.5 rounded-lg transition border border-slate-700/60"
                        >
                          View
                        </button>
                      </div>
                    ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* SPECIFIC RECIPE POPUP MODAL (Triggered by View button) */}
      {viewingRecipe && (
        <div 
          onClick={() => setViewingRecipe(null)}
          className="fixed inset-0 bg-black/90 backdrop-blur-md z-[80] flex items-center justify-center p-3 sm:p-6 overflow-y-auto cursor-pointer"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="bg-[#0b0f17] border border-slate-800 rounded-3xl max-w-3xl w-full max-h-[92vh] flex flex-col overflow-hidden shadow-2xl relative cursor-default"
          >
            <button
              onClick={() => setViewingRecipe(null)}
              className="absolute top-4 right-4 z-30 p-2.5 bg-black/70 hover:bg-black text-slate-300 hover:text-white rounded-xl border border-slate-700/60 backdrop-blur-md transition"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="overflow-y-auto flex-1 space-y-5 pb-8">
              {/* Hero Image & Metadata */}
              <div className="relative h-64 sm:h-72 w-full bg-slate-900 overflow-hidden flex flex-col justify-end p-5">
                <img
                  src={viewingRecipe.imageUrl || viewingRecipe.image || 'https://images.unsplash.com/photo-1559847844-5315695dadae?auto=format&fit=crop&w=1000&q=80'}
                  alt={viewingRecipe.title || viewingRecipe.name}
                  className="absolute inset-0 w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#0b0f17] via-[#0b0f17]/60 to-transparent" />

                <div className="relative z-10 space-y-3">
                  <h2 className="text-2xl sm:text-3xl font-black text-white leading-tight">
                    {viewingRecipe.title || viewingRecipe.name}
                  </h2>

                  <div className="flex flex-wrap items-center gap-2 text-xs font-semibold">
                    <span className="bg-[#111726]/90 border border-slate-700/80 text-slate-200 px-3 py-1.5 rounded-full flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5 text-slate-300" /> Cook: {viewingRecipe.cookTimeMinutes || 10} minutes
                    </span>
                    <span className="bg-[#111726]/90 border border-slate-700/80 text-slate-200 px-3 py-1.5 rounded-full flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5 text-slate-300" /> Prep: {viewingRecipe.prepTimeMinutes || 30} minutes
                    </span>
                    <span className="bg-[#111726]/90 border border-slate-700/80 text-slate-200 px-3 py-1.5 rounded-full flex items-center gap-1.5">
                      <Utensils className="h-3.5 w-3.5 text-slate-300" /> {viewingRecipe.tags?.[0] || viewingRecipe.recipeType || 'Main Dish'}
                    </span>
                    
                    <button
                      onClick={() => updateViewingRecipeState('isFavorite', !viewingRecipe.isFavorite)}
                      className="ml-auto w-8 h-8 bg-white/95 rounded-full flex items-center justify-center text-[#E05638] shadow"
                    >
                      <Heart className={`h-4 w-4 ${viewingRecipe.isFavorite ? 'fill-[#E05638] text-[#E05638]' : 'text-slate-400'}`} />
                    </button>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="px-5 grid grid-cols-3 gap-2.5">
                <button
                  onClick={() => alert(`Recipe belongs to cookbook!`)}
                  className="border border-[#E05638]/60 text-[#E05638] font-bold text-xs py-2.5 px-3 rounded-xl transition flex items-center justify-center gap-1.5 hover:bg-[#E05638]/10"
                >
                  <BookmarkPlus className="h-4 w-4 text-[#E05638]" /> Book Assigned
                </button>
                <button
                  onClick={() => alert(`Scheduled "${viewingRecipe.title || viewingRecipe.name}" into Meal Plan!`)}
                  className="border border-[#E05638]/60 text-[#E05638] font-bold text-xs py-2.5 px-3 rounded-xl transition flex items-center justify-center gap-2 hover:bg-[#E05638]/10"
                >
                  <CalendarPlus className="h-4 w-4 text-[#E05638]" /> Add to Plan
                </button>
                <button
                  onClick={() => alert(`Added ingredients for "${viewingRecipe.title || viewingRecipe.name}" to Shopping List!`)}
                  className="border border-[#E05638]/60 text-[#E05638] font-bold text-xs py-2.5 px-3 rounded-xl transition flex items-center justify-center gap-2 hover:bg-[#E05638]/10"
                >
                  <ShoppingCart className="h-4 w-4 text-[#E05638]" /> Shopping List
                </button>
              </div>

              <div className="border-t border-slate-800/80 mx-5" />

              {/* Servings & Secondary Controls */}
              <div className="px-5 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="text-xs font-bold text-[#E05638] flex items-center gap-1.5">
                    <Utensils className="h-4 w-4" /> Servings
                  </span>
                  <div className="flex items-center bg-[#070b13] border border-slate-800 rounded-lg overflow-hidden">
                    <button
                      onClick={() => setServingsMultiplier(Math.max(1, servingsMultiplier - 1))}
                      className="px-2.5 py-1 text-slate-400 hover:text-white font-bold"
                    >
                      -
                    </button>
                    <span className="px-3 py-1 text-xs font-bold text-white">
                      {currentTotalServings}
                    </span>
                    <button
                      onClick={() => setServingsMultiplier(servingsMultiplier + 1)}
                      className="px-2.5 py-1 text-slate-400 hover:text-white font-bold"
                    >
                      +
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => alert('Kitchen Timer set for 15 minutes!')}
                    className="border border-[#E05638]/60 text-[#E05638] font-bold text-xs px-3 py-1.5 rounded-xl transition flex items-center gap-1.5 hover:bg-[#E05638]/10"
                  >
                    <Timer className="h-3.5 w-3.5" /> Timer
                  </button>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(window.location.href);
                      alert('Recipe link copied!');
                    }}
                    className="border border-[#E05638]/60 text-[#E05638] font-bold text-xs px-3 py-1.5 rounded-xl transition flex items-center gap-1.5 hover:bg-[#E05638]/10"
                  >
                    <Share2 className="h-3.5 w-3.5" /> Share Recipe
                  </button>
                </div>
              </div>

              {/* Description */}
              <div className="px-5 text-xs text-slate-300 leading-relaxed">
                {viewingRecipe.description || 'Authentic traditional recipe cooked to perfection.'}
              </div>

              <div className="border-t border-slate-800/80 mx-5" />

              {/* Ingredients & Steps Viewer */}
              <div className="px-5 space-y-6">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <h3 className="text-base font-extrabold text-white">Ingredients</h3>
                  <div className="flex items-center bg-[#070b13] border border-slate-800 rounded-lg text-xs">
                    <button
                      onClick={() => setFontSizeScale(Math.max(80, fontSizeScale - 10))}
                      className="px-2 py-1 text-slate-400 hover:text-white"
                    >
                      -
                    </button>
                    <span className="px-2 py-1 font-bold text-slate-200">{fontSizeScale}%</span>
                    <button
                      onClick={() => setFontSizeScale(Math.min(140, fontSizeScale + 10))}
                      className="px-2 py-1 text-slate-400 hover:text-white"
                    >
                      +
                    </button>
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-3" style={{ fontSize: `${fontSizeScale}%` }}>
                  {Array.isArray(viewingRecipe.ingredients) && viewingRecipe.ingredients.map((ing: any, idx: number) => {
                    const amt = typeof ing === 'string' ? '' : ing.amount || ing.quantity || '';
                    const unit = typeof ing === 'string' ? '' : ing.unit || '';
                    const name = typeof ing === 'string' ? ing : ing.item || ing.name || '';
                    const scaledAmount = calculateScaledAmount(amt, baseServings, currentTotalServings);
                    return (
                      <div key={idx} className="flex items-start gap-2.5 text-xs py-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#E05638] mt-1.5 shrink-0" />
                        <span className="text-slate-200">
                          {(scaledAmount || unit) && <strong className="text-white font-bold">{scaledAmount} {unit !== 'Unit' ? unit : ''} </strong>}
                          {name}
                        </span>
                      </div>
                    );
                  })}
                </div>

                <div className="space-y-3 pt-2">
                  <h3 className="text-base font-extrabold text-white">Instructions</h3>
                  <div className="space-y-2.5" style={{ fontSize: `${fontSizeScale}%` }}>
                    {Array.isArray(viewingRecipe.instructions) && viewingRecipe.instructions.map((step: string, idx: number) => {
                      const isDone = completedSteps.includes(idx);
                      return (
                        <div
                          key={idx}
                          onClick={() => toggleStepComplete(idx)}
                          className={`flex items-start gap-3 p-3 rounded-xl border text-xs cursor-pointer transition ${
                            isDone ? 'bg-[#070b13]/50 border-slate-800/60 opacity-50 line-through' : 'bg-[#070b13] border-slate-800'
                          }`}
                        >
                          <span className="font-extrabold text-[#E05638] shrink-0">{idx + 1}.</span>
                          <span className="text-slate-200 leading-relaxed flex-1">{step}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="border-t border-slate-800/80 mx-5" />

              {/* Mark as Cooked & 5-Star Rating */}
              <div className="px-5 space-y-3">
                <div className="flex items-center justify-between">
                  <button
                    onClick={() => updateViewingRecipeState('isCooked', !viewingRecipe.isCooked)}
                    className="flex items-center gap-2 text-sm font-bold text-white cursor-pointer"
                  >
                    Mark as Cooked
                    <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold ${
                      viewingRecipe.isCooked ? 'bg-slate-400 text-black' : 'border border-slate-600'
                    }`}>
                      {viewingRecipe.isCooked && '✓'}
                    </span>
                  </button>

                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        onClick={() => updateViewingRecipeState('rating', star)}
                        className={`h-4 w-4 cursor-pointer transition ${
                          (viewingRecipe.rating || 0) >= star
                            ? 'fill-[#E05638] text-[#E05638]'
                            : 'text-slate-700 hover:text-slate-500'
                        }`}
                      />
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <button
                    onClick={() => setIsNoteOpen(!isNoteOpen)}
                    className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-slate-200"
                  >
                    <Edit3 className="h-3.5 w-3.5" /> Add a note
                  </button>

                  {isNoteOpen && (
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Add notes..."
                        value={noteText}
                        onChange={(e) => setNoteText(e.target.value)}
                        className="flex-1 bg-[#070b13] border border-slate-800 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-[#E05638]"
                      />
                      <button
                        onClick={() => {
                          updateViewingRecipeState('note', noteText);
                          setIsNoteOpen(false);
                        }}
                        className="bg-[#E05638] text-white font-bold text-xs px-3 py-2 rounded-xl"
                      >
                        Save
                      </button>
                    </div>
                  )}
                  {viewingRecipe.note && !isNoteOpen && (
                    <p className="text-xs text-emerald-400 italic">Note: "{viewingRecipe.note}"</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
"""

with open("apps/web/src/app/books/page.tsx", "w", encoding="utf-8") as f:
    f.write(code)

print("✅ 'View' button in cookbook modal now pops up the specific recipe modal directly!")
