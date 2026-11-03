#!/usr/bin/env bash
# Đẩy thư mục dist/ (đã build) lên nhánh gh-pages để GitHub Pages phục vụ.
set -euo pipefail
cd "$(dirname "$0")/.."
remote=$(git remote get-url origin)
tmp=$(mktemp -d)
cp -R dist/. "$tmp"
touch "$tmp/.nojekyll"   # để GitHub Pages không bỏ qua file bắt đầu bằng "_"
cd "$tmp"
git init -q -b gh-pages
git add -A
git -c user.name="$(git -C "$OLDPWD" config user.name)" -c user.email="$(git -C "$OLDPWD" config user.email)" \
  commit -q -m "Deploy $(date '+%Y-%m-%d %H:%M')"
git push -q -f "$remote" gh-pages
rm -rf "$tmp"
echo "Đã deploy lên gh-pages"
