# 🚀 よく使うコマンド辞書

## 📍 基本操作
```bash
pwd                    # 今いる場所を表示
ls                     # ファイル一覧を表示
ls -la                # 詳細なファイル一覧
cd フォルダ名          # フォルダに移動
cd ..                 # 一つ上のフォルダに移動
cd ~                  # ホームディレクトリに移動
```

## 📁 ファイル・フォルダ操作
```bash
mkdir フォルダ名       # フォルダを作成
touch ファイル名       # 空のファイルを作成
open ファイル名        # ファイルを開く
open .                # 現在のフォルダをFinderで開く
rm ファイル名          # ファイルを削除
rm -rf フォルダ名      # フォルダを削除（注意！）
```

## 🌐 Web開発関連
```bash
open index.html       # HTMLファイルをブラウザで開く
python -m http.server 8000  # ローカルサーバー起動
node server.js        # Node.jsサーバー起動
npm install           # パッケージをインストール
npm run dev           # 開発サーバー起動
```

## 🔧 Git（バージョン管理）
```bash
git init              # Gitリポジトリを初期化
git add .             # 全ての変更をステージング
git commit -m "メッセージ"  # 変更をコミット
git status            # 変更状況を確認
```

## 💡 便利な Claude Code 使い方
```
「XXXを作って」      # 具体的に指示
「エラーを直して」    # エラーメッセージを見せる
「説明して」         # コードの解説
「テストして」       # 動作確認
```

## 📂 このプロジェクトに戻る方法
```bash
# 1. ターミナルを開く
# 2. Claude Codeを起動
claude

# 3. プロジェクトフォルダに移動
cd ~/recruitment-system

# 4. ファイル確認
ls -la
```

## 🆘 トラブル時
- 迷子になった → `pwd` で場所確認
- ファイルが見つからない → `ls -la` で一覧表示  
- エラーが出た → エラーメッセージをClaude Codeに見せる