import os

with open("apps/web/src/app/shopping/page.tsx", "r", encoding="utf-8") as f:
    code = f.read()

# Add a handler for marking all active items as complete/checked
handler_code = """
  const handleMarkAllComplete = () => {
    const updated = items.map(i => ({ ...i, checked: true }));
    saveList(updated);
  };
"""

if "handleMarkAllComplete" not in code:
    code = code.replace("const handleCopyList = () => {", handler_code + "\n  const handleCopyList = () => {")

# Insert the "Mark All Complete" button right after the top controls / search bar container
old_top_controls = """      {/* TOP CONTROLS */}
      <div className="flex flex-col sm:flex-row items-center gap-3 justify-between">"""

new_top_controls = """      {/* TOP CONTROLS */}
      <div className="flex flex-col sm:flex-row items-center gap-3 justify-between">
        <button
          onClick={handleMarkAllComplete}
          className="w-full sm:w-auto bg-[#111726] hover:bg-[#1a2338] border border-emerald-900 text-emerald-400 font-bold text-xs px-4 py-3 rounded-2xl transition flex items-center justify-center gap-2 shadow-sm"
        >
          ✓ Mark All Complete
        </button>"""

if old_top_controls in code and "Mark All Complete" not in code:
    code = code.replace(old_top_controls, new_top_controls)

with open("apps/web/src/app/shopping/page.tsx", "w", encoding="utf-8") as f:
    f.write(code)

print("✅ 'Mark All Complete' button successfully added below the search bar!")
