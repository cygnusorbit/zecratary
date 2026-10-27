import { redirect } from 'next/navigation';

export default function RedirectToRecipes() {
  redirect('/recipes');
}
