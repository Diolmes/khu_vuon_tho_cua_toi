#!/bin/bash
# Cách dùng:  ./dang-len-web.sh "mô tả ngắn thay đổi"
# Việc nó làm: commit mọi thay đổi (trừ file sao lưu) -> gộp vào dev và main -> đẩy lên GitHub -> web tự cập nhật sau 1-3 phút.
cd "$(dirname "$0")" || exit 1

MSG="$1"
if [ -z "$MSG" ]; then echo "Thiếu mô tả. Ví dụ: ./dang-len-web.sh \"sửa hướng dẫn khách\""; exit 1; fi

BRANCH=$(git branch --show-current)

# 1. commit những gì đã sửa (không lấy file sao lưu vườn)
git add -A
git reset -q -- sao-luu-khu-vuon*.json 2>/dev/null
if git diff --cached --quiet; then
  echo "Không có gì mới để đăng."
else
  git commit -q -m "$MSG" || exit 1
  echo "Đã commit: $MSG"
fi

# 2. gộp vào dev rồi main (bỏ qua nhánh mà mình đang đứng)
fail() { echo "Gộp bị xung đột, dừng lại. Gọi Claude giúp."; git merge --abort 2>/dev/null; git checkout -q "$BRANCH"; exit 1; }
if [ "$BRANCH" != "dev" ]; then git checkout -q dev && git merge -q "$BRANCH" || fail; fi
if [ "$BRANCH" != "main" ]; then git checkout -q main && git merge -q dev || fail; fi
git checkout -q "$BRANCH"

# 3. đẩy lên GitHub (dùng github-token.txt nếu có, không thì dùng đăng nhập sẵn của máy)
REMOTE=$(git remote get-url origin)
if [ -f github-token.txt ]; then
  TOKEN=$(tr -d '\n ' < github-token.txt)
  git push "${REMOTE/https:\/\//https://x-access-token:$TOKEN@}" dev main 2>&1 | sed "s/$TOKEN/***/g" | tail -3
else
  git push origin dev main 2>&1 | tail -3
fi
echo "Xong. Đợi 1-3 phút rồi tải lại cứng (Cmd+Shift+R)."
