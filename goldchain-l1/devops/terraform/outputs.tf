# outputs.tf - AWS Deployment Outputs

output "validator_public_ips" {
  description = "Public IP addresses of the deployed validator nodes"
  value       = aws_instance.validators[*].public_ip
}

output "validator_rpc_endpoints" {
  description = "JSON-RPC HTTP Connection Endpoints"
  value       = [for ip in aws_instance.validators[*].public_ip : "http://${ip}:8545"]
}

output "vpc_id" {
  description = "ID of the deployed VPC"
  value       = aws_vpc.main.id
}
