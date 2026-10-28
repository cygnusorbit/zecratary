-- MySQL 8.0+ / 8.4+ / 9.0+ Production Schema for Zecratary
-- GitHub: cygnusorbit/zecratary
-- Symmetrically mirrored from PostgreSQL schema.sql

CREATE TABLE IF NOT EXISTS admin_settings (
    id VARCHAR(64) PRIMARY KEY,
    site_name VARCHAR(255) DEFAULT 'Zecratary',
    titlebar_emoji VARCHAR(32) DEFAULT '🍳',
    titlebar_image MEDIUMTEXT,
    favicon_emoji VARCHAR(32) DEFAULT '🍳',
    favicon_image MEDIUMTEXT,
    currency VARCHAR(10) DEFAULT 'USD',
    ai_provider VARCHAR(64) DEFAULT 'gemini',
    ai_model VARCHAR(128) DEFAULT 'gemini-3.5-flash-lite',
    theme_colors JSON,
    payment_settings JSON,
    social_login JSON,
    chef_ai_settings JSON,
    recipe_types JSON,
    ingredient_categories JSON,
    supported_languages JSON,
    settings JSON,
    translations JSON,
    value JSON,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS subscription_plans (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(64) NOT NULL UNIQUE,
    is_free BOOLEAN DEFAULT FALSE,
    is_default BOOLEAN DEFAULT FALSE,
    monthly_price_dollars DECIMAL(10, 2) DEFAULT 0.00,
    annual_price_dollars DECIMAL(10, 2) DEFAULT 0.00,
    monthly_badge VARCHAR(64) DEFAULT '',
    annual_badge VARCHAR(64) DEFAULT '',
    trial_badge VARCHAR(64) DEFAULT '',
    description_monthly TEXT,
    description_annual TEXT,
    button_text VARCHAR(64) DEFAULT 'Choose Plan',
    ai_recipe_limit INT DEFAULT 5,
    recipe_library_limit INT DEFAULT 25,
    social_scrape_limit INT DEFAULT 5,
    can_view_macros BOOLEAN DEFAULT FALSE,
    allowed_ai_models VARCHAR(255) DEFAULT 'gemini-3.5-flash-lite',
    features JSON,
    token_limit INT DEFAULT 50000,
    token_reimburse_frequency VARCHAR(32) DEFAULT 'monthly',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_plans_slug (slug)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255),
    role VARCHAR(32) NOT NULL DEFAULT 'user',
    subscription_plan VARCHAR(64) DEFAULT 'taster',
    plan_expiry_date DATETIME NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_users_role (role),
    INDEX idx_users_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS payment_transactions (
    id VARCHAR(64) PRIMARY KEY,
    customer_name VARCHAR(255) NOT NULL,
    customer_email VARCHAR(255) NOT NULL,
    plan_name VARCHAR(255) NOT NULL,
    plan_slug VARCHAR(64) NULL,
    amount DECIMAL(10, 2) NOT NULL,
    currency VARCHAR(10) NOT NULL DEFAULT 'USD',
    gateway VARCHAR(32) NOT NULL DEFAULT 'stripe',
    status VARCHAR(32) NOT NULL DEFAULT 'succeeded',
    failure_reason TEXT NULL,
    test_mode BOOLEAN DEFAULT TRUE,
    expiry_date DATETIME NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_tx_email (customer_email),
    INDEX idx_tx_status (status),
    CONSTRAINT fk_mysql_tx_plan FOREIGN KEY (plan_slug) REFERENCES subscription_plans(slug) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS saved_recipes (
    id VARCHAR(64) PRIMARY KEY,
    user_id VARCHAR(64) NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    recipe_type VARCHAR(64) DEFAULT 'General',
    cuisine VARCHAR(64),
    prep_time VARCHAR(32),
    cook_time VARCHAR(32),
    servings VARCHAR(32),
    difficulty VARCHAR(32),
    ingredients JSON,
    directions JSON,
    nutrition JSON,
    tags JSON,
    image_url TEXT,
    is_public BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_saved_recipes_user_id (user_id),
    CONSTRAINT fk_mysql_saved_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS page_contents (
    page_slug VARCHAR(128) PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    meta_description TEXT,
    content_blocks JSON,
    custom_attributes JSON,
    is_published BOOLEAN DEFAULT TRUE,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


CREATE TABLE IF NOT EXISTS app_translations (
    lang_code VARCHAR(16) PRIMARY KEY,
    lang_name VARCHAR(64) NOT NULL,
    dictionary JSON,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

