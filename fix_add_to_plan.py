import os
import re

def fix_add_to_plan():
    found_files = []
    for root, dirs, files in os.walk("apps/web/src"):
        for file in files:
            if file.endswith(".tsx"):
                path = os.path.join(root, file)
                try:
                    with open(path, "r", encoding="utf-8") as f:
                        if "Add to Plan" in f.read():
                            found_files.append(path)
                except Exception:
                    pass
    
    for path in found_files:
        with open(path, "r", encoding="utf-8") as f:
            code = f.read()
        
        # Inject the handler function if it doesn't exist
        if "Add to Plan" in code and "handleAddToPlan" not in code:
            handler = """
  const handleAddToPlan = () => {
    const local = localStorage.getItem('zecratary_meal_plan');
    const currentPlan = local ? JSON.parse(local) : [];
    const planItem = {
      id: 'plan_' + Date.now(),
      dateAdded: new Date().toISOString(),
      status: 'planned'
    };
    localStorage.setItem('zecratary_meal_plan', JSON.stringify([...currentPlan, planItem]));
    alert("✅ Successfully added to your Meal Plan!");
  };
"""
            # Safely inject the handler after the first state declaration
            code = re.sub(r'(const \[.*?\] = useState.*?;)', r'\1\n' + handler, code, count=1)
            
            # Attach the onClick event specifically to the button containing "Add to Plan"
            pattern = r'(<button[^>]*?)(>(?:(?!</button>)[\s\S])*?Add to Plan(?:(?!</button>)[\s\S])*?</button>)'
            
            code = re.sub(
                pattern, 
                lambda m: m.group(1) + (' onClick={handleAddToPlan}' if 'onClick' not in m.group(1) else '') + m.group(2), 
                code
            )
            
            with open(path, "w", encoding="utf-8") as f:
                f.write(code)
            print(f"✅ Successfully attached 'Add to Plan' handler in {path}")
        else:
            print(f"ℹ️ 'Add to Plan' handler already exists in {path}")

fix_add_to_plan()
