'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  Book, Plus, Utensils, Trash2, Heart, ExternalLink, ArrowRight, X, 
  Clock, Timer, Edit3, Share2, CheckSquare, Square, Star, CheckCircle2, Type, Lock, CalendarPlus, ShoppingCart, BookmarkPlus
} from 'lucide-react';

export default function BooksPage() {
  const [books, setBooks] = useState<any[]>([]);
  const [recipes, setRecipes] = useState<any[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newBookTitle, setNewBookTitle] = useState('');
  const [newBookDesc, setNewBookDesc] = useState('');
  const [selectedBook, setSelectedBook] = useState<any | null>(null);
  
  // Specific Recipe Popup State
  const [viewingRecipe, setViewingRecipe] = useState<any | null>(null);
  const [servingsMultiplier, setServingsMultiplier] = useState(1);
  const [noteText, setNoteText] = useState('');
  const [fontSizeScale, setFontSizeScale] = useState(100);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);

  const loadData = () => {
    const localBooks = localStorage.getItem('zecratary_recipe_books');
    const localRecipes = localStorage.getItem('zecratary_saved_recipes') || localStorage.getItem('zecratary_recipes');
    
    let parsedRecipes = localRecipes ? JSON.parse(localRecipes) : [];
    setRecipes(parsedRecipes);

    if (localBooks) {
      let parsedBooks = JSON.parse(localBooks);
      parsedBooks = parsedBooks.map((b: any) => {
        const count = parsedRecipes.filter((r: any) => r.bookId === b.id).length;
        return { ...b, recipeCount: count };
      });
      setBooks(parsedBooks);
      localStorage.setItem('zecratary_recipe_books', JSON.stringify(parsedBooks));
    } else {
      const defaultBooks = [
        {
          id: 'book_1',
          title: 'Family Favorites & Weeknight Dinners',
          description: 'Quick and easy meals loved by the entire family.',
          coverColor: 'from-orange-500 to-amber-600',
        },
        {
          id: 'book_2',
          title: 'Authentic Asian Cuisine',
          description: 'Traditional recipes, homemade curries, stir-fries, and noodles.',
          coverColor: 'from-emerald-600 to-teal-800',
        },
        {
          id: 'book_3',
          title: 'Baking & Desserts',
          description: 'Cakes, pastries, sweet treats, and weekend baking projects.',
          coverColor: 'from-rose-500 to-pink-700',
        },
      ];
      const withCounts = defaultBooks.map(b => ({
        ...b,
        recipeCount: parsedRecipes.filter((r: any) => r.bookId === b.id).length
      }));
      setBooks(withCounts);
      localStorage.setItem('zecratary_recipe_books', JSON.stringify(withCounts));
    }
  };

  useEffect(() => {
    loadData();
    window.addEventListener('storage', loadData);
    return () => window.removeEventListener('storage', loadData);
  }, []);

  const handleCreateBook = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBookTitle.trim()) return;

    const colors = [
      'from-orange-500 to-amber-600',
      'from-emerald-600 to-teal-800',
      'from-rose-500 to-pink-700',
      'from-purple-600 to-indigo-800',
      'from-blue-600 to-cyan-700',
    ];

    const newBook = {
      id: 'book_' + Date.now(),
      title: newBookTitle,
      description: newBookDesc || 'Custom recipe collection',
      recipeCount: 0,
      coverColor: colors[Math.floor(Math.random() * colors.length)],
    };

    const updated = [newBook, ...books];
    setBooks(updated);
    localStorage.setItem('zecratary_recipe_books', JSON.stringify(updated));
    setNewBookTitle('');
    setNewBookDesc('');
    setShowAddModal(false);
  };

  const handleDeleteBook = (id: string) => {
    if (!confirm('Are you sure you want to delete this recipe book?')) return;
    const updated = books.filter(b => b.id !== id);
    setBooks(updated);
    localStorage.setItem('zecratary_recipe_books', JSON.stringify(updated));
    if (selectedBook?.id === id) setSelectedBook(null);
  };

  const updateViewingRecipeState = (key: string, val: any) => {
    if (!viewingRecipe) return;
    const updatedRec = { ...viewingRecipe, [key]: val };
    setViewingRecipe(updatedRec);
    const updatedRecipes = recipes.map(r => r.id === updatedRec.id ? updatedRec : r);
    setRecipes(updatedRecipes);
    localStorage.setItem('zecratary_saved_recipes', JSON.stringify(updatedRecipes));
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
    <div className="max-w-6xl mx-auto space-y-6 text-slate-100 pb-16">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-extrabold text-[#E05638]">Recipe Books</h1>
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
          const count = recipes.filter((r: any) => r.bookId === book.id).length;
          return (
            <div
              key={book.id}
              onClick={() => setSelectedBook(book)}
              className="bg-[#111726] border border-slate-800 hover:border-[#E05638]/50 rounded-2xl overflow-hidden transition cursor-pointer group flex flex-col justify-between shadow-sm"
            >
              <div className={`h-32 w-full bg-gradient-to-br ${book.coverColor || 'from-orange-500 to-amber-600'} p-6 flex flex-col justify-between relative overflow-hidden`}>
                <div className="absolute right-3 top-3 bg-black/30 backdrop-blur-md p-2 rounded-xl text-white">
                  <Book className="h-5 w-5" />
                </div>
                <div>
                  <span className="text-[10px] font-extrabold uppercase tracking-widest text-white/80 bg-black/20 px-2.5 py-1 rounded-full">
                    Cookbook
                  </span>
                </div>
                <h3 className="font-black text-white text-lg leading-snug drop-shadow-md">
                  {book.title}
                </h3>
              </div>

              <div className="p-5 space-y-4">
                <p className="text-xs text-slate-300 leading-relaxed line-clamp-2">
                  {book.description}
                </p>

                <div className="flex items-center justify-between pt-2 border-t border-slate-800 text-xs">
                  <span className="text-slate-400 font-medium flex items-center gap-1.5">
                    <Utensils className="h-3.5 w-3.5 text-[#E05638]" /> {count} recipes inside
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteBook(book.id);
                    }}
                    className="text-slate-500 hover:text-red-400 p-1.5 rounded-lg transition"
                    title="Delete Book"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* 1. CREATE BOOK MODAL (CLICK OUTSIDE CLOSES) */}
      {showAddModal && (
        <div 
          onClick={() => setShowAddModal(false)}
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 cursor-pointer"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="bg-[#111726] border border-slate-800 rounded-3xl max-w-md w-full p-6 space-y-6 shadow-2xl relative cursor-default"
          >
            <button
              onClick={() => setShowAddModal(false)}
              className="absolute top-4 right-4 p-2 bg-slate-800 text-slate-300 hover:text-white rounded-full transition"
            >
              <X className="h-4 w-4" />
            </button>

            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Book className="h-5 w-5 text-[#E05638]" /> Create Recipe Book
            </h2>

            <form onSubmit={handleCreateBook} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-400 font-semibold mb-1">Book Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Weekend Baking & Desserts"
                  value={newBookTitle}
                  onChange={(e) => setNewBookTitle(e.target.value)}
                  className="w-full bg-[#0B101D] border border-slate-800 rounded-xl p-3 text-sm text-white placeholder-slate-700 outline-none focus:border-[#E05638]"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1">Description</label>
                <textarea
                  rows={3}
                  placeholder="Short summary of this cookbook collection..."
                  value={newBookDesc}
                  onChange={(e) => setNewBookDesc(e.target.value)}
                  className="w-full bg-[#0B101D] border border-slate-800 rounded-xl p-3 text-sm text-white placeholder-slate-700 outline-none focus:border-[#E05638] resize-y"
                />
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
                  Create Book
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 2. VIEW BOOK DETAILS MODAL (CLICK OUTSIDE CLOSES) */}
      {selectedBook && (
        <div 
          onClick={() => setSelectedBook(null)}
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 cursor-pointer"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="bg-[#111726] border border-slate-800 rounded-3xl max-w-2xl w-full p-6 space-y-6 shadow-2xl relative max-h-[85vh] overflow-y-auto cursor-default"
          >
            <button
              onClick={() => setSelectedBook(null)}
              className="absolute top-4 right-4 p-2 bg-slate-800 text-slate-300 hover:text-white rounded-full transition"
            >
              <X className="h-4 w-4" />
            </button>

            <div className={`h-28 w-full bg-gradient-to-br ${selectedBook.coverColor || 'from-orange-500 to-amber-600'} rounded-2xl p-6 flex flex-col justify-end text-white shadow-md`}>
              <h2 className="text-2xl font-black">{selectedBook.title}</h2>
              <p className="text-xs text-white/80 mt-1">{selectedBook.description}</p>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-white uppercase tracking-wider text-[#E05638]">
                  Recipes in this Book ({recipes.filter((r: any) => r.bookId === selectedBook.id).length})
                </h3>
                <Link
                  href="/recipes"
                  className="text-xs text-emerald-400 font-bold hover:underline flex items-center gap-1"
                >
                  Add recipes from Saved <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>

              {recipes.filter((r: any) => r.bookId === selectedBook.id).length === 0 ? (
                <div className="p-8 border border-slate-800 bg-[#0B101D] rounded-2xl text-center space-y-2">
                  <Utensils className="h-8 w-8 text-slate-600 mx-auto" />
                  <h4 className="text-sm font-bold text-white">No recipes added yet</h4>
                  <p className="text-xs text-slate-400">Browse your saved recipes and assign them to this cookbook.</p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {recipes.filter((r: any) => r.bookId === selectedBook.id).map((rec: any) => (
                    <div key={rec.id} className="flex items-center justify-between bg-[#0B101D] p-3 rounded-xl border border-slate-800 text-xs">
                      <div className="flex items-center gap-3">
                        <img src={rec.imageUrl || rec.image || 'https://images.unsplash.com/photo-1559847844-5315695dadae?auto=format&fit=crop&w=300&q=80'} alt={rec.title} className="w-10 h-10 rounded-lg object-cover" />
                        <div>
                          <h4 className="font-bold text-white">{rec.title || rec.name}</h4>
                          <span className="text-[10px] text-slate-400">{rec.recipeType || 'Main Dish'} • {rec.servings || 4} servings</span>
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          setViewingRecipe(rec);
                          setServingsMultiplier(1);
                          setNoteText(rec.note || '');
                          setCompletedSteps([]);
                          setFontSizeScale(100);
                        }}
                        className="bg-[#141b2d] hover:bg-[#1c263f] text-white font-bold px-4 py-2 rounded-xl transition border border-slate-700"
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

      {/* 3. SPECIFIC RECIPE POPUP MODAL (CLICK OUTSIDE CLOSES) */}
      {viewingRecipe && (
        <div 
          onClick={() => setViewingRecipe(null)}
          className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-3 sm:p-6 overflow-y-auto cursor-pointer"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="bg-[#111726] border border-slate-800 rounded-3xl max-w-4xl w-full max-h-[92vh] flex flex-col overflow-hidden shadow-2xl relative cursor-default"
          >
            <button
              onClick={() => setViewingRecipe(null)}
              className="absolute top-4 right-4 z-20 p-2.5 bg-black/60 hover:bg-black text-white rounded-full backdrop-blur-md transition"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="overflow-y-auto flex-1 space-y-6">
              <div className="relative h-64 sm:h-80 w-full bg-slate-900 overflow-hidden flex flex-col justify-end p-6">
                <img
                  src={viewingRecipe.imageUrl || viewingRecipe.image || 'https://images.unsplash.com/photo-1559847844-5315695dadae?auto=format&fit=crop&w=1000&q=80'}
                  alt={viewingRecipe.title || viewingRecipe.name}
                  className="absolute inset-0 w-full h-full object-cover opacity-75"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#111726] via-[#111726]/40 to-transparent" />

                <div className="relative z-10 space-y-3">
                  <h2 className="text-2xl sm:text-4xl font-black text-white leading-tight">{viewingRecipe.title || viewingRecipe.name}</h2>
                  
                  <div className="flex flex-wrap items-center gap-3 text-xs font-semibold">
                    <span className="bg-[#1B2436]/90 border border-slate-700/80 text-slate-200 px-3 py-1.5 rounded-xl flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5 text-[#E05638]" /> Cook: {viewingRecipe.cookTimeMinutes || 10} minutes
                    </span>
                    <span className="bg-[#1B2436]/90 border border-slate-700/80 text-slate-200 px-3 py-1.5 rounded-xl flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5 text-emerald-400" /> Prep: {viewingRecipe.prepTimeMinutes || 30} minutes
                    </span>
                    <span className="bg-[#1B2436]/90 border border-slate-700/80 text-slate-200 px-3 py-1.5 rounded-xl flex items-center gap-1.5">
                      <Utensils className="h-3.5 w-3.5 text-orange-400" /> {viewingRecipe.tags?.[0] || viewingRecipe.recipeType || 'Main Dish'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="px-6 grid grid-cols-1 sm:grid-cols-3 gap-3">
                <button
                  onClick={() => alert(`Added "${viewingRecipe.title || viewingRecipe.name}" to Book!`)}
                  className="bg-[#1B2436] hover:bg-[#25324A] border border-slate-700/80 text-white font-bold text-xs py-3 px-4 rounded-xl transition flex items-center justify-center gap-2"
                >
                  <BookmarkPlus className="h-4 w-4 text-[#E05638]" /> Add to Book
                </button>
                <button
                  onClick={() => alert(`Scheduled "${viewingRecipe.title || viewingRecipe.name}" into Meal Planner!`)}
                  className="bg-[#1B2436] hover:bg-[#25324A] border border-slate-700/80 text-white font-bold text-xs py-3 px-4 rounded-xl transition flex items-center justify-center gap-2"
                >
                  <CalendarPlus className="h-4 w-4 text-emerald-400" /> Add to Plan
                </button>
                <button
                  onClick={() => alert(`Added ingredients for "${viewingRecipe.title || viewingRecipe.name}" to Shopping List!`)}
                  className="bg-[#1B2436] hover:bg-[#25324A] border border-slate-700/80 text-white font-bold text-xs py-3 px-4 rounded-xl transition flex items-center justify-center gap-2"
                >
                  <ShoppingCart className="h-4 w-4 text-orange-400" /> Shopping List
                </button>
              </div>

              <div className="border-t border-slate-800 mx-6" />

              <div className="px-6 flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <span className="text-sm font-bold text-slate-200 flex items-center gap-1.5">
                    <Utensils className="h-4 w-4 text-[#E05638]" /> Servings
                  </span>
                  <div className="flex items-center bg-[#0B101D] border border-slate-800 rounded-xl overflow-hidden">
                    <button
                      onClick={() => setServingsMultiplier(Math.max(1, servingsMultiplier - 1))}
                      className="px-3 py-1.5 text-slate-400 hover:text-white hover:bg-slate-800 transition font-bold"
                    >
                      -
                    </button>
                    <span className="px-4 py-1.5 text-xs font-black text-white">
                      {currentTotalServings}
                    </span>
                    <button
                      onClick={() => setServingsMultiplier(servingsMultiplier + 1)}
                      className="px-3 py-1.5 text-slate-400 hover:text-white hover:bg-slate-800 transition font-bold"
                    >
                      +
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => alert('Kitchen Timer activated for 15 minutes!')}
                    className="bg-[#1B2436] hover:bg-[#25324A] border border-slate-700/80 text-slate-200 font-bold text-xs px-3.5 py-2 rounded-xl transition flex items-center gap-1.5"
                  >
                    <Timer className="h-3.5 w-3.5 text-emerald-400" /> Timer
                  </button>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(window.location.href);
                      alert('Recipe link copied to clipboard!');
                    }}
                    className="bg-[#1B2436] hover:bg-[#25324A] border border-slate-700/80 text-slate-200 font-bold text-xs px-3.5 py-2 rounded-xl transition flex items-center gap-1.5"
                  >
                    <Share2 className="h-3.5 w-3.5 text-blue-400" /> Share
                  </button>
                </div>
              </div>

              <div className="px-6 text-sm text-slate-300 leading-relaxed">
                {viewingRecipe.description}
              </div>

              <div className="border-t border-slate-800 mx-6" />

              <div className="px-6 space-y-8 pb-8">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <h3 className="text-xl font-black text-white tracking-wide">Ingredients</h3>
                  
                  <div className="flex items-center bg-[#080C17] border border-slate-800 rounded-xl overflow-hidden shadow-inner">
                    <button
                      onClick={() => setFontSizeScale(Math.min(140, fontSizeScale + 10))}
                      className="px-2.5 py-1.5 text-slate-300 hover:text-white hover:bg-slate-800 transition text-xs font-bold"
                    >
                      <Type className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => setFontSizeScale(Math.max(80, fontSizeScale - 10))}
                      className="px-2.5 py-1.5 text-slate-300 hover:text-white hover:bg-slate-800 transition text-xs font-bold border-l border-slate-800"
                    >
                      -
                    </button>
                    <span className="px-3 py-1.5 text-xs font-bold text-white border-l border-slate-800 bg-[#0B101D]">
                      {fontSizeScale}%
                    </span>
                    <button
                      onClick={() => setFontSizeScale(Math.min(140, fontSizeScale + 10))}
                      className="px-2.5 py-1.5 text-slate-300 hover:text-white hover:bg-slate-800 transition text-xs font-bold border-l border-slate-800"
                    >
                      +
                    </button>
                  </div>
                </div>

                <div
                  className="grid md:grid-cols-2 gap-x-8 gap-y-3.5"
                  style={{ fontSize: `${fontSizeScale}%` }}
                >
                  {Array.isArray(viewingRecipe.ingredients) && viewingRecipe.ingredients.map((ing: any, i: number) => {
                    const ingText = typeof ing === 'string' ? ing : ing.item || ing.name || '';
                    const rawAmount = ing.amount || ing.quantity || '';
                    const scaledAmount = calculateScaledAmount(rawAmount, viewingRecipe.servings || 4, currentTotalServings);
                    const unitText = typeof ing === 'string' ? '' : ing.unit || '';
                    return (
                      <div key={i} className="flex items-start gap-3 py-1">
                        <span className="w-2 h-2 rounded-full bg-[#E05638] shrink-0 mt-1.5" />
                        <span className="text-slate-200 leading-snug">
                          {scaledAmount !== '' && (
                            <strong className="text-white font-semibold">
                              {scaledAmount} {unitText !== 'Unit' ? unitText : ''}{' '}
                            </strong>
                          )}
                          {ingText}
                        </span>
                      </div>
                    );
                  })}
                </div>

                <div className="space-y-4 pt-6 border-t border-slate-800">
                  <h3 className="text-xl font-black text-white tracking-wide">Instructions</h3>
                  
                  <div className="space-y-4" style={{ fontSize: `${fontSizeScale}%` }}>
                    {Array.isArray(viewingRecipe.instructions) && viewingRecipe.instructions.map((step: string, i: number) => {
                      const isDone = completedSteps.includes(i);
                      return (
                        <div
                          key={i}
                          onClick={() => toggleStepComplete(i)}
                          className={`flex items-start gap-4 p-4 rounded-2xl border transition cursor-pointer select-none ${
                            isDone ? 'bg-[#0B101D]/60 border-slate-800/80 opacity-50 line-through' : 'bg-[#0B101D] border-slate-800 hover:border-slate-700'
                          }`}
                        >
                          <div className={`w-5 h-5 rounded-lg border flex items-center justify-center shrink-0 mt-0.5 transition ${
                            isDone ? 'bg-[#E05638] border-[#E05638] text-white' : 'border-slate-600 bg-transparent'
                          }`}>
                            {isDone && <CheckCircle2 className="h-3.5 w-3.5" />}
                          </div>

                          <div className="flex gap-3 flex-1">
                            <span className="font-extrabold text-[#E05638] shrink-0">{i + 1}.</span>
                            <span className={`leading-relaxed ${isDone ? 'text-slate-500' : 'text-slate-200'}`}>
                              {step}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
