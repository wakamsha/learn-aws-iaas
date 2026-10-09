# 課金のガードレール

学習で一番避けたい事故は「消し忘れて請求が来る」こと。セッションが何週間も空くことを前提に、ルールで防ぐ。

金額は書かない。変わるからである。見積もるときは [AWS 料金ページ](https://aws.amazon.com/pricing/) で確かめ、確認日を添える。

## ルール

1. **予算アラートを設定してから始める**([SETUP-AWS-ACCOUNT.md](./SETUP-AWS-ACCOUNT.md))
2. **時間課金リソースはセッションをまたいで残さない。** 続きは次回 apply し直せばよい。それが IaC の利点
3. **`docs/PROGRESS.md` の「現在 apply 中のリソース」を常に正しく保つ**
4. **すべてのリソースに `default_tags`**(`Project = "learn-aws-iaas"`、`Phase = "N"`)
5. **Console で手で作ったものはその場で消す。** Terraform の管理外なので destroy では消えない

## 課金の性質

| 性質 | 例 | 気をつけること |
| --- | --- | --- |
| 存在するだけで時間課金 | NAT Gateway、ALB、RDS インスタンス、Interface 型 VPC エンドポイント、パブリック IPv4 アドレス、稼働中の EC2 / Fargate タスク | 一番危険。放置するとそのまま積み上がる |
| 停止しても残る課金 | EBS ボリューム、RDS のストレージ、スナップショット | 「停止」は無料ではない |
| 保存量・転送量 | S3、ECR、CloudWatch Logs、データ転送 | ロググループの保持期間は既定で無期限。必ず指定する |
| リクエスト課金 | CloudFront、API 呼び出し | 学習規模ならほぼかからない |

## 後片付けのチェックリスト

`terraform destroy` の後に確かめる。`/cleanup` はこれに沿って進む。

- [ ] `Destroy complete!` の件数が、apply 時の作成数と一致した
- [ ] タグで検索して残存がない
      `aws resourcegroupstaggingapi get-resources --tag-filters Key=Project,Values=learn-aws-iaas`
      (削除直後は一時的に残って見えることがある。また、すべてのリソース種別が対象ではない)
- [ ] NAT Gateway / Elastic IP / VPC エンドポイント
- [ ] EC2 インスタンス / ロードバランサー / ターゲットグループ / EBS ボリューム / ENI
- [ ] RDS インスタンス / **スナップショット**
- [ ] ECS サービス / タスク
- [ ] CloudWatch Logs のロググループ
- [ ] `us-east-1` など、別リージョンに作ったもの
- [ ] Console で手で作ったもの
- [ ] `docs/PROGRESS.md` の「現在 apply 中のリソース」を更新した
