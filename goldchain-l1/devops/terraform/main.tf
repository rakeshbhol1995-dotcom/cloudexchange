# main.tf - AWS Deployment Terraform Script

terraform {
  required_version = ">= 1.0.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = var.aws_region
}

# 1. VPC Infrastructure Setup
resource "aws_vpc" "main" {
  cidr_block           = "10.0.0.0/16"
  enable_dns_hostnames = true
  enable_dns_support   = true

  tags = {
    Name = "goldchain-vpc"
  }
}

resource "aws_internet_gateway" "igw" {
  vpc_id = aws_vpc.main.id

  tags = {
    Name = "goldchain-igw"
  }
}

resource "aws_subnet" "public" {
  vpc_id                  = aws_vpc.main.id
  cidr_block              = "10.0.1.0/24"
  map_public_ip_on_launch = true
  availability_zone       = "us-east-1a"

  tags = {
    Name = "goldchain-subnet-public"
  }
}

resource "aws_route_table" "public" {
  vpc_id = aws_vpc.main.id

  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.igw.id
  }

  tags = {
    Name = "goldchain-rt-public"
  }
}

resource "aws_route_table_association" "public" {
  subnet_id      = aws_subnet.public.id
  route_table_id = aws_route_table.public.id
}

# 2. Security Groups
resource "aws_security_group" "node_sg" {
  name        = "goldchain-node-security-group"
  description = "Access control for GoldChain L1 Validator Nodes"
  vpc_id      = aws_vpc.main.id

  # Admin SSH access
  ingress {
    description = "SSH for administration"
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = [var.admin_ssh_cidr]
  }

  # JSON-RPC & BFT Gossip port (shared)
  ingress {
    description = "JSON-RPC and Gossip protocol port"
    from_port   = 8545
    to_port     = 8545
    protocol    = "tcp"
    cidr_blocks = [var.rpc_allowed_cidr]
  }

  # Outbound rules
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "goldchain-node-sg"
  }
}

# 3. Dynamic Local Configuration Files Mapping
locals {
  config_0 = jsondecode(file("${path.module}/configs/config-0.json"))
  config_1 = jsondecode(file("${path.module}/configs/config-1.json"))
  config_2 = jsondecode(file("${path.module}/configs/config-2.json"))
  configs  = [local.config_0, local.config_1, local.config_2]
}

# 4. Fetch Latest Ubuntu 22.04 LTS AMI
data "aws_ami" "ubuntu" {
  most_recent = true
  filter {
    name   = "name"
    values = ["ubuntu/images/hvm-ssd/ubuntu-jammy-22.04-amd64-server-*"]
  }
  filter {
    name   = "virtualization-type"
    values = ["hvm"]
  }
  owners = ["099720109477"] # Canonical
}

# 5. EC2 Instances provisioning
resource "aws_instance" "validators" {
  count                  = var.validator_count
  ami                    = data.aws_ami.ubuntu.id
  instance_type          = var.instance_type
  key_name               = var.key_name
  subnet_id              = aws_subnet.public.id
  vpc_security_group_ids = [aws_security_group.node_sg.id]
  private_ip             = "10.0.1.${10 + count.index}"

  # Bootstrapping instance
  user_data = templatefile("${path.module}/setup_node.sh", {
    private_key            = local.configs[count.index].private_key
    peers_json             = jsonencode(local.configs[count.index].peers)
    active_validators_json = jsonencode(local.configs[count.index].active_validators)
    docker_image           = "rakeshabhol/goldchain-node:latest" # Pull from public repository
    insecure_tls           = "1"                                  # 1 for testing self-signed certificates
  })

  tags = {
    Name = "goldchain-validator-${count.index}"
    Role = "Validator"
  }
}
