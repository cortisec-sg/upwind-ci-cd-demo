variable "aws_region" {
  description = "AWS deployment region for optional IaC demo"
  type = string
  default = "ap-south-1"
}
variable "bucket_name" {
  description = "Globally unique bucket name; configure before applying"
  type = string
}
