import os

code = """'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Book, Plus, Utensils, Trash2, Edit3, Save, ArrowRight, X, Palette } from 'lucide-react';

const COVER_GRADIENTS = [
  { label: 'Sunset Coral', value: 'from-orange-500 to-rose-600' },
  { label: 'Emerald Forest', value: 'from-emerald-600 to-teal-800' },
  { label: 'Rose & Berry', value: 'from-rose-500 to-pink-700' },
  { label: 'Indigo Night', value: 'from-purple-600 to-indigo-800' },
  { label: 'Ocean Blue', value: 'from-blue-600 to-cyan-700' },
  { label: 'Amber Gold', value: 'from-amber-500 to-yellow-600' },
];

export default function BooksPage() {
  const [books, setBooks] = useState<any[]>([]);
  const [recipes, setRecipes] = useState<any[]>([]);
  
  // Modal States
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingBook, setEditingBook] = useState<any | null>(null);
  const [selectedBook, setSelectedBook] = useState<any | null>(null);

  // Form States
  const [newBookTitle, setNewBookTitle] = useState('');
  const [newBookDesc, setNewBookDesc] = useState('');
  const [newBookColor, setNewBookColor] = useState(COVER_GRADIENTS[0].value);

  const [editTitle, setEditTitle] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editColor, setEditColor] = useState('');

  const loadData = () => {
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
      localStorage.setItem('zecratary_recipe_books', JSON.stringify(parsedBooks));
    } else {
      const defaultBooks = [
        {
          id: 'book_1',
          title: 'Family Favorites & Weeknight Dinners',
          description: 'Quick and easy meals loved by the entire family.',
          coverColor: 'from-orange-500 to-rose-600',
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

    const newBook = {
      id: 'book_' + Date.now(),
      title: newBookTitle.trim(),
      description: newBookDesc.trim() || 'Custom recipe collection',
      recipeCount: 0,
      coverColor: newBookColor,
    };

    const updated = [newBook, ...books];
    setBooks(updated);
    localStorage.setItem('zecratary_recipe_books', JSON.stringify(updated));
    setNewBookTitle('');
    setNewBookDesc('');
    setShowAddModal(false);
  };

  const openEditModal = (e: React.MouseEvent, book: any) => {
    e.stopPropagation();
    setEditingBook(book);
    setEditTitle(book.title);
    setEditDesc(book.description || '');
    setEditColor(book.coverColor || COVER_GRADIENTS[0].value);
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
            coverColor: editColor,
          }
        : b
    );

    setBooks(updated);
    localStorage.setItem('zecratary_recipe_books', JSON.stringify(updated));

    if (selectedBook?.id === editingBook.id) {
      setSelectedBook({
        ...selectedBook,
        title: editTitle.trim(),
        description: editDesc.trim(),
        coverColor: editColor,
      });
    }

    setEditingBook(null);
  };

  const handleDeleteBook = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this recipe book?')) return;
    const updated = books.filter((b) => b.id !== id);
    setBooks(updated);
    localStorage.setItem('zecratary_recipe_books', JSON.stringify(updated));
    if (selectedBook?.id === id) setSelectedBook(null);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 text-slate-100 pb-16">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-extrabold text-[#E05638]">Recipe Books</h1>
          <p className="text-slate-400 text-xs mt-1">Organize and manage your digital cookbooks</p>
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
              <div className={`h-32 w-full bg-gradient-to-br ${book.coverColor || 'from-orange-500 to-rose-600'} p-5 flex flex-col justify-between relative overflow-hidden`}>
                <div className="flex items-center justify-between z-10">
                  <span className="text-[10px] font-extrabold uppercase tracking-widest text-white/90 bg-black/30 backdrop-blur-md px-2.5 py-1 rounded-full">
                    Cookbook
                  </span>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={(e) => openEditModal(e, book)}
                      className="bg-black/40 hover:bg-black/70 backdrop-blur-md p-2 rounded-xl text-white transition"
                      title="Edit Book"
                    >
                      <Edit3 className="h-4 w-4" />
                    </button>
                    <button
                      onClick={(e) => handleDeleteBook(e, book.id)}
                      className="bg-black/40 hover:bg-black/70 backdrop-blur-md p-2 rounded-xl text-white hover:text-red-400 transition"
                      title="Delete Book"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                <h3 className="font-black text-white text-lg leading-snug drop-shadow-md z-10">
                  {book.title}
                </h3>
              </div>

              <div className="p-5 space-y-4">
                <p className="text-xs text-slate-300 leading-relaxed line-clamp-2 min-h-[32px]">
                  {book.description || 'No description provided.'}
                </p>

                <div className="flex items-center justify-between pt-2 border-t border-slate-800 text-xs">
                  <span className="text-slate-400 font-medium flex items-center gap-1.5">
                    <Utensils className="h-3.5 w-3.5 text-[#E05638]" /> {count} recipes inside
                  </span>
                  <button
                    onClick={(e) => openEditModal(e, book)}
                    className="text-xs text-[#E05638] hover:underline font-bold flex items-center gap-1"
                  >
                    Edit Details
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Edit Book Modal */}
      {editingBook && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#111726] border border-slate-800 rounded-3xl max-w-md w-full p-6 space-y-5 shadow-2xl relative">
            <button
              onClick={() => setEditingBook(null)}
              className="absolute top-4 right-4 p-2 bg-slate-800 text-slate-300 hover:text-white rounded-full transition"
            >
              <X className="h-4 w-4" />
            </button>

            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Edit3 className="h-5 w-5 text-[#E05638]" /> Edit Recipe Book
            </h2>

            <form onSubmit={handleSaveEdit} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-400 font-semibold mb-1">Book Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Baking & Desserts"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full bg-[#0B101D] border border-slate-800 rounded-xl p-3 text-sm text-white placeholder-slate-600 outline-none focus:border-[#E05638]"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1">Description</label>
                <textarea
                  rows={3}
                  placeholder="Short summary of this cookbook collection..."
                  value={editDesc}
                  onChange={(e) => setEditDesc(e.target.value)}
                  className="w-full bg-[#0B101D] border border-slate-800 rounded-xl p-3 text-sm text-white placeholder-slate-600 outline-none focus:border-[#E05638] resize-y"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-2 flex items-center gap-1.5">
                  <Palette className="h-3.5 w-3.5 text-[#E05638]" /> Cover Gradient
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {COVER_GRADIENTS.map((g, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setEditColor(g.value)}
                      className={`h-10 rounded-xl bg-gradient-to-br ${g.value} flex items-center justify-center transition border-2 ${
                        editColor === g.value ? 'border-white scale-105 shadow-md' : 'border-transparent opacity-75 hover:opacity-100'
                      }`}
                      title={g.label}
                    />
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingBook(null)}
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

      {/* Create Book Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#111726] border border-slate-800 rounded-3xl max-w-md w-full p-6 space-y-5 shadow-2xl relative">
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
                  className="w-full bg-[#0B101D] border border-slate-800 rounded-xl p-3 text-sm text-white placeholder-slate-600 outline-none focus:border-[#E05638]"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1">Description</label>
                <textarea
                  rows={3}
                  placeholder="Short summary of this cookbook collection..."
                  value={newBookDesc}
                  onChange={(e) => setNewBookDesc(e.target.value)}
                  className="w-full bg-[#0B101D] border border-slate-800 rounded-xl p-3 text-sm text-white placeholder-slate-600 outline-none focus:border-[#E05638] resize-y"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-2 flex items-center gap-1.5">
                  <Palette className="h-3.5 w-3.5 text-[#E05638]" /> Cover Gradient
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {COVER_GRADIENTS.map((g, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setNewBookColor(g.value)}
                      className={`h-10 rounded-xl bg-gradient-to-br ${g.value} flex items-center justify-center transition border-2 ${
                        newBookColor === g.value ? 'border-white scale-105 shadow-md' : 'border-transparent opacity-75 hover:opacity-100'
                      }`}
                      title={g.label}
                    />
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
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

      {/* View Book Details Modal */}
      {selectedBook && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#111726] border border-slate-800 rounded-3xl max-w-2xl w-full p-6 space-y-6 shadow-2xl relative max-h-[85vh] overflow-y-auto">
            <button
              onClick={() => setSelectedBook(null)}
              className="absolute top-4 right-4 p-2 bg-slate-800 text-slate-300 hover:text-white rounded-full transition"
            >
              <X className="h-4 w-4" />
            </button>

            <div className={`h-32 w-full bg-gradient-to-br ${selectedBook.coverColor || 'from-orange-500 to-rose-600'} rounded-2xl p-6 flex flex-col justify-between text-white shadow-md`}>
              <div className="flex justify-between items-start">
                <span className="text-[10px] font-extrabold uppercase tracking-widest bg-black/30 px-2.5 py-1 rounded-full">
                  Cookbook Details
                </span>
                <button
                  onClick={(e) => openEditModal(e, selectedBook)}
                  className="bg-black/40 hover:bg-black/70 backdrop-blur-md px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition"
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
                <div className="p-8 border border-slate-800 bg-[#0B101D] rounded-2xl text-center space-y-2">
                  <Utensils className="h-8 w-8 text-slate-600 mx-auto" />
                  <h4 className="text-sm font-bold text-white">No recipes in this book yet</h4>
                  <p className="text-xs text-slate-400">Open any saved recipe and click "Add to Book" to add it here.</p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {recipes
                    .filter((r: any) => r.bookId === selectedBook.id)
                    .map((rec: any) => (
                      <div key={rec.id} className="flex items-center justify-between bg-[#0B101D] p-3 rounded-xl border border-slate-800 text-xs">
                        <div className="flex items-center gap-3">
                          <img src={rec.imageUrl || 'https://images.unsplash.com/photo-1559847844-5315695dadae?auto=format&fit=crop&w=200&q=80'} alt={rec.title} className="w-10 h-10 rounded-lg object-cover" />
                          <div>
                            <h4 className="font-bold text-white">{rec.title}</h4>
                            <span className="text-[10px] text-slate-400">{rec.recipeType || 'Main Dish'} • {rec.servings || 4} servings</span>
                          </div>
                        </div>
                        <Link
                          href="/recipes"
                          className="bg-slate-800 hover:bg-slate-700 text-white font-bold px-3 py-1.5 rounded-lg transition"
                        >
                          View
                        </Link>
                      </div>
                    ))}
                </div>
              )}
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

print("✅ Books editing feature successfully installed!")
