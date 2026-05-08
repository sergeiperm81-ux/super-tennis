#!/bin/bash
for vid in "$@"; do
  views=$(curl -s "https://www.youtube.com/shorts/$vid" -A "Mozilla/5.0" 2>/dev/null | grep -oE '"viewCount":"[0-9]+"' | head -1 | grep -oE '[0-9]+')
  echo "$vid : ${views:-?}"
done
