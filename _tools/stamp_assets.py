# -*- coding: utf-8 -*-
"""CSS/JSの読み込みURLに、ファイル内容のハッシュ(?v=xxxxxxxx)を付ける(2026-10-03追加)。

GitHub Pagesは Cache-Control: max-age=600 のため、デプロイ直後の約10分は「新しいHTML + 古いCSS/JS」の
組み合わせで表示される訪問者が出る(見出しの大きさが崩れる等)。読み込みURLを内容ハッシュ付きにしておけば、
CSS/JSを変えたとき新しいHTMLは必ず新しいファイルを取りに行く。

使い方(CSS/JSを編集したら、コミットの前に毎回実行する):
    python _tools/stamp_assets.py          # 全HTMLの ?v= を現在の内容に更新
    python _tools/stamp_assets.py --check  # 更新が必要なら一覧を出して終了コード1(書き込みなし)

ハッシュは改行コードの違い(LF/CRLF)に影響されないよう、LFに揃えてから計算する。
"""
import hashlib
import os
import re
import sys

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')  # Windowsのコンソールで日本語が文字化けしないように

APP = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

LINK_RE = re.compile(r'(<link\b[^>]*?\shref=")((?!https?:|//|data:)[^"?#]+\.css)(\?v=[0-9a-f]+)?(")')
SCRIPT_RE = re.compile(r'(<script\b[^>]*?\ssrc=")((?!https?:|//|data:)[^"?#]+\.js)(\?v=[0-9a-f]+)?(")')


def content_hash(path):
    with open(path, 'rb') as f:
        data = f.read().replace(b'\r\n', b'\n')
    return hashlib.sha1(data).hexdigest()[:8]


def html_files():
    for name in sorted(os.listdir(APP)):
        full = os.path.join(APP, name)
        if name == 'index.html':
            yield full
        elif os.path.isdir(full) and not name.startswith(('.', '_')):
            page = os.path.join(full, 'index.html')
            if os.path.exists(page):
                yield page


def stamp(html_path, check_only):
    with open(html_path, encoding='utf-8', newline='') as f:
        text = f.read()
    base = os.path.dirname(html_path)
    changes = []

    def repl(match):
        prefix, ref, old, suffix = match.groups()
        target = os.path.normpath(os.path.join(base, ref))
        if not os.path.exists(target):
            raise SystemExit(f"参照先が存在しません: {html_path} -> {ref}")
        new = '?v=' + content_hash(target)
        if old != new:
            changes.append(f"{ref}: {old or '(なし)'} -> {new}")
        return f"{prefix}{ref}{new}{suffix}"

    new_text = SCRIPT_RE.sub(repl, LINK_RE.sub(repl, text))
    if new_text != text and not check_only:
        with open(html_path, 'w', encoding='utf-8', newline='') as f:
            f.write(new_text)
    return changes


def main():
    check_only = '--check' in sys.argv
    total = 0
    for page in html_files():
        changes = stamp(page, check_only)
        if changes:
            total += len(changes)
            print(os.path.relpath(page, APP))
            for c in changes:
                print('   ', c)
    if check_only:
        print('要更新: %d 件' % total if total else 'OK: すべて最新です')
        sys.exit(1 if total else 0)
    print('更新: %d 件' % total)


if __name__ == '__main__':
    main()
