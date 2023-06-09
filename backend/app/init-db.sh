#!/bin/bash
set -e

echo "*** CREATING DATABASE ***"
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
    CREATE ROLE ncemhub;
EOSQL
echo "*** CREATED DATABASE ***"
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" -f /tmp/still.sql
echo "*** IMPORTED DATABASE ***"