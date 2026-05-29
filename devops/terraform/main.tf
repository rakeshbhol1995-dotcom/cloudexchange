# Terraform Configuration — CloudExchange Core Infrastructure
# Phase 6 — Kubernetes + Terraform + DevOps

terraform {
  required_version = ">= 1.5.0"
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

variable "aws_region" {
  type    = string
  default = "us-east-1"
}

# 1. High-Performance Multi-AZ VPC Configuration
resource "aws_vpc" "exchange_vpc" {
  cidr_block           = "10.0.0.0/16"
  enable_dns_hostnames = true
  enable_dns_support   = true

  tags = {
    Name = "cloudexchange-production-vpc"
  }
}

resource "aws_subnet" "private_subnets" {
  count             = 3
  vpc_id            = aws_vpc.exchange_vpc.id
  cidr_block        = "10.0.${count.index}.0/24"
  availability_zone = element(["us-east-1a", "us-east-1b", "us-east-1c"], count.index)

  tags = {
    Name = "cloudexchange-private-subnet-${count.index}"
  }
}

# 2. Amazon MSK (Apache Kafka) Cluster Configuration
resource "aws_security_group" "msk_sg" {
  name        = "exchange-msk-sg"
  description = "Allow inbound traffic to Kafka brokers"
  vpc_id      = aws_vpc.exchange_vpc.id

  ingress {
    from_port   = 9092
    to_port     = 9092
    protocol    = "tcp"
    cidr_blocks = ["10.0.0.0/16"]
  }
}

resource "aws_msk_cluster" "kafka_cluster" {
  cluster_name           = "cloudexchange-sequencer-kafka"
  kafka_version          = "3.4.0"
  number_of_broker_nodes = 3

  broker_node_group_info {
    instance_type   = "kafka.m5.large"
    client_subnets  = aws_subnet.private_subnets[*].id
    security_groups = [aws_security_group.msk_sg.id]
  }

  encryption_info {
    encryption_in_transit {
      client_broker = "TLS"
      in_cluster    = true
    }
  }

  tags = {
    Environment = "production"
  }
}

# 3. PostgreSQL Database Instance (Citus Coordinator Node)
resource "aws_security_group" "db_sg" {
  name        = "exchange-postgres-sg"
  description = "Allow inbound database traffic"
  vpc_id      = aws_vpc.exchange_vpc.id

  ingress {
    from_port   = 5432
    to_port     = 5432
    protocol    = "tcp"
    cidr_blocks = ["10.0.0.0/16"]
  }
}

resource "aws_db_subnet_group" "db_subnet_grp" {
  name       = "exchange-db-subnet-group"
  subnet_ids = aws_subnet.private_subnets[*].id
}

resource "aws_db_instance" "citus_coordinator" {
  identifier             = "cloudexchange-ledger-coordinator"
  allocated_storage      = 250
  max_allocated_storage  = 1000
  engine                 = "postgres"
  engine_version         = "15.3"
  instance_class         = "db.r6g.xlarge"
  db_name                = "cloudexchange_ledger"
  username               = "admin_exchange"
  password               = "HardenedVaultPassword999!" # In prod, fetch from AWS Secrets Manager
  db_subnet_group_name   = aws_db_subnet_group.db_subnet_grp.name
  vpc_security_group_ids = [aws_security_group.db_sg.id]
  skip_final_snapshot    = true

  tags = {
    Role = "Citus-Coordinator-DB"
  }
}
