import os

config_paths = ["apps/web/next.config.js", "apps/web/next.config.mjs", "next.config.js", "next.config.mjs"]
target_path = None

for path in config_paths:
    if os.path.exists(path):
        target_path = path
        break

if target_path:
    with open(target_path, "r", encoding="utf-8") as f:
        content = f.read()

    redirect_block = """  async redirects() {
    return [
      {
        source: '/recipes',
        destination: '/saved',
        permanent: true,
      },
    ];
  },"""

    if "redirects()" not in content:
        if "module.exports = {" in content:
            content = content.replace("module.exports = {", f"module.exports = {{\n{redirect_block}")
        elif "const nextConfig = {" in content:
            content = content.replace("const nextConfig = {", f"const nextConfig = {{\n{redirect_block}")
        elif "export default {" in content:
            content = content.replace("export default {", f"export default {{\n{redirect_block}")
        
        with open(target_path, "w", encoding="utf-8") as f:
            f.write(content)
        print(f"✅ Added route redirect in {target_path}")
    else:
        print(f"ℹ️ Redirects already configured in {target_path}")
else:
    # If no next.config file exists, create a basic next.config.js in apps/web
    default_config = """/** @type {import('next').NextConfig} */
const nextConfig = {
  async redirects() {
    return [
      {
        source: '/recipes',
        destination: '/saved',
        permanent: true,
      },
    ];
  },
};

module.exports = nextConfig;
"""
    with open("apps/web/next.config.js", "w", encoding="utf-8") as f:
        f.write(default_config)
    print("✅ Created apps/web/next.config.js with redirect rules")
