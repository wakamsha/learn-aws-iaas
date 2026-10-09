output "bucket_name" {
  value = aws_s3_bucket.phase0.id
}

output "bucket_arn" {
  value = aws_s3_bucket.phase0.arn
}
