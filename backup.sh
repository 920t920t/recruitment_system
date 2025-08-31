#!/bin/bash

# 人材紹介システム自動バックアップスクリプト
# 使用方法: ./backup.sh "変更内容の説明"

# 現在の日時取得
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="$HOME/recruitment-system-backups"

# バックアップディレクトリ作成
mkdir -p "$BACKUP_DIR"

# 引数から説明文を取得（なければデフォルト）
DESCRIPTION=${1:-"定期バックアップ"}

echo "🔄 バックアップ開始: $DESCRIPTION"

# 1. Gitコミット（作業内容保存）
cd ~/recruitment-system
git add .
git commit -m "バックアップ: $DESCRIPTION - $TIMESTAMP"

# 2. フォルダ全体をコピー
cp -r ~/recruitment-system "$BACKUP_DIR/backup_$TIMESTAMP"

# 3. 圧縮保存（容量節約）
cd "$BACKUP_DIR"
tar -czf "backup_$TIMESTAMP.tar.gz" "backup_$TIMESTAMP"
rm -rf "backup_$TIMESTAMP"

echo "✅ バックアップ完了: $BACKUP_DIR/backup_$TIMESTAMP.tar.gz"

# 4. 古いバックアップを削除（10個以上ある場合）
BACKUP_COUNT=$(ls -1 backup_*.tar.gz 2>/dev/null | wc -l)
if [ "$BACKUP_COUNT" -gt 10 ]; then
    echo "🗑️  古いバックアップを削除中..."
    ls -t backup_*.tar.gz | tail -n +11 | xargs rm -f
fi

echo "📊 現在のバックアップ数: $(ls -1 backup_*.tar.gz 2>/dev/null | wc -l)"