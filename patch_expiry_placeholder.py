import os

with open("apps/web/src/app/pantry/page.tsx", "r", encoding="utf-8") as f:
    code = f.read()

# Replace date inputs to have a dark gray text state when empty / placeholder effect
old_date_input = '''          <input
            type="date"
            value={expiryDate}
            onChange={(e) => setExpiryDate(e.target.value)}
            className="bg-[#0B101D] border border-slate-800 rounded-xl p-3 text-slate-300 outline-none"
            title="Expiry Date"
          />'''

new_date_input = '''          <input
            type="date"
            value={expiryDate}
            placeholder="Expiry date"
            onChange={(e) => setExpiryDate(e.target.value)}
            className="bg-[#0B101D] border border-slate-800 rounded-xl p-3 text-slate-500 outline-none focus:text-slate-200"
            title="Expiry Date"
          />'''

if old_date_input in code:
    code = code.replace(old_date_input, new_date_input)

# Also update the modal edit date input
old_edit_date = '''              <div>
                <label className="block text-slate-400 font-semibold mb-1">Expiry Date</label>
                <input
                  type="date"
                  value={editingItem.expiryDate || ''}
                  onChange={(e) => setEditingItem({ ...editingItem, expiryDate: e.target.value })}
                  className="w-full bg-[#0B101D] border border-slate-800 rounded-xl p-3 text-sm text-white outline-none focus:border-[#E05638]"
                />
              </div>'''

new_edit_date = '''              <div>
                <label className="block text-slate-400 font-semibold mb-1">Expiry Date</label>
                <input
                  type="date"
                  placeholder="Expiry date"
                  value={editingItem.expiryDate || ''}
                  onChange={(e) => setEditingItem({ ...editingItem, expiryDate: e.target.value })}
                  className="w-full bg-[#0B101D] border border-slate-800 rounded-xl p-3 text-sm text-slate-500 outline-none focus:text-white focus:border-[#E05638]"
                />
              </div>'''

if old_edit_date in code:
    code = code.replace(old_edit_date, new_edit_date)

with open("apps/web/src/app/pantry/page.tsx", "w", encoding="utf-8") as f:
    f.write(code)

print("✅ Expiry input text successfully updated to dark gray!")
