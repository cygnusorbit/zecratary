import os
import glob

candidates = ['apps/web/src/app/planner/page.tsx', 'src/app/planner/page.tsx', 'app/planner/page.tsx']
planner_path = next((p for p in candidates if os.path.exists(p)), None)

if not planner_path:
    matches = glob.glob('**/planner/page.tsx', recursive=True)
    if matches:
        planner_path = matches[0]

if not planner_path:
    print("Error: Could not locate planner/page.tsx")
    exit(1)

with open(planner_path, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Add recipe detail modal state if not present
if 'selectedRecipeDetailModal' not in content:
    state_target = "const [showShoppingListModal, setShowShoppingListModal] = useState(false);"
    state_addition = "\n  const [selectedRecipeDetailModal, setSelectedRecipeDetailModal] = useState<any | null>(null);"
    content = content.replace(state_target, state_target + state_addition)

# 2. Update meal card click handler to open recipe details
# Let's target the meal card flex container or make the image/title clickable
old_meal_card_inner = """                      <div className="flex items-center gap-3.5 min-w-0">
                        <img 
                          src={meal.image || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=200&q=80'} 
                          alt={meal.recipeName}
                          className="w-14 h-14 rounded-xl object-cover border shadow-xs shrink-0" 
                          style={{ borderColor: isDayMode ? '#cbd5e1' : 'var(--color-border, #1e293b)' }}
                        />
                        <div className="space-y-1 min-w-0">"""

new_meal_card_inner = """                      <div 
                        className="flex items-center gap-3.5 min-w-0 cursor-pointer group"
                        onClick={() => {
                          const found = savedRecipes.find(r => r.id === meal.recipeId || r.name === meal.recipeName || r.title === meal.recipeName);
                          setSelectedRecipeDetailModal(found || {
                            title: meal.recipeName,
                            name: meal.recipeName,
                            image: meal.image,
                            imageUrl: meal.image,
                            category: meal.mealType,
                            description: meal.notes || 'Planned meal from calendar.',
                            ingredients: [],
                            instructions: 'No detailed instructions provided for this planned custom meal.'
                          });
                        }}
                        title="Click to view full recipe details"
                      >
                        <img 
                          src={meal.image || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=200&q=80'} 
                          alt={meal.recipeName}
                          className="w-14 h-14 rounded-xl object-cover border shadow-xs shrink-0 group-hover:scale-105 transition" 
                          style={{ borderColor: isDayMode ? '#cbd5e1' : 'var(--color-border, #1e293b)' }}
                        />
                        <div className="space-y-1 min-w-0">"""

content = content.replace(old_meal_card_inner, new_meal_card_inner)

# Also make the recipe name itself have group-hover:underline
content = content.replace(
    'className="text-sm font-bold leading-snug truncate"',
    'className="text-sm font-bold leading-snug truncate group-hover:underline"'
)

# 3. Inject Recipe Details Popup Modal right before the end of the return statement (e.g. before the last closing </div>)
modal_jsx = """
      {/* FULL RECIPE DETAILS POPUP MODAL */}
      {selectedRecipeDetailModal && (
        <div 
          onClick={() => setSelectedRecipeDetailModal(null)}
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[80] flex items-center justify-center p-4 cursor-pointer"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="border rounded-3xl max-w-2xl w-full p-6 sm:p-8 space-y-6 shadow-2xl relative max-h-[90vh] flex flex-col animate-in fade-in cursor-default transition-colors duration-200 text-xs"
            style={{
              backgroundColor: isDayMode ? '#ffffff' : 'var(--color-card, #0b0e14)',
              borderColor: isDayMode ? '#cbd5e1' : 'var(--color-border, #1e293b)',
              color: isDayMode ? '#0f172a' : '#ffffff'
            }}
          >
            <button 
              onClick={() => setSelectedRecipeDetailModal(null)} 
              className="absolute top-5 right-5 p-2 rounded-xl transition cursor-pointer shadow-xs"
              style={{
                backgroundColor: isDayMode ? '#f1f5f9' : 'var(--color-inner-dark, #172033)',
                color: isDayMode ? '#0f172a' : '#cbd5e1'
              }}
            >
              <X className="h-4 w-4" />
            </button>

            <div className="flex items-center gap-4 border-b pb-5 pr-10" style={{ borderColor: isDayMode ? '#e2e8f0' : 'var(--color-border, #1e293b)' }}>
              <img 
                src={selectedRecipeDetailModal.image || selectedRecipeDetailModal.imageUrl || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=400&q=80'} 
                alt={selectedRecipeDetailModal.title || selectedRecipeDetailModal.name}
                className="w-20 h-20 rounded-2xl object-cover border shadow-md shrink-0"
                style={{ borderColor: isDayMode ? '#cbd5e1' : 'var(--color-border, #1e293b)' }}
              />
              <div className="space-y-1.5 min-w-0">
                <span 
                  className="text-[10px] font-black uppercase px-2.5 py-0.5 rounded-md tracking-wider"
                  style={{ backgroundColor: 'var(--color-primary, #E05638)', color: '#ffffff' }}
                >
                  {selectedRecipeDetailModal.category || 'Recipe Details'}
                </span>
                <h2 className="text-xl font-black truncate" style={{ color: isDayMode ? '#0f172a' : '#ffffff' }}>
                  {selectedRecipeDetailModal.title || selectedRecipeDetailModal.name}
                </h2>
                {selectedRecipeDetailModal.prepTime && (
                  <div className="flex items-center gap-3 text-[11px]" style={{ color: isDayMode ? '#64748b' : '#94a3b8' }}>
                    <span className="flex items-center gap-1">⏰ Prep: {selectedRecipeDetailModal.prepTime}</span>
                    {selectedRecipeDetailModal.cookTime && <span>🔥 Cook: {selectedRecipeDetailModal.cookTime}</span>}
                    {selectedRecipeDetailModal.servings && <span>🍽️ Servings: {selectedRecipeDetailModal.servings}</span>}
                  </div>
                )}
              </div>
            </div>

            <div className="overflow-y-auto flex-1 space-y-5 pr-1">
              {selectedRecipeDetailModal.description && (
                <p className="leading-relaxed text-xs" style={{ color: isDayMode ? '#475569' : '#cbd5e1' }}>
                  {selectedRecipeDetailModal.description}
                </p>
              )}

              {/* Ingredients */}
              <div className="space-y-2">
                <h3 className="font-bold text-sm" style={{ color: 'var(--color-primary, #E05638)' }}>Ingredients</h3>
                {selectedRecipeDetailModal.ingredients && selectedRecipeDetailModal.ingredients.length > 0 ? (
                  <div 
                    className="border rounded-2xl p-4 space-y-2"
                    style={{
                      backgroundColor: isDayMode ? '#f8fafc' : 'var(--color-inner-dark, #07090e)',
                      borderColor: isDayMode ? '#e2e8f0' : 'var(--color-border, #1e293b)'
                    }}
                  >
                    {selectedRecipeDetailModal.ingredients.map((ing: any, idx: number) => {
                      const ingText = typeof ing === 'string' ? ing : `${ing.amount || ing.quantity || ''} ${ing.unit || ''} ${ing.name || ing.item || ''}`.trim();
                      return (
                        <div key={idx} className="flex items-center gap-2.5">
                          <Check className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                          <span style={{ color: isDayMode ? '#0f172a' : '#ffffff' }}>{ingText}</span>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="italic text-xs" style={{ color: isDayMode ? '#64748b' : '#94a3b8' }}>No ingredient list specified for this item.</p>
                )}
              </div>

              {/* Instructions */}
              <div className="space-y-2">
                <h3 className="font-bold text-sm" style={{ color: 'var(--color-primary, #E05638)' }}>Instructions</h3>
                <div 
                  className="border rounded-2xl p-4 space-y-3"
                  style={{
                    backgroundColor: isDayMode ? '#f8fafc' : 'var(--color-inner-dark, #07090e)',
                    borderColor: isDayMode ? '#e2e8f0' : 'var(--color-border, #1e293b)'
                  }}
                >
                  {Array.isArray(selectedRecipeDetailModal.instructions) ? (
                    selectedRecipeDetailModal.instructions.map((step: string, idx: number) => (
                      <div key={idx} className="flex items-start gap-3">
                        <span 
                          className="w-5 h-5 rounded-full font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5 text-white"
                          style={{ backgroundColor: 'var(--color-primary, #E05638)' }}
                        >
                          {idx + 1}
                        </span>
                        <span className="leading-relaxed" style={{ color: isDayMode ? '#0f172a' : '#ffffff' }}>{step}</span>
                      </div>
                    ))
                  ) : typeof selectedRecipeDetailModal.instructions === 'string' ? (
                    <p className="leading-relaxed whitespace-pre-line" style={{ color: isDayMode ? '#0f172a' : '#ffffff' }}>
                      {selectedRecipeDetailModal.instructions}
                    </p>
                  ) : (
                    <p className="italic text-xs" style={{ color: isDayMode ? '#64748b' : '#94a3b8' }}>No step-by-step instructions available.</p>
                  )}
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-4 border-t" style={{ borderColor: isDayMode ? '#e2e8f0' : 'var(--color-border, #1e293b)' }}>
              <button
                type="button"
                onClick={() => setSelectedRecipeDetailModal(null)}
                className="py-2.5 px-6 text-white font-bold rounded-xl text-xs transition shadow-md cursor-pointer"
                style={{ backgroundColor: 'var(--color-primary, #E05638)' }}
              >
                Close Details
              </button>
            </div>
          </div>
        </div>
      )}
"""

if '{/* FULL RECIPE DETAILS POPUP MODAL */}' not in content:
    # Insert before the final closing </div> of the main component return
    last_div_idx = content.rfind('</div>')
    if last_div_idx != -1:
        content = content[:last_div_idx] + modal_jsx + "\n" + content[last_div_idx:]

with open(planner_path, 'w', encoding='utf-8') as f:
    f.write(content)

print(f"Successfully patched {planner_path} with full recipe details modal popup on card click.")
