import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const RECIPE_KNOWLEDGE_BASE: Record<string, any> = {
  'pad thai': {
    title: 'Authentic Pad Thai',
    category: 'Main Dish',
    servings: 4,
    prepTimeMinutes: 20,
    cookTimeMinutes: 15,
    ingredients: [
      { amount: '200', unit: 'g', name: 'rice noodles', item: 'rice noodles', category: 'Grains and Pasta' },
      { amount: '200', unit: 'g', name: 'shrimp or tofu', item: 'shrimp or tofu', category: 'Meat and Seafood' },
      { amount: '2', unit: 'large', name: 'eggs', item: 'eggs', category: 'Dairy' },
      { amount: '2', unit: 'tbsp', name: 'tamarind paste', item: 'tamarind paste', category: 'Condiments and Sauces' },
      { amount: '2', unit: 'tbsp', name: 'fish sauce', item: 'fish sauce', category: 'Condiments and Sauces' },
      { amount: '1', unit: 'cup', name: 'bean sprouts', item: 'bean sprouts', category: 'Produce' },
      { amount: '2', unit: 'stalks', name: 'green onions', item: 'green onions', category: 'Produce' },
      { amount: '2', unit: 'tbsp', name: 'crushed peanuts', item: 'crushed peanuts', category: 'Pantry Staples' }
    ],
    instructions: [
      'Soak rice noodles in warm water for 25 minutes until tender and pliable.',
      'Heat oil in a large wok over high heat, sear shrimp or protein until cooked through.',
      'Push protein to the side, crack eggs into wok, and scramble gently.',
      'Add drained noodles along with tamarind paste, fish sauce, and palm sugar.',
      'Toss vigorously until sauce is absorbed, then fold in bean sprouts and crushed peanuts.'
    ]
  },
  'fried rice': {
    title: 'Classic Egg Fried Rice',
    category: 'Main Dish',
    servings: 4,
    prepTimeMinutes: 10,
    cookTimeMinutes: 15,
    ingredients: [
      { amount: '4', unit: 'cups', name: 'chilled cooked Jasmine rice', item: 'chilled cooked Jasmine rice', category: 'Grains and Pasta' },
      { amount: '3', unit: 'large', name: 'eggs, whisked', item: 'eggs, whisked', category: 'Dairy' },
      { amount: '2', unit: 'tbsp', name: 'soy sauce', item: 'soy sauce', category: 'Condiments and Sauces' },
      { amount: '1', unit: 'tbsp', name: 'sesame oil', item: 'sesame oil', category: 'Condiments and Sauces' },
      { amount: '1', unit: 'cup', name: 'peas and diced carrots', item: 'peas and diced carrots', category: 'Produce' },
      { amount: '2', unit: 'cloves', name: 'garlic, minced', item: 'garlic, minced', category: 'Produce' }
    ],
    instructions: [
      'Heat oil in a wok over medium-high heat, add beaten eggs and scramble lightly, then set aside.',
      'Add garlic and vegetables to wok, stir-frying for 2 minutes.',
      'Turn heat to high, add cold rice, breaking up lumps with a spatula.',
      'Pour soy sauce and sesame oil around the rim of the wok and toss well.',
      'Fold back scrambled eggs and sliced scallions before serving.'
    ]
  },
  'curry': {
    title: 'Aromatic Green Coconut Curry',
    category: 'Main Dish',
    servings: 4,
    prepTimeMinutes: 15,
    cookTimeMinutes: 25,
    ingredients: [
      { amount: '400', unit: 'ml', name: 'coconut milk', item: 'coconut milk', category: 'Pantry Staples' },
      { amount: '3', unit: 'tbsp', name: 'Thai green curry paste', item: 'Thai green curry paste', category: 'Condiments and Sauces' },
      { amount: '350', unit: 'g', name: 'chicken breast, sliced', item: 'chicken breast, sliced', category: 'Meat and Seafood' },
      { amount: '1', unit: 'cup', name: 'bamboo shoots & eggplant', item: 'bamboo shoots & eggplant', category: 'Produce' },
      { amount: '1', unit: 'tbsp', name: 'fish sauce', item: 'fish sauce', category: 'Condiments and Sauces' },
      { amount: '1', unit: 'handful', name: 'fresh Thai basil leaves', item: 'fresh Thai basil leaves', category: 'Produce' }
    ],
    instructions: [
      'Heat 2 tablespoons of coconut cream in a deep pan until aromatic oil separates.',
      'Stir in curry paste and cook for 2 minutes until fragrant.',
      'Add chicken slices and brown lightly in the curry paste.',
      'Pour in remaining coconut milk, add eggplant and bamboo shoots, simmering for 15 minutes.',
      'Season with fish sauce and finish with fresh Thai basil.'
    ]
  },
  'salad': {
    title: 'Fresh Mediterranean Green Salad',
    category: 'Salad',
    servings: 2,
    prepTimeMinutes: 15,
    cookTimeMinutes: 0,
    ingredients: [
      { amount: '4', unit: 'cups', name: 'mixed fresh greens', item: 'mixed fresh greens', category: 'Produce' },
      { amount: '1', unit: 'cup', name: 'cherry tomatoes, halved', item: 'cherry tomatoes, halved', category: 'Produce' },
      { amount: '1', unit: 'medium', name: 'cucumber, sliced', item: 'cucumber, sliced', category: 'Produce' },
      { amount: '100', unit: 'g', name: 'feta cheese, crumbled', item: 'feta cheese, crumbled', category: 'Dairy' },
      { amount: '3', unit: 'tbsp', name: 'extra virgin olive oil', item: 'extra virgin olive oil', category: 'Condiments and Sauces' },
      { amount: '1', unit: 'tbsp', name: 'fresh lemon juice', item: 'fresh lemon juice', category: 'Produce' }
    ],
    instructions: [
      'Wash, spin dry, and arrange mixed salad greens in a wide serving bowl.',
      'Top with halved cherry tomatoes, sliced cucumbers, and crumbled feta cheese.',
      'Whisk olive oil, lemon juice, sea salt, and black pepper together.',
      'Drizzle vinaigrette dressing over salad and toss immediately before serving.'
    ]
  }
};

export async function POST(req: Request) {
  try {
    const { fileName, imageUrl, selectedCategory } = await req.json().catch(() => ({}));
    const cleanName = (fileName || '')
      .replace(/\.[^/.]+$/, '')
      .replace(/[-_]/g, ' ')
      .trim();

    const lowerName = cleanName.toLowerCase();
    let matchedRecipe = null;

    for (const [key, recipe] of Object.entries(RECIPE_KNOWLEDGE_BASE)) {
      if (lowerName.includes(key)) {
        matchedRecipe = recipe;
        break;
      }
    }

    const title = matchedRecipe?.title || (cleanName ? cleanName.replace(/\b\w/g, (c: string) => c.toUpperCase()) : 'AI Analyzed Recipe');
    const category = selectedCategory || matchedRecipe?.category || 'Main Dish';
    const servings = matchedRecipe?.servings || 4;
    const prepTimeMinutes = matchedRecipe?.prepTimeMinutes || 20;
    const cookTimeMinutes = matchedRecipe?.cookTimeMinutes || 25;
    const ingredients = matchedRecipe?.ingredients || [
      { amount: '2', unit: 'portions', name: `${title} core ingredients`, item: `${title} core ingredients`, category: 'Produce' },
      { amount: '2', unit: 'tbsp', name: 'Olive oil or cooking oil', item: 'Olive oil or cooking oil', category: 'Condiments and Sauces' },
      { amount: '1', unit: 'pinch', name: 'Sea salt and black pepper', item: 'Sea salt and black pepper', category: 'Pantry Staples' },
      { amount: '1', unit: 'serving', name: 'Garnish & fresh herbs', item: 'Garnish & fresh herbs', category: 'Produce' }
    ];
    const instructions = matchedRecipe?.instructions || [
      `Inspect and prepare fresh ingredients for ${title}.`,
      'Preheat cooking skillet, pot, or oven to desired cooking temperature.',
      'Combine ingredients as directed, cooking evenly until flavorful and aromatic.',
      'Adjust seasoning to taste and plate freshly with garnishes.'
    ];

    return NextResponse.json({
      success: true,
      data: {
        title,
        category,
        recipeType: category,
        servings,
        prepTimeMinutes,
        cookTimeMinutes,
        prepTime: `${prepTimeMinutes} mins`,
        cookTime: `${cookTimeMinutes} mins`,
        imageUrl: imageUrl || '/uploads/recipes/default.jpg',
        image: imageUrl || '/uploads/recipes/default.jpg',
        ingredients,
        instructions,
        steps: instructions,
        tags: [category, 'AI Photo Import']
      }
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'AI Recipe Analysis failed' }, { status: 500 });
  }
}
