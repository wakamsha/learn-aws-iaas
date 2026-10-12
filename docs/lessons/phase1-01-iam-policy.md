# Phase 1 基礎 単元 1: IAM ポリシーの文法

AWS で「誰が、何に、何をできるか」を書いた JSON の文書を **ポリシー** と呼ぶ。
Phase 1 では、CloudFront にだけ S3 のファイルを読ませるポリシーを書く。この単元では、その文法を読めるようにする。

AWS のリソースは作らない。例に出てくる管理ポリシーと信頼ポリシーは、2026-10-12 にこのアカウントから読み取ったものである。

---

## 1. 説明

### AWS は、すべての API 呼び出しをポリシーで判定する

Phase 0 で、Terraform は provider を通して AWS の API を呼び、リクエストには「誰が送ったか」の署名が付く、と学んだ。
AWS はリクエストを受け取るたびに、**その主体がその操作をその対象に対して行ってよいか** を、関係するポリシーを集めて判定する。

FE で近いのは、API サーバーがリクエストごとにトークンのスコープを見て 403 を返すかを決める処理である。違いは 2 つある。

- 判定するのはアプリではなく AWS 自身で、すべてのサービスのすべての API に同じ仕組みが効く
- 許可を書ける場所が 2 つある。**主体の側**と、**リソースの側**

### ポリシーの形

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::example-bucket/*"
    }
  ]
}
```

| 要素 | 意味 |
| --- | --- |
| `Version` | ポリシーの文法のバージョン。今使うのは `2012-10-17` だけで、日付はポリシーを書いた日ではない |
| `Statement` | ルールの配列。1 つのルールを **ステートメント** と呼ぶ |
| `Effect` | `Allow`(許可)か `Deny`(拒否) |
| `Action` | 操作。`サービス名:API 名` の形(`s3:GetObject`)。`*` で前方一致などのワイルドカードが使える(`s3:Get*`) |
| `Resource` | 対象のリソースの ARN。`*` はすべて |
| `Principal` | **誰が**。リソースの側に付けるポリシーにだけ書く(下記) |
| `Condition` | 追加の条件。「リクエストがこの値を持つときだけ」 |

1 つのステートメントは、「`Principal` が `Resource` に対して `Action` をすることを、`Condition` を満たすなら `Effect` する」と読む。

### 主体の側のポリシーと、リソースの側のポリシー

| 種類 | 付ける場所 | `Principal` | 読み方 |
| --- | --- | --- | --- |
| アイデンティティベースのポリシー | ユーザー・ロール | 書かない(付けた相手が主体) | 「この主体は、何に何をできるか」 |
| リソースベースのポリシー | S3 バケット、ロールの信頼ポリシーなど | 書く | 「このリソースに、誰が何をできるか」 |

FE で近いのは、アイデンティティベースが「トークンに付いたスコープ」、リソースベースが「サーバー側の CORS の許可リスト(`Access-Control-Allow-Origin`)」である。
違うのは、CORS はブラウザが守る約束だが、IAM のポリシーは AWS がすべてのリクエストに強制する点である。

### 判定の順序

1. どこかに当てはまる `Deny` があれば、**拒否**(明示的 Deny)
2. どこかに当てはまる `Allow` があれば、**許可**
3. どちらもなければ、**拒否**(暗黙の Deny)

**何も書かなければ拒否** が出発点である。許可は、書いた分だけ増える。
同じアカウントの中では、主体の側かリソースの側のどちらかに Allow があれば許可される(どちらにも Deny がない場合)。

### S3 の ARN の 2 つの形

S3 の ARN には、バケットそのものと、バケットの中のオブジェクトの 2 種類がある。

| ARN | 指すもの | 対応する操作の例 |
| --- | --- | --- |
| `arn:aws:s3:::example-bucket` | バケット | `s3:ListBucket`(中身の一覧) |
| `arn:aws:s3:::example-bucket/*` | バケットの中のすべてのオブジェクト | `s3:GetObject`(ファイルを読む) |

`/*` を付け忘れると、`s3:GetObject` を許可したつもりでも、一致するリソースがなく暗黙の Deny になる。

---

## 2. 例題

### 例題 1: AWS 管理ポリシー `AmazonS3ReadOnlyAccess`

AWS が用意している、S3 を読むだけの権限。ユーザーやロールに付けて使う。

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:Get*",
        "s3:List*",
        "s3:Describe*",
        "s3-object-lambda:Get*",
        "s3-object-lambda:List*"
      ],
      "Resource": "*"
    }
  ]
}
```

- `Principal` がない → アイデンティティベースのポリシー。付けた相手が主体になる
- `Action` は `Get` / `List` / `Describe` で始まる操作。名前が「読む」操作に揃っていることを利用している
- `Resource` は `*` → アカウント内のすべてのバケットとオブジェクト
- `Put*` や `Delete*` には何も書いていない → 暗黙の Deny で、書き込みはできない

### 例題 2: いま使っているロールの信頼ポリシー

SSO でログインしたときに借りているロール `AWSReservedSSO_AdministratorAccess_...` に付いている、**誰がこのロールを借りられるか** のポリシー。

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Federated": "arn:aws:iam::<account-id>:saml-provider/AWSSSO_cdcf747f0b95826e_DO_NOT_DELETE"
      },
      "Action": ["sts:AssumeRoleWithSAML", "sts:TagSession"],
      "Condition": {
        "StringEquals": { "SAML:aud": "https://signin.aws.amazon.com/saml" }
      }
    }
  ]
}
```

- `Principal` がある → リソースベースのポリシー。リソースは「このロール」
- `Principal` の `Federated` は、外部の ID の仕組み(ここでは IAM Identity Center)を通してログインした人
- `Action` の `sts:AssumeRoleWithSAML` は「SAML でログインした人がロールを借りる」API
- `Condition` は、ログインの証明書(SAML の応答)の宛先が AWS のサインイン画面であるときだけ、と絞っている

このロールにはもう 1 つ、例題 1 と同じ形のアイデンティティベースのポリシー `AdministratorAccess`(`"Action": "*"`, `"Resource": "*"`)が付いている。
**借りられるのは誰か** は信頼ポリシーが、**借りた後に何ができるか** はアイデンティティベースのポリシーが決める。

### 例題 3: Phase 0 のバケットが外から読めなかった理由

Phase 0 のバケットには、バケットポリシー(リソースベースのポリシー)を書かなかった。
自分は `AdministratorAccess` を持つロールで操作していたので、主体の側に Allow があった。
外部の人には、主体の側にもバケットの側にも Allow がない。判定の順序の 3 にあたり、暗黙の Deny になる。

---

## 3. 練習問題

間違えても構わない。分からなければ「分からない」と書いて、解答を読めばよい。

**問 1.** 例題 1 の `AmazonS3ReadOnlyAccess` だけを付けたロールで、次の操作は許可されるか。

- (a) `s3:GetObject`
- (b) `s3:PutObject`
- (c) `s3:ListBucket`

**問 2.** 次のポリシーは、アイデンティティベースとリソースベースのどちらか。理由も 1 行で。

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": { "Service": "cloudfront.amazonaws.com" },
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::example-bucket/*"
    }
  ]
}
```

**問 3.** あるロールに、次の 2 つのステートメントが付いている。このロールで `example-bucket` の `secret.txt` を `s3:GetObject` すると、許可されるか。

```json
[
  { "Effect": "Allow", "Action": "s3:*", "Resource": "*" },
  { "Effect": "Deny", "Action": "s3:GetObject", "Resource": "arn:aws:s3:::example-bucket/secret.txt" }
]
```

**問 4.** 次のステートメントは、`example-bucket` の中のファイルを読ませるつもりで書いたが、読めない。原因はどこか。

```json
{ "Effect": "Allow", "Action": "s3:GetObject", "Resource": "arn:aws:s3:::example-bucket" }
```

**問 5.** 問 2 のポリシーは、CloudFront というサービスであれば、**どのアカウントの、どのディストリビューションでも** このバケットを読めてしまう。
「自分のディストリビューションだけ」に絞るには、ステートメントのどの要素を足せばよいか。要素の名前だけでよい。

---

## 4. 解答

**問 1.**
- (a) 許可。`s3:Get*` に一致する
- (b) 拒否。どの `Action` にも一致しないので暗黙の Deny
- (c) 許可。`s3:List*` に一致する

**問 2.** リソースベース。`Principal` があるからである。バケットに付けるバケットポリシーで、「CloudFront というサービスに、このバケットのオブジェクトを読ませる」と読む。Phase 1 のガイド付き構築で書くものの原型である。

**問 3.** 拒否。`s3:*` の Allow にも当てはまるが、明示的な Deny が当てはまるので、判定の順序の 1 で拒否になる。Deny は Allow より常に優先される。

**問 4.** `Resource` がバケットの ARN になっている。`s3:GetObject` の対象はオブジェクトなので、`arn:aws:s3:::example-bucket/*` と `/*` を付ける。

**問 5.** `Condition`。リクエストを送ってきたディストリビューションの ARN(`AWS:SourceArn`)が自分のものと一致するときだけ、と絞る。Phase 1 のガイド付き構築で書く。
