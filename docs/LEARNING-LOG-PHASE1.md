# Phase 1 学習ログ

## 決定事項と判断理由

| 論点 | 決定 | 理由 |
| --- | --- | --- |
| アクセス制限 | かけない。配信するのは中身のないサンプルの SPA に限る | 制限には WAF や CloudFront Functions が要り、Phase 1 の範囲外 |
| ドメインと証明書 | `*.cloudfront.net` と CloudFront の既定の証明書 | 証明書の発行と DNS の設定が要らない。独自ドメインは発展課題 |
| デプロイの反映 | デプロイ後、利用者が次に画面を開いたときに新しい版が出る | プロダクト側の要求 |
| アセットのキャッシュ | ブラウザにできるだけ長くキャッシュさせる | プロダクト側の要求 |
| 存在しないパス | SPA の「ページが見つかりません」画面。ステータスは問わない | 社内向けで、検索エンジンに載らない |
| アップロード | Terraform ではなく AWS CLI | インフラ(バケット、配信の設定)とアプリの中身(ビルドのたびに変わる)では変わる頻度が違う |
| `index.html` のキャッシュ | ブラウザは `no-cache`、CloudFront は `Managed-CachingDisabled` | URL が変わらないのに中身はデプロイのたびに変わる。期間を指定しない `public` だと、CloudFront は既定の TTL(1 日)で保存し、ブラウザも推測でキャッシュするので、デプロイが反映されない |
| `/assets/*` のキャッシュ | ブラウザは `public, max-age=31536000, immutable`、CloudFront は `Managed-CachingOptimized` | ファイル名にハッシュが入り、中身が変わると URL が変わる。1 年は `Managed-CachingOptimized` の最大 TTL と同じ |
| 深いパスと存在しないパス | `custom_error_response` で 403 を `/index.html` と 200 に差し替える | S3 から見るとどちらも「ないファイル」で区別できない。どの画面を出すかは SPA のルーターが決める |
| セキュリティヘッダー | `Managed-SecurityHeadersPolicy` をすべてのビヘイビアに付ける | HSTS、`X-Frame-Options`、`X-Content-Type-Options`、`Referrer-Policy` が付く。自作は Phase 1 の主題ではない |

## 学んだこと

### IAM ポリシーの判定

AWS は API の呼び出しのたびに、関係するポリシーを集めて判定する。

1. 当てはまる `Deny` があれば拒否(明示的 Deny)
2. 当てはまる `Allow` があれば許可
3. どちらもなければ拒否(暗黙の Deny)

Deny が Allow より優先されるのは、ステートメントがより具体的だからではない。対象が広くても狭くても、当てはまる Deny が 1 つでもあれば拒否になる。

### `Principal` と `Condition` の役割の違い

`Principal` は「誰が」を書く要素で、CloudFront なら `"Service": "cloudfront.amazonaws.com"` までしか書けない。どのアカウントのどのディストリビューションかは区別できない。
特定のディストリビューションに絞るには、`Condition` でリクエストの送り元の ARN(`AWS:SourceArn`)を照合する。

### S3 の ARN

`arn:aws:s3:::example-bucket` はバケット、`arn:aws:s3:::example-bucket/*` はその中のオブジェクトを指す。`s3:GetObject` の対象はオブジェクトなので `/*` が要る。

### CDN のキャッシュ

- キャッシュはブラウザと CDN のエッジの 2 層にあり、どちらもオリジンの `Cache-Control` を手がかりにする。`private` は共有キャッシュ(CDN)に保存させない
- `x-cache` が `Hit` の間、`age` は経過時間だけ増える。`max-age` を過ぎると、エッジはオリジンに確かめに行く(`RefreshHit` / `Miss`)
- キャッシュキーが違えば別のファイルとして扱われる。クエリ文字列をキャッシュキーに含めるディストリビューションでは、自分だけの値を付けた URL は 1 回目が `Miss`、2 回目が `Hit` になる
- 長い `max-age` を付けてよいのは、中身が変わると URL も変わるハッシュ付きのアセット。`index.html` は URL が変わらないので、長くキャッシュさせるとデプロイ後も古い画面が出続ける

### OAC 経由の配信を成り立たせる 3 つの部品

| 部品 | 役割 |
| --- | --- |
| OAC | CloudFront が S3 へのリクエストに署名する設定。署名がなければ、S3 から見て匿名の `curl` と同じ |
| ディストリビューション | オリジン(S3)、使う OAC、キャッシュのしかたを持つ配信の設定 |
| バケットポリシー | `cloudfront.amazonaws.com` に `s3:GetObject` を許し、`AWS:SourceArn` でこのディストリビューションに絞る |

- `data "aws_iam_policy_document"` は JSON を組み立てるだけで、バケットに付けるには `aws_s3_bucket_policy` が別に要る
- ポリシーの条件がディストリビューションの ARN を参照しているので、JSON の組み立ては apply の途中(ディストリビューションを作った後)に回る。plan には `will be read during apply` と出る
- 確かめた結果: CloudFront 経由は 200(1 回目 `Miss`、2 回目 `Hit`)、http は 301 で https へ、S3 の URL への直接アクセスは `AccessDenied`
- 存在しないパスは、CloudFront 経由で 403 になる。`s3:ListBucket` を許可していないので、S3 は「ない」と答えず「読めない」と答える

### 構築の順序

段階ごとに 1 種類の部品だけを足し、その効果だけを確かめた。

| 段階 | 足したもの | 確かめたこと |
| --- | --- | --- |
| 1 | バケット、パブリックアクセスブロック、OAC、ディストリビューション(既定のビヘイビアだけ)。SPA のアップロード | CloudFront 経由も S3 への直接アクセスも 403 |
| 2 | バケットポリシー | CloudFront 経由が 200 に変わり、S3 への直接アクセスは 403 のまま |
| 3 | `/assets/*` のビヘイビア、レスポンスヘッダーポリシー | `/` は毎回 `Miss` で `no-cache`、アセットは `Hit` で 1 年。セキュリティヘッダーが付く |
| 4 | `custom_error_response` | `/settings/profile` と `/no-such-page` で SPA のそれぞれの画面が出る |

- 確かめる対象のファイルは最初の段階で置く。ファイルがないと、403 が「拒否」なのか「ない」なのか区別できない
- アップロードはアセット → `index.html` の順。新しい `index.html` が、まだない新しいアセットを読みにいく瞬間をなくす
- ビヘイビアやヘッダーポリシーの追加は、ディストリビューションの in-place の変更になる
- `custom_error_response` はディストリビューション全体に効く。存在しない JS を読むと、`index.html` が 200(`x-cache: Error from cloudfront`)で返り、JS の読み込みは失敗する

### 検証

| 要件 | 確かめ方 | 結果 |
| --- | --- | --- |
| HTTPS で配信する | https の `/` と、http の `/` | https は 200、http は 301 で https へ |
| S3 は直接公開しない | S3 の URL に直接アクセス | `AccessDenied` |
| 深いパスを直接開いても表示される | ブラウザで `/settings/profile` を開く | プロフィールの画面が出る |
| デプロイが次に開いたときに反映される | 文言を変えてビルドし、アセット → `index.html` の順で上げ、開いていたタブを普通にリロード | 新しい文言が出る。`index.html` が新しいハッシュの JS を指す |
| アセットを長くキャッシュさせる | アセットの `cache-control` と `x-cache` | `public, max-age=31536000, immutable`、2 回目以降 `Hit` |
| セキュリティヘッダー | `/` のレスポンスヘッダー | HSTS、`x-frame-options`、`x-content-type-options`、`referrer-policy` |

- 通る側だけでなく、拒否されるべき側(http、S3 への直接アクセス)も確かめる
- デプロイの反映は、スーパーリロードではなく普通のリロードで見る。スーパーリロードはブラウザのキャッシュを無視するので、`no-cache` が効いているかの確かめにならない
- `aws s3 sync` は手元にないファイルを消さないので、古いアセットもバケットに残る。デプロイ前から開いていたタブが古い JS を読みに来ても壊れない

## Console で見たもの

### オリジンの編集画面(OAC とバケットポリシー)

- 「オリジンアクセス」は `Origin access control settings (recommended)` が選ばれ、OAC は作成済みのもの(`learn-aws-iaas-phase1-guided-<account-id>`)から選ぶ形になっている。OAC はディストリビューションとは独立した部品で、Terraform でも別のリソースとして書いて ID で参照する
- 「このポリシーステートメントを使用して CloudFront へのアクセスを許可する必要があります。」というアラートと「ポリシーをコピー」ボタンがある。コピーされる JSON は、`data.aws_iam_policy_document.bucket` で組み立てたものと同じ内容
- CloudFront の画面は、バケットポリシーの JSON を組み立てて見せるところまでで、バケットに付ける作業は利用者に任せている(推測: バケットポリシーは S3 の側のリソースベースのポリシーで、CloudFront とは別のサービスの持ち物だから)。Terraform では `aws_s3_bucket_policy` を自分で書いてこの作業を担った

## 振り返り

### 今回作ったもの

Vite でビルドした SPA を、CloudFront のデフォルトドメインから HTTPS で配信する基盤(`phase1-static-site/`)。S3 は OAC 経由でだけ読め、直接のアクセスは拒否する。深いパスと存在しないパスは `custom_error_response` で `index.html` を返し、表示する画面は SPA のルーターが決める。`index.html` はキャッシュさせず、ハッシュ付きのアセットだけを CloudFront とブラウザに 1 年キャッシュさせる。

その前に、基礎で IAM ポリシーの文法と CDN のキャッシュのヘッダーを学び、ガイド付き構築(`phase1-guided/`)で `index.html` 1 つを OAC 経由で配信した。

### コードの構成

`terraform.tf` / `providers.tf` / `storage.tf` / `cloudfront.tf` / `outputs.tf`。リソースは、それが属するサービスのファイルに置く。`aws_s3_*` とバケットポリシーの JSON を組み立てる data source は `storage.tf`、`aws_cloudfront_*` と CloudFront の管理ポリシーを読む data source は `cloudfront.tf`。

### 難しかった点

- data source と resource をどの順に書くか。今回は data source をすべて先に書き、その後に resource を並べた
  - data source は、それを参照するリソースのそばに、そのリソースより前に置く(HashiCorp の Style Guide)。記述の順序は Terraform の動作に影響せず、作る順序は参照で決まるので、これは読みやすさのための規則である

### 作り直すなら改善したい点

- data source を、参照するリソースの直前に置く。`cloudfront.tf` では、キャッシュポリシー 2 つとレスポンスヘッダーポリシーをファイルの先頭にまとめたが、ディストリビューションの直前に置けば、ディストリビューションを読むときに上下に行き来しなくて済む
- アップロードの 3 つのコマンド(アセット → `favicon.svg` → `index.html`)を 1 つのスクリプトにまとめる。順番を記憶ではなくスクリプトで守らせる。Phase 4 で CI に載せるときの土台になる
- 確かめる対象のファイルは最初の段階で置く。今回は実装計画のレビューで足したが、403 が「拒否」なのか「ない」なのかを区別するために、計画の時点で入れておく

### 次に学ぶこと

通信経路を自分で組み立てる VPC とネットワーク(Phase 2)。基礎の単元は「2 進数と IP アドレス」から始める。
