output "bucket_name" {
  description = "Created demo bucket"
  value = aws_s3_bucket.demo.id
}
