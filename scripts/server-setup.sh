#!/bin/bash
# ================================
# Server Setup Script
# For fresh VPS Ubuntu 22.04
# ================================

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}======================================${NC}"
echo -e "${BLUE}  GYM-147 Server Setup${NC}"
echo -e "${BLUE}======================================${NC}"

# Check if running as root
if [[ $EUID -ne 0 ]]; then
   echo -e "${RED}❌ Please run as root${NC}"
   exit 1
fi

# Update system
echo -e "${YELLOW}📦 Updating system...${NC}"
apt-get update -qq
apt-get upgrade -y -qq

# Install essential packages
echo -e "${YELLOW}📦 Installing essential packages...${NC}"
apt-get install -y \
    curl \
    wget \
    git \
    vim \
    htop \
    net-tools \
    ufw \
    fail2ban \
    certbot \
    python3-certbot-nginx

# Install Docker
echo -e "${YELLOW}🐳 Installing Docker...${NC}"
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh
rm get-docker.sh

# Enable Docker
systemctl enable docker
systemctl start docker

# Install Docker Compose
echo -e "${YELLOW}📦 Installing Docker Compose...${NC}"
curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
chmod +x /usr/local/bin/docker-compose

# Add current user to docker group
usermod -aG docker $SUDO_USER || true

# Setup Firewall (UFW)
echo -e "${YELLOW}🔥 Setting up firewall...${NC}"
ufw default deny incoming
ufw default allow outgoing
ufw allow ssh
ufw allow 80/tcp
ufw allow 443/tcp
ufw allow 3000/tcp  # Web Admin
ufw allow 9443/tcp  # Portainer
ufw --force enable

# Setup fail2ban
echo -e "${YELLOW}🔒 Setting up fail2ban...${NC}"
cat > /etc/fail2ban/jail.local << 'EOF'
[DEFAULT]
bantime = 3600
findtime = 600
maxretry = 5

[sshd]
enabled = true
port = ssh
filter = sshd
logpath = /var/log/auth.log
EOF

systemctl enable fail2ban
systemctl start fail2ban

# Create swap file (if less than 2GB)
if [ $(free -m | awk '/^Mem:/{print $2}') -lt 2048 ]; then
    echo -e "${YELLOW}💾 Creating swap file...${NC}"
    fallocate -l 2G /swapfile
    chmod 600 /swapfile
    mkswap /swapfile
    swapon /swapfile
    echo '/swapfile none swap sw 0 0' >> /etc/fstab
fi

# Setup automatic security updates
echo -e "${YELLOW}🔄 Setting up automatic updates...${NC}"
apt-get install -y unattended-upgrades
dpkg-reconfigure -plow unattended-upgrades

# Optimize sysctl for production
echo -e "${YELLOW}⚡ Optimizing system settings...${NC}"
cat >> /etc/sysctl.conf << 'EOF'
# Network optimizations
net.core.somaxconn = 65535
net.core.netdev_max_backlog = 65535
net.ipv4.tcp_max_syn_backlog = 65535
net.ipv4.tcp_fin_timeout = 30
net.ipv4.tcp_keepalive_time = 300
net.ipv4.tcp_keepalive_intvl = 30
net.ipv4.tcp_keepalive_probes = 5

# File descriptors
fs.file-max = 65535
EOF

sysctl -p

# Create deployment directory
echo -e "${YELLOW}📁 Creating deployment directory...${NC}"
mkdir -p /opt/gym-147
mkdir -p /var/www/gym-147
mkdir -p /var/log/gym-147
mkdir -p /opt/gym-147/data/postgres
mkdir -p /opt/gym-147/data/redis

echo -e "${BLUE}======================================${NC}"
echo -e "${GREEN}✅ Server setup completed!${NC}"
echo -e "${BLUE}======================================${NC}"
echo ""
echo -e "${GREEN}📝 Next Steps:${NC}"
echo "1. Copy your project files to /opt/gym-147"
echo "2. Configure .env file"
echo "3. Run: bash scripts/deploy-prod.sh"
echo ""
echo -e "${GREEN}🔒 Security Features Enabled:${NC}"
echo "  - UFW Firewall (ports: 22, 80, 443, 3000, 9443)"
echo "  - Fail2ban (SSH protection)"
echo "  - Automatic security updates"
echo "  - Swap file"
