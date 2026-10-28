-- Docker PostgreSQL Initialization Script
DO $$ BEGIN   IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'zecratary_admin') THEN     CREATE ROLE zecratary_admin WITH SUPERUSER LOGIN PASSWORD 'zecratary_secure_password';   ELSE     ALTER ROLE zecratary_admin WITH SUPERUSER LOGIN PASSWORD 'zecratary_secure_password';   END IF; END $$;

SELECT 'CREATE DATABASE zecratary_prod OWNER zecratary_admin'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'zecratary_prod')\gexec

GRANT ALL PRIVILEGES ON DATABASE zecratary_prod TO zecratary_admin;
