import os

# 1. Update apps/web/src/app/saved/page.tsx with a Next.js server redirect
saved_redirect_code = """import { redirect } from 'next/navigation';

export default function SavedPageRedirect() {
  redirect('/recipes');
}
"""

os.makedirs("apps/web/src/app/saved", exist_ok=True)
with open("apps/web/src/app/saved/page.tsx", "w", encoding="utf-8") as f:
    f.write(saved_redirect_code)

print("✅ /saved route configured to redirect automatically to /recipes")
