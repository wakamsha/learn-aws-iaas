# Terraform の書き方の規則

全 Phase で使う命名とファイル分割の規則。HashiCorp の Terraform Style Guide に従う。
最初の `.tf` を書く前に読む。

## 命名

- 名前は説明的な名詞にし、単語は `_` で区切る(`web_api`)
- 名前にリソースの型を繰り返さない。アドレス(`aws_s3_bucket.this`)に型が既に含まれる。ディレクトリで分かること(`phase1`)も繰り返さない
- その型のリソースが 1 つしかなければ `this` にする。AWS provider の公式 module(terraform-aws-modules)の慣習
- 同じ型が複数あるときは、役割で名前を付ける(`caching_disabled` / `caching_optimized`)

## ファイル分割

- `terraform.tf`(`required_version` と `required_providers`)/ `providers.tf` / `main.tf` / `variables.tf` / `outputs.tf` / `locals.tf` に分ける
- リソースが増えたら、`main.tf` を論理的なまとまり(`network.tf`、`storage.tf` など)に分ける。基準は、目的のリソースがどのファイルにあるかがすぐ分かること

Terraform は、同じディレクトリの `.tf` ファイルをすべて 1 つのモジュールとして読む。
ES Modules のようにファイルごとのスコープや `import` はなく、全ファイルを連結した 1 つのファイルに近い。
ファイルの分け方と並び順は動作に影響せず、依存関係を決めるのは参照だけである。依存関係は `terraform graph` で図にできる。
入力と出力を明示した境界が要るときは module を使う(Phase 3)。

## フォーマット

`terraform fmt` を正とする。設定は [SETUP-TOOLCHAIN.md](./SETUP-TOOLCHAIN.md) にある。
