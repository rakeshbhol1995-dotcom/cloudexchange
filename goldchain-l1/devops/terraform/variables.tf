# variables.tf - AWS Deployment Input Variables

variable "aws_region" {
  type        = string
  description = "AWS region to deploy infrastructure"
  default     = "us-east-1"
}

variable "instance_type" {
  type        = string
  description = "EC2 instance type for validator nodes"
  default     = "t3.medium"
}

variable "key_name" {
  type        = string
  description = "Name of the existing SSH key pair to access EC2 instances"
  default     = "goldchain-key"
}

variable "admin_ssh_cidr" {
  type        = string
  description = "CIDR block allowed to SSH into instances (restrict for security)"
  default     = "0.0.0.0/0"
}

variable "rpc_allowed_cidr" {
  type        = string
  description = "CIDR block allowed to call JSON-RPC API port 8545 (restrict for security)"
  default     = "0.0.0.0/0"
}

variable "validator_count" {
  type        = number
  description = "Number of validator nodes to spawn"
  default     = 3
}
