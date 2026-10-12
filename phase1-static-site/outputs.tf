output "bucket_name" {
  value = aws_s3_bucket.this.id
}

output "bucket_regional_domain_name" {
  value = aws_s3_bucket.this.bucket_regional_domain_name
}

output "distribution_domain_name" {
  value = aws_cloudfront_distribution.this.domain_name
}
