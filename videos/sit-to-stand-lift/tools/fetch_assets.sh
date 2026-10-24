#!/bin/bash
# Downloads the external assets the project needs: Hebrew fonts (Google Fonts, OFL) and Mixkit sound effects.
set -e
cd "$(dirname "$0")/.."
mkdir -p fonts sfx
get_font() { # family weight file
  url=$(curl -s "https://fonts.googleapis.com/css2?family=$1:wght@$2" | grep -o 'https://fonts.gstatic.com[^)]*\.ttf' | head -1)
  curl -s -o "fonts/$3" "$url"
}
for w in 400 700 800 900; do get_font Heebo $w Heebo-$w.ttf; done
for w in 500 700 900; do get_font Rubik $w Rubik-$w.ttf; done
for id in 1461 1474 1482 1489 2232 3109; do
  curl -s -o "sfx/mixkit_$id.mp3" "https://assets.mixkit.co/active_storage/sfx/$id/$id-preview.mp3"
done
echo "assets ready"
