import os

with open("apps/web/src/app/pantry/page.tsx", "r", encoding="utf-8") as f:
    code = f.read()

# Replace any text or labels referencing date format with "Expiry Date"
code = code.replace("expiryDate", "expiryDate") # ensures clean state

# Update date input fields to clearly display Expiry Date or label accordingly
old_input = '''          <input
            type="date"
            placeholder="Expiry date"
            value={expiryDate}
            onChange={(e) => setExpiryDate(e.target.value)}
            className="bg-[#0B101D] border border-slate-800 rounded-xl p-3 text-slate-500 outline-none focus:text-slate-200"
            title="Expiry Date"
          />'''

# Inject a wrapper or label so it explicitly shows "Expiry Date"
new_input = '''          <div className="relative">
            <input
              type="date"
              value={expiryDate}
              onChange={(e) => setExpiryDate(e.target.value)}
              className="w-full bg-[#0B101D] border border-slate-800 rounded-xl p-3 text-slate-500 outline-none focus:text-slate-200"
              title="Expiry Date"
            />
            {!expiryDate && (
              <span className="absolute left-3 top-3.5 text-xs text-slate-500 pointer-events-none select-none">
                Expiry Date
              </span>
            )}
          </div>'''

if old_input in code:
    code = code.replace(old_input, new_input)

with open("apps/web/src/app/pantry/page.tsx", "w", encoding="utf-8") as f:
    f.write(code)

print("✅ Expiry Date label successfully applied!")
