'use client';
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

  // View States & Dynamic Font Scaling (70% - 160%)
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

      {/* RECIPE DETAILS & EDIT MODAL */}
      {selectedRecipe && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
          <div className="bg-[#0c111d] border border-slate-800 rounded-3xl max-w-3xl w-full max-h-[92vh] flex flex-col overflow-hidden shadow-2xl relative">
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
                          <div className="absolute left-0 top-full mt-2 w-64 bg-[#0d131f] border border-slate-700/80 rounded-2xl shadow-2xl p-2 z-50 space-y-1 animate-in fade-in">
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

                  {/* ───────────────────────────────────────────────────────────── */}
                  {/* INGREDIENTS & INSTRUCTIONS WITH REAL-TIME FONT RESIZING */}
                  {/* ───────────────────────────────────────────────────────────── */}
                  <div className="px-5 space-y-6">
                    
                    {/* Ingredients Header with Stepper Controls */}
                    <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                      <h3 className="text-base font-extrabold text-white">Ingredients</h3>
                      
                      {/* Enlarger Percentage Stepper Container */}
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

                    {/* Scalable Two-Column Ingredients */}
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

                    {/* Scalable Instructions */}
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
    </div>
  );
}
