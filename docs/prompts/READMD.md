# prompt
- chatgptに与えるプロンプトです。

## 流れ
1. NL.txtに実現したいことを記述
2. コマンドを実行
   ```
   python3 gen_prompt.py < template.yaml
   ```
   - gen_prompt.pyの中でNL.txtを読み込み
   - meta.yamlをテンプレートとしてプロンプトを出力(クリップボードにコピー)
3. ChatGPTにペースト
