#!/bin/sh
# Backfills HISTORY_DAYS of made-up SLA history into the TSDB once, then starts Prometheus.
set -eu

if [ ! -f /prometheus/.backfilled ]; then
  now=$(date +%s)
  echo "backfill: writing ${HISTORY_DAYS} days of history"
  awk -v now="$now" -v days="$HISTORY_DAYS" -f /dev-ch/history.awk > /prometheus/history.om
  promtool tsdb create-blocks-from openmetrics --max-block-duration=720h \
    /prometheus/history.om /prometheus >/dev/null
  rm /prometheus/history.om
  touch /prometheus/.backfilled
fi

exec /bin/prometheus \
  --config.file=/etc/prometheus/prometheus.yml \
  --storage.tsdb.path=/prometheus \
  --storage.tsdb.retention.time=450d
