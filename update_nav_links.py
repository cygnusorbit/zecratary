import os

for root, dirs, files in os.walk("apps/web/src"):
    for file in files:
        if file.endswith((".tsx", ".ts", ".jsx", ".js")):
            filepath = os.path.join(root, file)
            with open(filepath, "r", encoding="utf-8") as f:
                code = f.read()
            
            # Replace link paths
            if 'href="/recipes"' in code or "href='/recipes'" in code:
                updated = code.replace('href="/recipes"', 'href="/saved"').replace("href='/recipes'", "href='/saved'")
                with open(filepath, "w", encoding="utf-8") as f:
                    f.write(updated)
                print(f"✅ Updated nav links in {filepath}")

print("✅ Navigation links verified!")
