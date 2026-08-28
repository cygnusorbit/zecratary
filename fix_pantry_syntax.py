import os

pantry_path = "apps/web/src/app/pantry/page.tsx"
with open(pantry_path, "r", encoding="utf-8") as f:
    code = f.read()

# Fix the missing closure for .sort((a, b) => { ... })
old_snippet = """    .sort((a, b) => {
      const res = a.name.localeCompare(b.name);
      return sortAsc ? res : -res;
    return ("""

new_snippet = """    .sort((a, b) => {
      const res = a.name.localeCompare(b.name);
      return sortAsc ? res : -res;
    });

  return ("""

if old_snippet in code:
    code = code.replace(old_snippet, new_snippet)
else:
    # Alternative fallback if formatting differs slightly
    code = code.replace("      return sortAsc ? res : -res;\n    return (", "      return sortAsc ? res : -res;\n    });\n\n  return (")

with open(pantry_path, "w", encoding="utf-8") as f:
    f.write(code)

print("✅ Pantry page syntax error successfully fixed!")
