#!/usr/bin/env bash
# Start a LOCAL single-node MongoDB replica set (rs0) so the backend's
# transaction probe (DatabaseTransactionService.onModuleInit) succeeds and
# transactions run with REAL atomicity instead of the non-atomic fallback.
#
# This directly resolves the boot error:
#   "[transactions] MongoDB transactions are NOT supported in this environment ..."
#
# Usage:
#   ./scripts/start-mongo-replica.sh
#   DBPATH=/path/to/your/existing/data PORT=27017 ./scripts/start-mongo-replica.sh
#
# IMPORTANT:
#   * Stop any standalone `mongod` already using $PORT BEFORE running this
#     (this script refuses to start if the port is occupied):
#       mongosh --port 27017 --eval 'db.adminCommand("shutdown")'
#   * Use the SAME --dbpath your standalone node used to preserve existing data.
#     A single node becomes a member of rs0; no resync is required.
#   * Your backend DATABASE_URL can stay unchanged (single member). Optionally
#     append ?replicaSet=rs0 for explicit discovery.
set -euo pipefail

DBPATH="${DBPATH:-$HOME/data/mongors}"
PORT="${PORT:-27017}"
LOGPATH="${DBPATH}/mongod.log"
RS_NAME="rs0"
HOST="127.0.0.1:${PORT}"

mkdir -p "$DBPATH"

# Refuse to clobber an existing node on the port.
if command -v lsof >/dev/null 2>&1; then
  if lsof -iTCP:"$PORT" -sTCP:LISTEN >/dev/null 2>&1; then
    echo "ERROR: port $PORT is already in use. Stop the existing mongod first, e.g.:" >&2
    echo "  mongosh --port $PORT --eval 'db.adminCommand(\"shutdown\")'" >&2
    exit 1
  fi
fi

echo "Starting mongod as replica set '$RS_NAME' on port $PORT (dbpath: $DBPATH)..."
mongod --replSet "$RS_NAME" --port "$PORT" --bind_ip 127.0.0.1 \
  --dbpath "$DBPATH" --logpath "$LOGPATH" --fork

# Give it a moment to accept connections.
sleep 2

# Initialise the replica set (idempotent — safe to re-run on restart).
INIT_JS="$(mktemp)"
cat > "$INIT_JS" <<EOF
try {
  rs.initiate({
    _id: "$RS_NAME",
    members: [{ _id: 0, host: "$HOST" }]
  });
  print("rs.initiate() issued");
} catch (e) {
  // Already initiated (e.g. after a restart) — not an error.
  print("Note: " + (e && e.errmsg ? e.errmsg : e));
}
EOF

mongosh --port "$PORT" "$INIT_JS" || true
rm -f "$INIT_JS"

echo "Verifying replica set state (expect '1' / PRIMARY):"
mongosh --port "$PORT" --eval 'rs.status().myState' || true

echo
echo "Done. Optional: set DATABASE_URL to include the replica set name:"
echo "  mongodb://${HOST}/hyper-market?replicaSet=${RS_NAME}"
echo "Then restart the backend — the probe should log '[transactions] ... atomicity enabled.'"
