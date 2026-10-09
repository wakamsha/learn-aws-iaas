# app

Phase 3 以降で使う、依存パッケージのない最小の API サーバー。
**Dockerfile は含めていない。** Phase 3 で自分で書く。

## 起動

```sh
node server.mjs
# PORT（既定 3000）と APP_VERSION（既定 dev）を環境変数で変更できる
```

## エンドポイント

| パス | 用途 | 使う Phase |
| --- | --- | --- |
| `GET /health` | ヘルスチェック | 3 |
| `GET /api/info` | 応答したホスト名・バージョン・起動時刻 | 3, 4 |
| `GET /api/slow?ms=3000` | 指定ミリ秒待ってから応答 | 3 の 504 の再現, 4 のアラーム |
| `GET /api/error` | 常に 500 を返す | 4 のアラーム |

## 観察してほしいこと

- ログは 1 行 1 JSON で標準出力に出る。コンテナではこれがどこに行くか(Phase 3 の `awslogs`)
- `SIGTERM` を受けると処理中のリクエストを終えてから終了する。`docker stop` したときと `kill -9` したときの違い(Phase 3)
- Phase 3 で、ここに DB に読み書きするエンドポイントを自分で追加する
