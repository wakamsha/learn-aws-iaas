# Phase 1 学習ログ

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

## Console で見たもの

### オリジンの編集画面(OAC とバケットポリシー)

- 「オリジンアクセス」は `Origin access control settings (recommended)` が選ばれ、OAC は作成済みのもの(`learn-aws-iaas-phase1-guided-<account-id>`)から選ぶ形になっている。OAC はディストリビューションとは独立した部品で、Terraform でも別のリソースとして書いて ID で参照する
- 「このポリシーステートメントを使用して CloudFront へのアクセスを許可する必要があります。」というアラートと「ポリシーをコピー」ボタンがある。コピーされる JSON は、`data.aws_iam_policy_document.bucket` で組み立てたものと同じ内容
- CloudFront の画面は、バケットポリシーの JSON を組み立てて見せるところまでで、バケットに付ける作業は利用者に任せている(推測: バケットポリシーは S3 の側のリソースベースのポリシーで、CloudFront とは別のサービスの持ち物だから)。Terraform では `aws_s3_bucket_policy` を自分で書いてこの作業を担った
