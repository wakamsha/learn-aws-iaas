# Phase 0 学習ログ

## 決定事項と判断理由

| 論点 | 決定 | 理由 |
| --- | --- | --- |
| Terraform のバージョン | `mise.toml` で `1.16.5` に固定 | CI やチームメンバー間で同じバージョンを使うため。`latest` だと実行のたびに参照先が変わり、予期せぬ挙動を招く。1 人の学習でも、数週間後の自分が別のメンバーにあたる |
| AWS provider のバージョン制約 | `~> 6.68` | 6 系の中だけで上げる。`>= 6.68.0` は互換性のない変更を含む 7 系も許してしまう |
| バケット名 | `learn-aws-iaas-phase0-883306515710` を直書き | 全世界での一意性のためにアカウント ID を入れる。data source と変数は Phase 1〜2 で導入する |
| 認証 | `mise.toml` の `[env]` で `AWS_PROFILE = "learn"` | リポジトリの中にいる間だけ、プロファイルが自動で設定される |

## 学んだこと

### アクセスを決める 2 つの層

- ブロックパブリックアクセスは、パブリックに公開する設定を拒否する安全装置。アカウント内の主体からのアクセスは制限しない
- アカウント内の主体は、IAM ポリシー(アイデンティティベース)で許可されていれば読める。AdministratorAccess のロールは、ブロックパブリックアクセスが有効なバケットの中身も一覧できる

### 参照と依存グラフ

- `bucket = aws_s3_bucket.phase0.id` は、S3 バケットが作られて初めて確定する値なので、plan では `known after apply` になる
- この参照が依存関係になる。作成はバケット → versioning / public access block の順、destroy はその逆順
- 名前を文字列で直書きすると依存関係が消え、作成の順番が保証されない

### state

- state は、Terraform が最後に AWS から読んだときの記録であって、実物そのものではない
  - 作成直後に読んだバケットの `versioning` は、versioning を有効にする前の `false` のまま残る
- plan は実物を読み直して比較するが、読み直した結果を state には保存しない。保存されるのは apply のとき(`apply -refresh-only` なら state だけを更新する)
- plan はコードと実物を比べる。コードに書いていない属性は差分にならない

### plan の記号

| 記号 | 意味 | 今回起こした操作 |
| --- | --- | --- |
| `+` | 作成 | 初回の apply |
| `~` | in-place 更新 | Console でタグを変えたあとの plan(drift) |
| `-/+` | 削除してから作成(replace) | バケット名を変えた plan |
| `-` | 削除 | destroy |

- drift: Console で `Phase` タグを変えると、plan は `~` でコードの値に戻そうとする。最終的に付くタグは `tags_all` で読む。`tags` 側の表示は provider の表現である
- replace: バケット名の変更は、AWS API に名前を変える操作がないため、provider が ForceNew として扱う。参照している versioning / public access block も、`bucket` 引数の値が変わるので作り直しになる
- plan が通っても apply が成功するとは限らない。大文字を含むバケット名(`-V2`)も plan は通る

### destroy

- 中身があるバケットの `DeleteBucket` は、AWS API が `409 BucketNotEmpty` で拒否する。`force_destroy = false` は、provider がバケットを空にする手当てをしないという意味
- バージョニングが有効なバケットを空にするには、オブジェクトのバージョンを 1 つずつ削除する
- destroy が途中で失敗すると、先に消えた依存リソースだけがなくなる。public access block が先に消えると、パブリック公開を止める安全装置だけが外れた状態になる
- versioning を destroy しても、バケットは `Suspended` になるだけで、有効にする前の状態には戻らない

### `init` が作るもの

- `.terraform/` には provider のバイナリ(`darwin_arm64` 用、768MB)が入る。lock から再生成できるので commit しない(`node_modules/` と同じ)
- `.terraform.lock.hcl` は commit する。`zh:` のハッシュは、他のプラットフォーム向けの配布物も検証する。そのため、Linux の CI でも同じバージョンであることを確かめられる

## Console で見たもの

2026-10-09 の CloudTrail で、S3 の書き込み系 API を比べた。

| 呼び出し元 | 書き込み系の API |
| --- | --- |
| Console | `CreateBucket`、`PutBucketEncryption` |
| Terraform | `CreateBucket`(タグを同時に指定)、`PutBucketPublicAccessBlock`、`PutBucketVersioning` |

Terraform は `CreateBucket` の直後に、十数個の `Get*`(`GetBucketCors`、`GetBucketLogging`、`GetBucketWebsite` など)を呼ぶ。
