#!/bin/bash
# SignalOps MongoDB Backup Script
# Sử dụng: ./scripts/backup-mongodb.sh
# Yêu cầu: mongodump phải có trong PATH

set -euo pipefail

BACKUP_DIR="${BACKUP_DIR:-./backups}"
MONGODB_URI="${MONGODB_URI:-mongodb://localhost:27017/signalops-db}"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_PATH="${BACKUP_DIR}/signalops_${DATE}"

echo "╔══════════════════════════════════════╗"
echo "║   SignalOps MongoDB Backup           ║"
echo "╚══════════════════════════════════════╝"
echo ""
echo "📅 Thời gian: $(date)"
echo "📁 Thư mục backup: ${BACKUP_PATH}"
echo ""

# Tạo thư mục backup
mkdir -p "${BACKUP_PATH}"

# Thực hiện backup
echo "⏳ Đang backup..."
mongodump --uri="${MONGODB_URI}" --out="${BACKUP_PATH}" 2>&1

# Nén backup
echo "📦 Đang nén..."
tar -czf "${BACKUP_PATH}.tar.gz" -C "${BACKUP_DIR}" "signalops_${DATE}"
rm -rf "${BACKUP_PATH}"

# Xóa backup cũ (giữ 7 ngày gần nhất)
KEEP_DAYS="${KEEP_DAYS:-7}"
echo "🗑️ Xóa backup cũ hơn ${KEEP_DAYS} ngày..."
find "${BACKUP_DIR}" -name "signalops_*.tar.gz" -mtime +${KEEP_DAYS} -delete 2>/dev/null || true

echo ""
echo "✅ Backup hoàn tất: ${BACKUP_PATH}.tar.gz"
echo "📊 Kích thước: $(du -h "${BACKUP_PATH}.tar.gz" | cut -f1)"

# Hướng dẫn restore
echo ""
echo "📖 Để restore, chạy:"
echo "   tar -xzf ${BACKUP_PATH}.tar.gz -C ${BACKUP_DIR}"
echo "   mongorestore --uri=\"\${MONGODB_URI}\" --drop ${BACKUP_PATH}/"
