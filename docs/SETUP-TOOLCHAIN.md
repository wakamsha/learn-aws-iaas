# ツールの準備

**設定はリポジトリ内のファイルに置く。** エディタの設定画面だけに置くと、CLI 側と一致しているかを目視でしか確かめられない。

---

## Terraform

バージョンはリポジトリ内のファイルで固定し、バージョン管理ツールに読ませる。

[mise](https://mise.jdx.dev/) を使い、リポジトリ直下の `mise.toml` にバージョンを書く。

```toml
[tools]
terraform = "<バージョン>"
```

```sh
# シェルの起動時に mise を有効にする(初回のみ)。追記後に新しいターミナルを開く
echo 'eval "$(mise activate zsh)"' >> ~/.zshrc

mise trust     # 初めて読む mise.toml を信頼する
mise install
terraform version
```

`terraform: command not found` になるときは `mise doctor` を実行し、`activated: yes` になっているかを見る。

各 Phase の `terraform.tf` には、`required_version` と AWS provider のバージョン制約を書く。
**バージョン番号は記憶で書かず、** [Terraform のリリース](https://releases.hashicorp.com/terraform/) と
[AWS provider](https://registry.terraform.io/providers/hashicorp/aws/latest) で確かめる。

`.terraform.lock.hcl` は commit する(`package-lock.json` と同じ役割)。`.terraform/` は commit しない。

## AWS CLI v2

[公式の手順](https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html) でインストールする。

## Session Manager plugin(Phase 2 から)

EC2 に SSH 鍵なしで入るために要る。
[公式の手順](https://docs.aws.amazon.com/systems-manager/latest/userguide/session-manager-working-with-install-plugin.html) でインストールする。

## Docker(Phase 3 から)

Apple Silicon の Mac でビルドしたイメージは、既定で `arm64` になる。
Fargate を `X86_64` で動かすなら `docker buildx build --platform linux/amd64`、
`ARM64` で動かすならタスク定義の `runtime_platform` を合わせる。どちらにするかは Phase 3 で決める。

## エディタ

HashiCorp 公式の Terraform 拡張を入れる。

フォーマットは `terraform fmt` を正とする。VS Code の保存時フォーマットは、リポジトリの `.vscode/settings.json` で Terraform 拡張に任せている(拡張は `terraform fmt` を呼ぶ)。
保存時フォーマットが効かない環境では、plan の前に `terraform fmt` を実行する。

## lint(Phase 4 から)

`tflint` を使う。設定はリポジトリ内の `.tflint.hcl` に置く。
