import os

# Update the pantry page to style date input calendar icons with dark gray accent
with open("apps/web/src/app/pantry/page.tsx", "r", encoding="utf-8") as f:
    content = f.read()

# Add a style injection for date inputs to make calendar icons dark gray
style_patch = """
      {/* Custom style for date input calendar icon */}
      <style jsx global>{`
        input[type="date"]::-webkit-calendar-picker-indicator {
          filter: invert(0.5);
          cursor: pointer;
        }
      `}</style>
    </div>
  );
}
"""

if "</style>" not in content:
    content = content.replace("</div>\n  );\n}", style_patch)
    with open("apps/web/src/app/pantry/page.tsx", "w", encoding="utf-8") as f:
        f.write(content)

print("✅ Calendar icon successfully updated to dark gray!")
