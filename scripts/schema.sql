-- Pure PostgreSQL Production Schema for Zecratary
-- 100% Database-Backed Persistence

CREATE TABLE IF NOT EXISTS admin_settings (
    id VARCHAR(64) PRIMARY KEY DEFAULT 'primary_settings',
    site_name VARCHAR(255) DEFAULT 'Zecratary',
    titlebar_emoji VARCHAR(32) DEFAULT '🍳',
    titlebar_image TEXT DEFAULT '',
    favicon_emoji VARCHAR(32) DEFAULT '🍳',
    favicon_image TEXT DEFAULT '',
    currency VARCHAR(10) DEFAULT 'USD',
    ai_provider VARCHAR(64) DEFAULT 'gemini',
    ai_model VARCHAR(128) DEFAULT 'gemini-3.5-flash-lite',
    theme_colors JSONB DEFAULT '{}'::jsonb,
    payment_settings JSONB DEFAULT '{}'::jsonb,
    social_login JSONB DEFAULT '{}'::jsonb,
    chef_ai_settings JSONB DEFAULT '{}'::jsonb,
    recipe_types JSONB DEFAULT '[]'::jsonb,
    ingredient_categories JSONB DEFAULT '[]'::jsonb,
    supported_languages JSONB DEFAULT '[]'::jsonb,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS subscription_plans (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(64) UNIQUE NOT NULL,
    is_free BOOLEAN DEFAULT FALSE,
    is_default BOOLEAN DEFAULT FALSE,
    monthly_price_dollars NUMERIC(10, 2) DEFAULT 0.00,
    annual_price_dollars NUMERIC(10, 2) DEFAULT 0.00,
    monthly_badge VARCHAR(64) DEFAULT '',
    annual_badge VARCHAR(64) DEFAULT '',
    trial_badge VARCHAR(64) DEFAULT '',
    description_monthly TEXT DEFAULT '',
    description_annual TEXT DEFAULT '',
    button_text VARCHAR(64) DEFAULT 'Choose Plan',
    ai_recipe_limit INTEGER DEFAULT 5,
    recipe_library_limit INTEGER DEFAULT 25,
    social_scrape_limit INTEGER DEFAULT 5,
    can_view_macros BOOLEAN DEFAULT FALSE,
    allowed_ai_models TEXT DEFAULT 'gemini-3.5-flash-lite',
    features JSONB DEFAULT '[]'::jsonb,
    token_limit INTEGER DEFAULT 50000,
    token_reimburse_frequency VARCHAR(32) DEFAULT 'monthly',
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255),
    role VARCHAR(32) NOT NULL DEFAULT 'user',
    subscription_plan VARCHAR(64) DEFAULT 'taster',
    plan_expiry_date TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

CREATE TABLE IF NOT EXISTS payment_transactions (
    id VARCHAR(64) PRIMARY KEY,
    customer_name VARCHAR(255) NOT NULL,
    customer_email VARCHAR(255) NOT NULL,
    plan_name VARCHAR(255) NOT NULL,
    plan_slug VARCHAR(64) REFERENCES subscription_plans(slug) ON UPDATE CASCADE ON DELETE SET NULL,
    amount NUMERIC(10, 2) NOT NULL,
    currency VARCHAR(10) NOT NULL DEFAULT 'USD',
    gateway VARCHAR(32) NOT NULL DEFAULT 'stripe',
    status VARCHAR(32) NOT NULL DEFAULT 'succeeded',
    failure_reason TEXT,
    test_mode BOOLEAN DEFAULT TRUE,
    expiry_date TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_transactions_email ON payment_transactions(customer_email);
CREATE INDEX IF NOT EXISTS idx_transactions_status ON payment_transactions(status);

CREATE TABLE IF NOT EXISTS saved_recipes (
    id VARCHAR(64) PRIMARY KEY,
    user_id VARCHAR(64) REFERENCES users(id) ON UPDATE CASCADE ON DELETE SET NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    recipe_type VARCHAR(64),
    cuisine VARCHAR(64),
    prep_time VARCHAR(32),
    cook_time VARCHAR(32),
    servings VARCHAR(32),
    difficulty VARCHAR(32),
    ingredients JSONB DEFAULT '[]'::jsonb,
    directions JSONB DEFAULT '[]'::jsonb,
    nutrition JSONB DEFAULT '{}'::jsonb,
    tags JSONB DEFAULT '[]'::jsonb,
    image_url TEXT,
    is_public BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_saved_recipes_user_id ON saved_recipes(user_id);

CREATE TABLE IF NOT EXISTS page_contents (
    page_slug VARCHAR(128) PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    meta_description TEXT,
    content_blocks JSONB DEFAULT '[]'::jsonb,
    custom_attributes JSONB DEFAULT '{}'::jsonb,
    is_published BOOLEAN DEFAULT TRUE,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);
