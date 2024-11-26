# board game template with cloudflare
- This is a template repository for creating online board game server with cloudflare workers, durable object and stuff.
- This project has implemented my original board game "undo ando".
  - You can read the rule([JP](https://mfqwkmr4.notion.site/undo-ando-13b1123f22e180b389d8d5c3b231fe87))([EN](https://mfqwkmr4.notion.site/undo-ando-English-14a1123f22e180259f72dde40a216470)) and play it [here](https://bodoge-fe.pages.dev/).

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
