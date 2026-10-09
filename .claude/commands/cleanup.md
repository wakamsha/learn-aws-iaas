---
description: destroy 後の残存リソースを確認し、PROGRESS を更新する
---

後片付けを確認します。`docs/COST-GUARDRAILS.md` の「後片付けのチェックリスト」に従ってください。

1. 対象の Phase ディレクトリを確かめ、`terraform destroy` を **学習者に** 実行してもらう(あなたは実行しない)
2. `Destroy complete! Resources: N destroyed.` を貼ってもらい、apply 時の作成数と一致するか確かめる
3. 残存確認の読み取り専用コマンドを **あなたが実行する**(学習者に検証させない)
   - タグ検索 `aws resourcegroupstaggingapi get-resources --tag-filters Key=Project,Values=learn-aws-iaas`
   - その Phase で作った時間課金リソースの種別ごとの `describe-*`
   - 別リージョンに作ったものがあればそのリージョンも
   - 出力はフィルタせずに読み、残存があればリソース ID とともに報告する
4. Console で手作業で作ったものが残っていないか、学習者に一度だけ確認する
5. `docs/PROGRESS.md` の「現在 apply 中のリソース」を更新する差分を見せ、承認を得て書き込む
6. セッションの終わりであれば、「次回の再開点」も更新する
