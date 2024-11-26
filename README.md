# board game template with cloudflare
- This is a template repository for creating online board game server with cloudflare workers, durable object and stuff.
- This project has implemented my original board game "undo ando".
  - You can read the rule(JP)(EN) and play it here.

## composition
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
