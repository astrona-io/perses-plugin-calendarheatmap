# Made-up SLA history in OpenMetrics text, one sample every 5 minutes, for promtool backfill.
#
#   demo_sli_availability{service="checkout"}  share of good requests in the 5 minutes (0..1)
#   demo_incident_open{service, incident}       1 while an incident is open
#   demo_deploys{service="checkout"}            deploys in the 5 minutes
#
# Most days meet 99.9%; a few are close (about a minute down), some breach with an incident, one
# month misses the SLA, and two days have no data (monitoring was down). Seeded, so every run
# draws the same calendar relative to today.
#
# awk -v now=<epoch s> -v days=<n> -f history.awk

function day_plan(d,    u) {
  u = rand()
  outage[d] = 0
  outage_at[d] = 0
  close_at[d] = -1
  blip_at[d] = -1
  if (d == big) {
    outage[d] = 74
  } else if (u < 0.03) {
    outage[d] = 10 + int(rand() * 18)
  } else if (u < 0.10) {
    close_at[d] = int(rand() * 288)
  } else if (u < 0.40) {
    blip_at[d] = int(rand() * 288)
  }
  if (outage[d] > 0) outage_at[d] = 96 + int(rand() * 144)
  # deploys: weekdays busy, weekends quiet
  wd = (int(start / 86400) + d + 4) % 7  # 0 = Sunday
  n = (wd == 0 || wd == 6) ? int(rand() * 2) : 1 + int(rand() * 8)
  for (i = 0; i < n; i++) deploy[d, 108 + int(rand() * 108)]++
}

BEGIN {
  srand(20261009)
  step = 300
  start = int((now - days * 86400) / 86400) * 86400
  last = int(now / step) * step
  ndays = int((last - start) / 86400) + 1
  big = ndays - 45
  gap = ndays - 120
  for (d = 0; d < ndays; d++) day_plan(d)

  print "# HELP demo_sli_availability Share of good requests."
  print "# TYPE demo_sli_availability gauge"
  for (t = start + step; t <= last; t += step) {
    d = int((t - step - start) / 86400)
    s = int(((t - step - start) % 86400) / step)
    if (d == gap || d == gap + 1) continue
    v = 1
    if (outage[d] > 0 && s >= outage_at[d] && s < outage_at[d] + int(outage[d] / 5)) v = 0
    if (outage[d] > 0 && s == outage_at[d] + int(outage[d] / 5)) v = 1 - (outage[d] % 5) / 5
    if (s == close_at[d]) v = 0.8
    if (s == blip_at[d]) v = 0.95
    printf "demo_sli_availability{service=\"checkout\"} %s %d\n", v, t
  }

  print "# HELP demo_incident_open Open incidents."
  print "# TYPE demo_incident_open gauge"
  for (d = 0; d < ndays; d++) {
    if (outage[d] == 0) continue
    id = sprintf("INC-%d", 2000 + d)
    first = start + d * 86400 + (outage_at[d] + 1) * step
    for (k = 0; k <= int(outage[d] / 5); k++) {
      t = first + k * step
      if (t > last) break
      printf "demo_incident_open{service=\"checkout\",incident=\"%s\"} 1 %d\n", id, t
    }
  }

  print "# HELP demo_deploys Deploys in the interval."
  print "# TYPE demo_deploys gauge"
  for (t = start + step; t <= last; t += step) {
    d = int((t - step - start) / 86400)
    s = int(((t - step - start) % 86400) / step)
    printf "demo_deploys{service=\"checkout\"} %d %d\n", deploy[d, s] + 0, t
  }
  print "# EOF"
}
