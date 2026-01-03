#!/bin/bash
set -e

# Resolve salonflow-web root reliably
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
WEB_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

SOURCE="$WEB_ROOT/src/assets/images/salon-flow-logo-original.png"
OUTPUT="$WEB_ROOT/public/icons"

# Sanity check
if [ ! -f "$SOURCE" ]; then
  echo "❌ Source logo not found at:"
  echo "   $SOURCE"
  exit 1
fi

mkdir -p "$OUTPUT"

SIZES=(
  16 32 48 64 72 96
  128 144 152 192
  256 384 512 1024
)

echo "🎨 Generating SalonFlow icons..."

for SIZE in "${SIZES[@]}"; do
  magick "$SOURCE" -resize ${SIZE}x${SIZE} "$OUTPUT/icon-${SIZE}x${SIZE}.png"
  echo "✔ icon-${SIZE}x${SIZE}.png"
done

# Apple touch icon
magick "$SOURCE" -resize 180x180 "$OUTPUT/apple-touch-icon.png"
echo "✔ apple-touch-icon.png"

# Favicon
magick "$SOURCE" -resize 256x256 "$OUTPUT/favicon.ico"
echo "✔ favicon.ico"

echo "✅ All SalonFlow icons generated successfully."