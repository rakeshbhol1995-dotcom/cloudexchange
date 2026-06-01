# Terraform Configuration — CloudExchange Core Infrastructure (Free-Tier & Budget Friendly)
# Designed for ap-south-1 (Mumbai) Region

terraform {
  required_version = ">= 1.5.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    local = {
      source  = "hashicorp/local"
      version = "~> 2.0"
    }
    tls = {
      source  = "hashicorp/tls"
      version = "~> 4.0"
    }
  }
}

provider "aws" {
  region = var.aws_region
}

variable "aws_region" {
  type    = string
  default = "ap-south-1" # Mumbai Region
}

# 1. Automatic SSH Key Pair Generation
resource "tls_private_key" "exchange_key" {
  algorithm = "RSA"
  rsa_bits  = 4096
}

resource "aws_key_pair" "generated_key" {
  key_name   = "cloudexchange-key"
  public_key = tls_private_key.exchange_key.public_key_openssh
}

resource "local_file" "private_key" {
  content         = tls_private_key.exchange_key.private_key_pem
  filename        = "${path.module}/cloudexchange-key.pem"
  file_permission = "0600"
}

# 2. VPC Configuration
resource "aws_vpc" "exchange_vpc" {
  cidr_block           = "10.0.0.0/16"
  enable_dns_hostnames = true
  enable_dns_support   = true

  tags = {
    Name = "cloudexchange-free-vpc"
  }
}

# Internet Gateway to allow connection to the internet
resource "aws_internet_gateway" "igw" {
  vpc_id = aws_vpc.exchange_vpc.id
  tags = {
    Name = "cloudexchange-igw"
  }
}

# Public Subnets for EC2 & Database
resource "aws_subnet" "public_subnet_a" {
  vpc_id                  = aws_vpc.exchange_vpc.id
  cidr_block              = "10.0.1.0/24"
  availability_zone       = "ap-south-1a"
  map_public_ip_on_launch = true
  tags = {
    Name = "cloudexchange-public-a"
  }
}

resource "aws_subnet" "public_subnet_b" {
  vpc_id                  = aws_vpc.exchange_vpc.id
  cidr_block              = "10.0.2.0/24"
  availability_zone       = "ap-south-1b"
  map_public_ip_on_launch = true
  tags = {
    Name = "cloudexchange-public-b"
  }
}

# Route Table for Internet Access
resource "aws_route_table" "rt" {
  vpc_id = aws_vpc.exchange_vpc.id

  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.igw.id
  }

  tags = {
    Name = "cloudexchange-rt"
  }
}

resource "aws_route_table_association" "rta_a" {
  subnet_id      = aws_subnet.public_subnet_a.id
  route_table_id = aws_route_table.rt.id
}

resource "aws_route_table_association" "rta_b" {
  subnet_id      = aws_subnet.public_subnet_b.id
  route_table_id = aws_route_table.rt.id
}

# 3. Security Groups
resource "aws_security_group" "exchange_sg" {
  name        = "cloudexchange-server-sg"
  description = "Allow Web traffic and SSH for CloudExchange"
  vpc_id      = aws_vpc.exchange_vpc.id

  ingress {
    description = "SSH Access"
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    description = "HTTP Web Port"
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    description = "HTTPS Secure Port"
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    description = "Next.js Frontend App"
    from_port   = 3000
    to_port     = 3000
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    description = "Vite Admin Panel"
    from_port   = 3001
    to_port     = 3001
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    description = "Node.js Backend server"
    from_port   = 3002
    to_port     = 3002
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

resource "aws_security_group" "db_sg" {
  name        = "cloudexchange-db-sg"
  description = "Allow Postgres access inside VPC"
  vpc_id      = aws_vpc.exchange_vpc.id

  ingress {
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [aws_security_group.exchange_sg.id] # Only EC2 instance can access database directly
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

# 4. Latest Ubuntu 22.04 LTS AMI Data Source
data "aws_ami" "ubuntu" {
  most_recent = true
  owners      = ["099720109477"] # Canonical

  filter {
    name   = "name"
    values = ["ubuntu/images/hvm-ssd/ubuntu-jammy-22.04-amd64-server-*"]
  }

  filter {
    name   = "virtualization-type"
    values = ["hvm"]
  }
}

# 5. EC2 Instance Configuration (100% Free-Tier & Self-Bootstrapped)
resource "aws_instance" "app_server" {
  ami           = data.aws_ami.ubuntu.id
  instance_type = "t2.micro" # 100% Free-Tier
  key_name      = aws_key_pair.generated_key.key_name

  subnet_id              = aws_subnet.public_subnet_a.id
  vpc_security_group_ids = [aws_security_group.exchange_sg.id]

  root_block_device {
    volume_size           = 25 # Up to 30 GB is 100% Free Tier in AWS
    volume_type           = "gp3"
    delete_on_termination = true
  }

  # Automated user_data script to prepare the server for complete exchange deployment on bootup
  user_data = <<-EOF
              #!/bin/bash
              # Update packages
              apt-get update -y

              # Install Docker & Docker-Compose
              apt-get install -y docker.io docker-compose
              systemctl start docker
              systemctl enable docker
              usermod -aG docker ubuntu

              # Install Node.js 20 LTS, NPM, Nginx, Git
              curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
              apt-get install -y nodejs nginx git

              # Install PM2 globally for background server processes management
              npm install -g pm2

              # Create workspace directory with proper permissions
              mkdir -p /var/www/cloud-exchange
              chown -R ubuntu:ubuntu /var/www/cloud-exchange

              echo "=== AWS Instance Bootstrapped Successfully ===" > /var/log/bootstrap.log
              EOF

  tags = {
    Name = "cloudexchange-server"
  }
}

# 6. RDS Postgres Database (100% Free-Tier)
resource "aws_db_subnet_group" "db_subnet_grp" {
  name       = "cloudexchange-db-subnet-group"
  subnet_ids = [aws_subnet.public_subnet_a.id, aws_subnet.public_subnet_b.id]
}

resource "aws_db_instance" "postgres_db" {
  identifier             = "cloudexchange-free-db"
  allocated_storage      = 20 # 20 GB is maximum Free Tier allowance
  max_allocated_storage  = 20
  engine                 = "postgres"
  engine_version         = "15" # Tells AWS to pick the latest minor version of Postgres 15 automatically
  instance_class         = "db.t3.micro" # 100% Free Tier in AWS RDS
  db_name                = "cloudexchange_ledger"
  username               = "admin_exchange"
  password               = "HardenedVaultPassword999!" # Recommended: Replace in .env later
  db_subnet_group_name   = aws_db_subnet_group.db_subnet_grp.name
  vpc_security_group_ids = [aws_security_group.db_sg.id]
  skip_final_snapshot    = true

  tags = {
    Name = "cloudexchange-database"
  }
}

# Outputs to print after deployment
output "ec2_public_ip" {
  value       = aws_instance.app_server.public_ip
  description = "The public IP of your EC2 Web Server"
}

output "rds_endpoint" {
  value       = aws_db_instance.postgres_db.endpoint
  description = "The connection endpoint of your Postgres RDS Database"
}
