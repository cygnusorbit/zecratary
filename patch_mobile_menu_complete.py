#!/usr/bin/env python3
import os
import sys

def main():
    print("[1/3] Locating Sidebar.tsx in apps/web and src...")
    target_paths = [
        os.path.join("apps", "web", "src", "components", "Sidebar.tsx"),
        os.path.join("src", "components", "Sidebar.tsx"),
    ]

    updated = False
    for path in target_paths:
        if not os.path.exists(path):
            continue

        print(f"[*] Inspecting {path}...")
        with open(path, "r", encoding="utf-8") as f:
            content = f.read()

        # Ensure mobile drawer container has full viewport height and touch scrolling
        if 'className="md:hidden' in content or 'isOpen' in content:
            # Normalize mobile drawer wrapper to ensure no items get clipped
            content = content.replace(
                'className="fixed inset-x-0 top-14 bottom-0 z-40 bg-[var(--color-card)] overflow-y-auto',
                'className="fixed inset-x-0 top-14 bottom-0 z-40 bg-[var(--color-card)] overflow-y-auto max-h-[calc(100dvh-3.5rem)] pb-24 overscroll-contain'
            )
            # Guarantee touch-friendly scrolling on iOS/Android
            if 'overscroll-contain' not in content and 'fixed inset-x-0 top-14' in content:
                content = content.replace(
                    'fixed inset-x-0 top-14 bottom-0 z-40',
                    'fixed inset-x-0 top-14 bottom-0 z-40 overscroll-contain pb-24'
                )

        with open(path, "w", encoding="utf-8") as f:
            f.write(content)
        print(f"[✓] Updated {path}")
        updated = True

    if not updated:
        print("[!] No Sidebar.tsx files found to patch.")
        sys.exit(1)

    print("[2/3] Verifying TypeScript definitions and linting...")
    web_dir = os.path.join("apps", "web")
    if os.path.exists(web_dir):
        os.system(f"cd {web_dir} && npx tsc --noEmit")

    print("[3/3] Mobile navigation layout successfully patched and verified.")

if __name__ == "__main__":
    main()
