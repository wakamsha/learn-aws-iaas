terraform {
  required_version = "1.16.5"

  required_providers {
    aws = {
      source  = "hashicorp/aws"

      # 6.68 以上、7.0 未満。6 系のマイナーアップデートを受け入れる
      version = "~> 6.68"
    }
  }
}
