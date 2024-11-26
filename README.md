# bodoge-server
- template

## ディレクトリ
```
bodoge/
├── src/
│   ├── index.ts ... エントリーポイント。ルーティング
│   ├── room.ts ... DurableObjectに対応するRoomクラス定義
│   ├── game/ ... ゲームロジックに関係のある関数/型定義
│   ├── types/ ... openapi.yamlから出力される型ファイル
│   └── utils/ ... ゲームロジックに関係のない関数/型定義
├── docs/
├── schema/ ... 以下のファイル群をソースとして、ツールを使ってコードを生成する。
│   ├── openapi.yaml ... API/WebSocketでクライアントとやりとりするデータ型を定義。
│   └── state_machine.md ... ゲームのフェイズを状態機械で定義。
├── tool/
├── package.json
└── README.md
```