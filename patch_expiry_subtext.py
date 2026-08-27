import os

with open("apps/web/src/app/pantry/page.tsx", "r", encoding="utf-8") as f:
    code = f.read()

# Locate the expiry date input field in the creation form and add small label under it
old_block = '''          <div className="relative">
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

new_block = '''          <div>
            <div className="relative">
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
            </div>
            <span className="block text-[10px] text-slate-500 mt-1 pl-1 font-medium">Expiry Date</span>
          </div>'''

if old_block in code:
    code = code.replace(old_block, new_block)

with open("apps/web/src/app/pantry/page.tsx", "w", encoding="utf-8") as f:
    f.write(code)

print("✅ Small 'Expiry Date' helper text successfully added under the field!")
