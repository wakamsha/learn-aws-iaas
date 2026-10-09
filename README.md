# learn-aws-iaas

AWS × Terraform によるクラウドインフラ設計・構築の学習用リポジトリ。
Claude Code を家庭教師として伴走させる。

- カリキュラムと Tutor の振る舞い: [CLAUDE.md](./CLAUDE.md)
- 計画: [docs/ROADMAP.md](./docs/ROADMAP.md)
- 進捗: run ブランチの `docs/PROGRESS.md`

## ブランチ

| ブランチ | 役割 |
| --- | --- |
| `main` | 学習開始時点の状態。カリキュラムのみを置く |
| `curriculum/run-N` | N 周目の学習。commit はすべてここに積む |

カリキュラムは反復して実施する。新しい周は `main` から `curriculum/run-N` を切り、
`docs/PROGRESS.template.md` を `docs/PROGRESS.md` にコピーして始める。

## コマンド

| コマンド | 用途 |
| --- | --- |
| `/resume` | セッションの再開。apply 中のリソースと再開点を確認する |
| `/cleanup` | destroy 後の残存確認と、進捗の更新 |

## 課金について

実際の AWS リソースを作成するため、料金が発生する。
始める前に [docs/SETUP-AWS-ACCOUNT.md](./docs/SETUP-AWS-ACCOUNT.md) の予算アラートを設定し、
[docs/COST-GUARDRAILS.md](./docs/COST-GUARDRAILS.md) を読むこと。
