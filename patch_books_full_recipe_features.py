import os

code = """'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  Book, Plus, Utensils, Trash2, Edit3, Save, X, 
  ArrowRight, Palette, Check, Clock, Timer, Share2, 
  CheckCircle2, CalendarPlus, ShoppingCart, 
  BookmarkPlus, Heart, Star, ChevronDown, ImagePlus,
  GripVertical, CheckSquare, ExternalLink, Users
} from 'lucide-react';

const COVER_GRADIENTS = [
  { label: 'Rose & Pink', value: 'bg-gradient-to-r from-pink-600 via-rose-500 to-rose-600' },
  { label: 'Emerald Green', value: 'bg-gradient-to-r from-emerald-600 to-teal-700' },
  { label: 'Sunset Orange', value: 'bg-gradient-to-r from-orange-500 to-amber-600' },
  { label: 'Royal Purple', value: 'bg-gradient-to-r from-purple-600 to-indigo-800' },
  { label: 'Ocean Blue', value: 'bg-gradient-to-r from-blue-600 to-cyan-600' },
  { label: 'Slate Charcoal', value: 'bg-gradient-to-r from-slate-700 to-slate-900' },
];

const DEFAULT_CATEGORIES = [
  'Produce', 'Meat and Seafood', 'Dairy', 
  'Grains and Pasta', 'Pantry Staples', 
  'Condiments and Sauces', 'Beverages'
];

export default function BooksPage() {
  const [books, setBooks] = useState<any[]>([]);
  const [recipes, setRecipes] = useState<any[]>([]);
  
  // Cookbook Modal States
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingBook, setEditingBook] = useState<any | null>(null);
  const [selectedBook, setSelectedBook] = useState<any | null>(null);

  // Form States for Cookbook Create
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newCoverColor, setNewCoverColor] = useState(COVER_GRADIENTS[0].value);

  // Form States for Cookbook Edit
  const [editTitle, setEditTitle] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editCoverColor, setEditCoverColor] = useState(COVER_GRADIENTS[0].value);

  // Specific Recipe Popup State
  const [viewingRecipe, setViewingRecipe] = useState<any | null>(null);
  const [isBookDropdownOpen, setIsBookDropdownOpen] = useState(false);
  const [servingsMultiplier, setServingsMultiplier] = useState(1);
  const [fontSizeScale, setFontSizeScale] = useState(100);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  const [noteText, setNoteText] = useState('');
  const [isNoteOpen, setIsNoteOpen] = useState(false);

  // Recipe Editing State (Inside Recipe Popup)
  const [isEditingRecipe, setIsEditingRecipe] = useState(false);
  const [editRecipeTab, setEditRecipeTab] = useState<'info' | 'ingredients' | 'steps'>('info');
  const [editRecipeForm, setEditRecipeForm] = useState<any>({
    title: '',
    description: '',
    recipeType: 'Main Dish',
    servings: 4,
    prepTimeMinutes: 15,
    cookTimeMinutes: 30,
    imageUrl: '',
    ingredients: [],
    instructions: []
  });
  const [isReorderingIngredients, setIsReorderingIngredients] = useState(false);
  const [isReorderingSteps, setIsReorderingSteps] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  // Shopping List Modal State
  const [isShoppingModalOpen, setIsShoppingModalOpen] = useState(false);
  const [shoppingModalIngredients, setShoppingModalIngredients] = useState<any[]>([]);

  // Add to Plan Modal State
  const [isPlanModalOpen, setIsPlanModalOpen] = useState(false);
  const [planDate, setPlanDate] = useState('2026-08-28');
  const [planMealType, setPlanMealType] = useState('Dinner');
  const [planMealTime, setPlanMealTime] = useState('19:00');

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

  const saveAllRecipes = (updatedList: any[]) => {
    setRecipes(updatedList);
    localStorage.setItem('zecratary_recipes', JSON.stringify(updatedList));
    localStorage.setItem('zecratary_saved_recipes', JSON.stringify(updatedList));

    const updatedBooks = books.map((b: any) => ({
      ...b,
      recipeCount: updatedList.filter((r: any) => r.bookId === b.id).length
    }));
    setBooks(updatedBooks);
    localStorage.setItem('zecratary_recipe_books', JSON.stringify(updatedBooks));

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('zecratary_recipes_updated'));
      window.dispatchEvent(new Event('storage'));
    }
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

  // Recipe Popup Specific Actions
  const handleOpenRecipePopup = (rec: any) => {
    setViewingRecipe(rec);
    setServingsMultiplier(1);
    setFontSizeScale(100);
    setCompletedSteps([]);
    setNoteText(rec.note || '');
    setIsNoteOpen(false);
    setIsBookDropdownOpen(false);
    setIsEditingRecipe(false);
  };

  const updateViewingRecipeState = (key: string, val: any) => {
    if (!viewingRecipe) return;
    const updatedRec = { ...viewingRecipe, [key]: val };
    setViewingRecipe(updatedRec);
    const updatedList = recipes.map(r => r.id === updatedRec.id ? updatedRec : r);
    saveAllRecipes(updatedList);
  };

  const handleAssignToBook = (bookId: string) => {
    if (!viewingRecipe) return;
    const isRemoving = viewingRecipe.bookId === bookId;
    const targetBookId = isRemoving ? null : bookId;
    const updatedRecipe = { ...viewingRecipe, bookId: targetBookId };
    setViewingRecipe(updatedRecipe);

    const updatedList = recipes.map(r => r.id === viewingRecipe.id ? updatedRecipe : r);
    saveAllRecipes(updatedList);

    const targetBookTitle = books.find(b => b.id === bookId)?.title || 'Cookbook';
    if (isRemoving) {
      alert(`Removed "${viewingRecipe.title || viewingRecipe.name}" from "${targetBookTitle}"`);
    } else {
      alert(`Assigned "${viewingRecipe.title || viewingRecipe.name}" to "${targetBookTitle}"!`);
    }
  };

  const handleDeleteRecipe = (id: string) => {
    if (!confirm('Are you sure you want to delete this recipe?')) return;
    const updated = recipes.filter(r => r.id !== id);
    saveAllRecipes(updated);
    setViewingRecipe(null);
    setIsEditingRecipe(false);
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

  // Recipe Edit Handlers
  const handleOpenEditRecipe = () => {
    if (!viewingRecipe) return;
    setEditRecipeForm({
      title: viewingRecipe.title || viewingRecipe.name || '',
      description: viewingRecipe.description || '',
      recipeType: viewingRecipe.recipeType || viewingRecipe.tags?.[0] || 'Main Dish',
      servings: viewingRecipe.servings || 4,
      prepTimeMinutes: viewingRecipe.prepTimeMinutes || 15,
      cookTimeMinutes: viewingRecipe.cookTimeMinutes || 30,
      imageUrl: viewingRecipe.imageUrl || viewingRecipe.image || '',
      ingredients: viewingRecipe.ingredients
        ? viewingRecipe.ingredients.map((ing: any) => ({
            amount: typeof ing === 'string' ? '' : ing.amount || ing.quantity || '',
            unit: typeof ing === 'string' ? '' : ing.unit || '',
            item: typeof ing === 'string' ? ing : ing.item || ing.name || '',
            category: typeof ing === 'string' ? 'Pantry Staples' : ing.category || 'Pantry Staples'
          }))
        : [{ amount: '', unit: '', item: '', category: 'Pantry Staples' }],
      instructions: viewingRecipe.instructions && viewingRecipe.instructions.length > 0
        ? [...viewingRecipe.instructions]
        : ['']
    });
    setEditRecipeTab('info');
    setIsReorderingIngredients(false);
    setIsReorderingSteps(false);
    setIsEditingRecipe(true);
  };

  const handleSaveRecipeEdit = () => {
    if (!editRecipeForm.title.trim()) {
      alert('Please enter a recipe title.');
      setEditRecipeTab('info');
      return;
    }

    const updatedRec = {
      ...viewingRecipe,
      ...editRecipeForm,
      tags: [editRecipeForm.recipeType]
    };

    setViewingRecipe(updatedRec);
    const updatedList = recipes.map(r => r.id === updatedRec.id ? updatedRec : r);
    saveAllRecipes(updatedList);
    setIsEditingRecipe(false);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setEditRecipeForm((prev: any) => ({ ...prev, imageUrl: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDragStart = (index: number) => setDraggedIndex(index);
  const handleDragOver = (e: React.DragEvent, index: number, type: 'ingredients' | 'steps') => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;
    if (type === 'ingredients') {
      const list = [...editRecipeForm.ingredients];
      const item = list[draggedIndex];
      list.splice(draggedIndex, 1);
      list.splice(index, 0, item);
      setEditRecipeForm({ ...editRecipeForm, ingredients: list });
    } else {
      const list = [...editRecipeForm.instructions];
      const item = list[draggedIndex];
      list.splice(draggedIndex, 1);
      list.splice(index, 0, item);
      setEditRecipeForm({ ...editRecipeForm, instructions: list });
    }
    setDraggedIndex(index);
  };
  const handleDrop = () => setDraggedIndex(null);

  // Shopping List Modal Handlers
  const handleOpenShoppingModal = () => {
    if (!viewingRecipe) return;
    const items = (viewingRecipe.ingredients || []).map((ing: any, idx: number) => ({
      id: 'shop_item_' + idx,
      selected: true,
      amount: typeof ing === 'string' ? '' : ing.amount || ing.quantity || '',
      unit: typeof ing === 'string' ? '' : ing.unit || '',
      name: typeof ing === 'string' ? ing : ing.item || ing.name || '',
      category: typeof ing === 'string' ? 'Pantry Staples' : ing.category || 'Pantry Staples'
    }));
    setShoppingModalIngredients(items);
    setIsShoppingModalOpen(true);
  };

  const handleConfirmAddToShoppingList = () => {
    const selectedItems = shoppingModalIngredients.filter(i => i.selected);
    if (selectedItems.length === 0) {
      alert('No ingredients selected.');
      return;
    }
    const local = localStorage.getItem('zecratary_shopping') || localStorage.getItem('zecratary_shopping_list');
    const current = local ? JSON.parse(local) : [];
    const formatted = selectedItems.map(i => ({
      id: 's_' + Date.now() + Math.random(),
      name: i.name,
      quantity: i.amount || '1',
      unit: i.unit || 'item',
      category: i.category,
      checked: false
    }));
    const updated = [...formatted, ...current];
    localStorage.setItem('zecratary_shopping', JSON.stringify(updated));
    localStorage.setItem('zecratary_shopping_list', JSON.stringify(updated));
    setIsShoppingModalOpen(false);
    alert(`Added ${selectedItems.length} ingredients to your Shopping List!`);
  };

  // Add to Plan Handler
  const handleConfirmAddToPlan = () => {
    if (!viewingRecipe) return;
    const localPlan = localStorage.getItem('zecratary_meal_plan');
    const planItems = localPlan ? JSON.parse(localPlan) : [];
    const newMeal = {
      id: 'plan_' + Date.now(),
      date: planDate,
      recipeId: viewingRecipe.id,
      recipeName: viewingRecipe.title || viewingRecipe.name,
      image: viewingRecipe.imageUrl || viewingRecipe.image,
      mealType: planMealType,
      time: planMealTime,
      isLeftover: false,
      notes: ''
    };
    const updatedPlan = [...planItems, newMeal];
    localStorage.setItem('zecratary_meal_plan', JSON.stringify(updatedPlan));
    window.dispatchEvent(new Event('zecratary_planner_updated'));
    setIsPlanModalOpen(false);
    alert(`Added "${viewingRecipe.title || viewingRecipe.name}" to meal plan on ${planDate}!`);
  };

  const baseServings = viewingRecipe?.servings || 4;
  const currentTotalServings = baseServings * servingsMultiplier;
  const assignedBook = books.find(b => b.id === viewingRecipe?.bookId);

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

              <div className="p-5 space-y-4 flex-1 flex flex-col justify-between">
                <p className="text-xs text-slate-300 leading-relaxed line-clamp-2 min-h-[32px]">
                  {book.description || 'Custom recipe collection'}
                </p>

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

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 1. SPECIFIC RECIPE POPUP MODAL (View / Edit / Actions) */}
      {/* ───────────────────────────────────────────────────────────── */}
      {viewingRecipe && (
        <div 
          onClick={() => { setViewingRecipe(null); setIsEditingRecipe(false); setIsBookDropdownOpen(false); }}
          className="fixed inset-0 bg-black/90 backdrop-blur-md z-[80] flex items-center justify-center p-3 sm:p-6 overflow-y-auto cursor-pointer"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="bg-[#0b0f17] border border-slate-800 rounded-3xl max-w-3xl w-full max-h-[92vh] flex flex-col overflow-hidden shadow-2xl relative cursor-default"
          >
            <button
              onClick={() => { setViewingRecipe(null); setIsEditingRecipe(false); setIsBookDropdownOpen(false); }}
              className="absolute top-4 right-4 z-30 p-2.5 bg-black/70 hover:bg-black text-slate-300 hover:text-white rounded-xl border border-slate-700/60 backdrop-blur-md transition"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="overflow-y-auto flex-1">
              {!isEditingRecipe ? (
                /* ─── RECIPE DETAILS VIEW ─── */
                <div className="space-y-5 pb-8">
                  {/* Hero Banner */}
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
                          className="ml-auto w-8 h-8 bg-white/95 rounded-full flex items-center justify-center text-[#E05638] shadow hover:scale-105 transition"
                        >
                          <Heart className={`h-4 w-4 ${viewingRecipe.isFavorite ? 'fill-[#E05638] text-[#E05638]' : 'text-slate-400'}`} />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Top Action Row: ADD TO BOOK DROPDOWN + ADD TO PLAN + SHOPPING LIST */}
                  <div className="px-5 grid grid-cols-3 gap-2.5">
                    {/* Functional Add to Book Dropdown */}
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => setIsBookDropdownOpen(!isBookDropdownOpen)}
                        className={`w-full border font-bold text-xs py-2.5 px-3 rounded-xl transition flex items-center justify-center gap-1.5 ${
                          assignedBook
                            ? 'bg-[#E05638]/20 border-[#E05638] text-[#E05638]'
                            : 'border-[#E05638]/60 text-[#E05638] hover:bg-[#E05638]/10'
                        }`}
                      >
                        <BookmarkPlus className="h-4 w-4 shrink-0 text-[#E05638]" />
                        <span className="truncate">
                          {assignedBook ? assignedBook.title : 'Add to Book'}
                        </span>
                        <ChevronDown className="h-3 w-3 shrink-0 opacity-70 ml-0.5" />
                      </button>

                      {isBookDropdownOpen && (
                        <>
                          <div className="fixed inset-0 z-40" onClick={() => setIsBookDropdownOpen(false)} />
                          <div className="absolute left-0 top-full mt-2 w-64 bg-[#0d131f] border border-slate-700/80 rounded-2xl shadow-2xl p-2 z-50 space-y-1 animate-in fade-in">
                            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-2.5 py-1.5 flex items-center justify-between">
                              <span>Select Cookbook</span>
                              <button onClick={() => { setSelectedBook(null); setIsBookDropdownOpen(false); }} className="text-emerald-400 hover:underline">
                                Books
                              </button>
                            </div>

                            <div className="max-h-52 overflow-y-auto space-y-1 pr-1">
                              {books.length === 0 ? (
                                <div className="text-xs text-slate-500 px-2.5 py-2">No cookbooks available</div>
                              ) : (
                                books.map((b) => {
                                  const isAssigned = viewingRecipe.bookId === b.id;
                                  return (
                                    <button
                                      key={b.id}
                                      type="button"
                                      onClick={() => {
                                        handleAssignToBook(b.id);
                                        setIsBookDropdownOpen(false);
                                      }}
                                      className={`w-full text-left px-2.5 py-2 rounded-xl text-xs font-semibold flex items-center justify-between transition ${
                                        isAssigned
                                          ? 'bg-[#E05638]/20 text-[#E05638] border border-[#E05638]/30'
                                          : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                                      }`}
                                    >
                                      <span className="truncate flex-1 pr-2">{b.title}</span>
                                      {isAssigned && <Check className="h-3.5 w-3.5 text-[#E05638] shrink-0" />}
                                    </button>
                                  );
                                })
                              )}
                            </div>
                          </div>
                        </>
                      )}
                    </div>

                    {/* Functional Add to Plan Trigger */}
                    <button
                      onClick={() => setIsPlanModalOpen(true)}
                      className="border border-[#E05638]/60 text-[#E05638] font-bold text-xs py-2.5 px-3 rounded-xl transition flex items-center justify-center gap-2 hover:bg-[#E05638]/10"
                    >
                      <CalendarPlus className="h-4 w-4 text-[#E05638]" /> Add to Plan
                    </button>

                    {/* Functional Shopping List Trigger */}
                    <button
                      onClick={handleOpenShoppingModal}
                      className="border border-[#E05638]/60 text-[#E05638] font-bold text-xs py-2.5 px-3 rounded-xl transition flex items-center justify-center gap-2 hover:bg-[#E05638]/10"
                    >
                      <ShoppingCart className="h-4 w-4 text-[#E05638]" /> Shopping List
                    </button>
                  </div>

                  <div className="border-t border-slate-800/80 mx-5" />

                  {/* Servings, Timer, Edit, Share Controls */}
                  <div className="px-5 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-bold text-[#E05638] flex items-center gap-1.5">
                        <Users className="h-4 w-4" /> Servings
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
                        onClick={handleOpenEditRecipe}
                        className="border border-[#E05638]/60 text-[#E05638] font-bold text-xs px-3 py-1.5 rounded-xl transition flex items-center gap-1.5 hover:bg-[#E05638]/10"
                      >
                        <Edit3 className="h-3.5 w-3.5" /> Edit
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

                  <div className="border-t border-slate-800/80 mx-5" />

                  {/* Source Footer & Delete Action */}
                  <div className="px-5 flex items-center justify-between text-xs">
                    <div>
                      <span className="text-slate-500 block uppercase font-bold text-[10px]">Source</span>
                      {viewingRecipe.sourceUrl ? (
                        <a
                          href={viewingRecipe.sourceUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-emerald-400 font-bold hover:underline flex items-center gap-1 mt-0.5"
                        >
                          Visit {new URL(viewingRecipe.sourceUrl).hostname.replace('www.', '')} <ExternalLink className="h-3 w-3" />
                        </a>
                      ) : (
                        <span className="text-slate-400">Manual / Custom Recipe</span>
                      )}
                    </div>

                    <button
                      onClick={() => handleDeleteRecipe(viewingRecipe.id)}
                      className="bg-red-950/60 border border-red-500/40 text-red-400 px-3.5 py-2 rounded-xl font-bold flex items-center gap-1.5 hover:bg-red-900/50 transition"
                    >
                      <Trash2 className="h-3.5 w-3.5" /> Delete Recipe
                    </button>
                  </div>
                </div>
              ) : (
                /* ─── RECIPE EDIT FORM (Identical to /recipes) ─── */
                <div className="p-6 space-y-6">
                  <div className="flex justify-between items-center border-b border-slate-800 pb-3">
                    <h3 className="text-xl font-bold text-white flex items-center gap-2">
                      <Edit3 className="h-5 w-5 text-[#E05638]" /> Edit Recipe
                    </h3>
                    <button
                      onClick={() => setIsEditingRecipe(false)}
                      className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>

                  <div className="flex bg-[#070b13] p-1.5 rounded-2xl border border-slate-800">
                    {[
                      { id: 'info', label: 'Basic Info' },
                      { id: 'ingredients', label: 'Ingredients' },
                      { id: 'steps', label: 'Steps' }
                    ].map((tab) => (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => setEditRecipeTab(tab.id as any)}
                        className={`flex-1 py-2.5 text-xs font-bold rounded-xl transition ${
                          editRecipeTab === tab.id
                            ? 'bg-[#111726] text-white shadow-md border border-slate-700'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>

                  {/* TAB 1: BASIC INFO */}
                  {editRecipeTab === 'info' && (
                    <div className="space-y-5 animate-in fade-in text-xs">
                      <div className="space-y-1.5">
                        <label className="block font-bold text-[#E05638] uppercase tracking-wider text-[11px]">
                          Photo
                        </label>
                        <label className="border-2 border-dashed border-slate-700 hover:border-[#E05638] bg-[#070b13] rounded-2xl h-44 flex flex-col items-center justify-center cursor-pointer transition relative overflow-hidden group">
                          {editRecipeForm.imageUrl ? (
                            <>
                              <img
                                src={editRecipeForm.imageUrl}
                                alt="Recipe Preview"
                                className="absolute inset-0 w-full h-full object-cover"
                              />
                              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-2">
                                <span className="bg-[#111726]/90 border border-slate-700 text-white text-xs font-bold px-3 py-1.5 rounded-xl flex items-center gap-1.5">
                                  <ImagePlus className="h-4 w-4 text-[#E05638]" /> Change Photo
                                </span>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    setEditRecipeForm({ ...editRecipeForm, imageUrl: '' });
                                  }}
                                  className="bg-red-950/90 border border-red-500/50 text-red-400 text-xs font-bold px-3 py-1.5 rounded-xl hover:bg-red-900"
                                >
                                  Remove
                                </button>
                              </div>
                            </>
                          ) : (
                            <div className="text-center space-y-2">
                              <ImagePlus className="h-8 w-8 text-slate-400 mx-auto group-hover:text-[#E05638] transition" />
                              <span className="text-xs font-bold text-slate-300 block">Add a photo</span>
                            </div>
                          )}
                          <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                        </label>
                      </div>

                      <div>
                        <label className="block font-bold text-[#E05638] uppercase tracking-wider text-[11px] mb-1.5">
                          Recipe Title
                        </label>
                        <input
                          type="text"
                          required
                          value={editRecipeForm.title}
                          onChange={(e) => setEditRecipeForm({ ...editRecipeForm, title: e.target.value })}
                          className="w-full bg-[#070b13] border border-slate-800 rounded-xl p-3 text-sm text-white placeholder-slate-600 outline-none focus:border-[#E05638]"
                        />
                      </div>

                      <div>
                        <label className="block font-bold text-[#E05638] uppercase tracking-wider text-[11px] mb-1.5">
                          Description
                        </label>
                        <textarea
                          rows={3}
                          value={editRecipeForm.description}
                          onChange={(e) => setEditRecipeForm({ ...editRecipeForm, description: e.target.value })}
                          className="w-full bg-[#070b13] border border-slate-800 rounded-xl p-3 text-xs text-white placeholder-slate-600 outline-none focus:border-[#E05638] resize-y leading-relaxed"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block font-bold text-[#E05638] uppercase tracking-wider text-[11px] mb-1.5">
                            Recipe Type
                          </label>
                          <select
                            value={editRecipeForm.recipeType}
                            onChange={(e) => setEditRecipeForm({ ...editRecipeForm, recipeType: e.target.value })}
                            className="w-full bg-[#070b13] border border-slate-800 rounded-xl p-3 text-xs text-white outline-none focus:border-[#E05638]"
                          >
                            <option value="Main Dish">Main Dish</option>
                            <option value="Appetizer">Appetizer</option>
                            <option value="Dessert">Dessert</option>
                            <option value="Side Dish">Side Dish</option>
                            <option value="Beverage">Beverage</option>
                          </select>
                        </div>

                        <div>
                          <label className="block font-bold text-[#E05638] uppercase tracking-wider text-[11px] mb-1.5">
                            Servings
                          </label>
                          <input
                            type="number"
                            value={editRecipeForm.servings}
                            onChange={(e) => setEditRecipeForm({ ...editRecipeForm, servings: parseInt(e.target.value) || 1 })}
                            className="w-full bg-[#070b13] border border-slate-800 rounded-xl p-3 text-xs text-white outline-none focus:border-[#E05638]"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block font-bold text-[#E05638] uppercase tracking-wider text-[11px] mb-1.5">
                            Preparation Time (mins)
                          </label>
                          <input
                            type="number"
                            value={editRecipeForm.prepTimeMinutes}
                            onChange={(e) => setEditRecipeForm({ ...editRecipeForm, prepTimeMinutes: parseInt(e.target.value) || 0 })}
                            className="w-full bg-[#070b13] border border-slate-800 rounded-xl p-3 text-xs text-white outline-none focus:border-[#E05638]"
                          />
                        </div>

                        <div>
                          <label className="block font-bold text-[#E05638] uppercase tracking-wider text-[11px] mb-1.5">
                            Cooking Time (mins)
                          </label>
                          <input
                            type="number"
                            value={editRecipeForm.cookTimeMinutes}
                            onChange={(e) => setEditRecipeForm({ ...editRecipeForm, cookTimeMinutes: parseInt(e.target.value) || 0 })}
                            className="w-full bg-[#070b13] border border-slate-800 rounded-xl p-3 text-xs text-white outline-none focus:border-[#E05638]"
                          />
                        </div>
                      </div>

                      <div className="pt-4 border-t border-slate-800 flex justify-end gap-3">
                        <button
                          type="button"
                          onClick={() => setIsEditingRecipe(false)}
                          className="px-5 py-2.5 rounded-xl bg-slate-800 text-slate-300 font-bold hover:bg-slate-700 transition text-xs"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={handleSaveRecipeEdit}
                          className="px-6 py-2.5 rounded-xl bg-[#E05638] text-white font-bold hover:bg-[#c94529] transition shadow-lg shadow-[#E05638]/20 flex items-center gap-2 text-xs"
                        >
                          <Save className="h-4 w-4" /> Save Changes
                        </button>
                      </div>
                    </div>
                  )}

                  {/* TAB 2: INGREDIENTS */}
                  {editRecipeTab === 'ingredients' && (
                    <div className="bg-[#070b13] border border-slate-800 rounded-2xl p-5 space-y-4 animate-in fade-in text-xs">
                      <div className="flex justify-between items-center">
                        <h2 className="text-sm font-bold text-white uppercase tracking-wider text-[#E05638]">Ingredients</h2>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => setIsReorderingIngredients(!isReorderingIngredients)}
                            className={`font-bold px-3 py-1.5 rounded-lg border transition ${
                              isReorderingIngredients ? 'bg-emerald-600 text-white border-emerald-500' : 'bg-[#111726] text-slate-200 border-slate-700'
                            }`}
                          >
                            {isReorderingIngredients ? 'Done' : 'Reorder'}
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditRecipeForm({
                              ...editRecipeForm,
                              ingredients: [...editRecipeForm.ingredients, { amount: '', unit: '', item: '', category: DEFAULT_CATEGORIES[0] }]
                            })}
                            className="bg-[#E05638] text-white font-bold px-3 py-1.5 rounded-lg flex items-center gap-1 hover:bg-[#c94529] transition"
                          >
                            <Plus className="h-3.5 w-3.5" /> Add Ingredient
                          </button>
                        </div>
                      </div>

                      <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1">
                        {editRecipeForm.ingredients.map((ing: any, idx: number) => (
                          <div
                            key={idx}
                            draggable={isReorderingIngredients}
                            onDragStart={() => handleDragStart(idx)}
                            onDragOver={(e) => handleDragOver(e, idx, 'ingredients')}
                            onDrop={handleDrop}
                            className={`flex items-center gap-2 bg-[#0b0f17] p-2.5 rounded-xl border transition ${
                              isReorderingIngredients ? 'border-emerald-500/60 cursor-grab bg-[#111928]' : 'border-slate-800'
                            }`}
                          >
                            <input
                              type="text"
                              placeholder="Amt"
                              value={ing.amount}
                              onChange={(e) => {
                                const list = [...editRecipeForm.ingredients];
                                list[idx].amount = e.target.value;
                                setEditRecipeForm({ ...editRecipeForm, ingredients: list });
                              }}
                              className="w-16 bg-slate-900 border border-slate-800 rounded-lg p-2 text-center text-white placeholder-slate-700 font-bold outline-none"
                            />
                            <input
                              type="text"
                              placeholder="Unit"
                              value={ing.unit}
                              onChange={(e) => {
                                const list = [...editRecipeForm.ingredients];
                                list[idx].unit = e.target.value;
                                setEditRecipeForm({ ...editRecipeForm, ingredients: list });
                              }}
                              className="w-20 bg-slate-900 border border-slate-800 rounded-lg p-2 text-center text-slate-300 placeholder-slate-700 outline-none"
                            />
                            <input
                              type="text"
                              placeholder="Ingredient name..."
                              value={ing.item}
                              onChange={(e) => {
                                const list = [...editRecipeForm.ingredients];
                                list[idx].item = e.target.value;
                                setEditRecipeForm({ ...editRecipeForm, ingredients: list });
                              }}
                              className="flex-1 bg-transparent border-none text-white placeholder-slate-700 outline-none px-2"
                            />
                            <select
                              value={ing.category}
                              onChange={(e) => {
                                const list = [...editRecipeForm.ingredients];
                                list[idx].category = e.target.value;
                                setEditRecipeForm({ ...editRecipeForm, ingredients: list });
                              }}
                              className="w-36 bg-slate-900 border border-slate-800 rounded-lg p-2 text-[11px] text-slate-300 outline-none cursor-pointer"
                            >
                              {DEFAULT_CATEGORIES.map((cat) => (
                                <option key={cat} value={cat}>{cat}</option>
                              ))}
                            </select>

                            {isReorderingIngredients ? (
                              <div className="p-2 text-emerald-400 cursor-grab"><GripVertical className="h-4 w-4" /></div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => setEditRecipeForm({
                                  ...editRecipeForm,
                                  ingredients: editRecipeForm.ingredients.filter((_: any, i: number) => i !== idx)
                                })}
                                className="p-2 text-red-400 hover:text-red-300"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            )}
                          </div>
                        ))}
                      </div>

                      <div className="flex justify-between pt-3">
                        <button
                          type="button"
                          onClick={() => setEditRecipeTab('info')}
                          className="bg-slate-800 text-slate-300 font-bold px-5 py-2 rounded-xl text-xs hover:bg-slate-700 transition"
                        >
                          ← Back
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditRecipeTab('steps')}
                          className="bg-[#E05638] text-white font-bold px-6 py-2 rounded-xl text-xs hover:bg-[#c94529] transition shadow-md"
                        >
                          Next: Steps →
                        </button>
                      </div>
                    </div>
                  )}

                  {/* TAB 3: STEPS */}
                  {editRecipeTab === 'steps' && (
                    <div className="bg-[#070b13] border border-slate-800 rounded-2xl p-5 space-y-4 animate-in fade-in text-xs">
                      <div className="flex justify-between items-center">
                        <h2 className="text-sm font-bold text-white uppercase tracking-wider text-[#E05638]">Step-by-Step Instructions</h2>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => setIsReorderingSteps(!isReorderingSteps)}
                            className={`font-bold px-3 py-1.5 rounded-lg border transition ${
                              isReorderingSteps ? 'bg-emerald-600 text-white border-emerald-500' : 'bg-[#111726] text-slate-200 border-slate-700'
                            }`}
                          >
                            {isReorderingSteps ? 'Done' : 'Reorder'}
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditRecipeForm({
                              ...editRecipeForm,
                              instructions: [...editRecipeForm.instructions, '']
                            })}
                            className="bg-[#E05638] text-white font-bold px-3 py-1.5 rounded-lg flex items-center gap-1 hover:bg-[#c94529] transition"
                          >
                            <Plus className="h-3.5 w-3.5" /> Add Step
                          </button>
                        </div>
                      </div>

                      <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1">
                        {editRecipeForm.instructions.map((step: string, idx: number) => (
                          <div
                            key={idx}
                            draggable={isReorderingSteps}
                            onDragStart={() => handleDragStart(idx)}
                            onDragOver={(e) => handleDragOver(e, idx, 'steps')}
                            onDrop={handleDrop}
                            className={`flex items-start gap-3 bg-[#0b0f17] p-3 rounded-xl border transition ${
                              isReorderingSteps ? 'border-emerald-500/60 cursor-grab bg-[#111928]' : 'border-slate-800'
                            }`}
                          >
                            <span className="w-6 h-6 rounded-full bg-[#E05638]/20 text-[#E05638] font-bold flex items-center justify-center shrink-0 mt-1">
                              {idx + 1}
                            </span>
                            <textarea
                              rows={2}
                              placeholder={`Describe step ${idx + 1}...`}
                              value={step}
                              onChange={(e) => {
                                const list = [...editRecipeForm.instructions];
                                list[idx] = e.target.value;
                                setEditRecipeForm({ ...editRecipeForm, instructions: list });
                              }}
                              className="flex-1 bg-transparent border-none text-white placeholder-slate-700 outline-none resize-y"
                            />

                            {isReorderingSteps ? (
                              <div className="p-2 text-emerald-400 cursor-grab mt-1"><GripVertical className="h-4 w-4" /></div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => setEditRecipeForm({
                                  ...editRecipeForm,
                                  instructions: editRecipeForm.instructions.filter((_: any, i: number) => i !== idx)
                                })}
                                className="p-2 text-slate-500 hover:text-red-400 h-fit"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            )}
                          </div>
                        ))}
                      </div>

                      <div className="flex justify-between pt-3">
                        <button
                          type="button"
                          onClick={() => setEditRecipeTab('ingredients')}
                          className="bg-slate-800 text-slate-300 font-bold px-5 py-2 rounded-xl text-xs hover:bg-slate-700 transition"
                        >
                          ← Back
                        </button>
                        <button
                          type="button"
                          onClick={handleSaveRecipeEdit}
                          className="bg-[#E05638] text-white font-bold px-8 py-2.5 rounded-xl text-xs hover:bg-[#c94529] transition shadow-lg shadow-[#E05638]/20 flex items-center gap-2"
                        >
                          <Save className="h-4 w-4" /> Save Changes
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 2. ADD INGREDIENTS TO SHOPPING LIST POPUP MODAL */}
      {/* ───────────────────────────────────────────────────────────── */}
      {isShoppingModalOpen && (
        <div 
          onClick={() => setIsShoppingModalOpen(false)}
          className="fixed inset-0 bg-black/85 backdrop-blur-md z-[90] flex items-center justify-center p-3 sm:p-6 overflow-y-auto cursor-pointer"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="bg-[#0b0f17] border border-slate-800 rounded-3xl max-w-2xl w-full max-h-[85vh] flex flex-col overflow-hidden shadow-2xl p-6 space-y-5 cursor-default"
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <ShoppingCart className="h-5 w-5 text-[#E05638]" /> Add to Shopping List
                </h3>
                <p className="text-xs text-slate-400">Select or edit items to add directly to your list</p>
              </div>
              <button onClick={() => setIsShoppingModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="overflow-y-auto flex-1 space-y-3 pr-1 text-xs">
              {shoppingModalIngredients.map((ing, idx) => (
                <div key={ing.id} className="flex items-center gap-2 bg-[#070b13] p-2.5 rounded-xl border border-slate-800">
                  <div
                    onClick={() => {
                      const updated = [...shoppingModalIngredients];
                      updated[idx].selected = !updated[idx].selected;
                      setShoppingModalIngredients(updated);
                    }}
                    className={`w-5 h-5 rounded-lg border flex items-center justify-center cursor-pointer transition ${
                      ing.selected ? 'bg-[#E05638] border-[#E05638] text-white' : 'border-slate-700 bg-slate-900'
                    }`}
                  >
                    {ing.selected && <CheckSquare className="h-3.5 w-3.5" />}
                  </div>

                  <input
                    type="text"
                    value={ing.amount}
                    onChange={(e) => {
                      const updated = [...shoppingModalIngredients];
                      updated[idx].amount = e.target.value;
                      setShoppingModalIngredients(updated);
                    }}
                    className="w-16 bg-slate-900 border border-slate-800 rounded-lg p-2 text-center text-white font-bold outline-none"
                    placeholder="Amt"
                  />
                  <input
                    type="text"
                    value={ing.unit}
                    onChange={(e) => {
                      const updated = [...shoppingModalIngredients];
                      updated[idx].unit = e.target.value;
                      setShoppingModalIngredients(updated);
                    }}
                    className="w-20 bg-slate-900 border border-slate-800 rounded-lg p-2 text-center text-slate-300 outline-none"
                    placeholder="Unit"
                  />
                  <input
                    type="text"
                    value={ing.name}
                    onChange={(e) => {
                      const updated = [...shoppingModalIngredients];
                      updated[idx].name = e.target.value;
                      setShoppingModalIngredients(updated);
                    }}
                    className="flex-1 bg-transparent border-none text-white outline-none px-2"
                    placeholder="Ingredient name..."
                  />
                  <select
                    value={ing.category}
                    onChange={(e) => {
                      const updated = [...shoppingModalIngredients];
                      updated[idx].category = e.target.value;
                      setShoppingModalIngredients(updated);
                    }}
                    className="w-36 bg-slate-900 border border-slate-800 rounded-lg p-2 text-[11px] text-slate-300 outline-none cursor-pointer"
                  >
                    {DEFAULT_CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
              ))}
            </div>

            <div className="pt-3 border-t border-slate-800 flex justify-end gap-2">
              <button
                onClick={() => setIsShoppingModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 font-bold text-xs"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmAddToShoppingList}
                className="px-6 py-2 rounded-xl bg-[#E05638] text-white font-bold text-xs flex items-center gap-1.5 shadow-lg shadow-[#E05638]/20"
              >
                <ShoppingCart className="h-3.5 w-3.5" /> Add Selected to List
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 3. ADD TO MEAL PLAN MODAL */}
      {/* ───────────────────────────────────────────────────────────── */}
      {isPlanModalOpen && (
        <div 
          onClick={() => setIsPlanModalOpen(false)}
          className="fixed inset-0 bg-black/85 backdrop-blur-md z-[90] flex items-center justify-center p-4 cursor-pointer"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="bg-[#0b0e14] border border-slate-800 rounded-2xl max-w-sm w-full p-6 space-y-4 shadow-2xl text-xs cursor-default"
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-black text-white flex items-center gap-2">
                <CalendarPlus className="h-4 w-4 text-[#E05638]" /> Add to Meal Plan
              </h3>
              <button onClick={() => setIsPlanModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-slate-400 font-bold mb-1">Date</label>
                <input
                  type="date"
                  value={planDate}
                  onChange={(e) => setPlanDate(e.target.value)}
                  className="w-full bg-[#070b13] border border-slate-800 rounded-xl px-3 py-2 text-white outline-none focus:border-[#E05638]"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-bold mb-1">Meal Type</label>
                <select
                  value={planMealType}
                  onChange={(e) => setPlanMealType(e.target.value)}
                  className="w-full bg-[#070b13] border border-slate-800 rounded-xl px-3 py-2 text-white outline-none"
                >
                  <option value="Breakfast">Breakfast</option>
                  <option value="Lunch">Lunch</option>
                  <option value="Dinner">Dinner</option>
                  <option value="Snack">Snack</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-400 font-bold mb-1">Time</label>
                <input
                  type="time"
                  value={planMealTime}
                  onChange={(e) => setPlanMealTime(e.target.value)}
                  className="w-full bg-[#070b13] border border-slate-800 rounded-xl px-3 py-2 text-white outline-none"
                />
              </div>
            </div>

            <div className="pt-3 border-t border-slate-800 flex justify-end gap-2">
              <button
                onClick={() => setIsPlanModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 font-bold text-xs"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmAddToPlan}
                className="px-5 py-2 rounded-xl bg-[#E05638] text-white font-bold text-xs shadow-lg shadow-[#E05638]/20"
              >
                Schedule Meal
              </button>
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

print("✅ Recipe popup on /books is now fully functional with Add to Book, Planner, Shopping List, and Recipe Editing!")
