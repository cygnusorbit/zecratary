import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const DEFAULT_SYSTEM_LANGUAGES = [
  { id: 'lang_en', code: 'en', name: 'English', native: 'English', flag: '🇺🇸', direction: 'ltr', status: 'active', is_default: true, file: 'en.ts' },
  { id: 'lang_es', code: 'es', name: 'Spanish', native: 'Español', flag: '🇪🇸', direction: 'ltr', status: 'active', is_default: false, file: 'es.ts' },
  { id: 'lang_fr', code: 'fr', name: 'French', native: 'Français', flag: '🇫🇷', direction: 'ltr', status: 'active', is_default: false, file: 'fr.ts' },
  { id: 'lang_th', code: 'th', name: 'Thai', native: 'ไทย', flag: '🇹🇭', direction: 'ltr', status: 'active', is_default: false, file: 'th.ts' }
];

function getLocalFileLanguages(): any[] | null {
  for (const rel of ['apps/web/data/admin_settings.json', 'data/admin_settings.json']) {
    try {
      const p = path.join(process.cwd(), rel);
      if (fs.existsSync(p)) {
        const raw = JSON.parse(fs.readFileSync(p, 'utf8'));
        const langs = raw.supportedLanguages || raw.supported_languages;
        if (Array.isArray(langs) && langs.length > 0) return langs;
      }
    } catch (_) {}
  }
  return null;
}


// Auto-registered Recipe Type keys
const RECIPE_TYPE_TRANSLATIONS = {
  "en": {
    "recipeTypesTitle": "Recipe Types",
    "recipeTypesSubtitle": "Manage culinary meal classifications, dish types, and ordering for recipe generation and filters.",
    "addRecipeType": "Add Recipe Type",
    "enterRecipeTypeName": "Enter recipe type name (e.g. Woodfired Pizza, Breakfast, Appetiser)...",
    "reposition": "Reposition",
    "doneRepositioning": "Done",
    "saveOrder": "Save Order",
    "savingOrder": "Saving Order...",
    "orderSavedSuccess": "Recipe type display order updated successfully.",
    "typeAddedSuccess": "New recipe type added successfully.",
    "typeUpdatedSuccess": "Recipe type updated successfully.",
    "typeDeletedSuccess": "Recipe type deleted successfully.",
    "deleteTypeConfirm": "Are you sure you want to delete this recipe type? This cannot be undone.",
    "searchRecipeTypes": "Search recipe types...",
    "totalTypes": "Total Types",
    "activeStatus": "Active",
    "inactiveStatus": "Inactive",
    "noRecipeTypesFound": "No recipe types found matching your query.",
    "editRecipeType": "Edit Recipe Type",
    "cancel": "Cancel",
    "save": "Save",
    "saving": "Saving...",
    "dragToReorder": "Drag to reorder or use the arrow buttons to move up and down.",
    "moveUp": "Move Up",
    "moveDown": "Move Down",
    "defaultBadge": "Default",
    "customBadge": "Custom",
    "resetDefaults": "Reset to Defaults",
    "resetDefaultsConfirm": "Are you sure you want to reset recipe types to system default categories?",
    "resetDefaultsSuccess": "Recipe types reset to defaults successfully.",
    "recipeTypePlaceholder": "e.g. Woodfired Pizza",
    "iconLabel": "Icon / Emoji",
    "descriptionLabel": "Description (Optional)",
    "descriptionPlaceholder": "Brief description of this culinary dish category...",
    "typeNameRequired": "Recipe type name is required.",
    "typeNameDuplicate": "A recipe type with this name already exists.",
    "cannotDeleteDefault": "Cannot delete default system recipe type."
  },
  "th": {
    "recipeTypesTitle": "\u0e1b\u0e23\u0e30\u0e40\u0e20\u0e17\u0e2a\u0e39\u0e15\u0e23\u0e2d\u0e32\u0e2b\u0e32\u0e23",
    "recipeTypesSubtitle": "\u0e08\u0e31\u0e14\u0e01\u0e32\u0e23\u0e1b\u0e23\u0e30\u0e40\u0e20\u0e17\u0e2d\u0e32\u0e2b\u0e32\u0e23 \u0e01\u0e32\u0e23\u0e08\u0e31\u0e14\u0e2b\u0e21\u0e27\u0e14\u0e2b\u0e21\u0e39\u0e48\u0e2d\u0e32\u0e2b\u0e32\u0e23 \u0e41\u0e25\u0e30\u0e25\u0e33\u0e14\u0e31\u0e1a\u0e01\u0e32\u0e23\u0e41\u0e2a\u0e14\u0e07\u0e1c\u0e25\u0e2a\u0e33\u0e2b\u0e23\u0e31\u0e1a\u0e15\u0e31\u0e27\u0e01\u0e23\u0e2d\u0e07\u0e41\u0e25\u0e30\u0e23\u0e30\u0e1a\u0e1a\u0e41\u0e19\u0e30\u0e19\u0e33\u0e2a\u0e39\u0e15\u0e23\u0e2d\u0e32\u0e2b\u0e32\u0e23",
    "addRecipeType": "\u0e40\u0e1e\u0e34\u0e48\u0e21\u0e1b\u0e23\u0e30\u0e40\u0e20\u0e17\u0e2a\u0e39\u0e15\u0e23\u0e2d\u0e32\u0e2b\u0e32\u0e23",
    "enterRecipeTypeName": "\u0e23\u0e30\u0e1a\u0e38\u0e0a\u0e37\u0e48\u0e2d\u0e1b\u0e23\u0e30\u0e40\u0e20\u0e17\u0e2a\u0e39\u0e15\u0e23\u0e2d\u0e32\u0e2b\u0e32\u0e23 (\u0e40\u0e0a\u0e48\u0e19 \u0e1e\u0e34\u0e0b\u0e0b\u0e48\u0e32\u0e40\u0e15\u0e32\u0e16\u0e48\u0e32\u0e19, \u0e2d\u0e32\u0e2b\u0e32\u0e23\u0e40\u0e0a\u0e49\u0e32, \u0e2d\u0e32\u0e2b\u0e32\u0e23\u0e27\u0e48\u0e32\u0e07)...",
    "reposition": "\u0e08\u0e31\u0e14\u0e40\u0e23\u0e35\u0e22\u0e07\u0e25\u0e33\u0e14\u0e31\u0e1a",
    "doneRepositioning": "\u0e40\u0e2a\u0e23\u0e47\u0e08\u0e2a\u0e34\u0e49\u0e19",
    "saveOrder": "\u0e1a\u0e31\u0e19\u0e17\u0e36\u0e01\u0e25\u0e33\u0e14\u0e31\u0e1a",
    "savingOrder": "\u0e01\u0e33\u0e25\u0e31\u0e07\u0e1a\u0e31\u0e19\u0e17\u0e36\u0e01\u0e25\u0e33\u0e14\u0e31\u0e1a...",
    "orderSavedSuccess": "\u0e2d\u0e31\u0e1b\u0e40\u0e14\u0e15\u0e25\u0e33\u0e14\u0e31\u0e1a\u0e01\u0e32\u0e23\u0e41\u0e2a\u0e14\u0e07\u0e1b\u0e23\u0e30\u0e40\u0e20\u0e17\u0e2a\u0e39\u0e15\u0e23\u0e2d\u0e32\u0e2b\u0e32\u0e23\u0e40\u0e23\u0e35\u0e22\u0e1a\u0e23\u0e49\u0e2d\u0e22\u0e41\u0e25\u0e49\u0e27",
    "typeAddedSuccess": "\u0e40\u0e1e\u0e34\u0e48\u0e21\u0e1b\u0e23\u0e30\u0e40\u0e20\u0e17\u0e2a\u0e39\u0e15\u0e23\u0e2d\u0e32\u0e2b\u0e32\u0e23\u0e43\u0e2b\u0e21\u0e48\u0e40\u0e23\u0e35\u0e22\u0e1a\u0e23\u0e49\u0e2d\u0e22\u0e41\u0e25\u0e49\u0e27",
    "typeUpdatedSuccess": "\u0e2d\u0e31\u0e1b\u0e40\u0e14\u0e15\u0e1b\u0e23\u0e30\u0e40\u0e20\u0e17\u0e2a\u0e39\u0e15\u0e23\u0e2d\u0e32\u0e2b\u0e32\u0e23\u0e40\u0e23\u0e35\u0e22\u0e1a\u0e23\u0e49\u0e2d\u0e22\u0e41\u0e25\u0e49\u0e27",
    "typeDeletedSuccess": "\u0e25\u0e1a\u0e1b\u0e23\u0e30\u0e40\u0e20\u0e17\u0e2a\u0e39\u0e15\u0e23\u0e2d\u0e32\u0e2b\u0e32\u0e23\u0e40\u0e23\u0e35\u0e22\u0e1a\u0e23\u0e49\u0e2d\u0e22\u0e41\u0e25\u0e49\u0e27",
    "deleteTypeConfirm": "\u0e04\u0e38\u0e13\u0e41\u0e19\u0e48\u0e43\u0e08\u0e2b\u0e23\u0e37\u0e2d\u0e44\u0e21\u0e48\u0e27\u0e48\u0e32\u0e15\u0e49\u0e2d\u0e07\u0e01\u0e32\u0e23\u0e25\u0e1a\u0e1b\u0e23\u0e30\u0e40\u0e20\u0e17\u0e2a\u0e39\u0e15\u0e23\u0e2d\u0e32\u0e2b\u0e32\u0e23\u0e19\u0e35\u0e49? \u0e01\u0e32\u0e23\u0e14\u0e33\u0e40\u0e19\u0e34\u0e19\u0e01\u0e32\u0e23\u0e19\u0e35\u0e49\u0e44\u0e21\u0e48\u0e2a\u0e32\u0e21\u0e32\u0e23\u0e16\u0e22\u0e01\u0e40\u0e25\u0e34\u0e01\u0e44\u0e14\u0e49",
    "searchRecipeTypes": "\u0e04\u0e49\u0e19\u0e2b\u0e32\u0e1b\u0e23\u0e30\u0e40\u0e20\u0e17\u0e2a\u0e39\u0e15\u0e23\u0e2d\u0e32\u0e2b\u0e32\u0e23...",
    "totalTypes": "\u0e1b\u0e23\u0e30\u0e40\u0e20\u0e17\u0e17\u0e31\u0e49\u0e07\u0e2b\u0e21\u0e14",
    "activeStatus": "\u0e43\u0e0a\u0e49\u0e07\u0e32\u0e19",
    "inactiveStatus": "\u0e44\u0e21\u0e48\u0e43\u0e0a\u0e49\u0e07\u0e32\u0e19",
    "noRecipeTypesFound": "\u0e44\u0e21\u0e48\u0e1e\u0e1a\u0e1b\u0e23\u0e30\u0e40\u0e20\u0e17\u0e2a\u0e39\u0e15\u0e23\u0e2d\u0e32\u0e2b\u0e32\u0e23\u0e17\u0e35\u0e48\u0e04\u0e49\u0e19\u0e2b\u0e32",
    "editRecipeType": "\u0e41\u0e01\u0e49\u0e44\u0e02\u0e1b\u0e23\u0e30\u0e40\u0e20\u0e17\u0e2a\u0e39\u0e15\u0e23\u0e2d\u0e32\u0e2b\u0e32\u0e23",
    "cancel": "\u0e22\u0e01\u0e40\u0e25\u0e34\u0e01",
    "save": "\u0e1a\u0e31\u0e19\u0e17\u0e36\u0e01",
    "saving": "\u0e01\u0e33\u0e25\u0e31\u0e07\u0e1a\u0e31\u0e19\u0e17\u0e36\u0e01...",
    "dragToReorder": "\u0e25\u0e32\u0e01\u0e40\u0e1e\u0e37\u0e48\u0e2d\u0e08\u0e31\u0e14\u0e25\u0e33\u0e14\u0e31\u0e1a \u0e2b\u0e23\u0e37\u0e2d\u0e43\u0e0a\u0e49\u0e1b\u0e38\u0e48\u0e21\u0e25\u0e39\u0e01\u0e28\u0e23\u0e40\u0e1e\u0e37\u0e48\u0e2d\u0e40\u0e25\u0e37\u0e48\u0e2d\u0e19\u0e02\u0e36\u0e49\u0e19-\u0e25\u0e07",
    "moveUp": "\u0e40\u0e25\u0e37\u0e48\u0e2d\u0e19\u0e02\u0e36\u0e49\u0e19",
    "moveDown": "\u0e40\u0e25\u0e37\u0e48\u0e2d\u0e19\u0e25\u0e07",
    "defaultBadge": "\u0e04\u0e48\u0e32\u0e40\u0e23\u0e34\u0e48\u0e21\u0e15\u0e49\u0e19",
    "customBadge": "\u0e01\u0e33\u0e2b\u0e19\u0e14\u0e40\u0e2d\u0e07",
    "resetDefaults": "\u0e04\u0e37\u0e19\u0e04\u0e48\u0e32\u0e40\u0e23\u0e34\u0e48\u0e21\u0e15\u0e49\u0e19",
    "resetDefaultsConfirm": "\u0e04\u0e38\u0e13\u0e41\u0e19\u0e48\u0e43\u0e08\u0e2b\u0e23\u0e37\u0e2d\u0e44\u0e21\u0e48\u0e27\u0e48\u0e32\u0e15\u0e49\u0e2d\u0e07\u0e01\u0e32\u0e23\u0e04\u0e37\u0e19\u0e04\u0e48\u0e32\u0e1b\u0e23\u0e30\u0e40\u0e20\u0e17\u0e2a\u0e39\u0e15\u0e23\u0e2d\u0e32\u0e2b\u0e32\u0e23\u0e40\u0e1b\u0e47\u0e19\u0e04\u0e48\u0e32\u0e40\u0e23\u0e34\u0e48\u0e21\u0e15\u0e49\u0e19\u0e02\u0e2d\u0e07\u0e23\u0e30\u0e1a\u0e1a?",
    "resetDefaultsSuccess": "\u0e04\u0e37\u0e19\u0e04\u0e48\u0e32\u0e1b\u0e23\u0e30\u0e40\u0e20\u0e17\u0e2a\u0e39\u0e15\u0e23\u0e2d\u0e32\u0e2b\u0e32\u0e23\u0e40\u0e1b\u0e47\u0e19\u0e04\u0e48\u0e32\u0e40\u0e23\u0e34\u0e48\u0e21\u0e15\u0e49\u0e19\u0e40\u0e23\u0e35\u0e22\u0e1a\u0e23\u0e49\u0e2d\u0e22\u0e41\u0e25\u0e49\u0e27",
    "recipeTypePlaceholder": "\u0e40\u0e0a\u0e48\u0e19 \u0e1e\u0e34\u0e0b\u0e0b\u0e48\u0e32\u0e40\u0e15\u0e32\u0e16\u0e48\u0e32\u0e19",
    "iconLabel": "\u0e44\u0e2d\u0e04\u0e2d\u0e19 / \u0e2d\u0e35\u0e42\u0e21\u0e08\u0e34",
    "descriptionLabel": "\u0e04\u0e33\u0e2d\u0e18\u0e34\u0e1a\u0e32\u0e22 (\u0e17\u0e32\u0e07\u0e40\u0e25\u0e37\u0e2d\u0e01)",
    "descriptionPlaceholder": "\u0e04\u0e33\u0e2d\u0e18\u0e34\u0e1a\u0e32\u0e22\u0e2a\u0e31\u0e49\u0e19\u0e46 \u0e40\u0e01\u0e35\u0e48\u0e22\u0e27\u0e01\u0e31\u0e1a\u0e2b\u0e21\u0e27\u0e14\u0e2b\u0e21\u0e39\u0e48\u0e2d\u0e32\u0e2b\u0e32\u0e23\u0e19\u0e35\u0e49...",
    "typeNameRequired": "\u0e01\u0e23\u0e38\u0e13\u0e32\u0e23\u0e30\u0e1a\u0e38\u0e0a\u0e37\u0e48\u0e2d\u0e1b\u0e23\u0e30\u0e40\u0e20\u0e17\u0e2a\u0e39\u0e15\u0e23\u0e2d\u0e32\u0e2b\u0e32\u0e23",
    "typeNameDuplicate": "\u0e21\u0e35\u0e1b\u0e23\u0e30\u0e40\u0e20\u0e17\u0e2a\u0e39\u0e15\u0e23\u0e2d\u0e32\u0e2b\u0e32\u0e23\u0e0a\u0e37\u0e48\u0e2d\u0e19\u0e35\u0e49\u0e2d\u0e22\u0e39\u0e48\u0e41\u0e25\u0e49\u0e27\u0e43\u0e19\u0e23\u0e30\u0e1a\u0e1a",
    "cannotDeleteDefault": "\u0e44\u0e21\u0e48\u0e2a\u0e32\u0e21\u0e32\u0e23\u0e16\u0e25\u0e1a\u0e1b\u0e23\u0e30\u0e40\u0e20\u0e17\u0e2a\u0e39\u0e15\u0e23\u0e2d\u0e32\u0e2b\u0e32\u0e23\u0e40\u0e23\u0e34\u0e48\u0e21\u0e15\u0e49\u0e19\u0e02\u0e2d\u0e07\u0e23\u0e30\u0e1a\u0e1a\u0e44\u0e14\u0e49"
  },
  "es": {
    "recipeTypesTitle": "Tipos de recetas",
    "recipeTypesSubtitle": "Gestione las clasificaciones culinarias, tipos de platos y el orden de visualizaci\u00f3n para filtros y generaci\u00f3n de recetas.",
    "addRecipeType": "A\u00f1adir tipo de receta",
    "enterRecipeTypeName": "Introduzca el nombre del tipo de receta (ej. Pizza a la le\u00f1a, Desayuno, Aperitivo)...",
    "reposition": "Reordenar",
    "doneRepositioning": "Terminado",
    "saveOrder": "Guardar orden",
    "savingOrder": "Guardando orden...",
    "orderSavedSuccess": "Orden de tipos de recetas actualizado con \u00e9xito.",
    "typeAddedSuccess": "Nuevo tipo de receta a\u00f1adido con \u00e9xito.",
    "typeUpdatedSuccess": "Tipo de receta actualizado con \u00e9xito.",
    "typeDeletedSuccess": "Tipo de receta eliminado con \u00e9xito.",
    "deleteTypeConfirm": "\u00bfEst\u00e1 seguro de que desea eliminar este tipo de receta? Esta acci\u00f3n no se puede deshacer.",
    "searchRecipeTypes": "Buscar tipos de recetas...",
    "totalTypes": "Total de tipos",
    "activeStatus": "Activo",
    "inactiveStatus": "Inactivo",
    "noRecipeTypesFound": "No se encontraron tipos de recetas que coincidan.",
    "editRecipeType": "Editar tipo de receta",
    "cancel": "Cancelar",
    "save": "Guardar",
    "saving": "Guardando...",
    "dragToReorder": "Arrastre para reordenar o use las flechas para subir o bajar.",
    "moveUp": "Subir",
    "moveDown": "Bajar",
    "defaultBadge": "Predeterminado",
    "customBadge": "Personalizado",
    "resetDefaults": "Restablecer a valores predeterminados",
    "resetDefaultsConfirm": "\u00bfEst\u00e1 seguro de que desea restablecer los tipos de recetas a los valores predeterminados?",
    "resetDefaultsSuccess": "Tipos de recetas restablecidos con \u00e9xito.",
    "recipeTypePlaceholder": "ej. Pizza a la le\u00f1a",
    "iconLabel": "Icono / Emoji",
    "descriptionLabel": "Descripci\u00f3n (Opcional)",
    "descriptionPlaceholder": "Breve descripci\u00f3n de esta categor\u00eda de platos...",
    "typeNameRequired": "El nombre del tipo de receta es obligatorio.",
    "typeNameDuplicate": "Ya existe un tipo de receta con este nombre.",
    "cannotDeleteDefault": "No se puede eliminar el tipo de receta predeterminado del sistema."
  },
  "fr": {
    "recipeTypesTitle": "Types de recettes",
    "recipeTypesSubtitle": "G\u00e9rez les classifications culinaires, les types de plats et l'ordre d'affichage pour les filtres et la g\u00e9n\u00e9ration de recettes.",
    "addRecipeType": "Ajouter un type de recette",
    "enterRecipeTypeName": "Entrez le nom du type de recette (ex. Pizza au feu de bois, Petit d\u00e9jeuner, Entr\u00e9e)...",
    "reposition": "R\u00e9organiser",
    "doneRepositioning": "Termin\u00e9",
    "saveOrder": "Enregistrer l'ordre",
    "savingOrder": "Enregistrement de l'ordre...",
    "orderSavedSuccess": "Ordre d'affichage des types de recettes mis \u00e0 jour avec succ\u00e8s.",
    "typeAddedSuccess": "Nouveau type de recette ajout\u00e9 avec succ\u00e8s.",
    "typeUpdatedSuccess": "Type de recette mis \u00e0 jour avec succ\u00e8s.",
    "typeDeletedSuccess": "Type de recette supprim\u00e9 avec succ\u00e8s.",
    "deleteTypeConfirm": "\u00cates-vous s\u00fbr de vouloir supprimer ce type de recette ? Cette action ne peut pas \u00eatre annul\u00e9e.",
    "searchRecipeTypes": "Rechercher des types de recettes...",
    "totalTypes": "Total des types",
    "activeStatus": "Actif",
    "inactiveStatus": "Inactif",
    "noRecipeTypesFound": "Aucun type de recette trouv\u00e9 correspondant \u00e0 votre recherche.",
    "editRecipeType": "Modifier le type de recette",
    "cancel": "Annuler",
    "save": "Enregistrer",
    "saving": "Enregistrement...",
    "dragToReorder": "Faites glisser pour r\u00e9organiser ou utilisez les fl\u00e8ches pour monter et descendre.",
    "moveUp": "Monter",
    "moveDown": "Descendre",
    "defaultBadge": "Par d\u00e9faut",
    "customBadge": "Personnalis\u00e9",
    "resetDefaults": "R\u00e9initialiser les valeurs par d\u00e9faut",
    "resetDefaultsConfirm": "\u00cates-vous s\u00fbr de vouloir r\u00e9initialiser les types de recettes aux cat\u00e9gories par d\u00e9faut ?",
    "resetDefaultsSuccess": "Types de recettes r\u00e9initialis\u00e9s par d\u00e9faut avec succ\u00e8s.",
    "recipeTypePlaceholder": "ex. Pizza au feu de bois",
    "iconLabel": "Ic\u00f4ne / \u00c9moji",
    "descriptionLabel": "Description (Optionnel)",
    "descriptionPlaceholder": "Br\u00e8ve description de cette cat\u00e9gorie de plats...",
    "typeNameRequired": "Le nom du type de recette est requis.",
    "typeNameDuplicate": "Un type de recette portant ce nom existe d\u00e9j\u00e0.",
    "cannotDeleteDefault": "Impossible de supprimer le type de recette par d\u00e9faut du syst\u00e8me."
  },
  "de": {
    "recipeTypesTitle": "Rezeptarten",
    "recipeTypesSubtitle": "Verwalten Sie kulinarische Mahlzeitenklassifizierungen, Gerichttypen und die Reihenfolge f\u00fcr Filter und Generierung.",
    "addRecipeType": "Rezeptart hinzuf\u00fcgen",
    "enterRecipeTypeName": "Rezeptart eingeben (z. B. Steinofenpizza, Fr\u00fchst\u00fcck, Vorspeise)...",
    "reposition": "Umsortieren",
    "doneRepositioning": "Fertig",
    "saveOrder": "Reihenfolge speichern",
    "savingOrder": "Reihenfolge wird gespeichert...",
    "orderSavedSuccess": "Reihenfolge der Rezeptarten erfolgreich aktualisiert.",
    "typeAddedSuccess": "Neue Rezeptart erfolgreich hinzugef\u00fcgt.",
    "typeUpdatedSuccess": "Rezeptart erfolgreich aktualisiert.",
    "typeDeletedSuccess": "Rezeptart erfolgreich gel\u00f6scht.",
    "deleteTypeConfirm": "M\u00f6chten Sie diese Rezeptart wirklich l\u00f6schen? Dies kann nicht r\u00fcckg\u00e4ngig gemacht werden.",
    "searchRecipeTypes": "Rezeptarten durchsuchen...",
    "totalTypes": "Gesamtanzahl",
    "activeStatus": "Aktiv",
    "inactiveStatus": "Inaktiv",
    "noRecipeTypesFound": "Keine passenden Rezeptarten gefunden.",
    "editRecipeType": "Rezeptart bearbeiten",
    "cancel": "Abbrechen",
    "save": "Speichern",
    "saving": "Speichern...",
    "dragToReorder": "Ziehen Sie zum Umsortieren oder nutzen Sie die Pfeiltasten.",
    "moveUp": "Nach oben",
    "moveDown": "Nach unten",
    "defaultBadge": "Standard",
    "customBadge": "Benutzerdefiniert",
    "resetDefaults": "Auf Standard zur\u00fccksetzen",
    "resetDefaultsConfirm": "M\u00f6chten Sie die Rezeptarten wirklich auf die Standardkategorien zur\u00fccksetzen?",
    "resetDefaultsSuccess": "Rezeptarten erfolgreich auf Standard zur\u00fcckgesetzt.",
    "recipeTypePlaceholder": "z. B. Steinofenpizza",
    "iconLabel": "Symbol / Emoji",
    "descriptionLabel": "Beschreibung (Optional)",
    "descriptionPlaceholder": "Kurze Beschreibung dieser Gerichtkategorie...",
    "typeNameRequired": "Name der Rezeptart ist erforderlich.",
    "typeNameDuplicate": "Eine Rezeptart mit diesem Namen existiert bereits.",
    "cannotDeleteDefault": "Standard-Rezeptarten k\u00f6nnen nicht gel\u00f6scht werden."
  }
};

export async function GET() {
  try {
    let languages = null;
    let translations = {};

    try {
      const res: any = await query(`
        SELECT supported_languages, settings, translations FROM admin_settings 
        WHERE id = 'primary_settings' OR id = '1' 
        ORDER BY updated_at DESC LIMIT 1;
      `);
      const row = (Array.isArray(res) ? res[0] : (res as any)?.rows?.[0]);
      if (row) {
        if (row.supported_languages) {
          const parsed = typeof row.supported_languages === 'string'
            ? JSON.parse(row.supported_languages)
            : row.supported_languages;
          if (Array.isArray(parsed) && parsed.length > 0) languages = parsed;
        } else if (row.settings) {
          const s = typeof row.settings === 'string' ? JSON.parse(row.settings) : row.settings;
          const l = s?.supportedLanguages || s?.supported_languages;
          if (Array.isArray(l) && l.length > 0) languages = l;
        }

        if (row.translations) {
          translations = typeof row.translations === 'string' ? JSON.parse(row.translations) : row.translations;
        }
      }
    } catch (_) {}

    if (!languages) {
      languages = getLocalFileLanguages() || DEFAULT_SYSTEM_LANGUAGES;
    }

    return NextResponse.json(
      { success: true, languages, translations },
      { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' } }
    );
  } catch (err: any) {
    return NextResponse.json({ success: true, languages: DEFAULT_SYSTEM_LANGUAGES, translations: {} });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const languages = Array.isArray(body) ? body : (body.languages || body.supportedLanguages);
    const translations = body.translations;

    if (Array.isArray(languages)) {
      // Update Dual-Path Server JSON Files
      for (const rel of ['apps/web/data/admin_settings.json', 'data/admin_settings.json']) {
        try {
          const p = path.join(process.cwd(), rel);
          osEnsureDir(path.dirname(p));
          let existing: any = {};
          if (fs.existsSync(p)) {
            try { existing = JSON.parse(fs.readFileSync(p, 'utf8')); } catch (_) {}
          }
          existing.supportedLanguages = languages;
          existing.supported_languages = languages;
          fs.writeFileSync(p, JSON.stringify(existing, null, 2), 'utf8');
        } catch (_) {}
      }

      // Update PostgreSQL / MySQL
      try {
        await query(`
          INSERT INTO admin_settings (id, supported_languages, updated_at)
          VALUES ('primary_settings', $1::jsonb, NOW())
          ON CONFLICT (id) DO UPDATE SET
            supported_languages = EXCLUDED.supported_languages,
            updated_at = NOW();
        `, [JSON.stringify(languages)]);
      } catch (_) {}
    }

    if (translations && typeof translations === 'object') {
      try {
        await query(`
          INSERT INTO admin_settings (id, translations, updated_at)
          VALUES ('primary_settings', $1::jsonb, NOW())
          ON CONFLICT (id) DO UPDATE SET
            translations = EXCLUDED.translations,
            updated_at = NOW();
        `, [JSON.stringify(translations)]);
      } catch (_) {}
    }

    return NextResponse.json({ success: true, message: 'Languages synchronized successfully' });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

function osEnsureDir(dirPath: string) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}
