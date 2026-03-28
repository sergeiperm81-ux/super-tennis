#!/bin/bash
# Quick health check — run when starting work
# Usage: bash scripts/health.sh

echo ""
echo "========================================="
echo "  SUPER.TENNIS — Health Report"
echo "  $(date '+%Y-%m-%d %H:%M')"
echo "========================================="
echo ""

REPO="sergeiperm81-ux/super-tennis"
ISSUES=0

check_workflow() {
  local name=$1
  local file=$2
  local label=$3

  local result=$(gh run list --repo $REPO --workflow="$file" --limit=1 \
    --json conclusion,createdAt --template '{{range .}}{{.conclusion}} {{.createdAt}}{{end}}' 2>/dev/null)

  local conclusion=$(echo "$result" | awk '{print $1}')
  local date=$(echo "$result" | awk '{print $2}' | cut -c1-10)

  if [ "$conclusion" = "success" ]; then
    printf "  [OK]   %-20s (%s)\n" "$label" "$date"
  elif [ -z "$conclusion" ]; then
    printf "  [--]   %-20s (no runs)\n" "$label"
  else
    printf "  [FAIL] %-20s (%s) — %s\n" "$label" "$date" "$conclusion"
    ISSUES=$((ISSUES + 1))
  fi
}

check_workflow "content-factory" "content-factory.yml" "Content Factory"
check_workflow "deploy" "deploy.yml" "Build & Deploy"
check_workflow "weekly-rankings" "weekly-rankings.yml" "Weekly Rankings"
check_workflow "watchdog" "watchdog.yml" "Watchdog"

# Site check
HTTP=$(curl -s -o /dev/null -w "%{http_code}" https://super.tennis/ 2>/dev/null || echo "000")
if [ "$HTTP" = "200" ]; then
  printf "  [OK]   %-20s (HTTP %s)\n" "Site online" "$HTTP"
else
  printf "  [FAIL] %-20s (HTTP %s)\n" "Site DOWN" "$HTTP"
  ISSUES=$((ISSUES + 1))
fi

echo ""
if [ "$ISSUES" -eq 0 ]; then
  echo "  All systems operational"
else
  echo "  *** $ISSUES issue(s) found ***"
fi
echo "========================================="
echo ""
