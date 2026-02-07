#!/bin/sh
# ============================================================================
# Turion Docker Entrypoint
# Fixes mounted volume permissions and drops to non-root user
# ============================================================================

# Fix ownership of mounted volumes (runs as root initially)
chown -R turion:turion /app/state /app/logs /app/auth_info 2>/dev/null || true

# Fix .env file permissions if it exists (bind-mounted from host)
if [ -f /app/.env ]; then
    chown turion:turion /app/.env 2>/dev/null || true
    chmod 660 /app/.env 2>/dev/null || true
fi

# Drop to turion user and execute the command
exec su-exec turion "$@"
