#!/bin/bash

# Script to fix thumbnail URLs in the database
# This will clean up any URLs that have text before the //

DB_PATH="api/database/app.db"

echo "Fixing thumbnail URLs in database..."

# Update thumbnail URLs to remove any text before //
sqlite3 "$DB_PATH" <<EOF
UPDATE channels 
SET thumbnail_url = 'https:' || substr(thumbnail_url, instr(thumbnail_url, '//'))
WHERE thumbnail_url LIKE '%//%' 
  AND thumbnail_url NOT LIKE 'http://%' 
  AND thumbnail_url NOT LIKE 'https://%';
EOF

# Show how many were updated
UPDATED=$(sqlite3 "$DB_PATH" "SELECT changes();")
echo "Updated $UPDATED thumbnail URLs"

# Show a sample of the fixed URLs
echo -e "\nSample of fixed thumbnails:"
sqlite3 "$DB_PATH" "SELECT channel_name, thumbnail_url FROM channels WHERE thumbnail_url != '' LIMIT 5;"