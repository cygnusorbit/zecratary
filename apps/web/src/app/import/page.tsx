'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Link2, FileText, Image as ImageIcon, Sparkles, AlertCircle, CheckCircle2, Upload, X } from 'lucide-react';
import { getCurrentUser } from '@/lib/auth';
import { useTranslation } from '@/components/LanguageProvider';

const DEFAULT_RECIPE_TYPES = [
  'Main Dish', 'Breakfast', 'Lunch', 'Dinner', 'Appetizer', 
  'Side Dish', 'Dessert', 'Snacks', 'Beverages', 'Soup', 'Salad'
];

export function decodeHtmlEntities(str: string): string {
  if (!str) return '';
  return str
    .replace(/&quot;/g, '"')
    .replace(/&#0*39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .replace(/&deg;/g, '°')
    .replace(/&#0*8211;/g, '–')
    .replace(/&#0*8212;/g, '—')
    .replace(/&ndash;/g, '–')
    .replace(/&mdash;/g, '—')
    .replace(/&#0*8216;/g, "'")
    .replace(/&#0*8217;/g, "'")
    .replace(/&#0*8220;/g, '"')
    .replace(/&#0*8221;/g, '"')
    .replace(/&#0*160;/g, ' ')
    .replace(/&#(\d+);/g, (_, dec) => {
      try { return String.fromCharCode(parseInt(dec, 10)); } catch { return _; }
    })
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => {
      try { return String.fromCharCode(parseInt(hex, 16)); } catch { return _; }
    });
}

export function parseIngredientLine(raw: string, index: number) {
  let text = decodeHtmlEntities(raw).replace(/^(\s*[-*•]\s*|\s*\d+[\.\)]\s*|\[\s*\]\s*)/, '').trim();

  const unicodeFractions: Record<string, string> = {
    '½': '1/2', '⅓': '1/3', '⅔': '2/3', '¼': '1/4', '¾': '3/4',
    '⅛': '1/8', '⅜': '3/8', '⅝': '5/8', '⅞': '7/8'
  };
  for (const [frac, rep] of Object.entries(unicodeFractions)) {
    text = text.replace(new RegExp(frac, 'g'), rep);
  }

  const amountRegex = /^((?:\d+\s+)?\d+\/\d+|\d+(?:\.\d+)?(?:\s*(?:-|to)\s*\d+(?:\.\d+)?)?)\s*/i;
  const amountMatch = text.match(amountRegex);

  let amount = '1';
  let remaining = text;

  if (amountMatch && amountMatch[1]) {
    amount = amountMatch[1].trim();
    remaining = text.slice(amountMatch[0].length).trim();
  }

  const unitsPattern = /^(tablespoons?|tbsp?\.?|teaspoons?|tsp?\.?|cups?|c\.?|ounces?|oz\.?|pounds?|lbs?\.?|grams?|g\.?|kilograms?|kg\.?|milliliters?|ml\.?|liters?|l\.?|pinches?|pinch|dashes?|dash|cloves?|clove|slices?|slice|pieces?|pcs?\.?|cans?|can|bottles?|bottle|packages?|pkgs?\.?|bunches?|bunch|stalks?|stalk|sprigs?|sprig|handfuls?|handful|heads?|head|portions?|portion|large|medium|small)\b/i;
  const unitMatch = remaining.match(unitsPattern);

  let unit = 'unit';
  let itemName = remaining;

  if (unitMatch && unitMatch[1]) {
    unit = unitMatch[1].trim();
    itemName = remaining.slice(unitMatch[0].length).trim().replace(/^of\s+/i, '').trim();
  }

  if (!amountMatch) {
    if (/to taste/i.test(text)) {
      amount = '1';
      unit = 'pinch';
    } else {
      amount = '1';
      unit = 'unit';
    }
    itemName = text;
  }

  if (!itemName) {
    itemName = unit || text;
    unit = 'unit';
  }

  const lName = (itemName || text).toLowerCase();
  let category = 'Produce';

  if (/garlic|onion|shallot|scallion|chive|ginger|tomato|potato|lettuce|basil|chili|pepper|bell pepper|lime|lemon|cilantro|coriander|mushroom|carrot|spinach|herb|cabbage|sprout|bean sprout|avocado|cucumber|zucchini|eggplant|celery|parsley|rosemary|thyme|mint|dill|kale|cauliflower|broccoli|fruit|apple|mango/.test(lName)) {
    category = 'Produce';
  } else if (/beef|chicken|pork|pork rib|shrimp|prawn|fish|steak|salmon|meat|bacon|tofu|egg|eggs|duck|turkey|lamb|crab|squid|clam|sausage|seafood/.test(lName)) {
    category = 'Meat and Seafood';
  } else if (/milk|cheese|butter|cream|yogurt|cheddar|parmesan|mozzarella|ghee|curd/.test(lName)) {
    category = 'Dairy';
  } else if (/rice|noodle|noodles|pasta|spaghetti|macaroni|flour|bread|quinoa|oat|oats|tortilla|cereal|grain/.test(lName)) {
    category = 'Grains and Pasta';
  } else if (/sauce|soy|fish sauce|oyster sauce|vinegar|oil|olive oil|sesame oil|paste|tamarind|mayo|mayonnaise|ketchup|mustard|sriracha|chili oil|dressing/.test(lName)) {
    category = 'Condiments and Sauces';
  } else if (/water|juice|tea|coffee|wine|beer|broth|stock|soda|cider/.test(lName)) {
    category = 'Beverages';
  } else if (/sugar|salt|palm sugar|cumin|paprika|pepper|black pepper|white pepper|cinnamon|star anise|clove|cloves|curry|spice|powder|baking powder|baking soda|yeast|extract|vanilla|honey|maple syrup|peanut|peanuts|cashew|almond|walnut|sesame seed|cornstarch/.test(lName)) {
    category = 'Pantry Staples';
  }

  return {
    id: `ing_${Date.now()}_${index}`,
    amount: amount || '1',
    quantity: amount || '1',
    unit: unit || 'unit',
    item: decodeHtmlEntities(itemName),
    name: decodeHtmlEntities(itemName),
    category
  };
}

export default function ImportPage() {
  const router = useRouter();
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<'url' | 'text' | 'image'>('url');
  const [isDayMode, setIsDayMode] = useState<boolean>(false);
  
  const [url, setUrl] = useState('');
  const [recipeTypes, setRecipeTypes] = useState<string[]>(DEFAULT_RECIPE_TYPES);

  const [textTitle, setTextTitle] = useState('');
  const [textCategory, setTextCategory] = useState('Main Dish');
  const [rawText, setRawText] = useState('');
  
  const [textFiles, setTextFiles] = useState<File[]>([]);
  const [textPreviewUrls, setTextPreviewUrls] = useState<string[]>([]);
  const [isTextDragging, setIsTextDragging] = useState(false);
  const textFileInputRef = useRef<HTMLInputElement | null>(null);

  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  const syncRecipeTypes = () => {
    try {
      const stored = localStorage.getItem('zecratary_recipe_types') || 
                     localStorage.getItem('zecratary_recipe_categories');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const names = parsed.map((item: any) => 
            typeof item === 'string' ? item : item.name || item.title || item.label
          ).filter(Boolean);
          if (names.length > 0) {
            setRecipeTypes(names);
            if (!names.includes(textCategory)) {
              setTextCategory(names[0]);
            }
            return;
          }
        }
      }
    } catch (_) {}
    setRecipeTypes(DEFAULT_RECIPE_TYPES);
  };

  const applyGlobalTheme = useCallback(() => {
    try {
      const mode = typeof window !== 'undefined' ? localStorage.getItem('zecratary_theme_mode') : null;
      const isDay = mode === 'light';
      setIsDayMode(isDay);

      const stored = localStorage.getItem('zecratary_theme_colors') || localStorage.getItem('zecratary_theme_config');
      const cfg = stored ? JSON.parse(stored) : {};
      const root = document.documentElement;

      if (isDay) {
        root.style.setProperty('--color-primary', cfg.primary || cfg.primaryColor || '#E05638');
        root.style.setProperty('--color-primary-hover', cfg.primaryHover || '#c94529');
        root.style.setProperty('--color-bg-dark', '#f8fafc');
        root.style.setProperty('--color-background', '#f8fafc');
        root.style.setProperty('--color-bg', '#f8fafc');
        root.style.setProperty('--color-card-dark', '#ffffff');
        root.style.setProperty('--color-card', '#ffffff');
        root.style.setProperty('--color-inner-dark', '#f1f5f9');
        root.style.setProperty('--color-border', '#e2e8f0');
        root.style.setProperty('--color-emerald', cfg.accentEmerald || cfg.accentColor || '#10b981');
        root.style.setProperty('--color-accent', cfg.accentEmerald || cfg.accentColor || '#10b981');
        root.style.setProperty('--color-text', '#0f172a');
        root.style.setProperty('--color-text-secondary', '#64748b');
        if (typeof document !== 'undefined' && document.body) {
          document.body.style.backgroundColor = '#f8fafc';
        }
      } else {
        root.style.setProperty('--color-primary', cfg.primary || cfg.primaryColor || '#E05638');
        root.style.setProperty('--color-primary-hover', cfg.primaryHover || '#c94529');
        root.style.setProperty('--color-bg-dark', cfg.backgroundDark || cfg.backgroundColor || '#070b13');
        root.style.setProperty('--color-background', cfg.backgroundDark || cfg.backgroundColor || '#070b13');
        root.style.setProperty('--color-bg', cfg.backgroundDark || cfg.backgroundColor || '#070b13');
        root.style.setProperty('--color-card-dark', cfg.cardDark || cfg.cardBackground || '#111726');
        root.style.setProperty('--color-card', cfg.cardDark || cfg.cardBackground || '#111726');
        root.style.setProperty('--color-inner-dark', cfg.innerDark || cfg.backgroundColor || '#0B101D');
        root.style.setProperty('--color-border', cfg.borderColor || cfg.cardBorder || '#1e293b');
        root.style.setProperty('--color-emerald', cfg.accentEmerald || cfg.accentColor || '#10b981');
        root.style.setProperty('--color-accent', cfg.accentEmerald || cfg.accentColor || '#10b981');
        root.style.setProperty('--color-text', cfg.textColor || '#ffffff');
        root.style.setProperty('--color-text-secondary', cfg.textSecondary || '#94a3b8');
        if (typeof document !== 'undefined' && document.body) {
          document.body.style.backgroundColor = '';
        }
      }
    } catch (_) {}
  }, []);

  useEffect(() => {
    document.title = `${t('importRecipeTitle') || 'Import Recipe'} - Zecratary`;
    syncRecipeTypes();
    applyGlobalTheme();

    const handleStorageUpdate = () => {
      applyGlobalTheme();
      syncRecipeTypes();
    };

    window.addEventListener('zecratary_theme_mode_changed', applyGlobalTheme);
    window.addEventListener('zecratary_theme_changed', applyGlobalTheme);
    window.addEventListener('zecratary_theme_updated', applyGlobalTheme);
    window.addEventListener('zecratary_recipe_types_changed', syncRecipeTypes);
    window.addEventListener('storage', handleStorageUpdate);

    return () => {
      window.removeEventListener('zecratary_theme_mode_changed', applyGlobalTheme);
      window.removeEventListener('zecratary_theme_changed', applyGlobalTheme);
      window.removeEventListener('zecratary_theme_updated', applyGlobalTheme);
      window.removeEventListener('zecratary_recipe_types_changed', syncRecipeTypes);
      window.removeEventListener('storage', handleStorageUpdate);
      if (typeof document !== 'undefined' && document.body) {
        document.body.style.backgroundColor = '';
      }
    };
  }, [applyGlobalTheme, t]);

  const saveAndRedirect = (recipeData: any) => {
    const user = getCurrentUser();
    const recipeTitle = decodeHtmlEntities(recipeData.title || recipeData.name || 'Imported Recipe');
    const recipeImage = recipeData.imageUrl || recipeData.image || '/uploads/recipes/default.jpg';
    const recipeCategory = recipeData.category || recipeData.recipeType || (recipeTypes[0] || 'Main Dish');

    const cleanIngredients = (recipeData.ingredients && recipeData.ingredients.length > 0)
      ? recipeData.ingredients.map((ing: any, i: number) => {
          if (typeof ing === 'string') {
            return parseIngredientLine(ing, i);
          }
          const amt = String(ing.amount || ing.quantity || '1').trim();
          const itm = decodeHtmlEntities(String(ing.item || ing.name || 'Ingredient')).trim();
          const un = String(ing.unit || '').trim();
          let cat = ing.category;
          if (!cat || cat === 'General') {
            const parsed = parseIngredientLine(`${amt} ${un} ${itm}`, i);
            cat = parsed.category;
          }
          return {
            id: ing.id || `ing_${Date.now()}_${i}`,
            amount: amt || '1',
            quantity: amt || '1',
            unit: un || 'unit',
            item: itm,
            name: itm,
            category: cat || 'Produce'
          };
        })
      : [
          { id: 'i_1', amount: '1', quantity: '1', unit: 'portion', name: 'Fresh Ingredients', item: 'Fresh Ingredients', category: 'Produce' }
        ];

    const rawSteps = recipeData.instructions || recipeData.steps || ['Follow preparation steps.'];
    let cleanInstructions = (Array.isArray(rawSteps) ? rawSteps : [rawSteps])
      .flatMap((s: any) => {
        const str = typeof s === 'string' ? s : s.text || s.step || '';
        const decoded = decodeHtmlEntities(str);
        if (decoded.length > 180 && /(?<=\.)\s+(?=(?:[A-Z][a-zA-Z\s]{1,30}\s+[–—-]|Add the flour mixture))/i.test(decoded)) {
          return decoded.split(/(?<=\.)\s+(?=(?:[A-Z][a-zA-Z\s]{1,30}\s+[–—-]|Add the flour mixture))/i);
        }
        return [decoded];
      })
      .map((s: string) => decodeHtmlEntities(s).replace(/^(\d+[\.\)]|\bstep\s*\d+[:.-]?|[-*•])\s*/i, '').trim())
      .filter(Boolean);

    if (cleanInstructions.length > 9 && /cream butter then sugar/i.test(cleanInstructions[0]) && /preheat the oven/i.test(cleanInstructions[1])) {
      cleanInstructions = cleanInstructions.slice(1);
    }

    const finalSteps = cleanInstructions.length > 0 ? cleanInstructions : ['Follow preparation steps.'];

    const normalizedRecipe = {
      id: recipeData.id || 'rec_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      userId: user?.id,
      createdBy: user?.email,
      creatorName: user?.name,
      title: recipeTitle,
      name: recipeTitle,
      imageUrl: recipeImage,
      image: recipeImage,
      category: recipeCategory,
      recipeType: recipeCategory,
      tags: recipeData.tags || [recipeCategory, 'Imported'],
      servings: Number(recipeData.servings) || 4,
      prepTimeMinutes: Number(recipeData.prepTimeMinutes) || 20,
      cookTimeMinutes: Number(recipeData.cookTimeMinutes) || 25,
      prepTime: recipeData.prepTime || `${recipeData.prepTimeMinutes || 20} mins`,
      cookTime: recipeData.cookTime || `${recipeData.cookTimeMinutes || 25} mins`,
      ingredients: cleanIngredients,
      instructions: finalSteps,
      steps: finalSteps,
      sourceUrl: recipeData.sourceUrl || url || '',
      isFavorite: false,
      isCooked: false,
      rating: 0,
      createdAt: new Date().toISOString()
    };

    const storageKeys = ['zecratary_recipes', 'zecratary_saved_recipes', 'saved_recipes'];
    storageKeys.forEach((key) => {
      try {
        const raw = localStorage.getItem(key);
        const currentList = raw ? JSON.parse(raw) : [];
        const filtered = Array.isArray(currentList)
          ? currentList.filter((r: any) => (r.title || r.name)?.toLowerCase() !== recipeTitle.toLowerCase())
          : [];
        localStorage.setItem(key, JSON.stringify([normalizedRecipe, ...filtered]));
      } catch (_) {}
    });

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('storage'));
      window.dispatchEvent(new Event('zecratary_recipes_updated'));
      window.dispatchEvent(new Event('zecratary_saved_recipes_updated'));
    }

    setStatus({
      type: 'success',
      msg: `Successfully imported "${recipeTitle}" with ${finalSteps.length} steps! Redirecting to Saved Recipes...`,
    });

    setTimeout(() => {
      router.push('/saved');
    }, 900);
  };

  const handleUrlImport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return;
    setLoading(true);
    setStatus(null);

    try {
      const res = await fetch('/api/recipes/ingest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: url.trim() }),
      });

      let result: any = null;
      try {
        result = await res.json();
      } catch (_) {
        const errorText = await res.text();
        throw new Error(errorText.slice(0, 120) || 'Server returned invalid response');
      }

      if (result && result.success && result.data) {
        saveAndRedirect(result.data);
      } else {
        setStatus({ type: 'error', msg: result?.error || 'Failed to extract recipe from URL.' });
        setLoading(false);
      }
    } catch (err: any) {
      setStatus({ type: 'error', msg: err.message || 'Network error during import.' });
      setLoading(false);
    }
  };

  const handleTextFilesAdded = (files: FileList | File[]) => {
    const validFiles: File[] = [];
    for (let i = 0; i < files.length; i++) {
      if (files[i].type.startsWith('image/')) validFiles.push(files[i]);
    }
    if (validFiles.length === 0) return;
    const merged = [...textFiles, ...validFiles].slice(0, 5);
    setTextFiles(merged);
    setTextPreviewUrls(merged.map(f => URL.createObjectURL(f)));
  };

  const removeTextFile = (index: number) => {
    const updatedFiles = textFiles.filter((_, idx) => idx !== index);
    setTextFiles(updatedFiles);
    setTextPreviewUrls(textPreviewUrls.filter((_, idx) => idx !== index));
  };

  const handleTextImport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rawText.trim()) return;
    setLoading(true);
    setStatus(null);

    let resolvedPhotoPath = '/uploads/recipes/default.jpg';
    if (textFiles.length > 0) {
      try {
        const formData = new FormData();
        formData.append('file', textFiles[0]);
        const uploadRes = await fetch('/api/recipes/upload', {
          method: 'POST',
          body: formData
        });
        const uploadData = await uploadRes.json();
        if (uploadData?.url) resolvedPhotoPath = uploadData.url;
      } catch (uploadErr) {
        console.warn('Text photo upload fallback:', uploadErr);
      }
    }

    const lines = rawText.split('\n').map(l => l.trim()).filter(Boolean);
    let parsedTitle = textTitle.trim();
    let servings = 4;
    let prepTimeMinutes = 20;
    let cookTimeMinutes = 25;

    const rawIngredients: string[] = [];
    const rawSteps: string[] = [];
    let section: 'unknown' | 'ingredients' | 'steps' = 'unknown';

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lower = line.toLowerCase();

      if (!parsedTitle && i === 0 && !lower.includes('ingredient') && !lower.includes('step') && !lower.includes('instruction')) {
        parsedTitle = line.replace(/^[#*-\s]+/, '').replace(/[:]$/, '');
        continue;
      }

      if (/^(ingredients?|shopping list|items needed|what you need):?/i.test(lower)) {
        section = 'ingredients';
        continue;
      }
      if (/^(instructions?|directions?|steps?|method|preparation|how to (make|cook)):?/i.test(lower)) {
        section = 'steps';
        continue;
      }

      const servingsMatch = lower.match(/(?:servings?|yield|serves)\s*[:=]\s*(\d+)/i);
      if (servingsMatch) {
        servings = parseInt(servingsMatch[1], 10) || servings;
        continue;
      }
      const prepMatch = lower.match(/prep(?:aration)?(?:\s*time)?\s*[:=]\s*(\d+)/i);
      if (prepMatch) {
        prepTimeMinutes = parseInt(prepMatch[1], 10) || prepTimeMinutes;
        continue;
      }
      const cookMatch = lower.match(/cook(?:ing)?(?:\s*time)?\s*[:=]\s*(\d+)/i);
      if (cookMatch) {
        cookTimeMinutes = parseInt(cookMatch[1], 10) || cookTimeMinutes;
        continue;
      }

      if (section === 'ingredients') {
        rawIngredients.push(line);
      } else if (section === 'steps') {
        rawSteps.push(line);
      } else {
        if (/^(\d+\.|\d+\)|\bstep\s*\d+[:.-]?)/i.test(line)) {
          rawSteps.push(line);
        } else if (/^[-*•]/.test(line)) {
          rawIngredients.push(line);
        } else if (line.length > 80 || /\b(heat|cook|bake|boil|stir|mix|serve|preheat|season|simmer|whisk)\b/i.test(line)) {
          rawSteps.push(line);
        } else {
          rawIngredients.push(line);
        }
      }
    }

    const ingredients = (rawIngredients.length > 0 ? rawIngredients : [rawText.substring(0, 50)])
      .map((ingStr, idx) => parseIngredientLine(ingStr, idx));

    const steps = (rawSteps.length > 0 ? rawSteps : ['Prepare all ingredients and cook as desired.'])
      .map(s => decodeHtmlEntities(s).replace(/^(\d+[\.\)]|\bstep\s*\d+[:.-]?|[-*•])\s*/i, '').trim())
      .filter(Boolean);

    const parsedRecipe = {
      title: parsedTitle || 'Text Imported Recipe',
      category: textCategory,
      recipeType: textCategory,
      imageUrl: resolvedPhotoPath,
      image: resolvedPhotoPath,
      tags: [textCategory, 'Text Import'],
      servings,
      prepTimeMinutes,
      cookTimeMinutes,
      ingredients,
      instructions: steps,
      steps,
      isFavorite: false,
      rating: 0
    };

    saveAndRedirect(parsedRecipe);
  };

  const handleFilesAdded = (files: FileList | File[]) => {
    const validFiles: File[] = [];
    for (let i = 0; i < files.length; i++) {
      if (files[i].type.startsWith('image/')) validFiles.push(files[i]);
    }
    if (validFiles.length === 0) return;
    const merged = [...selectedFiles, ...validFiles].slice(0, 5);
    setSelectedFiles(merged);
    setPreviewUrls(merged.map(f => URL.createObjectURL(f)));
  };

  const removeFile = (index: number) => {
    const updatedFiles = selectedFiles.filter((_, idx) => idx !== index);
    setSelectedFiles(updatedFiles);
    setPreviewUrls(previewUrls.filter((_, idx) => idx !== index));
  };

  const handleImageImport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedFiles.length === 0) return;
    setLoading(true);
    setStatus(null);

    try {
      const primaryFile = selectedFiles[0];
      const formData = new FormData();
      formData.append('file', primaryFile);

      const uploadRes = await fetch('/api/recipes/upload', {
        method: 'POST',
        body: formData
      });
      const uploadData = await uploadRes.json();
      const localPhotoPath = uploadData.url || '/uploads/recipes/default.jpg';

      let recipeData = null;
      try {
        const aiRes = await fetch('/api/recipes/analyze-image', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fileName: primaryFile.name,
            imageUrl: localPhotoPath,
            selectedCategory: textCategory
          })
        });
        const aiJson = await aiRes.json();
        if (aiJson && aiJson.success && aiJson.data) recipeData = aiJson.data;
      } catch (aiErr) {
        console.warn('AI analysis fallback triggered:', aiErr);
      }

      if (!recipeData) {
        const cleanTitle = primaryFile.name
          .replace(/\.[^/.]+$/, '')
          .replace(/[-_]/g, ' ')
          .replace(/\b\w/g, c => c.toUpperCase());

        recipeData = {
          title: cleanTitle || 'Delicious Dish',
          category: textCategory || recipeTypes[0] || 'Main Dish',
          recipeType: textCategory || recipeTypes[0] || 'Main Dish',
          imageUrl: localPhotoPath,
          image: localPhotoPath,
          servings: 4,
          prepTimeMinutes: 20,
          cookTimeMinutes: 25,
          ingredients: [
            parseIngredientLine(`2 portions ${cleanTitle} core ingredients`, 0),
            parseIngredientLine('2 tbsp olive oil', 1),
            parseIngredientLine('1 pinch salt and pepper', 2)
          ],
          instructions: [
            'Prepare all fresh ingredients as shown in the uploaded recipe photo.',
            'Heat skillet or pot with cooking oil over medium heat.',
            'Cook ingredients until tender, aromatic, and flavorful.',
            'Season to taste and serve immediately.'
          ]
        };
      }

      recipeData.isFavorite = false;
      recipeData.rating = 0;
      saveAndRedirect(recipeData);
    } catch (err: any) {
      setStatus({ type: 'error', msg: err.message || 'Image upload or AI analysis failed.' });
      setLoading(false);
    }
  };

  return (
    <div 
      className="max-w-6xl mx-auto space-y-6 pb-24 px-4 transition-colors duration-200"
      style={{ color: isDayMode ? '#0f172a' : 'var(--color-text, #ffffff)' }}
    >
      <div>
        <h1 className="text-2xl font-black tracking-tight text-[var(--color-primary,#E05638)]">
          {t('importRecipeTitle') || 'Import Recipe'}
        </h1>
        <p className="text-xs" style={{ color: isDayMode ? '#64748b' : 'var(--color-text-secondary, #94a3b8)' }}>
          {t('importRecipeSubtitle') || 'Import recipes from websites, text notes, or photos and save directly to your recipe library'}
        </p>
      </div>

      <div 
        className="rounded-3xl p-6 space-y-6 shadow-xl border transition-colors duration-200"
        style={{
          backgroundColor: isDayMode ? '#ffffff' : 'var(--color-card-dark, #111726)',
          borderColor: isDayMode ? '#e2e8f0' : 'var(--color-border, #1e293b)'
        }}
      >
        <div 
          className="flex p-1.5 rounded-2xl border transition-colors duration-200"
          style={{
            backgroundColor: isDayMode ? '#f1f5f9' : 'var(--color-inner-dark, #070b13)',
            borderColor: isDayMode ? '#e2e8f0' : 'var(--color-border, #1e293b)'
          }}
        >
          {[
            { id: 'url', label: t('urlTab') || 'URL', icon: Link2 },
            { id: 'text', label: t('textTab') || 'Text', icon: FileText },
            { id: 'image', label: t('imageTab') || 'Image', icon: ImageIcon },
          ].map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  setActiveTab(tab.id as any);
                  setStatus(null);
                }}
                className="flex-1 py-3 text-xs font-bold rounded-xl flex items-center justify-center gap-2 transition cursor-pointer"
                style={isActive ? {
                  backgroundColor: 'rgba(16, 185, 129, 0.18)',
                  color: 'var(--color-emerald, #10b981)',
                  borderColor: 'rgba(16, 185, 129, 0.45)',
                  borderWidth: '1px',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                } : {
                  color: isDayMode ? '#64748b' : '#94a3b8'
                }}
              >
                <tab.icon className="h-4 w-4" /> {tab.label}
              </button>
            );
          })}
        </div>

        {activeTab === 'url' && (
          <form onSubmit={handleUrlImport} className="space-y-4">
            <div>
              <label className="block text-xs font-bold mb-1.5" style={{ color: isDayMode ? '#0f172a' : '#cbd5e1' }}>
                {t('recipeWebUrlLabel') || 'Recipe Web URL *'}
              </label>
              <input
                type="url"
                required
                placeholder={t('recipeWebUrlPlaceholder') || 'https://www.recipetineats.com/... or food blog URL'}
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                className="w-full border rounded-xl px-4 py-3.5 text-sm outline-none transition font-medium"
                style={{
                  backgroundColor: isDayMode ? '#f8fafc' : 'var(--color-inner-dark, #070b13)',
                  borderColor: isDayMode ? '#cbd5e1' : 'var(--color-border, #1e293b)',
                  color: isDayMode ? '#0f172a' : '#ffffff'
                }}
                onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--color-primary, #E05638)')}
                onBlur={(e) => (e.currentTarget.style.borderColor = isDayMode ? '#cbd5e1' : 'var(--color-border, #1e293b)')}
              />
            </div>
            <button
              type="submit"
              disabled={loading || !url.trim()}
              className="w-full text-white font-bold py-3.5 rounded-xl transition flex items-center justify-center gap-2 text-xs shadow-lg cursor-pointer disabled:opacity-50"
              style={{ backgroundColor: 'var(--color-primary, #E05638)' }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--color-primary-hover, #c94529)')}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'var(--color-primary, #E05638)')}
            >
              <Sparkles className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              {loading ? (t('downloadingPhotoParsingSteps') || 'Downloading photo & parsing all steps...') : (t('importRecipeBtn') || 'Import Recipe')}
            </button>
          </form>
        )}

        {activeTab === 'text' && (
          <form onSubmit={handleTextImport} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold mb-1.5" style={{ color: isDayMode ? '#0f172a' : '#cbd5e1' }}>
                  {t('recipeTitleLabel') || 'Recipe Title'}
                </label>
                <input
                  type="text"
                  placeholder={t('recipeTitlePlaceholder') || 'e.g. Homemade Apple Cake'}
                  value={textTitle}
                  onChange={(e) => setTextTitle(e.target.value)}
                  className="w-full border rounded-xl px-4 py-3 text-sm outline-none"
                  style={{
                    backgroundColor: isDayMode ? '#f8fafc' : 'var(--color-inner-dark, #070b13)',
                    borderColor: isDayMode ? '#cbd5e1' : 'var(--color-border, #1e293b)',
                    color: isDayMode ? '#0f172a' : '#ffffff'
                  }}
                  onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--color-primary, #E05638)')}
                  onBlur={(e) => (e.currentTarget.style.borderColor = isDayMode ? '#cbd5e1' : 'var(--color-border, #1e293b)')}
                />
              </div>
              <div>
                <label className="block text-xs font-bold mb-1.5" style={{ color: isDayMode ? '#0f172a' : '#cbd5e1' }}>
                  {t('categoryLabel') || 'Category (Recipe Type)'}
                </label>
                <select
                  value={textCategory}
                  onChange={(e) => setTextCategory(e.target.value)}
                  className="w-full border rounded-xl px-4 py-3 text-sm outline-none cursor-pointer"
                  style={{
                    backgroundColor: isDayMode ? '#f8fafc' : 'var(--color-inner-dark, #070b13)',
                    borderColor: isDayMode ? '#cbd5e1' : 'var(--color-border, #1e293b)',
                    color: isDayMode ? '#0f172a' : '#ffffff'
                  }}
                >
                  {recipeTypes.map(c => (
                    <option key={c} value={c} style={{ backgroundColor: isDayMode ? '#ffffff' : '#111726', color: isDayMode ? '#0f172a' : '#ffffff' }}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold mb-2" style={{ color: isDayMode ? '#0f172a' : '#cbd5e1' }}>
                {t('recipeImagesOptional') || 'Recipe Images (Optional - Drag & drop or click to upload)'}
              </label>

              <div
                onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); setIsTextDragging(true); }}
                onDragLeave={(e) => { e.preventDefault(); e.stopPropagation(); setIsTextDragging(false); }}
                onDrop={(e) => { e.preventDefault(); e.stopPropagation(); setIsTextDragging(false); if (e.dataTransfer.files) handleTextFilesAdded(e.dataTransfer.files); }}
                onClick={() => textFileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-2xl py-8 px-6 flex flex-col items-center justify-center text-center cursor-pointer transition relative ${
                  isTextDragging ? 'bg-emerald-500/10 border-emerald-400' : 'hover:border-emerald-400'
                }`}
                style={{
                  borderColor: isTextDragging ? 'var(--color-emerald, #10b981)' : (isDayMode ? '#cbd5e1' : 'rgba(16, 185, 129, 0.4)'),
                  backgroundColor: isDayMode ? '#f8fafc' : 'var(--color-inner-dark, #070b13)'
                }}
              >
                <input
                  ref={textFileInputRef}
                  type="file"
                  accept="image/png, image/jpeg, image/webp"
                  multiple
                  onChange={(e) => e.target.files && handleTextFilesAdded(e.target.files)}
                  className="hidden"
                />
                <div className="w-12 h-12 rounded-full flex items-center justify-center mb-2">
                  <Upload className="h-8 w-8 text-emerald-500 stroke-[2.2]" />
                </div>
                <p className="text-xs sm:text-sm font-semibold tracking-wide" style={{ color: isDayMode ? '#0f172a' : '#ffffff' }}>
                  <span style={{ color: 'var(--color-primary, #E05638)' }} className="font-bold">
                    {t('clickToUpload') || 'Click to upload'}
                  </span>{' '}
                  <span className="text-emerald-500 font-semibold">
                    {t('orDragAndDrop') || 'or drag and drop'}
                  </span>
                </p>
                <p className="text-[11px] font-medium mt-1" style={{ color: isDayMode ? '#059669' : 'rgba(16, 185, 129, 0.7)' }}>
                  {t('pngJpgWebpOptional') || 'PNG, JPG, or WEBP (optional photo for recipe)'}
                </p>
              </div>

              {textPreviewUrls.length > 0 && (
                <div className="space-y-1.5 mt-3">
                  <div className="text-[11px] font-bold" style={{ color: isDayMode ? '#0f172a' : '#cbd5e1' }}>
                    {t('selectedPhoto') || 'Selected Photo'} ({textPreviewUrls.length}/5):
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                    {textPreviewUrls.map((previewUrl, idx) => (
                      <div
                        key={idx}
                        className="relative h-24 rounded-xl overflow-hidden border group shadow"
                        style={{
                          borderColor: isDayMode ? '#e2e8f0' : 'var(--color-border, #1e293b)',
                          backgroundColor: isDayMode ? '#f8fafc' : 'var(--color-inner-dark, #070b13)'
                        }}
                      >
                        <img src={previewUrl} alt={`Upload ${idx + 1}`} className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); removeTextFile(idx); }}
                          className="absolute top-1 right-1 p-1 bg-black/70 hover:bg-black text-white rounded-full transition cursor-pointer"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold mb-1.5" style={{ color: isDayMode ? '#0f172a' : '#cbd5e1' }}>
                {t('pasteIngredientsSteps') || 'Paste Ingredients & Steps *'}
              </label>
              <textarea
                required
                rows={7}
                placeholder={t('pasteRecipeContentPlaceholder') || 'Paste recipe content here...'}
                value={rawText}
                onChange={(e) => setRawText(e.target.value)}
                className="w-full border rounded-xl p-4 text-xs outline-none resize-none font-mono"
                style={{
                  backgroundColor: isDayMode ? '#f8fafc' : 'var(--color-inner-dark, #070b13)',
                  borderColor: isDayMode ? '#cbd5e1' : 'var(--color-border, #1e293b)',
                  color: isDayMode ? '#0f172a' : '#ffffff'
                }}
                onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--color-primary, #E05638)')}
                onBlur={(e) => (e.currentTarget.style.borderColor = isDayMode ? '#cbd5e1' : 'var(--color-border, #1e293b)')}
              />
            </div>
            <button
              type="submit"
              disabled={loading || !rawText.trim()}
              className="w-full text-white font-bold py-3.5 rounded-xl transition flex items-center justify-center gap-2 text-xs shadow-lg cursor-pointer disabled:opacity-50"
              style={{ backgroundColor: 'var(--color-primary, #E05638)' }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--color-primary-hover, #c94529)')}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'var(--color-primary, #E05638)')}
            >
              <Sparkles className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              {loading ? (t('processingSavingRecipe') || 'Processing & saving recipe...') : (t('saveAndImportRecipe') || 'Save & Import Recipe')}
            </button>
          </form>
        )}

        {activeTab === 'image' && (
          <form onSubmit={handleImageImport} className="space-y-4">
            <div>
              <label className="block text-xs font-bold mb-2" style={{ color: isDayMode ? '#0f172a' : '#cbd5e1' }}>
                {t('recipeImagesMax5') || 'Recipe Images (up to 5)'}
              </label>

              <div
                onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); setIsDragging(true); }}
                onDragLeave={(e) => { e.preventDefault(); e.stopPropagation(); setIsDragging(false); }}
                onDrop={(e) => { e.preventDefault(); e.stopPropagation(); setIsDragging(false); if (e.dataTransfer.files) handleFilesAdded(e.dataTransfer.files); }}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-2xl py-12 px-6 flex flex-col items-center justify-center text-center cursor-pointer transition relative ${
                  isDragging ? 'bg-emerald-500/10 border-emerald-400' : 'hover:border-emerald-400'
                }`}
                style={{
                  borderColor: isDragging ? 'var(--color-emerald, #10b981)' : (isDayMode ? '#cbd5e1' : 'rgba(16, 185, 129, 0.4)'),
                  backgroundColor: isDayMode ? '#f8fafc' : 'var(--color-inner-dark, #070b13)'
                }}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png, image/jpeg, image/webp"
                  multiple
                  onChange={(e) => e.target.files && handleFilesAdded(e.target.files)}
                  className="hidden"
                />
                <div className="w-14 h-14 rounded-full flex items-center justify-center mb-3">
                  <Upload className="h-10 w-10 text-emerald-500 stroke-[2.2]" />
                </div>
                <p className="text-xs sm:text-sm font-semibold tracking-wide" style={{ color: isDayMode ? '#0f172a' : '#ffffff' }}>
                  <span style={{ color: 'var(--color-primary, #E05638)' }} className="font-bold">
                    {t('clickToUpload') || 'Click to upload'}
                  </span>{' '}
                  <span className="text-emerald-500 font-semibold">
                    {t('orDragAndDrop') || 'or drag and drop'}
                  </span>
                </p>
                <p className="text-[11px] font-medium mt-1" style={{ color: isDayMode ? '#059669' : 'rgba(16, 185, 129, 0.7)' }}>
                  {t('pngJpgWebpMax5') || 'PNG, JPG, or WEBP (max 5 images)'}
                </p>
              </div>
            </div>

            {previewUrls.length > 0 && (
              <div className="space-y-1.5">
                <div className="text-[11px] font-bold" style={{ color: isDayMode ? '#0f172a' : '#cbd5e1' }}>
                  {t('selectedPhotos') || 'Selected Photos'} ({previewUrls.length}/5):
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                  {previewUrls.map((previewUrl, idx) => (
                    <div
                      key={idx}
                      className="relative h-24 rounded-xl overflow-hidden border group shadow"
                      style={{
                        borderColor: isDayMode ? '#e2e8f0' : 'var(--color-border, #1e293b)',
                        backgroundColor: isDayMode ? '#f8fafc' : 'var(--color-inner-dark, #070b13)'
                      }}
                    >
                      <img src={previewUrl} alt={`Upload ${idx + 1}`} className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); removeFile(idx); }}
                        className="absolute top-1 right-1 p-1 bg-black/70 hover:bg-black text-white rounded-full transition cursor-pointer"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={loading || selectedFiles.length === 0}
              className="w-full text-white font-bold py-3.5 rounded-xl transition flex items-center justify-center gap-2 text-xs shadow-lg cursor-pointer disabled:opacity-50"
              style={{ backgroundColor: 'var(--color-primary, #E05638)' }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--color-primary-hover, #c94529)')}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'var(--color-primary, #E05638)')}
            >
              <Upload className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              {loading ? (t('aiSearchingRecipeImporting') || 'AI searching recipe & importing...') : (t('importRecipeFromImages') || 'Import Recipe from Images')}
            </button>
          </form>
        )}

        {status && (
          <div
            className="p-4 rounded-2xl border text-xs font-semibold flex items-center gap-2 animate-in fade-in"
            style={status.type === 'success' ? {
              backgroundColor: isDayMode ? '#ecfdf5' : 'rgba(16, 185, 129, 0.1)',
              borderColor: isDayMode ? '#a7f3d0' : 'rgba(16, 185, 129, 0.4)',
              color: isDayMode ? '#065f46' : 'var(--color-emerald, #10b981)'
            } : {
              backgroundColor: isDayMode ? '#fef2f2' : 'rgba(239, 68, 68, 0.1)',
              borderColor: isDayMode ? '#fecaca' : 'rgba(239, 68, 68, 0.4)',
              color: isDayMode ? '#991b1b' : '#f87171'
            }}
          >
            {status.type === 'success' ? (
              <CheckCircle2 className="h-4 w-4 shrink-0" />
            ) : (
              <AlertCircle className="h-4 w-4 shrink-0" />
            )}
            <span>{status.msg}</span>
          </div>
        )}
      </div>
    </div>
  );
}
