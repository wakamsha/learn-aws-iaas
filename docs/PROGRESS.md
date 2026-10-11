# 進捗

<!--
run ブランチを切ったら、このファイルを docs/PROGRESS.md にコピーして使う。
main のこのテンプレートには書き込まない。
-->

## 現在 apply 中のリソース

**セッションの開始時と終了時に必ず確認する。** 時間課金のものはセッションをまたいで残さない。

| Phase | ディレクトリ | 時間課金 | apply した日 | 備考 |
| --- | --- | --- | --- | --- |
| - | - | - | - | なし |

意図的に残しているもの(state 用バケット、OIDC プロバイダーなど)もここに書く。

## 次回の再開点

<!-- セッションの終わりに Claude が更新する。何週間も空く前提で書く -->

- 次にやること: Phase 1 の振り返り(項目は `CLAUDE.md` の「振り返り」)。Phase 1 のリソースは destroy 済み。振り返りに apply は要らない
- そのとき最初に考える問い: Phase 0 の「1 つのリソース」と比べて、Phase 1 の「参照し合う複数のリソース」で一番難しかったのは何か。それは設計・Terraform の書き方・AWS の振る舞いのどれだったか
- 前回から持ち越している疑問: アカウント単位のブロックパブリックアクセスを有効にするか。既存の Route 53 / CloudFront の構成が公開バケットに依存していないかを確かめてから決める

## 全体

| Phase | 作るもの | 状態 |
| --- | --- | --- |
| 0 | S3 バケット 1 つ | ✅ |
| 1 | 静的サイト配信基盤 | ⬜ |
| 2 | VM ベースの Web システム | ⬜ |
| 3 | コンテナベースの Web システム | ⬜ |
| 4 | 運用できるインフラ | ⬜ |
| 5 | 白紙からの再構築 | ⬜ |

---

## Phase 0

- [x] 環境構築(SETUP-AWS-ACCOUNT / SETUP-TOOLCHAIN)
- [x] Console で S3 バケットを手で作って消す
- [x] `phase0-hello/` で S3 バケット
- [x] `init` が作ったものの確認
- [x] plan → apply → `state list` / `state show`
- [x] drift
- [x] replace
- [x] destroy
- [x] 振り返り

### 確定した設計判断

| 論点 | 決定 |
| --- | --- |
| 使う AWS アカウント | 個人アカウント `wakamsha`。既存のリソースがあるため、学習用のものはタグ `Project = "learn-aws-iaas"` で区別する |
| 予算 | 月額 $30。実績 50% / 実績 100% / 予測 100% で通知し、Cost Anomaly Detection を併用する。消し忘れに数日で気づくための額(Phase 3 構成の消し忘れで約 $3.8/日。東京リージョンの単価、2026-10-09 確認) |
| IAM Identity Center | 組織インスタンス、単一リージョン(東京)。許可セットは AdministratorAccess |
| CLI プロファイル | `learn`(SSO セッション名も `learn`) |
| Terraform のバージョン管理 | mise。`mise.toml` で 1.16.5 に固定 |

---

## Phase 1

- [x] 要件定義
- [x] 構成設計
- [x] `phase1-static-site/` の構築
- [x] ビルド成果物のアップロード
- [x] 検証
- [x] 後片付け
- [ ] 振り返り

### 確定した設計判断

| 論点 | 決定 |
| --- | --- |
| ドメインと証明書 | CloudFront のデフォルトドメイン(`*.cloudfront.net`)と、その既定の証明書で HTTPS を配信する。独自ドメインと ACM 証明書は発展課題 |
| アクセス制限 | かけない。URL を知っていれば誰でも開ける。配信するのは中身のないサンプルの SPA に限る |
| 存在しないパス | SPA の 404 画面を表示し、HTTP ステータスは 200。社内向けで検索エンジンに載らないため |
| S3 への読み取り | OAC。バケットポリシーで `cloudfront.amazonaws.com` に `s3:GetObject` を許し、`AWS:SourceArn` でこのディストリビューションに限る。`s3:ListBucket` は許さない |
| 存在しないパスの処理 | ディストリビューションの `custom_error_response` で、オリジンの 403 を `/index.html` と 200 に置き換える |
| セキュリティヘッダー | マネージドのレスポンスヘッダーポリシー(SecurityHeadersPolicy) |
| `index.html` のキャッシュ | ブラウザは `Cache-Control: no-cache`。CloudFront にはキャッシュさせない(デフォルトのビヘイビアに `CachingDisabled`) |
| `/assets/*` のキャッシュ | ブラウザは `Cache-Control: public, max-age=31536000, immutable`。CloudFront にもキャッシュさせる(`/assets/*` のビヘイビアに `CachingOptimized`) |

---

## Phase 2

- [ ] 要件定義
- [ ] 構成設計(CIDR 設計表 / 通信マトリクス)
- [ ] 実装計画
- [ ] VPC / サブネット / ルートテーブル / IGW
- [ ] EC2 単体の疎通(public subnet)
- [ ] NAT Gateway と private subnet への移動
- [ ] Launch Template / ASG / ALB / ターゲットグループ
- [x] 検証
- [ ] 後片付け
- [ ] 振り返り

### 確定した設計判断

| 論点 | 決定 |
| --- | --- |

---

## Phase 3

- [ ] 要件定義
- [ ] 構成設計(Phase 2 との対応表 / タスクを置くサブネット)
- [ ] `modules/network` の移植
- [ ] Dockerfile
- [ ] ECR と push
- [ ] ECS(DB なしで疎通)
- [ ] RDS と秘密の注入
- [ ] デプロイ設定と ECS Exec
- [x] 検証
- [ ] 後片付け
- [ ] 振り返り

### 確定した設計判断

| 論点 | 決定 |
| --- | --- |

---

## Phase 4

- [ ] 要件定義
- [ ] state 用バケットの bootstrap と S3 backend
- [ ] 環境分離
- [ ] アラームと通知
- [ ] OIDC とロール
- [ ] CI(PR で plan / main でデプロイ)
- [ ] イメージ更新の責任分界の決定
- [x] 検証
- [ ] 後片付け
- [ ] 振り返り

### 確定した設計判断

| 論点 | 決定 |
| --- | --- |

---

## Phase 5

- [ ] 要件定義
- [ ] 構成設計とコスト見積もり
- [ ] 設計レビュー
- [ ] 実装
- [ ] 障害訓練
- [ ] 手順書どおりの destroy → apply → destroy
- [ ] Console の設計課題
- [ ] 振り返り

### 確定した設計判断

| 論点 | 決定 |
| --- | --- |
