output "bucket_name" {
  value = aws_s3_bucket.this.id
}

output "cloudfront_distribution_domain_name" {
  value = aws_cloudfront_distribution.this.domain_name
}
