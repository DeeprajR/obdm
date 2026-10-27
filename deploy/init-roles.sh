#!/bin/sh
# Role provisioning for the `local-db` profile (docs/deployment.md, §5.9).
#
# Roles are cluster-wide, so they are created here rather than by a
# migration, with passwords from the environment rather than the committed
# development ones in db/docker/init.sql. Migrations own schemas, tables and
# grants; this owns the three logins those grants are made to.
#
# Runs once, when the data directory is first initialised. A managed database
# gets the same three statements by hand.
set -eu

: "${MIGRATOR_PASSWORD:?set MIGRATOR_PASSWORD}"
: "${APP_WEB_PASSWORD:?set APP_WEB_PASSWORD}"
: "${APP_BOT_PASSWORD:?set APP_BOT_PASSWORD}"

# The passwords travel as psql variables and are quoted by psql (:'name'),
# so a generated secret containing a quote cannot break the statement. A
# failure here would leave an initialised cluster with no roles, and the next
# start would skip this script for good.
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" \
  -v migrator_password="$MIGRATOR_PASSWORD" \
  -v app_web_password="$APP_WEB_PASSWORD" \
  -v app_bot_password="$APP_BOT_PASSWORD" <<'SQL'
CREATE ROLE migrator LOGIN PASSWORD :'migrator_password';
CREATE ROLE app_web  LOGIN PASSWORD :'app_web_password';
CREATE ROLE app_bot  LOGIN PASSWORD :'app_bot_password';

GRANT CONNECT ON DATABASE obdm TO migrator, app_web, app_bot;
GRANT CREATE ON DATABASE obdm TO migrator;
-- PostgreSQL 15 revoked CREATE on public from everyone but the owner; the
-- shared set_updated_at() trigger function lives there.
GRANT CREATE, USAGE ON SCHEMA public TO migrator;
SQL
