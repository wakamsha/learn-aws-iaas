resource "aws_s3_bucket" "phase0" {
  # 名前の一意性のためにアカウント ID を入れる
  bucket = "learn-aws-iaas-phase0-883306515710"
}

resource "aws_s3_bucket_versioning" "phase0" {
  bucket = aws_s3_bucket.phase0.id

  # バージョニングを有効化する設定
  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_public_access_block" "phase0" {
  bucket = aws_s3_bucket.phase0.id

  # 公開アクセスをブロックする設定
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}
