# Phase 0 学習ログ

## 学んだこと

### Terraform は provider を通して AWS の API を呼ぶ

AWS の API を呼んでいるのは provider(Terraform 本体とは別のプロセス)である。リクエストには、SSO でログインして得た一時的な認証情報で署名する。`mise.toml` の `AWS_PROFILE = "learn"` が、どのプロファイルの認証情報を使うかを決める。ログインが切れていると、何も作らない plan でもエラーになる。plan は今の状態を AWS に問い合わせて差分を計算するからである。

### `init` が作るもの

| できたもの | 中身 | FE で近いもの | コミット |
| --- | --- | --- | --- |
| `.terraform/` | provider の実行ファイル(darwin_arm64 用、約 770 MB) | `node_modules/` | しない |
| `.terraform.lock.hcl` | 選ばれた provider のバージョンとハッシュ | `package-lock.json` | する |

`terraform.tf` の `~> 6.68` は受け入れる範囲で、lock file はその中から実際に使う 1 つ(6.68.0)を記録する。state は lock file とは別物で、何かを作るまで存在しない。

### plan で読めること

- `tags` は `resource` ブロックに直接書いたタグ。`tags_all` は `default_tags` と合わせて実際に付くタグで、provider が計算する
- `(known after apply)` は、作った後に AWS から受け取る値。`id` はバケット名と同じ値になるが、plan ではこう表示される
- `force_destroy` は AWS の API にない、provider だけの引数。`true` なら destroy の前に provider がバケットを空にする

### 書かなかった設定にも値が入る

`main.tf` に書かなかった暗号化(SSE-S3、`AES256`)とオブジェクト所有者(`BucketOwnerEnforced`)は、AWS の API のデフォルトで設定される。
バケットキーは、Console では作成画面で有効になっていたが、API で作ったこのバケットでは無効(`BucketKeyEnabled: false`)だった。Console のデフォルトと API のデフォルトは同じとは限らない。

### drift

Terraform を通さずに AWS 側が変わり、コードと実物がずれた状態。Console でタグを手で変えると、plan は `~`(in-place)でコードの値に戻す計画を出す。

- 普通の plan の矢印は「実物 → コード」で、これから何をするかを表す
- `terraform plan -refresh-only` の矢印は「state → 実物」で、Terraform の外で何が起きたかを表す
- AWS から読んだタグを `tags` と `tags_all` のどちらに振り分けるかは provider が決める。`default_tags` と値が違うタグは `tags` 側に入る

### replace

バケット名を変えると `-/+` になり、`bucket` の行に `# forces replacement` が付く。S3 に名前を変える API がなく、provider がその引数を作り直しの扱いにしているためである。
バケットを参照するバージョニングとパブリックアクセスブロックも、`bucket` 引数の値が変わるので連鎖して作り直しになる。
`-/+` はデフォルトで先に消してから作る。データを持つリソースでは、中身が消えることを意味する。

### destroy

- destroy は作ったときと逆の順序で消す。参照している側(バージョニング、パブリックアクセスブロック)が先に消える
- 中身が残ったバケットの `DeleteBucket` は `409 BucketNotEmpty` で失敗する。Terraform は API のエラーで止まり、Console のように手前で止めない
- 途中で失敗すると、成功した分だけが state から消える
- バージョニングを一度有効にしたバケットは、無効には戻せない。provider はリソースを消すとき「一時停止」にする
- バージョニングが有効なバケットでは、ファイルを消しても古いバージョンが残る。`force_destroy = true` にすると、provider が全バージョンを消してから `DeleteBucket` を呼ぶ。この引数は AWS の API にはなく、変更しても state が書き換わるだけである

## Console で見たもの

### S3 バケットの作成画面

- 最初から値が入っている項目: パブリックアクセスをすべてブロック(オン)、バージョニング(無効)、暗号化タイプ(SSE-S3)、バケットキー(有効)
- 空欄の項目: バケット名
- バケット名の規則に反すると、入力中にエラーが出る。`ab` は「バケット名は 3 文字以上 63 文字以下である必要があります。」、`Learn_Test` は「バケット名に無効な文字が含まれています: _」
- 作成後の詳細画面のタブ: オブジェクト / メタデータ / プロパティ / アクセス許可 / メトリクス / 管理 / ファイルシステム / アクセスポイント

### オブジェクトが入ったバケットの削除

Console は「バケットを空にする必要がある」と警告し、削除ボタンを押せない状態にして、「空にする」へ案内する。
削除の API(`DeleteBucket`)自体は、オブジェクトが残っているバケットに対してエラーを返す。Console はその API を呼ぶ前に状態を調べ、失敗する操作をボタンの段階で止めている。

## 振り返り

### 今回作ったもの

AWS Console を使った S3 バケットの作成・編集・削除と、Terraform による S3 バケットの作成・編集・削除。
Terraform では、バケット・バージョニング・パブリックアクセスブロックの 3 リソースを `phase0-hello/` に書き、drift・replace・destroy を一通り起こした。

### コードの構成

[TERRAFORM-STYLE.md](./TERRAFORM-STYLE.md) に従い、`terraform.tf` / `providers.tf` / `main.tf` / `outputs.tf` に分けた。リソースはすべて 1 つずつなので、名前は `this`。

### 難しかった点

- HCL の値が文字列型だと、入力補完が弱くなる(例: `versioning_configuration.status`)。慣れが必要
  - 使える値は provider が検査する。`"enabled"`(小文字)は `terraform validate` で `expected ... to be one of ["Enabled" "Suspended" "Disabled"]` になる
- `aws_s3_bucket_public_access_block` を、名前の似た `aws_s3_account_public_access_block`(アカウント全体に効く)と取り違えた。リソースの型は、Registry のページの見出しと 1 文字ずつ照合する

### 確かめたこと

- apply 後、AWS 側のバージョニング・パブリックアクセスブロック・タグがコードどおりで、`plan` が `No changes` になる
- Console でタグを変えると、plan が `~` で元に戻す計画を出す
- バケット名を変えると、3 リソースとも `-/+` になる
- 中身が残ったバケットの destroy は `409 BucketNotEmpty` で止まり、`force_destroy = true` にすると消し切れる
- destroy 後、タグ検索で残存が 0 件

### Console で気づいたこと

Console と Terraform の初期値がどの程度一致しているのかが気になる。パブリックアクセスブロックは、Console では「すべてブロック」が初期値だったが、Terraform では明示的な指定が必要だった。

初期値は 3 つの層で別々に決まっている。

| 層 | パブリックアクセスブロックの初期値 |
| --- | --- |
| Console の作成画面 | 4 つともオン |
| AWS の API(`CreateBucket`) | 4 つともオン(AWS のドキュメントによる。このアカウントでは未確認) |
| `aws_s3_bucket_public_access_block` の引数 | 4 つとも `false` |

リソースを書かなければ AWS の初期値のまま、リソースを書いて引数を省くと `false` で上書きされる。バケットキーのように Console と API で初期値が違う設定もあるので、初期値が大事な設定はコードに書くか、apply 後に `describe` 系のコマンドで確かめる。

### 作り直すなら改善したい点

- 初期値に頼っている設定(暗号化、オブジェクト所有者)も、意図を示すためにコードに書く。今回は AWS の初期値で SSE-S3 と ACL 無効になったが、コードを読んでもそれが分からない
- 学習用のバケットには、最初から `force_destroy = true` を付ける。消すたびに手で空にする必要がなくなる。中身を失うと困るバケットには付けない

### 次に学ぶこと

リソースどうしが参照し合う構成(Phase 1)。基礎の単元は IAM ポリシーの文法から始める。
