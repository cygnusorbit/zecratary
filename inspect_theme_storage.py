import os
import json
import glob

# Search for data/system_settings.json
target = 'data/system_settings.json'
if not os.path.exists(target):
    matches = glob.glob('**/data/system_settings.json', recursive=True)
    matches = [m for m in matches if 'node_modules' not in m and '.next' not in m]
    if matches:
        target = matches[0]

if os.path.exists(target):
    print(f"📁 Server Theme Settings File: {os.path.abspath(target)}\n")
    with open(target, 'r', encoding='utf-8') as f:
        try:
            data = json.load(f)
            theme_colors = data.get('themeColors', {})
            print("Current Saved Palette on Disk:")
            print(json.dumps(theme_colors, indent=2))
        except Exception as e:
            print(f"Error parsing JSON: {e}")
else:
    print("❌ 'data/system_settings.json' was not found on disk.")
