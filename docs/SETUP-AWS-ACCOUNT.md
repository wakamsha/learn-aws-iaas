# 学習用 AWS アカウントの準備

学習で使う AWS アカウントと、ローカルから操作するための認証の手順。
**一度やれば終わる作業だが、周を重ねるときや別のマシンで始めるときに読み直す。**

料金・無料利用枠の条件は変わる。2025 年には新規アカウント向けの無料利用枠の仕組みが変わっているので、
始める時点で [AWS 無料利用枠](https://aws.amazon.com/free/) を確認し、確認日とともに `docs/PROGRESS.md` にメモしておく。

---

## 1. アカウント

- 業務用とは別の、学習専用のアカウントを使う
- ルートユーザーに MFA を設定する。**ルートユーザーのアクセスキーは作らない**
- 以降、ルートユーザーでは作業しない

## 2. 予算アラート

**これを設定するまで、何も apply しない。**

- Billing and Cost Management → Budgets でコスト予算を作る。金額は自分が許容できる額
- 通知は「実績」と「予測」の両方に設定する
- 通知先のメールアドレスは、Budgets の画面から検証メールを送って検証する。検証が済むまでアラートは届かない
- 余裕があれば Cost Anomaly Detection も有効にする
- Billing の設定で、タグ `Project` をコスト配分タグとして有効にしておくと、後でタグ別に費用を見られる
  (有効化してから反映されるまで時間がかかる)

## 3. IAM Identity Center

日常の作業は、IAM Identity Center のユーザーとして一時クレデンシャルで行う。

1. IAM Identity Center を有効化する(リージョンは `ap-northeast-1`)
   - AWS Organizations で有効にする(組織インスタンス)。アカウントインスタンスでは AWS アカウントへのアクセスに使えない
   - 単一リージョンインスタンスを選ぶ。マルチリージョンはカスタマーマネージドの KMS キーを要し、KMS の料金がかかる
2. 自分用のユーザーを作る
3. 許可セットを作り、自分のユーザーをこのアカウントに割り当てる
   - 学習用なので広い権限でよい。**本番では不適切である理由は、Phase 4 で OIDC のロールを絞るときに扱う**

## 4. AWS CLI のプロファイル

```sh
aws configure sso
# SSO start URL / リージョン / アカウント / 許可セットを選ぶ
# プロファイル名は learn にする
# SSO registration scopes はデフォルト(Enter)のまま
# CLI default output format は json
```

以降の作業:

```sh
aws sso login --profile learn
export AWS_PROFILE=learn
aws sts get-caller-identity
```

`get-caller-identity` の `Arn` が `assumed-role/AWSReservedSSO_...` で始まっていれば、
SSO の許可セットに対応するロールの一時クレデンシャルで操作している。

Terraform は `AWS_PROFILE` を読むので、provider にプロファイル名を書く必要はない。

## よくある詰まり

| 症状 | 原因と対処 |
| --- | --- |
| `Error when retrieving token from sso: Token has expired` | SSO のセッション切れ。`aws sso login --profile learn` |
| Terraform が `No valid credential sources found` | `AWS_PROFILE` が設定されていないシェルで実行している |
| 別のアカウントにリソースができた | `aws sts get-caller-identity` で `Account` を確かめてから apply する |
