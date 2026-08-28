import os

# ======================================================================
# 1. Update apps/web/src/app/recipes/page.tsx & apps/web/src/app/recipe/page.tsx
# ======================================================================
recipes_page_code = """'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Search, SlidersHorizontal, Heart, Clock, Utensils,
  X, UploadCloud, BookmarkPlus, CalendarPlus, ShoppingCart,
  Timer, Edit3, Share2, Star, Check, Book, ChevronDown,
  Trash2, Save, Plus, ImagePlus, Users, Calendar,
  GripVertical, CheckSquare, CheckCircle2
} from 'lucide-react';
import { getStoredCategories } from '@/lib/categories';

export default function SavedRecipesPage() {
  const [recipes, setRecipes] = useState<any[]>([]);
  const [books, setBooks] = useState<any[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState('All');
  const [selectedRecipe, setSelectedRecipe] = useState<any | null>(null);

  // Add to Book Dropdown State
  const [isBookDropdownOpen, setIsBookDropdownOpen] = useState(false);

  // Add to Plan / Calendar Modal State
  const [showAddToPlanModal, setShowAddToPlanModal] = useState(false);
  const [planDate, setPlanDate] = useState('2026-08-28');
  const [planMealType, setPlanMealType] = useState('Dinner');
  const [planTime, setPlanTime] = useState('');
  const [planNotes, setPlanNotes] = useState('');

  // Edit Mode & Form State
  const [isEditing, setIsEditing] = useState(false);
  const [editTab, setEditTab] = useState<'info' | 'ingredients' | 'steps'>('info');
  const [editForm, setEditForm] = useState<any>({
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

  // View States & Dynamic Font Scaling
  const [servingsMultiplier, setServingsMultiplier] = useState(1);
  const [fontSizeScale, setFontSizeScale] = useState(100);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  const [noteText, setNoteText] = useState('');
  const [isNoteOpen, setIsNoteOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  // Shopping List Modal State
  const [isShoppingModalOpen, setIsShoppingModalOpen] = useState(false);
  const [shoppingModalIngredients, setShoppingModalIngredients] = useState<any[]>([]);

  const defaultBooks = [
    { id: 'book_1', title: 'Family Favorites & Weeknight Dinners', description: 'Quick and easy meals.' },
    { id: 'book_2', title: 'Authentic Asian Cuisine', description: 'Traditional recipes & stir-fries.' },
    { id: 'book_3', title: 'Baking & Desserts', description: 'Sweet treats & pastries.' }
  ];

  const defaultRecipes = [
    {
      id: 'rec_caesar',
      title: 'Caesar Salad',
      description: 'Classic crisp romaine lettuce tossed with creamy Caesar dressing, crunchy homemade garlic croutons, and shaved Parmigiano-Reggiano.',
      servings: 4,
      prepTimeMinutes: 20,
      cookTimeMinutes: 25,
      tags: ['Main Dish'],
      recipeType: 'Main Dish',
      isFavorite: true,
      isCooked: true,
      rating: 5,
      note: 'Extra shaved parmesan makes all the difference!',
      sourceUrl: '',
      imageUrl: 'https://images.unsplash.com/photo-1546793665-c74683f339c1?auto=format&fit=crop&w=800&q=80',
      bookId: 'book_3',
      ingredients: [
        { amount: '4', unit: 'cups', item: 'cubed crusty bread', category: 'Bakery' },
        { amount: '1', unit: 'Extra', item: '-virgin olive oil (for drizzling)', category: 'Pantry Staples' },
        { amount: '1', unit: 'Sea', item: 'salt (for sprinkling)', category: 'Pantry Staples' },
        { amount: '1', unit: 'cup', item: 'mayonnaise', category: 'Condiments and Sauces' },
        { amount: '1/4', unit: 'cup', item: 'extra-virgin olive oil', category: 'Pantry Staples' },
        { amount: '2', unit: 'tablespoons', item: 'fresh lemon juice', category: 'Produce' },
        { amount: '2', unit: 'teaspoons', item: 'Dijon mustard', category: 'Condiments and Sauces' },
        { amount: '1', unit: 'garlic', item: 'clove (grated)', category: 'Produce' }
      ],
      instructions: [
        'Preheat oven to 375°F (190°C). Toss cubed bread with olive oil and sea salt, then bake for 10-12 minutes until golden and crisp.',
        'In a small bowl, whisk together mayonnaise, extra-virgin olive oil, fresh lemon juice, Dijon mustard, and grated garlic until smooth and creamy.',
        'In a large salad bowl, toss chopped crisp romaine lettuce with the dressing until evenly coated.',
        'Top generously with warm garlic croutons, freshly shaved Parmesan cheese, and freshly cracked black pepper before serving.'
      ]
    }
  ];

  const loadData = () => {
    setCategories(getStoredCategories());
    try {
      const localRecipes = localStorage.getItem('zecratary_recipes') || localStorage.getItem('zecratary_saved_recipes');
      const localBooks = localStorage.getItem('zecratary_recipe_books');

      let parsedRecipes = defaultRecipes;
      if (localRecipes) {
        const parsed = JSON.parse(localRecipes);
        if (Array.isArray(parsed) && parsed.length > 0) {
          parsedRecipes = parsed;
        }
      }
      setRecipes(parsedRecipes);

      let parsedBooks = defaultBooks;
      if (localBooks) {
        const parsed = JSON.parse(localBooks);
        if (Array.isArray(parsed) && parsed.length > 0) {
          parsedBooks = parsed;
        }
      }

      const booksWithCounts = parsedBooks.map((b: any) => ({
        ...b,
        recipeCount: parsedRecipes.filter((r: any) => r.bookId === b.id).length
      }));

      setBooks(booksWithCounts);
      localStorage.setItem('zecratary_recipes', JSON.stringify(parsedRecipes));
      localStorage.setItem('zecratary_saved_recipes', JSON.stringify(parsedRecipes));
      localStorage.setItem('zecratary_recipe_books', JSON.stringify(booksWithCounts));
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();

    const handleSync = () => loadData();
    window.addEventListener('storage', handleSync);
    window.addEventListener('zecratary_recipes_updated', handleSync);
    window.addEventListener('zecratary_categories_changed', handleSync);

    return () => {
      window.removeEventListener('storage', handleSync);
      window.removeEventListener('zecratary_recipes_updated', handleSync);
      window.removeEventListener('zecratary_categories_changed', handleSync);
    };
  }, []);

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

  const toggleFavorite = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const updated = recipes.map(r => r.id === id ? { ...r, isFavorite: !r.isFavorite } : r);
    saveAllRecipes(updated);
    if (selectedRecipe?.id === id) {
      setSelectedRecipe({ ...selectedRecipe, isFavorite: !selectedRecipe.isFavorite });
    }
  };

  const toggleCooked = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const updated = recipes.map(r => r.id === id ? { ...r, isCooked: !r.isCooked } : r);
    saveAllRecipes(updated);
    if (selectedRecipe?.id === id) {
      setSelectedRecipe({ ...selectedRecipe, isCooked: !selectedRecipe.isCooked });
    }
  };

  const handleAssignToBook = (bookId: string) => {
    if (!selectedRecipe) return;
    const isRemoving = selectedRecipe.bookId === bookId;
    const targetBookId = isRemoving ? null : bookId;
    const updatedRecipe = { ...selectedRecipe, bookId: targetBookId };
    setSelectedRecipe(updatedRecipe);

    const updatedList = recipes.map(r => r.id === selectedRecipe.id ? updatedRecipe : r);
    saveAllRecipes(updatedList);

    const bookTitle = books.find(b => b.id === bookId)?.title || 'Cookbook';
    if (isRemoving) {
      alert(`Removed "${selectedRecipe.title || selectedRecipe.name}" from "${bookTitle}"`);
    } else {
      alert(`Added "${selectedRecipe.title || selectedRecipe.name}" to "${bookTitle}"!`);
    }
  };

  const openAddToPlanModal = () => {
    setPlanDate('2026-08-28');
    setPlanMealType('Dinner');
    setPlanTime('');
    setPlanNotes('');
    setShowAddToPlanModal(true);
  };

  const handleSaveToCalendar = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRecipe) return;

    const localPlan = localStorage.getItem('zecratary_meal_plan');
    const currentPlan = localPlan ? JSON.parse(localPlan) : [];

    const newPlanItem = {
      id: 'plan_' + Date.now(),
      date: planDate,
      recipeId: selectedRecipe.id,
      recipeName: selectedRecipe.title || selectedRecipe.name,
      image: selectedRecipe.imageUrl || selectedRecipe.image || 'https://images.unsplash.com/photo-1546793665-c74683f339c1?auto=format&fit=crop&w=800&q=80',
      mealType: planMealType,
      time: planTime,
      notes: planNotes,
      isLeftover: false
    };

    localStorage.setItem('zecratary_meal_plan', JSON.stringify([...currentPlan, newPlanItem]));
    window.dispatchEvent(new Event('zecratary_planner_updated'));
    window.dispatchEvent(new Event('storage'));
    setShowAddToPlanModal(false);
    alert(`Successfully scheduled "${selectedRecipe.title || selectedRecipe.name}" in your meal plan!`);
  };

  const updateSelectedRecipeState = (key: string, val: any) => {
    if (!selectedRecipe) return;
    const updatedRec = { ...selectedRecipe, [key]: val };
    setSelectedRecipe(updatedRec);
    const updatedList = recipes.map(r => r.id === updatedRec.id ? updatedRec : r);
    saveAllRecipes(updatedList);
  };

  const handleDeleteRecipe = (id: string) => {
    if (!confirm('Are you sure you want to delete this recipe?')) return;
    const updated = recipes.filter(r => r.id !== id);
    saveAllRecipes(updated);
    setSelectedRecipe(null);
    setIsEditing(false);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setEditForm((prev: any) => ({ ...prev, imageUrl: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number, type: 'ingredients' | 'steps') => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;

    if (type === 'ingredients') {
      const list = [...editForm.ingredients];
      const item = list[draggedIndex];
      list.splice(draggedIndex, 1);
      list.splice(index, 0, item);
      setEditForm({ ...editForm, ingredients: list });
      setDraggedIndex(index);
    } else {
      const list = [...editForm.instructions];
      const item = list[draggedIndex];
      list.splice(draggedIndex, 1);
      list.splice(index, 0, item);
      setEditForm({ ...editForm, instructions: list });
      setDraggedIndex(index);
    }
  };

  const handleDrop = () => {
    setDraggedIndex(null);
  };

  const handleOpenEdit = () => {
    if (!selectedRecipe) return;
    const defaultCat = categories[0] || 'Produce';
    setEditForm({
      title: selectedRecipe.title || selectedRecipe.name || '',
      description: selectedRecipe.description || '',
      recipeType: selectedRecipe.recipeType || selectedRecipe.tags?.[0] || 'Main Dish',
      servings: selectedRecipe.servings || 4,
      prepTimeMinutes: selectedRecipe.prepTimeMinutes || 15,
      cookTimeMinutes: selectedRecipe.cookTimeMinutes || 30,
      imageUrl: selectedRecipe.imageUrl || selectedRecipe.image || '',
      ingredients: selectedRecipe.ingredients
        ? selectedRecipe.ingredients.map((ing: any) => ({
            amount: typeof ing === 'string' ? '' : ing.amount || ing.quantity || '',
            unit: typeof ing === 'string' ? '' : ing.unit || '',
            item: typeof ing === 'string' ? ing : ing.item || ing.name || '',
            category: typeof ing === 'string' ? defaultCat : ing.category || defaultCat
          }))
        : [{ amount: '', unit: '', item: '', category: defaultCat }],
      instructions: selectedRecipe.instructions && selectedRecipe.instructions.length > 0
        ? [...selectedRecipe.instructions]
        : ['']
    });
    setEditTab('info');
    setIsReorderingIngredients(false);
    setIsReorderingSteps(false);
    setIsEditing(true);
  };

  const handleSaveEdit = () => {
    if (!editForm.title.trim()) {
      alert('Please enter a recipe title.');
      setEditTab('info');
      return;
    }

    const updatedRec = {
      ...selectedRecipe,
      ...editForm,
      tags: [editForm.recipeType]
    };

    setSelectedRecipe(updatedRec);
    const updatedList = recipes.map(r => r.id === updatedRec.id ? updatedRec : r);
    saveAllRecipes(updatedList);
    setIsEditing(false);
  };

  const handleOpenShoppingModal = () => {
    if (!selectedRecipe) return;
    const defaultCat = categories[0] || 'Produce';
    const items = (selectedRecipe.ingredients || []).map((ing: any, idx: number) => ({
      id: 'shop_item_' + idx,
      selected: true,
      amount: typeof ing === 'string' ? '' : ing.amount || ing.quantity || '',
      unit: typeof ing === 'string' ? '' : ing.unit || '',
      name: typeof ing === 'string' ? ing : ing.item || ing.name || '',
      category: typeof ing === 'string' ? defaultCat : ing.category || defaultCat
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
    alert(`Added ${selectedItems.length} items to your Shopping List!`);
  };

  const filtered = recipes.filter(r => {
    const q = search.toLowerCase().trim();
    const title = (r.title || r.name || '').toLowerCase();
    if (q && !title.includes(q)) return false;
    if (activeFilter === 'Favorites') return Boolean(r.isFavorite);
    if (activeFilter === 'Main Dish') return (r.tags?.includes('Main Dish') || r.recipeType === 'Main Dish');
    if (activeFilter === 'Cooked') return Boolean(r.isCooked);
    if (activeFilter === 'Top Rated') return (r.rating || 0) >= 4;
    return true;
  });

  const assignedBook = books.find(b => b.id === selectedRecipe?.bookId);
  const computedFontSize = `${(fontSizeScale / 100) * 0.875}rem`;
  const computedLineHeight = `${(fontSizeScale / 100) * 1.35}rem`;

  return (
    <div className="max-w-6xl mx-auto space-y-6 text-slate-100 pb-16 px-4">
      {/* Top Header */}
      <div className="flex items-center justify-between pt-2">
        <div>
          <h1 className="text-3xl font-black text-[#E05638] tracking-tight">Saved Recipes</h1>
          <p className="text-emerald-400 text-xs mt-1 font-semibold">Your collection of favorite recipes ({recipes.length})</p>
        </div>
        <Link
          href="/manual"
          className="bg-[#E05638] hover:bg-[#c94529] text-white font-bold text-xs px-4 py-2.5 rounded-xl transition flex items-center gap-2 shadow-lg shadow-[#E05638]/20"
        >
          <UploadCloud className="h-4 w-4" /> Create Recipe
        </Link>
      </div>

      {/* Search & Filters */}
      <div className="space-y-3">
        <div className="flex gap-3">
          <div className="relative flex-1">
            <Search className="h-4 w-4 text-slate-500 absolute left-3.5 top-3.5" />
            <input
              type="text"
              placeholder="Search by name or ingredient..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-[#070b13] border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-slate-500 outline-none focus:border-[#E05638]"
            />
          </div>
          <button className="border border-slate-800 font-bold text-xs px-4 py-2.5 rounded-xl flex items-center gap-1.5 bg-[#070b13] text-emerald-400">
            <SlidersHorizontal className="h-4 w-4" /> Filter
          </button>
        </div>

        <div className="flex flex-wrap gap-2 text-xs">
          {['All', 'Favorites', 'Main Dish', 'Cooked', 'Top Rated'].map((filter) => (
            <button
              key={filter}
              onClick={() => setActiveFilter(filter)}
              className={`px-3.5 py-1.5 rounded-full font-semibold border transition ${
                activeFilter === filter
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                  : 'bg-[#070b13] text-slate-400 border-slate-800 hover:text-white'
              }`}
            >
              {filter}
            </button>
          ))}
        </div>
      </div>

      {/* Recipe Grid */}
      {loading ? (
        <div className="text-slate-500 text-xs py-12 text-center">Loading recipes...</div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((r) => {
            const cardBook = books.find(b => b.id === r.bookId);
            return (
              <div
                key={r.id}
                onClick={() => {
                  setSelectedRecipe(r);
                  setServingsMultiplier(1);
                  setCompletedSteps([]);
                  setNoteText(r.note || '');
                  setIsBookDropdownOpen(false);
                  setIsEditing(false);
                }}
                className="bg-[#070b13] border border-slate-800 hover:border-slate-700 rounded-2xl overflow-hidden transition cursor-pointer group shadow-lg relative"
              >
                <div className="relative h-44 w-full bg-slate-800 overflow-hidden">
                  <img
                    src={r.imageUrl || r.image || 'https://images.unsplash.com/photo-1546793665-c74683f339c1?auto=format&fit=crop&w=800&q=80'}
                    alt={r.title || r.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                  />
                  
                  {/* Top-Right Action Buttons */}
                  <div className="absolute top-3 right-3 flex items-center gap-1.5 z-10" onClick={(e) => e.stopPropagation()}>
                    <button
                      type="button"
                      onClick={(e) => toggleCooked(e, r.id)}
                      className={`p-2 rounded-full backdrop-blur-md transition shadow-md ${
                        r.isCooked 
                          ? 'bg-emerald-600/90 hover:bg-emerald-500 text-white' 
                          : 'bg-black/60 hover:bg-black/80 text-slate-400 hover:text-white'
                      }`}
                      title={r.isCooked ? "Marked as Cooked (Click to undo)" : "Mark as Cooked"}
                    >
                      <CheckCircle2 className={`h-4 w-4 ${r.isCooked ? 'text-white' : 'text-slate-300'}`} />
                    </button>

                    <button
                      type="button"
                      onClick={(e) => toggleFavorite(e, r.id)}
                      className="p-2 bg-black/60 hover:bg-black/80 backdrop-blur-md rounded-full text-white hover:text-[#E05638] transition shadow-md"
                      title="Favorite"
                    >
                      <Heart className={`h-4 w-4 ${r.isFavorite ? 'fill-[#E05638] text-[#E05638]' : 'text-white'}`} />
                    </button>
                  </div>

                  {cardBook && (
                    <div className="absolute bottom-3 left-3 bg-black/75 backdrop-blur-md text-[10px] text-amber-300 font-bold px-2.5 py-1 rounded-full flex items-center gap-1 border border-amber-400/30">
                      <Book className="h-3 w-3" /> {cardBook.title}
                    </div>
                  )}
                </div>

                <div className="p-4 space-y-2">
                  <h3 className="font-bold text-white text-base leading-snug">{r.title || r.name}</h3>
                  
                  <div className="flex items-center justify-between pt-1">
                    <div className="flex items-center gap-2">
                      <span className="bg-[#E05638] text-white text-[10px] font-bold px-2.5 py-0.5 rounded-full">
                        {r.tags?.[0] || r.recipeType || 'Main Dish'}
                      </span>

                      {(r.rating || 0) > 0 ? (
                        <span className="flex items-center gap-1 text-amber-400 text-xs font-bold bg-amber-400/10 px-2 py-0.5 rounded-md border border-amber-400/20 shadow-xs">
                          <Star className="h-3 w-3 fill-amber-400 text-amber-400" /> {r.rating}
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-slate-500 text-[11px] font-medium">
                          <Star className="h-3 w-3 text-slate-600" /> 0
                        </span>
                      )}
                    </div>

                    <span className="text-xs text-slate-400 flex items-center gap-1">
                      <Clock className="h-3 w-3" /> {(r.prepTimeMinutes || 15) + (r.cookTimeMinutes || 10)}m
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 1. RECIPE DETAILS & EDIT MODAL (CLICK OUTSIDE CLOSES) */}
      {selectedRecipe && (
        <div 
          onClick={() => { setSelectedRecipe(null); setIsEditing(false); setIsBookDropdownOpen(false); }}
          className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-3 sm:p-6 overflow-y-auto cursor-pointer"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="bg-[#0c111d] border border-slate-800 rounded-3xl max-w-3xl w-full max-h-[92vh] flex flex-col overflow-hidden shadow-2xl relative cursor-default"
          >
            <button
              onClick={() => { setSelectedRecipe(null); setIsEditing(false); setIsBookDropdownOpen(false); }}
              className="absolute top-4 right-4 z-30 p-2 bg-black/70 hover:bg-black text-slate-300 hover:text-white rounded-xl border border-slate-700/60 transition"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="overflow-y-auto flex-1">
              {!isEditing ? (
                /* RECIPE DETAILS VIEW */
                <div className="space-y-5 pb-6">
                  {/* Hero Banner */}
                  <div className="relative h-64 sm:h-72 w-full bg-slate-900 overflow-hidden flex flex-col justify-end p-5">
                    <img
                      src={selectedRecipe.imageUrl || selectedRecipe.image || 'https://images.unsplash.com/photo-1546793665-c74683f339c1?auto=format&fit=crop&w=1000&q=80'}
                      alt={selectedRecipe.title || selectedRecipe.name}
                      className="absolute inset-0 w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#0c111d] via-[#0c111d]/60 to-transparent" />

                    <div className="relative z-10 space-y-3">
                      <h2 className="text-2xl sm:text-3xl font-black text-white leading-tight">
                        {selectedRecipe.title || selectedRecipe.name}
                      </h2>

                      <div className="flex flex-wrap items-center gap-2 text-xs font-semibold">
                        <span className="bg-[#111726]/90 border border-slate-700/80 text-slate-200 px-3 py-1.5 rounded-full flex items-center gap-1.5">
                          <Clock className="h-3.5 w-3.5 text-slate-300" /> Cook: {selectedRecipe.cookTimeMinutes || 30} minutes
                        </span>
                        <span className="bg-[#111726]/90 border border-slate-700/80 text-slate-200 px-3 py-1.5 rounded-full flex items-center gap-1.5">
                          <Clock className="h-3.5 w-3.5 text-slate-300" /> Prep: {selectedRecipe.prepTimeMinutes || 15} minutes
                        </span>
                        <span className="bg-[#111726]/90 border border-slate-700/80 text-slate-200 px-3 py-1.5 rounded-full flex items-center gap-1.5">
                          <Utensils className="h-3.5 w-3.5 text-slate-300" /> {selectedRecipe.tags?.[0] || selectedRecipe.recipeType || 'Main Dish'}
                        </span>
                        
                        <button
                          onClick={(e) => toggleFavorite(e, selectedRecipe.id)}
                          className="ml-auto w-8 h-8 bg-white/95 rounded-full flex items-center justify-center text-[#E05638] shadow"
                        >
                          <Heart className={`h-4 w-4 ${selectedRecipe.isFavorite ? 'fill-[#E05638] text-[#E05638]' : 'text-slate-400'}`} />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Top Action Row */}
                  <div className="px-5 grid grid-cols-3 gap-2.5">
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
                          <div className="absolute left-0 top-full mt-2 w-64 bg-[#0d131f] border border-slate-700/80 rounded-2xl shadow-2xl p-2 z-50 space-y-1 animate-in fade-in" onClick={(e) => e.stopPropagation()}>
                            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-2.5 py-1.5 flex items-center justify-between">
                              <span>Select Cookbook</span>
                              <Link href="/books" className="text-emerald-400 hover:underline">Manage</Link>
                            </div>

                            <div className="max-h-52 overflow-y-auto space-y-1 pr-1">
                              {books.length === 0 ? (
                                <div className="text-xs text-slate-500 px-2.5 py-2">No cookbooks available</div>
                              ) : (
                                books.map((b) => {
                                  const isAssigned = selectedRecipe.bookId === b.id;
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

                    <button
                      type="button"
                      onClick={openAddToPlanModal}
                      className="border border-[#E05638]/60 text-[#E05638] font-bold text-xs py-2.5 px-3 rounded-xl transition flex items-center justify-center gap-2 hover:bg-[#E05638]/10"
                    >
                      <CalendarPlus className="h-4 w-4 text-[#E05638]" /> Add to Plan
                    </button>

                    <button
                      onClick={handleOpenShoppingModal}
                      className="border border-[#E05638]/60 text-[#E05638] font-bold text-xs py-2.5 px-3 rounded-xl transition flex items-center justify-center gap-2 hover:bg-[#E05638]/10"
                    >
                      <ShoppingCart className="h-4 w-4 text-[#E05638]" /> Shopping List
                    </button>
                  </div>

                  <div className="border-t border-slate-800/80 mx-5" />

                  {/* Servings Stepper & Tools */}
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
                          {(selectedRecipe.servings || 4) * servingsMultiplier}
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
                        onClick={handleOpenEdit}
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
                    {selectedRecipe.description}
                  </div>

                  <div className="border-t border-slate-800/80 mx-5" />

                  {/* Cooked Status Column */}
                  <div className="px-5 space-y-3">
                    <div className="flex items-center justify-between">
                      <button
                        type="button"
                        onClick={() => updateSelectedRecipeState('isCooked', !selectedRecipe.isCooked)}
                        className="flex items-center gap-2.5 text-base font-extrabold text-white group cursor-pointer select-none transition"
                      >
                        <span className={selectedRecipe.isCooked ? "text-white font-extrabold tracking-tight" : "text-slate-200"}>
                          {selectedRecipe.isCooked ? "Cooked" : "Mark as Cooked"}
                        </span>
                        
                        <span className={`w-5 h-5 rounded-full flex items-center justify-center transition shadow-sm ${
                          selectedRecipe.isCooked 
                            ? 'bg-[#22c55e] text-white' 
                            : 'border border-slate-600 bg-transparent text-transparent'
                        }`}>
                          {selectedRecipe.isCooked && <Check className="h-3.5 w-3.5 stroke-[3]" />}
                        </span>
                      </button>

                      <div className="flex items-center gap-1">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star
                            key={star}
                            onClick={() => updateSelectedRecipeState('rating', star)}
                            className={`h-5 w-5 cursor-pointer transition ${
                              (selectedRecipe.rating || 0) >= star
                                ? 'fill-[#E05638] text-[#E05638]'
                                : 'text-slate-700 hover:text-slate-500'
                            }`}
                          />
                        ))}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <button
                        type="button"
                        onClick={() => setIsNoteOpen(!isNoteOpen)}
                        className="flex items-center gap-1.5 text-xs font-medium text-slate-400 hover:text-slate-200 transition"
                      >
                        <Edit3 className="h-3.5 w-3.5 text-slate-400" />
                        <span className="italic">Add a note</span>
                      </button>

                      {isNoteOpen && (
                        <div className="flex gap-2 animate-in fade-in">
                          <input
                            type="text"
                            placeholder="Add notes..."
                            value={noteText}
                            onChange={(e) => setNoteText(e.target.value)}
                            className="flex-1 bg-[#070b13] border border-slate-800 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-[#E05638]"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              updateSelectedRecipeState('note', noteText);
                              setIsNoteOpen(false);
                            }}
                            className="bg-[#E05638] hover:bg-[#c94529] text-white font-bold text-xs px-3.5 py-2 rounded-xl transition"
                          >
                            Save
                          </button>
                        </div>
                      )}
                      {selectedRecipe.note && !isNoteOpen && (
                        <p className="text-xs text-emerald-400 italic">Note: "{selectedRecipe.note}"</p>
                      )}
                    </div>
                  </div>

                  <div className="border-t border-slate-800/80 mx-5" />

                  {/* INGREDIENTS & INSTRUCTIONS WITH REAL-TIME FONT RESIZING */}
                  <div className="px-5 space-y-6">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                      <h3 className="text-base font-extrabold text-white">Ingredients</h3>
                      
                      <div className="flex items-center bg-[#070b13] border border-slate-700/80 rounded-lg text-xs overflow-hidden shadow-sm">
                        <button
                          type="button"
                          onClick={() => setFontSizeScale(prev => Math.max(70, prev - 10))}
                          className="px-2.5 py-1 text-slate-300 hover:text-white hover:bg-slate-800 transition font-bold"
                          title="Decrease font size"
                        >
                          -
                        </button>
                        <span className="px-3 py-1 font-bold text-slate-200 border-x border-slate-800 select-none bg-[#0b0e14]">
                          {fontSizeScale}%
                        </span>
                        <button
                          type="button"
                          onClick={() => setFontSizeScale(prev => Math.min(160, prev + 10))}
                          className="px-2.5 py-1 text-slate-300 hover:text-white hover:bg-slate-800 transition font-bold"
                          title="Increase font size"
                        >
                          +
                        </button>
                      </div>
                    </div>

                    <div 
                      className="grid md:grid-cols-2 gap-x-8 gap-y-3 transition-all duration-150"
                      style={{ fontSize: computedFontSize, lineHeight: computedLineHeight }}
                    >
                      {Array.isArray(selectedRecipe.ingredients) && selectedRecipe.ingredients.map((ing: any, idx: number) => {
                        const amt = typeof ing === 'string' ? '' : ing.amount || ing.quantity || '';
                        const unit = typeof ing === 'string' ? '' : ing.unit || '';
                        const name = typeof ing === 'string' ? ing : ing.item || ing.name || '';
                        return (
                          <div key={idx} className="flex items-start gap-2.5 py-0.5">
                            <span 
                              className="rounded-full bg-[#E05638] shrink-0" 
                              style={{ 
                                width: `${(fontSizeScale / 100) * 0.45}rem`, 
                                height: `${(fontSizeScale / 100) * 0.45}rem`,
                                marginTop: `${(fontSizeScale / 100) * 0.45}rem`
                              }}
                            />
                            <span className="text-slate-200">
                              {(amt || unit) && (
                                <strong className="text-white font-bold">
                                  {amt} {unit && unit !== 'Unit' ? unit : ''}{' '}
                                </strong>
                              )}
                              {name}
                            </span>
                          </div>
                        );
                      })}
                    </div>

                    <div className="space-y-3 pt-3 border-t border-slate-800/80">
                      <h3 className="text-base font-extrabold text-white">Instructions</h3>
                      
                      <div 
                        className="space-y-2.5 transition-all duration-150"
                        style={{ fontSize: computedFontSize, lineHeight: computedLineHeight }}
                      >
                        {Array.isArray(selectedRecipe.instructions) && selectedRecipe.instructions.map((step: string, idx: number) => {
                          const isDone = completedSteps.includes(idx);
                          return (
                            <div
                              key={idx}
                              onClick={() => {
                                if (completedSteps.includes(idx)) {
                                  setCompletedSteps(completedSteps.filter(i => i !== idx));
                                } else {
                                  setCompletedSteps([...completedSteps, idx]);
                                }
                              }}
                              className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition select-none ${
                                isDone 
                                  ? 'bg-[#070b13]/50 border-slate-800/60 opacity-50 line-through' 
                                  : 'bg-[#070b13] border-slate-800 hover:border-slate-700'
                              }`}
                            >
                              <span className="font-extrabold text-[#E05638] shrink-0">{idx + 1}.</span>
                              <span className="text-slate-200 flex-1 leading-relaxed">{step}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  <div className="border-t border-slate-800/80 mx-5" />

                  {/* Delete Option */}
                  <div className="px-5 flex items-center justify-end text-xs">
                    <button
                      onClick={() => handleDeleteRecipe(selectedRecipe.id)}
                      className="bg-red-950/60 border border-red-500/40 text-red-400 px-3.5 py-2 rounded-xl font-bold flex items-center gap-1.5 hover:bg-red-900/50"
                    >
                      <Trash2 className="h-3.5 w-3.5" /> Delete Recipe
                    </button>
                  </div>
                </div>
              ) : (
                /* EDIT RECIPE MODAL */
                <div className="p-6 space-y-6">
                  <div className="flex justify-between items-center border-b border-slate-800 pb-3">
                    <h3 className="text-xl font-bold text-white flex items-center gap-2">
                      <Edit3 className="h-5 w-5 text-[#E05638]" /> Edit Recipe
                    </h3>
                    <button
                      onClick={() => setIsEditing(false)}
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
                        onClick={() => setEditTab(tab.id as any)}
                        className={`flex-1 py-2.5 text-xs font-bold rounded-xl transition ${
                          editTab === tab.id
                            ? 'bg-[#111726] text-white shadow-md border border-slate-700'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>

                  {/* TAB 1: BASIC INFO */}
                  {editTab === 'info' && (
                    <div className="space-y-5 animate-in fade-in text-xs">
                      <div className="space-y-1.5">
                        <label className="block font-bold text-[#E05638] uppercase tracking-wider text-[11px]">
                          Photo
                        </label>
                        <label className="border-2 border-dashed border-slate-700 hover:border-[#E05638] bg-[#070b13] rounded-2xl h-44 flex flex-col items-center justify-center cursor-pointer transition relative overflow-hidden group">
                          {editForm.imageUrl ? (
                            <>
                              <img
                                src={editForm.imageUrl}
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
                                    setEditForm({ ...editForm, imageUrl: '' });
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
                          value={editForm.title}
                          onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                          className="w-full bg-[#070b13] border border-slate-800 rounded-xl p-3 text-sm text-white placeholder-slate-600 outline-none focus:border-[#E05638]"
                        />
                      </div>

                      <div>
                        <label className="block font-bold text-[#E05638] uppercase tracking-wider text-[11px] mb-1.5">
                          Description
                        </label>
                        <textarea
                          rows={3}
                          value={editForm.description}
                          onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                          className="w-full bg-[#070b13] border border-slate-800 rounded-xl p-3 text-xs text-white placeholder-slate-600 outline-none focus:border-[#E05638] resize-y leading-relaxed"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block font-bold text-[#E05638] uppercase tracking-wider text-[11px] mb-1.5">
                            Recipe Type
                          </label>
                          <select
                            value={editForm.recipeType}
                            onChange={(e) => setEditForm({ ...editForm, recipeType: e.target.value })}
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
                            value={editForm.servings}
                            onChange={(e) => setEditForm({ ...editForm, servings: parseInt(e.target.value) || 1 })}
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
                            value={editForm.prepTimeMinutes}
                            onChange={(e) => setEditForm({ ...editForm, prepTimeMinutes: parseInt(e.target.value) || 0 })}
                            className="w-full bg-[#070b13] border border-slate-800 rounded-xl p-3 text-xs text-white outline-none focus:border-[#E05638]"
                          />
                        </div>

                        <div>
                          <label className="block font-bold text-[#E05638] uppercase tracking-wider text-[11px] mb-1.5">
                            Cooking Time (mins)
                          </label>
                          <input
                            type="number"
                            value={editForm.cookTimeMinutes}
                            onChange={(e) => setEditForm({ ...editForm, cookTimeMinutes: parseInt(e.target.value) || 0 })}
                            className="w-full bg-[#070b13] border border-slate-800 rounded-xl p-3 text-xs text-white outline-none focus:border-[#E05638]"
                          />
                        </div>
                      </div>

                      <div className="pt-4 border-t border-slate-800 flex justify-end gap-3">
                        <button
                          type="button"
                          onClick={() => setIsEditing(false)}
                          className="px-5 py-2.5 rounded-xl bg-slate-800 text-slate-300 font-bold hover:bg-slate-700 transition text-xs"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={handleSaveEdit}
                          className="px-6 py-2.5 rounded-xl bg-[#E05638] text-white font-bold hover:bg-[#c94529] transition shadow-lg shadow-[#E05638]/20 flex items-center gap-2 text-xs"
                        >
                          <Save className="h-4 w-4" /> Save Changes
                        </button>
                      </div>
                    </div>
                  )}

                  {/* TAB 2: INGREDIENTS */}
                  {editTab === 'ingredients' && (
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
                            onClick={() => setEditForm({
                              ...editForm,
                              ingredients: [...editForm.ingredients, { amount: '', unit: '', item: '', category: categories[0] || 'Pantry Staples' }]
                            })}
                            className="bg-[#E05638] text-white font-bold px-3 py-1.5 rounded-lg flex items-center gap-1 hover:bg-[#c94529] transition"
                          >
                            <Plus className="h-3.5 w-3.5" /> Add Ingredient
                          </button>
                        </div>
                      </div>

                      <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1">
                        {editForm.ingredients.map((ing: any, idx: number) => (
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
                                const list = [...editForm.ingredients];
                                list[idx].amount = e.target.value;
                                setEditForm({ ...editForm, ingredients: list });
                              }}
                              className="w-16 bg-slate-900 border border-slate-800 rounded-lg p-2 text-center text-white placeholder-slate-700 font-bold outline-none"
                            />
                            <input
                              type="text"
                              placeholder="Unit"
                              value={ing.unit}
                              onChange={(e) => {
                                const list = [...editForm.ingredients];
                                list[idx].unit = e.target.value;
                                setEditForm({ ...editForm, ingredients: list });
                              }}
                              className="w-20 bg-slate-900 border border-slate-800 rounded-lg p-2 text-center text-slate-300 placeholder-slate-700 outline-none"
                            />
                            <input
                              type="text"
                              placeholder="Ingredient name..."
                              value={ing.item}
                              onChange={(e) => {
                                const list = [...editForm.ingredients];
                                list[idx].item = e.target.value;
                                setEditForm({ ...editForm, ingredients: list });
                              }}
                              className="flex-1 bg-transparent border-none text-white placeholder-slate-700 outline-none px-2"
                            />
                            <select
                              value={ing.category}
                              onChange={(e) => {
                                const list = [...editForm.ingredients];
                                list[idx].category = e.target.value;
                                setEditForm({ ...editForm, ingredients: list });
                              }}
                              className="w-36 bg-slate-900 border border-slate-800 rounded-lg p-2 text-[11px] text-slate-300 outline-none cursor-pointer"
                            >
                              {categories.map((cat) => (
                                <option key={cat} value={cat}>{cat}</option>
                              ))}
                            </select>

                            {isReorderingIngredients ? (
                              <div className="p-2 text-emerald-400 cursor-grab"><GripVertical className="h-4 w-4" /></div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => setEditForm({
                                  ...editForm,
                                  ingredients: editForm.ingredients.filter((_: any, i: number) => i !== idx)
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
                          onClick={() => setEditTab('info')}
                          className="bg-slate-800 text-slate-300 font-bold px-5 py-2 rounded-xl text-xs hover:bg-slate-700 transition"
                        >
                          ← Back
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditTab('steps')}
                          className="bg-[#E05638] text-white font-bold px-6 py-2 rounded-xl text-xs hover:bg-[#c94529] transition shadow-md"
                        >
                          Next: Steps →
                        </button>
                      </div>
                    </div>
                  )}

                  {/* TAB 3: STEPS */}
                  {editTab === 'steps' && (
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
                            onClick={() => setEditForm({
                              ...editForm,
                              instructions: [...editForm.instructions, '']
                            })}
                            className="bg-[#E05638] text-white font-bold px-3 py-1.5 rounded-lg flex items-center gap-1 hover:bg-[#c94529] transition"
                          >
                            <Plus className="h-3.5 w-3.5" /> Add Step
                          </button>
                        </div>
                      </div>

                      <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1">
                        {editForm.instructions.map((step: string, idx: number) => (
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
                                const list = [...editForm.instructions];
                                list[idx] = e.target.value;
                                setEditForm({ ...editForm, instructions: list });
                              }}
                              className="flex-1 bg-transparent border-none text-white placeholder-slate-700 outline-none resize-y"
                            />

                            {isReorderingSteps ? (
                              <div className="p-2 text-emerald-400 cursor-grab mt-1"><GripVertical className="h-4 w-4" /></div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => setEditForm({
                                  ...editForm,
                                  instructions: editForm.instructions.filter((_: any, i: number) => i !== idx)
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
                          onClick={() => setEditTab('ingredients')}
                          className="bg-slate-800 text-slate-300 font-bold px-5 py-2 rounded-xl text-xs hover:bg-slate-700 transition"
                        >
                          ← Back
                        </button>
                        <button
                          type="button"
                          onClick={handleSaveEdit}
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

      {/* 2. ADD TO PLAN / CALENDAR MODAL (CLICK OUTSIDE CLOSES) */}
      {showAddToPlanModal && selectedRecipe && (
        <div 
          onClick={() => setShowAddToPlanModal(false)}
          className="fixed inset-0 bg-black/85 backdrop-blur-md z-[70] flex items-center justify-center p-4 cursor-pointer"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="bg-[#0f1115] border border-slate-800/90 rounded-2xl max-w-sm w-full p-6 space-y-4 shadow-2xl relative text-xs animate-in fade-in cursor-default"
          >
            <button 
              onClick={() => setShowAddToPlanModal(false)} 
              className="absolute top-4 right-4 p-2 bg-[#1e2430] hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg transition"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="pr-6 space-y-1">
              <h2 className="text-xl font-black text-[#E05638] tracking-tight">Add to Calendar</h2>
              <p className="text-xs text-slate-400 leading-snug">
                Schedule {selectedRecipe.title || selectedRecipe.name} in your meal plan
              </p>
            </div>

            <form onSubmit={handleSaveToCalendar} className="space-y-4 pt-1">
              <div>
                <label className="block text-xs font-bold text-[#E05638] mb-1.5">Date</label>
                <div className="relative flex items-center">
                  <Calendar className="h-4 w-4 text-[#E05638] absolute left-3.5 pointer-events-none" />
                  <input
                    type="date"
                    required
                    value={planDate}
                    onChange={(e) => setPlanDate(e.target.value)}
                    className="w-full bg-[#07090e] border border-slate-800 hover:border-slate-700 rounded-xl pl-10 pr-3 py-2.5 text-xs text-[#E05638] font-semibold outline-none focus:border-[#E05638] cursor-pointer"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#E05638] mb-1.5">Meal Type</label>
                <div className="relative flex items-center">
                  <select
                    value={planMealType}
                    onChange={(e) => setPlanMealType(e.target.value)}
                    className="w-full bg-[#07090e] border border-slate-800 hover:border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-slate-200 outline-none focus:border-[#E05638] cursor-pointer appearance-none"
                  >
                    <option value="Breakfast">Breakfast</option>
                    <option value="Lunch">Lunch</option>
                    <option value="Dinner">Dinner</option>
                    <option value="Snack">Snack</option>
                  </select>
                  <ChevronDown className="h-4 w-4 text-slate-400 absolute right-3 pointer-events-none" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#E05638] mb-1.5">Time</label>
                <div className="relative flex items-center">
                  <Clock className="h-4 w-4 text-slate-400 absolute left-3.5 pointer-events-none" />
                  <input
                    type="time"
                    value={planTime}
                    onChange={(e) => setPlanTime(e.target.value)}
                    className="w-full bg-[#07090e] border border-slate-800 hover:border-slate-700 rounded-xl px-10 py-2.5 text-xs text-slate-200 outline-none focus:border-[#E05638]"
                    placeholder="--:-- --"
                  />
                  <Clock className="h-4 w-4 text-[#E05638] absolute right-3.5 pointer-events-none" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#E05638] mb-1.5">Notes</label>
                <textarea
                  value={planNotes}
                  onChange={(e) => setPlanNotes(e.target.value)}
                  placeholder="Add any notes or reminders..."
                  rows={3}
                  className="w-full bg-[#07090e] border border-slate-800 hover:border-slate-700 rounded-xl p-3 text-xs text-slate-200 placeholder-slate-500 outline-none focus:border-[#E05638] resize-none"
                />
              </div>

              <div className="flex justify-end gap-2.5 pt-3">
                <button
                  type="button"
                  onClick={() => setShowAddToPlanModal(false)}
                  className="px-5 py-2.5 rounded-xl border border-emerald-900/80 hover:bg-emerald-950/20 text-[#E05638] font-bold text-xs transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-[#E05638] hover:bg-[#c94529] text-white font-bold text-xs transition shadow-md"
                >
                  Add to Calendar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 3. SHOPPING LIST MODAL (CLICK OUTSIDE CLOSES) */}
      {isShoppingModalOpen && (
        <div 
          onClick={() => setIsShoppingModalOpen(false)}
          className="fixed inset-0 bg-black/85 backdrop-blur-md z-[60] flex items-center justify-center p-3 sm:p-6 overflow-y-auto cursor-pointer"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="bg-[#0c111d] border border-slate-800 rounded-3xl max-w-2xl w-full max-h-[85vh] flex flex-col overflow-hidden shadow-2xl p-6 space-y-5 cursor-default"
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
                    {categories.map((cat) => (
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
                className="px-6 py-2 rounded-xl bg-[#E05638] text-white font-bold text-xs flex items-center gap-1.5"
              >
                <ShoppingCart className="h-3.5 w-3.5" /> Add Selected to List
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
"""

for path in ["apps/web/src/app/recipes/page.tsx", "apps/web/src/app/recipe/page.tsx"]:
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        f.write(recipes_page_code)

# ======================================================================
# 2. Update apps/web/src/app/planner/page.tsx
# ======================================================================
planner_code = """'use client';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  Calendar as CalendarIcon, Copy, ShoppingBag, Share2, 
  ChevronLeft, ChevronRight, Plus, Trash2, ChefHat, Lock, 
  Clock, X, Search, Heart, SlidersHorizontal, ChevronDown, 
  ChevronUp, Edit3, Check, CheckSquare
} from 'lucide-react';

export default function PlannerPage() {
  const router = useRouter();
  const [currentWeekStart, setCurrentWeekStart] = useState(new Date('2026-08-24'));
  const [selectedDate, setSelectedDate] = useState('2026-08-28');
  const [plannedMeals, setPlannedMeals] = useState<any[]>([]);
  const [savedRecipes, setSavedRecipes] = useState<any[]>([]);
  const [books, setBooks] = useState<any[]>([]);

  // Main Add Meal Modal State
  const [showAddMealModal, setShowAddMealModal] = useState(false);
  const [activeDateForAdd, setActiveDateForAdd] = useState('2026-08-28');
  const [selectedRecipeObj, setSelectedRecipeObj] = useState<any | null>(null);
  const [mealType, setMealType] = useState('Dinner');
  const [mealTime, setMealTime] = useState('');
  const [isLeftover, setIsLeftover] = useState(false);
  const [notes, setNotes] = useState('');

  // Edit Meal Modal State
  const [showEditMealModal, setShowEditMealModal] = useState(false);
  const [editingMealId, setEditingMealId] = useState<string | null>(null);
  const [editRecipeObj, setEditRecipeObj] = useState<any | null>(null);
  const [editDate, setEditDate] = useState('2026-08-28');
  const [editMealType, setEditMealType] = useState('Dinner');
  const [editMealTime, setEditMealTime] = useState('');
  const [editIsLeftover, setEditIsLeftover] = useState(false);
  const [editNotes, setEditNotes] = useState('');

  // "Select Recipe" Sub-Modal State
  const [showRecipePickerModal, setShowRecipePickerModal] = useState(false);
  const [pickerTarget, setPickerTarget] = useState<'add' | 'edit'>('add');
  const [recipeSearch, setRecipeSearch] = useState('');
  const [selectedBookFilter, setSelectedBookFilter] = useState('All Books');
  const [activeRecipeTagFilter, setActiveRecipeTagFilter] = useState('All');
  const [showFilterOptions, setShowFilterOptions] = useState(false);

  // "Select Recipes for Shopping List" Modal State
  const [showShoppingListModal, setShowShoppingListModal] = useState(false);
  const [selectedMealIdsForShopping, setSelectedMealIdsForShopping] = useState<string[]>([]);
  const [expandedDayCards, setExpandedDayCards] = useState<{ [key: string]: boolean }>({});

  const loadSavedData = useCallback(() => {
    if (typeof window === 'undefined') return;
    try {
      const raw = localStorage.getItem('zecratary_recipes') || localStorage.getItem('zecratary_saved_recipes');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          const uniqueRecipes: any[] = [];
          const seenIds = new Set();

          parsed.forEach((rec: any) => {
            const id = rec.id || rec.title || rec.name;
            if (id && !seenIds.has(id)) {
              seenIds.add(id);
              uniqueRecipes.push({
                id: rec.id || id,
                name: rec.title || rec.name || 'Untitled Recipe',
                title: rec.title || rec.name || 'Untitled Recipe',
                category: rec.tags?.[0] || rec.recipeType || rec.category || 'Main Dish',
                isFavorite: Boolean(rec.isFavorite),
                bookId: rec.bookId || null,
                ingredients: rec.ingredients || [],
                image: rec.imageUrl || rec.image || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=800&q=80',
                imageUrl: rec.imageUrl || rec.image || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=800&q=80'
              });
            }
          });

          setSavedRecipes(uniqueRecipes);
        }
      }

      const rawBooks = localStorage.getItem('zecratary_recipe_books');
      if (rawBooks) {
        const parsedBooks = JSON.parse(rawBooks);
        if (Array.isArray(parsedBooks)) {
          setBooks(parsedBooks);
        }
      } else {
        setBooks([
          { id: 'book_1', title: 'Family Favorites & Weeknight Dinners' },
          { id: 'book_2', title: 'Authentic Asian Cuisine' },
          { id: 'book_3', title: 'Baking & Desserts' }
        ]);
      }
    } catch (e) {
      console.error('Failed to load saved data', e);
    }
  }, []);

  useEffect(() => {
    document.title = 'Meal Planner - FoodiePrep';

    const localPlan = localStorage.getItem('zecratary_meal_plan');
    if (localPlan) {
      try {
        setPlannedMeals(JSON.parse(localPlan));
      } catch (e) {}
    } else {
      const defaultPlan = [
        {
          id: 'p_1',
          date: '2026-08-28',
          recipeName: 'Caesar Salad Recipe',
          image: 'https://images.unsplash.com/photo-1550304943-4f24f54ddde9?auto=format&fit=crop&w=800&q=80',
          mealType: 'Dinner',
          time: '19:00',
          isLeftover: false,
          notes: ''
        }
      ];
      setPlannedMeals(defaultPlan);
      localStorage.setItem('zecratary_meal_plan', JSON.stringify(defaultPlan));
    }

    loadSavedData();

    const handleSync = () => loadSavedData();
    window.addEventListener('storage', handleSync);
    window.addEventListener('zecratary_recipes_updated', handleSync);
    window.addEventListener('zecratary_saved_recipes_updated', handleSync);
    window.addEventListener('zecratary_planner_updated', handleSync);

    return () => {
      window.removeEventListener('storage', handleSync);
      window.removeEventListener('zecratary_recipes_updated', handleSync);
      window.removeEventListener('zecratary_saved_recipes_updated', handleSync);
      window.removeEventListener('zecratary_planner_updated', handleSync);
    };
  }, [loadSavedData]);

  const savePlan = (updated: any[]) => {
    setPlannedMeals(updated);
    localStorage.setItem('zecratary_meal_plan', JSON.stringify(updated));
    window.dispatchEvent(new Event('zecratary_planner_updated'));
  };

  const openAddModal = (date: string) => {
    loadSavedData();
    setActiveDateForAdd(date);
    setSelectedRecipeObj(null);
    setMealType('Dinner');
    setMealTime('');
    setIsLeftover(false);
    setNotes('');
    setRecipeSearch('');
    setSelectedBookFilter('All Books');
    setActiveRecipeTagFilter('All');
    setShowFilterOptions(false);
    setShowRecipePickerModal(false);
    setShowAddMealModal(true);
  };

  const openEditModal = (meal: any) => {
    loadSavedData();
    setEditingMealId(meal.id);
    setEditDate(meal.date || selectedDate);
    setEditMealType(meal.mealType || 'Dinner');
    setEditMealTime(meal.time || '');
    setEditIsLeftover(Boolean(meal.isLeftover));
    setEditNotes(meal.notes || '');

    const found = savedRecipes.find(r => (r.name === meal.recipeName || r.title === meal.recipeName || r.id === meal.recipeId));
    setEditRecipeObj(found || {
      id: meal.recipeId || 'custom',
      name: meal.recipeName,
      title: meal.recipeName,
      image: meal.image,
      imageUrl: meal.image
    });

    setRecipeSearch('');
    setSelectedBookFilter('All Books');
    setActiveRecipeTagFilter('All');
    setShowFilterOptions(false);
    setShowEditMealModal(true);
  };

  const handleAddMealSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRecipeObj) {
      alert('Please select a recipe by clicking "+ Select Recipe".');
      return;
    }
    const newMeal = {
      id: 'plan_' + Date.now(),
      date: activeDateForAdd || selectedDate,
      recipeId: selectedRecipeObj.id,
      recipeName: selectedRecipeObj.name || selectedRecipeObj.title,
      image: selectedRecipeObj.image || selectedRecipeObj.imageUrl || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=800&q=80',
      mealType: mealType,
      time: mealTime,
      isLeftover: isLeftover,
      notes: notes
    };
    savePlan([...plannedMeals, newMeal]);
    setShowAddMealModal(false);
  };

  const handleEditMealSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMealId || !editRecipeObj) return;

    const updated = plannedMeals.map((m) => {
      if (m.id === editingMealId) {
        return {
          ...m,
          date: editDate,
          recipeId: editRecipeObj.id || m.recipeId,
          recipeName: editRecipeObj.name || editRecipeObj.title || m.recipeName,
          image: editRecipeObj.image || editRecipeObj.imageUrl || m.image,
          mealType: editMealType,
          time: editMealTime,
          isLeftover: editIsLeftover,
          notes: editNotes
        };
      }
      return m;
    });

    savePlan(updated);
    setShowEditMealModal(false);
    setEditingMealId(null);
  };

  const handleDeleteMeal = (id: string) => {
    const updated = plannedMeals.filter(m => m.id !== id);
    savePlan(updated);
    if (showEditMealModal && editingMealId === id) {
      setShowEditMealModal(false);
    }
  };

  const openShoppingListSelectModal = () => {
    loadSavedData();
    const allMealIds = plannedMeals.filter(m => !m.isLeftover).map(m => m.id);
    setSelectedMealIdsForShopping(allMealIds);
    setShowShoppingListModal(true);
  };

  const toggleDaySelectionForShopping = (dateStr: string, dayMeals: any[]) => {
    const dayMealIds = dayMeals.map(m => m.id);
    const allSelected = dayMealIds.every(id => selectedMealIdsForShopping.includes(id));

    if (allSelected) {
      setSelectedMealIdsForShopping(selectedMealIdsForShopping.filter(id => !dayMealIds.includes(id)));
    } else {
      const merged = Array.from(new Set([...selectedMealIdsForShopping, ...dayMealIds]));
      setSelectedMealIdsForShopping(merged);
    }
  };

  const toggleSingleMealForShopping = (mealId: string) => {
    if (selectedMealIdsForShopping.includes(mealId)) {
      setSelectedMealIdsForShopping(selectedMealIdsForShopping.filter(id => id !== mealId));
    } else {
      setSelectedMealIdsForShopping([...selectedMealIdsForShopping, mealId]);
    }
  };

  const handleGenerateShoppingList = () => {
    const selectedMeals = plannedMeals.filter(m => selectedMealIdsForShopping.includes(m.id));
    if (selectedMeals.length === 0) {
      alert('Please select at least one recipe day to generate a shopping list.');
      return;
    }

    const localList = localStorage.getItem('zecratary_shopping') || localStorage.getItem('zecratary_shopping_list');
    const currentItems = localList ? JSON.parse(localList) : [];
    const newIngredients: any[] = [];

    selectedMeals.forEach((meal) => {
      const fullRecipe = savedRecipes.find(r => (r.name === meal.recipeName || r.title === meal.recipeName || r.id === meal.recipeId));
      if (fullRecipe && Array.isArray(fullRecipe.ingredients) && fullRecipe.ingredients.length > 0) {
        fullRecipe.ingredients.forEach((ing: any, idx: number) => {
          newIngredients.push({
            id: 's_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6) + '_' + idx,
            name: typeof ing === 'string' ? ing : (ing.item || ing.name || 'Ingredient'),
            quantity: ing.amount || ing.quantity || '1',
            unit: ing.unit || 'item',
            category: ing.category || 'Pantry Staples',
            checked: false
          });
        });
      } else {
        newIngredients.push({
          id: 's_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
          name: meal.recipeName + ' ingredients',
          quantity: '1',
          unit: 'pack',
          category: 'Pantry Staples',
          checked: false
        });
      }
    });

    const merged = [...newIngredients, ...currentItems];
    localStorage.setItem('zecratary_shopping', JSON.stringify(merged));
    localStorage.setItem('zecratary_shopping_list', JSON.stringify(merged));
    setShowShoppingListModal(false);
    router.push('/shopping');
  };

  const weekDays = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(currentWeekStart);
    d.setDate(d.getDate() + i);
    const dateStr = d.toISOString().split('T')[0];
    const dayName = d.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase();
    const dayNum = d.getDate();
    weekDays.push({ dateStr, dayName, dayNum, fullDate: d });
  }

  const todayStr = '2026-08-28';
  const endDate = new Date(currentWeekStart);
  endDate.setDate(endDate.getDate() + 6);
  const rangeStr = `${currentWeekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;

  const activeDateObj = new Date(activeDateForAdd + 'T00:00:00');
  const activeDateFormattedHeader = activeDateObj.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
  const activeDateFieldText = activeDateObj.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });

  const datesWithMeals = Array.from(new Set(plannedMeals.map(m => m.date))).sort();

  const filteredPickerRecipes = savedRecipes.filter(r => {
    const name = (r.name || r.title || '').toLowerCase();
    const matchesSearch = !recipeSearch.trim() || name.includes(recipeSearch.toLowerCase().trim());

    let matchesBook = true;
    if (selectedBookFilter !== 'All Books') {
      matchesBook = r.bookId === selectedBookFilter;
    }

    let matchesTag = true;
    if (activeRecipeTagFilter !== 'All') {
      if (activeRecipeTagFilter === 'Favorites') {
        matchesTag = Boolean(r.isFavorite);
      } else {
        matchesTag = (r.category === activeRecipeTagFilter || r.tags?.includes(activeRecipeTagFilter));
      }
    }

    return matchesSearch && matchesBook && matchesTag;
  });

  return (
    <div className="max-w-6xl mx-auto space-y-6 text-slate-100 pb-24 px-4">
      {/* Header & Actions */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pt-2">
        <h1 className="text-3xl font-black text-[#E05638] tracking-tight">Planner</h1>
        
        <div className="flex flex-wrap items-center gap-2.5">
          <button 
            onClick={() => alert('Plan Week activated!')}
            className="bg-[#E05638] hover:bg-[#c94529] text-white font-bold text-xs px-4 py-2.5 rounded-xl transition flex items-center gap-1.5 shadow-md"
          >
            <CalendarIcon className="h-4 w-4" /> Plan Week
          </button>
          <button 
            onClick={() => alert('Week copied!')}
            className="bg-[#0f1117] hover:bg-slate-800 border border-emerald-900/60 text-slate-200 font-bold text-xs px-4 py-2.5 rounded-xl transition flex items-center gap-1.5"
          >
            <Copy className="h-4 w-4 text-[#E05638]" /> Copy Week
          </button>
          <button
            type="button"
            onClick={openShoppingListSelectModal}
            className="bg-[#0f1117] hover:bg-slate-800 border border-emerald-900/60 text-slate-200 font-bold text-xs px-4 py-2.5 rounded-xl transition flex items-center gap-1.5 cursor-pointer"
          >
            <ShoppingBag className="h-4 w-4 text-[#E05638]" /> Shopping List
          </button>
          <button 
            onClick={() => alert('Share link copied!')}
            className="bg-[#0f1117] hover:bg-slate-800 border border-emerald-900/60 text-slate-200 font-bold text-xs px-4 py-2.5 rounded-xl transition flex items-center gap-1.5"
          >
            <Share2 className="h-4 w-4 text-[#E05638]" /> Share
          </button>
        </div>
      </div>

      {/* Week Strip */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <button 
            onClick={() => {
              const prev = new Date(currentWeekStart);
              prev.setDate(prev.getDate() - 7);
              setCurrentWeekStart(prev);
            }}
            className="p-2 bg-[#0f1117] hover:bg-slate-800 border border-emerald-900/60 rounded-xl text-[#E05638] transition"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>

          <span className="text-base font-extrabold text-[#E05638] tracking-wide">{rangeStr}</span>

          <div className="flex items-center gap-2">
            <button 
              onClick={() => {
                const next = new Date(currentWeekStart);
                next.setDate(next.getDate() + 7);
                setCurrentWeekStart(next);
              }}
              className="p-2 bg-[#0f1117] hover:bg-slate-800 border border-emerald-900/60 rounded-xl text-[#E05638] transition"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
            <button 
              onClick={() => setCurrentWeekStart(new Date('2026-08-24'))}
              className="px-3.5 py-2 bg-[#0f1117] hover:bg-slate-800 border border-emerald-900/60 text-[#E05638] font-bold text-xs rounded-xl transition"
            >
              Today
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5">
          {weekDays.map((d) => {
            const isSelected = selectedDate === d.dateStr;
            const isToday = d.dateStr === todayStr;
            const hasMeals = plannedMeals.some(m => m.date === d.dateStr);

            return (
              <div
                key={d.dateStr}
                onClick={() => setSelectedDate(d.dateStr)}
                className={`p-3.5 rounded-2xl border text-center cursor-pointer transition flex flex-col items-center justify-center ${
                  isToday 
                    ? 'bg-[#161213] border-[#E05638] shadow-md' 
                    : isSelected 
                    ? 'bg-[#111726] border-emerald-500' 
                    : 'bg-[#070b13] border-emerald-950/80 hover:border-slate-700'
                }`}
              >
                <span className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">{d.dayName}</span>
                <span className={`text-xl font-black mt-1 ${isToday ? 'text-[#E05638]' : 'text-white'}`}>{d.dayNum}</span>
                {isToday && <span className="text-[9px] font-bold text-[#E05638] uppercase mt-0.5">Today</span>}
                {hasMeals && !isToday && <div className="w-1.5 h-1.5 rounded-full bg-[#E05638] mt-1"></div>}
              </div>
            );
          })}
        </div>
      </div>

      {/* Daily Average Banner */}
      <div className="bg-[#070b13] border border-emerald-950 rounded-2xl p-5 relative overflow-hidden shadow-lg">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2 text-sm font-extrabold text-white">
            <span className="text-lg">🔥</span> Daily average
          </div>
          <button className="flex items-center gap-1.5 bg-[#161213] border border-emerald-900/60 text-[#E05638] font-bold text-xs px-3 py-1.5 rounded-xl hover:bg-emerald-950/30 transition">
            <Lock className="h-3.5 w-3.5" /> Upgrade
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-slate-400 text-xs">
          <div>
            <span className="block text-[11px] font-semibold text-slate-500 uppercase">Calories</span>
            <span className="text-xl font-black text-white/40 blur-[4px]">1,234</span>
          </div>
          <div>
            <span className="block text-[11px] font-semibold text-slate-500 uppercase">Protein</span>
            <span className="text-xl font-black text-white/40 blur-[4px]">120g</span>
          </div>
          <div>
            <span className="block text-[11px] font-semibold text-slate-500 uppercase">Carbs</span>
            <span className="text-xl font-black text-white/40 blur-[4px]">150g</span>
          </div>
          <div>
            <span className="block text-[11px] font-semibold text-slate-500 uppercase">Fat</span>
            <span className="text-xl font-black text-white/40 blur-[4px]">45g</span>
          </div>
        </div>
      </div>

      {/* Selected Date Meals */}
      {(() => {
        const dObj = new Date(selectedDate + 'T00:00:00');
        const titleDate = dObj.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
        const isToday = selectedDate === todayStr;
        const dayMeals = plannedMeals.filter(m => m.date === selectedDate);

        return (
          <div className="bg-[#070b13] border border-emerald-950 rounded-3xl p-6 space-y-6 shadow-xl">
            <div className="flex items-center justify-between border-b border-emerald-950 pb-4">
              <div className="flex items-center gap-3">
                <h2 className="text-xl font-extrabold text-white">{titleDate}</h2>
                {isToday && (
                  <span className="bg-[#E05638] text-white text-[10px] font-black px-3 py-0.5 rounded-full uppercase tracking-wider shadow-sm">
                    TODAY
                  </span>
                )}
              </div>
              <button
                onClick={() => openAddModal(selectedDate)}
                className="bg-[#E05638] hover:bg-[#c94529] text-white font-bold text-xs px-4 py-2 rounded-xl transition flex items-center gap-1.5 shadow-md"
              >
                <Plus className="h-4 w-4" /> Add Meal
              </button>
            </div>

            {dayMeals.length === 0 ? (
              <div className="py-16 text-center space-y-4">
                <div className="w-12 h-12 rounded-2xl bg-emerald-950/40 border border-emerald-800 text-emerald-400 flex items-center justify-center mx-auto shadow-sm">
                  <ChefHat className="h-6 w-6" />
                </div>
                <p className="text-sm font-semibold text-slate-400">Nothing planned yet</p>
                <button
                  onClick={() => openAddModal(selectedDate)}
                  className="inline-flex items-center gap-2 bg-[#0f1117] hover:bg-slate-800 border border-emerald-900/60 text-[#E05638] font-bold text-xs px-5 py-2.5 rounded-xl transition shadow-sm"
                >
                  <Plus className="h-4 w-4" /> Add a meal
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {dayMeals.map((meal) => (
                  <div key={meal.id} className="bg-[#0b0e14] border border-slate-800/90 rounded-2xl p-4 flex items-center justify-between shadow-md gap-4">
                    <div className="flex items-center gap-3.5 min-w-0">
                      <img 
                        src={meal.image || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=200&q=80'} 
                        alt={meal.recipeName}
                        className="w-14 h-14 rounded-xl object-cover border border-slate-700/80 shadow-sm shrink-0" 
                      />
                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="bg-[#172033] text-slate-300 text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wide">
                            {meal.mealType}
                          </span>
                          {meal.isLeftover && (
                            <span className="bg-amber-950/60 border border-amber-600/40 text-amber-300 text-[9px] font-bold px-1.5 py-0.5 rounded">
                              Leftover
                            </span>
                          )}
                        </div>
                        <h3 className="text-sm font-bold text-white leading-snug truncate">{meal.recipeName}</h3>
                        {meal.time && <span className="text-[11px] text-slate-400 flex items-center gap-1">⏰ {meal.time}</span>}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => openEditModal(meal)}
                        className="p-2.5 text-slate-300 hover:text-white transition bg-[#172033] hover:bg-slate-700 rounded-xl border border-slate-700/60 shadow-sm"
                        title="Edit Planned Meal"
                      >
                        <Edit3 className="h-4 w-4 text-[#E05638]" />
                      </button>
                      <button
                        onClick={() => handleDeleteMeal(meal.id)}
                        className="p-2.5 text-slate-400 hover:text-red-400 transition bg-[#172033] hover:bg-red-950/40 rounded-xl border border-slate-700/60 shadow-sm"
                        title="Delete Meal"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })()}

      {/* 1. SELECT RECIPES FOR SHOPPING LIST MODAL (CLICK OUTSIDE CLOSES) */}
      {showShoppingListModal && (
        <div 
          onClick={() => setShowShoppingListModal(false)}
          className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4 cursor-pointer"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="bg-[#0b0e14] border border-slate-800/90 rounded-3xl max-w-lg w-full p-7 space-y-6 shadow-2xl relative max-h-[90vh] flex flex-col animate-in fade-in cursor-default"
          >
            <button 
              onClick={() => setShowShoppingListModal(false)} 
              className="absolute top-5 right-5 p-2 bg-[#172033] hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl transition"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="space-y-1.5 pr-8">
              <h2 className="text-xl font-bold text-[#E05638] tracking-tight">
                Select Recipes for Shopping List
              </h2>
              <p className="text-xs text-slate-400 leading-relaxed">
                Choose the recipes you want to include in your shopping list. Tap a day to expand and select individual recipes.
              </p>
            </div>

            <div className="overflow-y-auto flex-1 space-y-3 pr-1 py-1 text-xs">
              {datesWithMeals.length === 0 ? (
                <div className="py-12 text-center text-xs text-slate-500 bg-[#07090e] rounded-2xl border border-slate-800">
                  No meals currently scheduled in your plan.
                </div>
              ) : (
                datesWithMeals.map((dateStr) => {
                  const dayMeals = plannedMeals.filter(m => m.date === dateStr);
                  const selectedCount = dayMeals.filter(m => selectedMealIdsForShopping.includes(m.id)).length;
                  const isAllDaySelected = selectedCount === dayMeals.length && dayMeals.length > 0;
                  const isPartiallySelected = selectedCount > 0 && selectedCount < dayMeals.length;
                  const isExpanded = Boolean(expandedDayCards[dateStr]);

                  const dObj = new Date(dateStr + 'T00:00:00');
                  const formattedDayTitle = dObj.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });

                  return (
                    <div 
                      key={dateStr}
                      className="border border-[#E05638] bg-[#0c0d11] rounded-2xl transition overflow-hidden shadow-md"
                    >
                      <div 
                        onClick={() => toggleDaySelectionForShopping(dateStr, dayMeals)}
                        className="flex items-center justify-between p-4 cursor-pointer select-none"
                      >
                        <div className="flex items-center gap-3.5">
                          <div 
                            className={`w-5 h-5 rounded-md flex items-center justify-center transition shrink-0 ${
                              isAllDaySelected || isPartiallySelected
                                ? 'bg-[#E05638] text-white' 
                                : 'border border-slate-700 bg-slate-900'
                            }`}
                          >
                            {isAllDaySelected && <Check className="h-3.5 w-3.5 stroke-[3]" />}
                            {isPartiallySelected && <div className="w-2 h-2 bg-white rounded-sm" />}
                          </div>

                          <div>
                            <h3 className="text-sm font-bold text-[#E05638]">
                              {formattedDayTitle}
                            </h3>
                            <span className="text-xs text-slate-400 font-medium">
                              {selectedCount}/{dayMeals.length} selected
                            </span>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setExpandedDayCards({ ...expandedDayCards, [dateStr]: !isExpanded });
                          }}
                          className="p-1 text-[#E05638] hover:text-white transition"
                        >
                          {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                        </button>
                      </div>

                      {isExpanded && (
                        <div className="px-4 pb-3 pt-1 space-y-2 border-t border-slate-800/80 bg-[#07090e]/60">
                          {dayMeals.map((meal) => {
                            const isMealSelected = selectedMealIdsForShopping.includes(meal.id);
                            return (
                              <div
                                key={meal.id}
                                onClick={() => toggleSingleMealForShopping(meal.id)}
                                className={`flex items-center justify-between p-2.5 rounded-xl border cursor-pointer transition ${
                                  isMealSelected 
                                    ? 'bg-[#1a141a] border-[#E05638]/60' 
                                    : 'bg-[#0b0e14] border-slate-800 hover:border-slate-700'
                                }`}
                              >
                                <div className="flex items-center gap-3 min-w-0">
                                  <div className={`w-4 h-4 rounded border flex items-center justify-center transition shrink-0 ${
                                    isMealSelected 
                                      ? 'bg-[#E05638] border-[#E05638] text-white' 
                                      : 'border-slate-700 bg-slate-900'
                                  }`}>
                                    {isMealSelected && <Check className="h-3 w-3" />}
                                  </div>

                                  <img 
                                    src={meal.image || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=200&q=80'} 
                                    alt={meal.recipeName}
                                    className="w-8 h-8 rounded-lg object-cover border border-slate-700 shrink-0"
                                  />

                                  <div className="min-w-0">
                                    <h4 className="text-xs font-bold text-white truncate">{meal.recipeName}</h4>
                                    <span className="text-[10px] text-slate-400">{meal.mealType}</span>
                                  </div>
                                </div>

                                {meal.isLeftover && (
                                  <span className="text-[9px] font-bold text-amber-400 bg-amber-950/60 border border-amber-700/40 px-1.5 py-0.5 rounded">
                                    Leftover
                                  </span>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            <div className="grid grid-cols-2 gap-3 pt-4 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setShowShoppingListModal(false)}
                className="py-3 px-4 bg-[#07090e] hover:bg-slate-800 border border-slate-800 text-slate-300 font-bold rounded-2xl text-xs transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleGenerateShoppingList}
                className="py-3 px-4 bg-[#E05638] hover:bg-[#c94529] text-white font-bold rounded-2xl text-xs transition shadow-lg shadow-[#E05638]/20"
              >
                Generate List
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. MAIN ADD MEAL MODAL (CLICK OUTSIDE CLOSES) */}
      {showAddMealModal && (
        <div 
          onClick={() => setShowAddMealModal(false)}
          className="fixed inset-0 bg-black/80 backdrop-blur-xs z-50 flex items-center justify-center p-4 cursor-pointer"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="bg-[#0b0e14] border border-slate-800/90 rounded-2xl max-w-sm w-full p-6 space-y-4 shadow-2xl relative text-xs animate-in fade-in cursor-default"
          >
            <button 
              onClick={() => setShowAddMealModal(false)} 
              className="absolute top-4 right-4 p-1.5 bg-[#172033] hover:bg-slate-700 text-slate-300 hover:text-white rounded-md transition"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="space-y-1 pr-6">
              <h2 className="text-lg font-black text-[#E05638] tracking-tight">
                Add Meal for {activeDateFormattedHeader}
              </h2>
              <p className="text-slate-400 text-xs">
                Plan your meal by selecting a recipe and adding details.
              </p>
            </div>

            <form onSubmit={handleAddMealSubmit} className="space-y-3.5 pt-1">
              <div>
                <label className="block text-xs font-bold text-[#E05638] mb-1.5">Date</label>
                <div className="w-full bg-[#070b13] border-2 border-blue-500 rounded-lg px-3 py-2 text-xs font-semibold text-slate-200">
                  {activeDateFieldText}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#E05638] mb-1.5">Meal Type</label>
                <div className="relative">
                  <select
                    value={mealType}
                    onChange={(e) => setMealType(e.target.value)}
                    className="w-full bg-[#070b13] border border-slate-800 rounded-lg px-3 py-2.5 text-xs text-slate-200 outline-none appearance-none cursor-pointer"
                  >
                    <option value="Breakfast">Breakfast</option>
                    <option value="Lunch">Lunch</option>
                    <option value="Dinner">Dinner</option>
                    <option value="Snack">Snack</option>
                  </select>
                  <ChevronDown className="h-4 w-4 text-slate-400 absolute right-3 top-3 pointer-events-none" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#E05638] mb-1.5">Time</label>
                <div className="relative flex items-center">
                  <Clock className="h-4 w-4 text-slate-400 absolute left-3 pointer-events-none" />
                  <input
                    type="time"
                    value={mealTime}
                    onChange={(e) => setMealTime(e.target.value)}
                    className="w-full bg-[#070b13] border border-slate-800 rounded-lg pl-9 pr-9 py-2 text-xs text-slate-200 outline-none"
                    placeholder="--:--"
                  />
                  <Clock className="h-4 w-4 text-[#E05638] absolute right-3 pointer-events-none" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#E05638] mb-1.5">Recipe</label>
                {selectedRecipeObj ? (
                  <div className="flex items-center justify-between p-2.5 bg-[#070b13] border border-emerald-800/80 rounded-lg">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <img 
                        src={selectedRecipeObj.image || selectedRecipeObj.imageUrl} 
                        alt={selectedRecipeObj.name || selectedRecipeObj.title}
                        className="w-8 h-8 rounded-md object-cover border border-slate-700 shrink-0" 
                      />
                      <span className="text-white font-bold text-xs truncate">
                        {selectedRecipeObj.name || selectedRecipeObj.title}
                      </span>
                    </div>
                    <button 
                      type="button" 
                      onClick={() => {
                        setPickerTarget('add');
                        setShowRecipePickerModal(true);
                      }}
                      className="text-[11px] text-[#E05638] hover:underline font-bold shrink-0 ml-2"
                    >
                      Change
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setPickerTarget('add');
                      setShowRecipePickerModal(true);
                    }}
                    className="w-full bg-[#070b13] hover:bg-[#111726] border border-slate-800/90 rounded-lg py-3 text-xs font-bold text-[#E05638] flex items-center justify-center gap-1.5 transition"
                  >
                    <Plus className="h-4 w-4" /> Select Recipe
                  </button>
                )}
              </div>

              <div className="bg-[#070b13] border border-slate-800/80 rounded-xl p-3 flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-[#E05638]">Leftover</div>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Mark as leftovers from a previous meal — won't be added to shopping lists.
                  </p>
                </div>
                
                <div 
                  onClick={() => setIsLeftover(!isLeftover)}
                  className={`w-11 h-6 flex items-center rounded-full p-1 cursor-pointer transition shrink-0 ml-3 ${
                    isLeftover ? 'bg-[#E05638]' : 'bg-[#1e293b]'
                  }`}
                >
                  <div className={`bg-white w-4 h-4 rounded-full shadow-md transform transition ${
                    isLeftover ? 'translate-x-5' : 'translate-x-0'
                  }`} />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#E05638] mb-1.5">Notes</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Add any notes or special instructions..."
                  rows={3}
                  className="w-full bg-[#070b13] border border-slate-800 rounded-lg p-3 text-xs text-slate-200 outline-none resize-none placeholder-slate-500"
                ></textarea>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddMealModal(false)}
                  className="px-5 py-2.5 rounded-xl border border-emerald-900/80 text-[#E05638] hover:bg-emerald-950/20 font-bold text-xs transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-[#E05638] hover:bg-[#c94529] text-white font-bold text-xs transition shadow-md"
                >
                  Add to Calendar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 3. EDIT MEAL MODAL (CLICK OUTSIDE CLOSES) */}
      {showEditMealModal && (
        <div 
          onClick={() => setShowEditMealModal(false)}
          className="fixed inset-0 bg-black/80 backdrop-blur-xs z-50 flex items-center justify-center p-4 cursor-pointer"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="bg-[#0b0e14] border border-slate-800/90 rounded-2xl max-w-sm w-full p-6 space-y-4 shadow-2xl relative text-xs animate-in fade-in cursor-default"
          >
            <button 
              onClick={() => setShowEditMealModal(false)} 
              className="absolute top-4 right-4 p-1.5 bg-[#172033] hover:bg-slate-700 text-slate-300 hover:text-white rounded-md transition"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="space-y-1 pr-6">
              <h2 className="text-lg font-black text-[#E05638] tracking-tight flex items-center gap-2">
                <Edit3 className="h-5 w-5 text-[#E05638]" /> Edit Planned Meal
              </h2>
              <p className="text-slate-400 text-xs">
                Update details or swap the recipe for this meal.
              </p>
            </div>

            <form onSubmit={handleEditMealSubmit} className="space-y-3.5 pt-1">
              <div>
                <label className="block text-xs font-bold text-[#E05638] mb-1.5">Date</label>
                <input
                  type="date"
                  value={editDate}
                  onChange={(e) => setEditDate(e.target.value)}
                  className="w-full bg-[#070b13] border border-slate-800 rounded-lg px-3 py-2 text-xs font-semibold text-slate-200 outline-none focus:border-[#E05638]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#E05638] mb-1.5">Meal Type</label>
                <div className="relative">
                  <select
                    value={editMealType}
                    onChange={(e) => setEditMealType(e.target.value)}
                    className="w-full bg-[#070b13] border border-slate-800 rounded-lg px-3 py-2.5 text-xs text-slate-200 outline-none appearance-none cursor-pointer"
                  >
                    <option value="Breakfast">Breakfast</option>
                    <option value="Lunch">Lunch</option>
                    <option value="Dinner">Dinner</option>
                    <option value="Snack">Snack</option>
                  </select>
                  <ChevronDown className="h-4 w-4 text-slate-400 absolute right-3 top-3 pointer-events-none" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#E05638] mb-1.5">Time</label>
                <div className="relative flex items-center">
                  <Clock className="h-4 w-4 text-slate-400 absolute left-3 pointer-events-none" />
                  <input
                    type="time"
                    value={editMealTime}
                    onChange={(e) => setEditMealTime(e.target.value)}
                    className="w-full bg-[#070b13] border border-slate-800 rounded-lg pl-9 pr-9 py-2 text-xs text-slate-200 outline-none"
                  />
                  <Clock className="h-4 w-4 text-[#E05638] absolute right-3 pointer-events-none" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#E05638] mb-1.5">Recipe</label>
                {editRecipeObj ? (
                  <div className="flex items-center justify-between p-2.5 bg-[#070b13] border border-emerald-800/80 rounded-lg">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <img 
                        src={editRecipeObj.image || editRecipeObj.imageUrl} 
                        alt={editRecipeObj.name || editRecipeObj.title}
                        className="w-8 h-8 rounded-md object-cover border border-slate-700 shrink-0" 
                      />
                      <span className="text-white font-bold text-xs truncate">
                        {editRecipeObj.name || editRecipeObj.title}
                      </span>
                    </div>
                    <button 
                      type="button" 
                      onClick={() => {
                        setPickerTarget('edit');
                        setShowRecipePickerModal(true);
                      }}
                      className="text-[11px] text-[#E05638] hover:underline font-bold shrink-0 ml-2"
                    >
                      Change
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setPickerTarget('edit');
                      setShowRecipePickerModal(true);
                    }}
                    className="w-full bg-[#070b13] hover:bg-[#111726] border border-slate-800/90 rounded-lg py-3 text-xs font-bold text-[#E05638] flex items-center justify-center gap-1.5 transition"
                  >
                    <Plus className="h-4 w-4" /> Select Recipe
                  </button>
                )}
              </div>

              <div className="bg-[#070b13] border border-slate-800/80 rounded-xl p-3 flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-[#E05638]">Leftover</div>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Mark as leftovers from a previous meal — won't be added to shopping lists.
                  </p>
                </div>
                
                <div 
                  onClick={() => setEditIsLeftover(!editIsLeftover)}
                  className={`w-11 h-6 flex items-center rounded-full p-1 cursor-pointer transition shrink-0 ml-3 ${
                    editIsLeftover ? 'bg-[#E05638]' : 'bg-[#1e293b]'
                  }`}
                >
                  <div className={`bg-white w-4 h-4 rounded-full shadow-md transform transition ${
                    editIsLeftover ? 'translate-x-5' : 'translate-x-0'
                  }`} />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#E05638] mb-1.5">Notes</label>
                <textarea
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  placeholder="Add any notes or special instructions..."
                  rows={3}
                  className="w-full bg-[#070b13] border border-slate-800 rounded-lg p-3 text-xs text-slate-200 outline-none resize-none placeholder-slate-500"
                ></textarea>
              </div>

              <div className="flex justify-between gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    if (editingMealId && confirm('Delete this planned meal?')) {
                      handleDeleteMeal(editingMealId);
                    }
                  }}
                  className="px-4 py-2.5 rounded-xl border border-red-900/60 hover:bg-red-950/30 text-red-400 font-bold text-xs transition flex items-center gap-1.5"
                >
                  <Trash2 className="h-4 w-4" /> Delete
                </button>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setShowEditMealModal(false)}
                    className="px-4 py-2.5 rounded-xl border border-emerald-900/80 text-[#E05638] hover:bg-emerald-950/20 font-bold text-xs transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2.5 rounded-xl bg-[#E05638] hover:bg-[#c94529] text-white font-bold text-xs transition shadow-md"
                  >
                    Save Changes
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 4. SELECT RECIPE PICKER MODAL (CLICK OUTSIDE CLOSES) */}
      {showRecipePickerModal && (
        <div 
          onClick={() => setShowRecipePickerModal(false)}
          className="fixed inset-0 bg-black/85 backdrop-blur-sm z-[70] flex items-center justify-center p-4 cursor-pointer"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="bg-[#0a0c10] border border-slate-800/90 rounded-3xl max-w-sm w-full p-6 space-y-4 shadow-2xl relative text-xs animate-in fade-in min-h-[500px] flex flex-col justify-between cursor-default"
          >
            <div className="space-y-4">
              <button 
                onClick={() => setShowRecipePickerModal(false)} 
                className="absolute top-4 right-4 p-2 bg-[#172033] hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl transition"
              >
                <X className="h-4 w-4" />
              </button>

              <div className="space-y-0.5 pr-8">
                <h2 className="text-lg font-black text-[#E05638] tracking-tight">Select Recipe</h2>
                <p className="text-xs text-slate-400">
                  Choose a recipe to add to your meal plan
                </p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <Search className="h-4 w-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
                    <input
                      type="text"
                      placeholder="Search by name"
                      value={recipeSearch}
                      onChange={(e) => setRecipeSearch(e.target.value)}
                      className="w-full bg-[#07090e] border border-[#E05638] rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-400 outline-none"
                    />
                  </div>

                  <div className="relative">
                    <select
                      value={selectedBookFilter}
                      onChange={(e) => setSelectedBookFilter(e.target.value)}
                      className="bg-[#07090e] border border-emerald-800 text-[#E05638] font-bold text-xs rounded-xl pl-3 pr-7 py-2 outline-none appearance-none cursor-pointer"
                    >
                      <option value="All Books">All Books</option>
                      {books.map((b) => (
                        <option key={b.id} value={b.id}>{b.title}</option>
                      ))}
                    </select>
                    <ChevronDown className="h-3.5 w-3.5 text-slate-400 absolute right-2.5 top-2.5 pointer-events-none" />
                  </div>

                  <button
                    type="button"
                    onClick={() => setShowFilterOptions(!showFilterOptions)}
                    className="border border-emerald-800 bg-[#07090e] hover:bg-emerald-950/30 text-[#E05638] font-bold text-xs px-3 py-2 rounded-xl flex items-center gap-1.5 transition"
                  >
                    <SlidersHorizontal className="h-3.5 w-3.5 text-[#E05638]" /> Filter
                  </button>
                </div>

                {showFilterOptions && (
                  <div className="flex flex-wrap gap-1.5 pt-1 animate-in fade-in">
                    {['All', 'Favorites', 'Main Dish', 'Imported'].map((tag) => (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => setActiveRecipeTagFilter(tag)}
                        className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border transition ${
                          activeRecipeTagFilter === tag
                            ? 'bg-[#E05638] text-white border-[#E05638]'
                            : 'bg-[#07090e] text-slate-400 border-slate-800 hover:text-white'
                        }`}
                      >
                        {tag}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
                {filteredPickerRecipes.length === 0 ? (
                  <div className="py-12 text-center text-xs text-slate-500">
                    No recipes found matching criteria.
                  </div>
                ) : (
                  filteredPickerRecipes.map((rec) => {
                    const recTitle = rec.name || rec.title || 'Untitled Recipe';
                    const recCategory = rec.category || rec.recipeType || 'Main Dish';
                    const recImage = rec.image || rec.imageUrl || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=800&q=80';

                    return (
                      <div
                        key={rec.id || recTitle}
                        className="flex items-center justify-between p-2 rounded-2xl bg-transparent transition"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <img
                            src={recImage}
                            alt={recTitle}
                            className="w-12 h-12 rounded-xl object-cover border border-slate-800 shrink-0"
                          />
                          <div className="space-y-1 min-w-0">
                            <h4 className="font-extrabold text-[#E05638] text-xs leading-snug truncate">
                              {recTitle}
                            </h4>
                            <div className="flex items-center gap-2">
                              <span className="bg-[#E05638] text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                                {recCategory}
                              </span>
                              <Heart className="h-3 w-3 fill-[#E05638] text-[#E05638]" />
                            </div>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            if (pickerTarget === 'edit') {
                              setEditRecipeObj(rec);
                            } else {
                              setSelectedRecipeObj(rec);
                            }
                            setShowRecipePickerModal(false);
                          }}
                          className="px-4 py-1.5 bg-[#07090e] border border-emerald-800/80 hover:bg-emerald-950/30 text-[#E05638] font-bold text-xs rounded-xl transition shrink-0 ml-2"
                        >
                          Select
                        </button>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            <div className="text-center py-2 text-xs font-semibold text-emerald-400">
              Showing {filteredPickerRecipes.length} of {savedRecipes.length} recipes
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
"""

with open("apps/web/src/app/planner/page.tsx", "w", encoding="utf-8") as f:
    f.write(planner_code)

# ======================================================================
# 3. Update apps/web/src/app/books/page.tsx
# ======================================================================
books_code = """'use client';
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
"""

with open("apps/web/src/app/books/page.tsx", "w", encoding="utf-8") as f:
    f.write(books_code)

print("✅ All modals across Recipes, Planner, and Books updated with backdrop click-to-close!")
