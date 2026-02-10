#!/bin/bash
set -e

# ============================================================
# EnlevoHub - Deploy Script for Ubuntu VPS
# Usage: ssh root@IP 'bash -s' < deploy.sh
# ============================================================

DOMAIN="app.enlevoengenharia.com.br"
APP_DIR="/opt/enlevohub"
EMAIL="admin@enlevoengenharia.com.br"

echo "============================================"
echo " EnlevoHub - Deploy to Production"
echo " Domain: $DOMAIN"
echo "============================================"

# ── 1. System Update ──
echo ""
echo "[1/7] Updating system..."
apt-get update -qq
apt-get upgrade -y -qq
apt-get install -y -qq curl git ufw

# ── 2. Firewall ──
echo ""
echo "[2/7] Configuring firewall..."
ufw allow OpenSSH
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable
echo "  Firewall: SSH, HTTP, HTTPS enabled"

# ── 3. Install Docker ──
echo ""
echo "[3/7] Installing Docker..."
if ! command -v docker &> /dev/null; then
    curl -fsSL https://get.docker.com | sh
    systemctl enable docker
    systemctl start docker
    echo "  Docker installed"
else
    echo "  Docker already installed"
fi

# ── 4. Install nginx + certbot ──
echo ""
echo "[4/7] Installing nginx and certbot..."
apt-get install -y -qq nginx certbot python3-certbot-nginx
systemctl enable nginx

# ── 5. Create app directory ──
echo ""
echo "[5/7] Setting up application directory..."
mkdir -p $APP_DIR
cd $APP_DIR

# Create production .env
if [ ! -f .env ]; then
    JWT_SECRET=$(openssl rand -hex 32)
    DB_PASSWORD=$(openssl rand -hex 16)
    cat > .env << ENVEOF
# ── EnlevoHub Production Environment ──
DB_PASSWORD=$DB_PASSWORD
JWT_SECRET=$JWT_SECRET
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
NODE_ENV=production
UPLOAD_MAX_SIZE=10485760
FRONTEND_URL=https://$DOMAIN
LOG_LEVEL=info
ENVEOF
    echo "  .env created with random secrets"
    echo ""
    echo "  !! SAVE THESE CREDENTIALS !!"
    echo "  DB_PASSWORD: $DB_PASSWORD"
    echo "  JWT_SECRET: $JWT_SECRET"
    echo ""
else
    echo "  .env already exists, keeping current values"
fi

# ── 6. Configure nginx as reverse proxy with SSL ──
echo ""
echo "[6/7] Configuring nginx..."

# First, create HTTP-only config (for certbot to work)
cat > /etc/nginx/sites-available/enlevohub << 'NGINXEOF'
server {
    listen 80;
    server_name DOMAIN_PLACEHOLDER;

    # Let's Encrypt challenge
    location /.well-known/acme-challenge/ {
        root /var/www/html;
    }

    location / {
        return 301 https://$host$request_uri;
    }
}
NGINXEOF

# Replace domain placeholder
sed -i "s/DOMAIN_PLACEHOLDER/$DOMAIN/g" /etc/nginx/sites-available/enlevohub

# Enable site
ln -sf /etc/nginx/sites-available/enlevohub /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx

echo "  nginx HTTP config ready"

# ── 7. Get SSL certificate ──
echo ""
echo "[7/7] Obtaining SSL certificate..."
certbot --nginx -d $DOMAIN --non-interactive --agree-tos -m $EMAIL --redirect 2>/dev/null || {
    echo "  SSL certificate failed (DNS may not be pointing here yet)"
    echo "  Run this manually after DNS is configured:"
    echo "    certbot --nginx -d $DOMAIN --non-interactive --agree-tos -m $EMAIL"
}

# Now update nginx with full config (after certbot added SSL blocks)
cat > /etc/nginx/sites-available/enlevohub << 'NGINXEOF'
# Redirect HTTP to HTTPS
server {
    listen 80;
    server_name DOMAIN_PLACEHOLDER;

    location /.well-known/acme-challenge/ {
        root /var/www/html;
    }

    location / {
        return 301 https://$host$request_uri;
    }
}

# HTTPS
server {
    listen 443 ssl http2;
    server_name DOMAIN_PLACEHOLDER;

    ssl_certificate /etc/letsencrypt/live/DOMAIN_PLACEHOLDER/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/DOMAIN_PLACEHOLDER/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    # Gzip
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml text/javascript image/svg+xml;
    gzip_min_length 1000;

    # Upload size
    client_max_body_size 10M;

    # Proxy to frontend container
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
NGINXEOF

sed -i "s/DOMAIN_PLACEHOLDER/$DOMAIN/g" /etc/nginx/sites-available/enlevohub

# Test and reload (may fail if cert doesn't exist yet, that's ok)
nginx -t 2>/dev/null && systemctl reload nginx || echo "  nginx SSL config saved (will activate after SSL cert)"

# ── Auto-renew SSL ──
systemctl enable certbot.timer 2>/dev/null || true

echo ""
echo "============================================"
echo " Setup complete!"
echo "============================================"
echo ""
echo " Next steps:"
echo "  1. Point DNS: A record 'app' → $(curl -s ifconfig.me 2>/dev/null || echo '144.91.68.23')"
echo "  2. Copy project files to $APP_DIR/"
echo "  3. cd $APP_DIR && docker compose -f docker-compose.prod.yml up -d"
echo "  4. Run: certbot --nginx -d $DOMAIN (if SSL failed above)"
echo ""
echo " Credentials saved in: $APP_DIR/.env"
echo "============================================"
