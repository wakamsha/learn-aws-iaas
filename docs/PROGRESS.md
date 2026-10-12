# 進捗

## 現在 apply 中のリソース

**セッションの開始時と終了時に必ず確認する。** 時間課金のものはセッションをまたいで残さない。

| Phase | ディレクトリ | 時間課金 | apply した日 | 備考 |
| --- | --- | --- | --- | --- |
| - | - | - | - | なし |

意図的に残しているもの(state 用バケット、OIDC プロバイダーなど)もここに書く。

## 次回の再開点

<!-- セッションの終わりに Claude が更新する。何週間も空く前提で書く -->

- 次にやること: Phase 2 の基礎、単元 1「2 進数と IP アドレス」。教材は `docs/lessons/` に、単元に入る直前に Tutor が作る。手元の Mac で学び、AWS のリソースは作らない。Phase 2 のガイド付き構築からは時間課金のリソース(NAT Gateway、ALB、EC2、パブリック IPv4)が出てくる
- そのとき最初に考える問い: 自宅の Mac は `192.168.x.x` のようなアドレスを持っているのに、外のサイトから見える IP は別の値になる。この 2 つのアドレスはそれぞれ何を表しているか
- 前回から持ち越している疑問: アカウント単位のブロックパブリックアクセスを有効にするか。既存の Route 53 / CloudFront の構成が公開バケットに依存していないかを確かめてから決める

## あやふやな点

あやふやなまま先へ進んだ概念を 1 行ずつ残す。後でその概念が出てきたときに扱い、扱ったら消す。

-

## カリキュラムへの反映候補

run を終えたら `main` の `CLAUDE.md` / `ROADMAP.md` に反映する。

- 前の周でやった作業でも、指示を省略しない。前の周を知らない学習者が、その指示だけで完了できる粒度で渡す(`CLAUDE.md` の「課題を出す前に、完了条件を全部渡す」)
- `docs/lessons/` の教材(Phase 1 単元 1・2 など)を `main` に移す。教材はカリキュラムの一部で、周回ごとに作り直すものではない
- Phase 1 のガイド付き構築に、パスごとのビヘイビア(`ordered_cache_behavior`)、`custom_error_response`、レスポンスヘッダーポリシー、アップロード時の `Cache-Control` を含める。設計の段で初めて見る部品になっている
- `TERRAFORM-STYLE.md` に、リソースはそれが属するサービスのファイルに置く規則を足す(`aws_s3_*` は `storage.tf`、`aws_cloudfront_*` は `cloudfront.tf`。ポリシーの JSON を組み立てる data source は、使うリソースの隣)
- `TERRAFORM-STYLE.md` に、data source は参照するリソースのそばに、そのリソースより前に置く規則を足す(HashiCorp の Style Guide)
- `CLAUDE.md` の「記録」の「学習者の言い回しをなるべく残す」を外す。学習ログは、学習者の言葉ではなく、次に同じ状況で使える規則として書く
- `TERRAFORM-STYLE.md` に「リソースは、それが付く相手と同じファイルに置く(バケットポリシーとその `aws_iam_policy_document` はバケットと同じファイル)」を足す

## 全体

| Phase | 作るもの | 状態 |
| --- | --- | --- |
| 0 | S3 バケット 1 つ | ✅ |
| 1 | 静的サイト配信基盤 | ✅ |
| 2 | VM ベースの Web システム | ⬜ |
| 3 | コンテナベースの Web システム | ⬜ |
| 4 | 運用できるインフラ | ⬜ |
| 5 | 白紙からの再構築 | ⬜ |

---

## Phase 0

### 基礎

- [x] 環境構築(SETUP-AWS-ACCOUNT / SETUP-TOOLCHAIN)
- [x] Console で S3 バケットを手で作って消す

### ガイド付き構築

- [x] TERRAFORM-STYLE を読む
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

---

## Phase 1

### 基礎

- [x] IAM ポリシーの文法
- [x] CDN の用語とキャッシュのヘッダーの観察

### ガイド付き構築

- [x] S3 とパブリックアクセスブロック
- [x] OAC と CloudFront
- [x] バケットポリシー
- [x] 配信と直接アクセスの拒否の確認
- [x] destroy

### 設計して作り直す

- [x] 要件定義
- [x] 構成設計
- [x] `phase1-static-site/` の構築
- [x] ビルド成果物のアップロード
- [x] 検証
- [x] 後片付け
- [x] 振り返り

### 確定した設計判断

| 論点 | 決定 |
| --- | --- |
| アクセス制限 | かけない。配信するのは中身のないサンプルの SPA に限る |
| ドメインと証明書 | `*.cloudfront.net` と CloudFront の既定の証明書。独自ドメインは使わない |
| デプロイの反映 | デプロイ後、利用者が次に画面を開いたときに新しい版が出る |
| アセットのキャッシュ | ブラウザにできるだけ長くキャッシュさせる |
| 存在しないパス | SPA の「ページが見つかりません」画面を表示する。HTTP のステータスは問わない |
| SPA | `phase1-static-site/spa/` に Vite + React。`/`、`/settings/profile`、それ以外の 404 画面 |
| アップロード | Terraform ではなく AWS CLI。インフラとアプリの中身では変わる頻度が違う |
| `index.html` のキャッシュ | ブラウザは `Cache-Control: no-cache`、CloudFront は `Managed-CachingDisabled`(既定のビヘイビア) |
| `/assets/*` のキャッシュ | ブラウザは `public, max-age=31536000, immutable`、CloudFront は `Managed-CachingOptimized` |
| 深いパスと存在しないパス | `custom_error_response` で 403 を `/index.html` と 200 に差し替え、表示する画面は SPA のルーターが決める |
| セキュリティヘッダー | `Managed-SecurityHeadersPolicy` をすべてのビヘイビアに付ける |

---

## Phase 2

### 基礎

- [ ] 2 進数と IP アドレス
- [ ] CIDR とサブネット
- [ ] ルーティング
- [ ] NAT
- [ ] ポートと TCP
- [ ] 自宅のネットワークと VPC の対応

### ガイド付き構築

- [ ] VPC / サブネット / ルートテーブル / IGW
- [ ] EC2 単体の疎通と nginx(手作業 → user data)
- [ ] NAT Gateway と private subnet への移動
- [ ] ALB / ターゲットグループ / リスナー
- [ ] Launch Template / ASG
- [ ] destroy

### 設計して作り直す

- [ ] 要件定義
- [ ] 構成設計(CIDR 設計表 / 通信マトリクス)
- [ ] 実装計画
- [ ] `phase2-vm-web/` の構築
- [ ] 検証
- [ ] 後片付け
- [ ] 振り返り

### 確定した設計判断

| 論点 | 決定 |
| --- | --- |

---

## Phase 3

### 基礎

- [ ] コンテナオーケストレーションの対応付け

### ガイド付き構築

- [ ] Dockerfile と ECR への push
- [ ] タスクを 1 つ動かす
- [ ] サービスと ALB
- [ ] RDS と秘密の注入
- [ ] destroy

### 設計して作り直す

- [ ] 要件定義
- [ ] 構成設計(Phase 2 との対応表 / タスクを置くサブネット)
- [ ] `modules/network` の移植
- [ ] Dockerfile の仕上げ
- [ ] ECR と push
- [ ] ECS(DB なしで疎通)
- [ ] RDS と秘密の注入
- [ ] デプロイ設定と ECS Exec
- [ ] 検証
- [ ] 後片付け
- [ ] 振り返り

### 確定した設計判断

| 論点 | 決定 |
| --- | --- |

---

## Phase 4

### 基礎

- [ ] OIDC のトークンのクレーム

### ガイド付き構築

- [ ] S3 backend への移行
- [ ] OIDC とロールで `get-caller-identity`
- [ ] アラームと通知
- [ ] destroy

### 設計して作り直す

- [ ] 要件定義
- [ ] state の分割と S3 backend
- [ ] 環境分離
- [ ] アラームと通知
- [ ] plan 用・deploy 用のロール
- [ ] CI(PR で plan / main でデプロイ)
- [ ] イメージ更新の責任分界の決定
- [ ] 検証
- [ ] 後片付け
- [ ] 振り返り

### 確定した設計判断

| 論点 | 決定 |
| --- | --- |

---

## Phase 5

### 設計して作り直す

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
