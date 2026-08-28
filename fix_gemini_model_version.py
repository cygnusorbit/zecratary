import os
import re

updated_files = []

for root, dirs, files in os.walk("."):
    # Skip node_modules and .next directories
    if "node_modules" in root or ".next" in root or ".git" in root:
        continue
    for file in files:
        if file.endswith((".ts", ".tsx", ".js", ".jsx", ".mjs", ".json")):
            filepath = os.path.join(root, file)
            try:
                with open(filepath, "r", encoding="utf-8") as f:
                    content = f.read()

                # Replace deprecated/unsupported model names
                if "gemini-1.5-pro" in content or "gemini-pro" in content:
                    new_content = re.sub(r'["\']gemini-1.5-pro["\']', '"gemini-1.5-flash"', content)
                    new_content = re.sub(r'["\']gemini-pro["\']', '"gemini-1.5-flash"', new_content)
                    
                    if new_content != content:
                        with open(filepath, "w", encoding="utf-8") as f:
                            f.write(new_content)
                        updated_files.append(filepath)
            except Exception as e:
                pass

if updated_files:
    print("✅ Updated model string to 'gemini-1.5-flash' in:")
    for f in updated_files:
        print(f"  - {f}")
else:
    print("ℹ️ No hardcoded 'gemini-1.5-pro' occurrences found in code files.")

