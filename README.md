# 🚀 TradersBloc - Professional Trading Platform

A comprehensive binary options and forex trading platform with 11 professional workspaces, AI-powered tools, and full backend infrastructure.

## ✨ Features

- 🎨 **11 Professional Trading Workspaces** - Bot Builder, Volt AI, Auto AI, Signal AI, Quick Bot, Premium AI, Free Bots, Apex Trader, Copy Trader, Bulk Trader, Speed Bot
- 📊 **Real-time Charts** - Lightweight Charts with 20+ indicators
- 🤖 **Bot Builder** - Visual + code editor for creating trading strategies
- 📱 **Mobile Responsive** - Perfect on all devices
- 🔐 **Secure Backend** - JWT auth, bcrypt encryption, rate limiting
- 💳 **Payment Integration** - M-Pesa + Flutterwave
- 🎯 **Pattern Recognition** - AI-powered chart analysis

---

## 🏃 Quick Start

### Option 1: Docker (Recommended)

```bash
# Install Docker Desktop from: https://www.docker.com/products/docker-desktop/

# Start server
docker-compose up -d

# Access platform
http://localhost:3000
```

### Option 2: Node.js (Local)

**Requirements:** Node.js 18.x - 20.x

```bash
# Start server (handles setup automatically)
START.bat

# Access platform
http://localhost:3000
```

**Note:** If you have Node.js v24, use Docker instead (native modules won't compile).

---

## 📁 Project Structure

```
TradersBloc/
├── index.html              # Landing page
├── platform.html           # Main trading terminal
├── bot-builder-new.html    # Bot Builder workspace
├── volt-ai.html            # AI signals workspace
├── [9 more workspaces]     # All other trading UIs
├── server/
│   ├── server.js          # Express server
│   ├── routes/            # API endpoints
│   ├── db/migrate.js      # Database setup
│   └── .env               # Configuration
└── START.bat              # Quick start script
```

---

## 🌐 All 11 Workspaces

1. **Bot Builder** (`/bot-builder-new.html`) - Visual node-based bot designer
2. **Volt AI** (`/volt-ai.html`) - AI-powered live signals
3. **Auto AI** (`/auto-ai.html`) - Automated trading control center
4. **Signal AI** (`/signal-ai.html`) - Real-time trading signals
5. **Quick Bot** (`/quick-bot.html`) - Create bots in 60 seconds
6. **Premium AI** (`/premium-ai.html`) - Advanced analytics
7. **Free Bots** (`/free-bots.html`) - Bot marketplace
8. **Apex Trader** (`/apex-trader.html`) - Professional terminal
9. **Copy Trader** (`/copy-trader.html`) - Social trading
10. **Bulk Trader** (`/bulk-trader.html`) - Multi-order editor
11. **Speed Bot** (`/speed-bot.html`) - Performance monitoring

---

## 🔧 Configuration

### Edit server/.env

```bash
# Required: Generate secure secrets
cd server
node generate-secret.js

# Copy the output to .env file
JWT_SECRET=your_generated_secret_here
JWT_REFRESH_SECRET=your_other_secret_here

# Optional: Payment gateway keys
MPESA_CONSUMER_KEY=your_key
FLUTTERWAVE_SECRET_KEY=your_key
```

---

## 🚀 Deployment

### Deploy to Render.com (Free)

1. Create account: https://render.com
2. New Web Service → Connect GitHub
3. Configure:
   - **Build Command:** `cd server && npm install`
   - **Start Command:** `cd server && npm start`
4. Add environment variables from `.env`
5. Deploy!

### Deploy to VPS

```bash
# On server (Ubuntu/Debian)
sudo apt install nodejs npm nginx
npm install -g pm2

# Upload files
scp -r Tradersbloc/ user@server:/var/www/

# Start with PM2
cd /var/www/Tradersbloc/server
npm install
pm2 start server.js --name tradersbloc
pm2 save

# Configure Nginx reverse proxy
sudo nano /etc/nginx/sites-available/tradersbloc
# Add proxy config to forward to localhost:3000
```

---

## 🐛 Troubleshooting

### Issue: better-sqlite3 won't compile (Node.js 24)

**Solution 1 - Use Docker:**
```bash
docker-compose up -d
```

**Solution 2 - Downgrade Node.js:**
- Uninstall Node.js 24
- Install Node.js 20 LTS from https://nodejs.org
- Run `START.bat` again

### Issue: Port 3000 in use

```bash
# Find and kill process
netstat -ano | findstr :3000
taskkill /PID <process_id> /F
```

### Issue: Charts not showing

1. Open browser console (F12)
2. Check for JavaScript errors
3. Clear cache (Ctrl+Shift+Delete)
4. Hard reload (Ctrl+F5)

---

## 📚 API Endpoints

### Authentication
- `POST /api/auth/register` - Create account
- `POST /api/auth/login` - User login
- `GET /api/auth/me` - Get user info

### Trading
- `POST /api/trades` - Place trade
- `GET /api/trades` - Get trades
- `POST /api/trades/:id/settle` - Settle trade

### Wallet
- `POST /api/wallet/deposit` - Deposit funds
- `POST /api/wallet/withdraw` - Withdraw funds
- `GET /api/wallet/transactions` - Transaction history

### System
- `GET /api/health` - Server status
- `GET /api/rates` - Exchange rates

---

## 🔐 Security Features

- ✅ JWT Authentication
- ✅ bcrypt Password Hashing
- ✅ Rate Limiting
- ✅ Helmet Security Headers
- ✅ CORS Protection
- ✅ Input Validation
- ✅ SQL Injection Prevention

---

## 📊 Tech Stack

**Frontend:** Vanilla JavaScript, Lightweight Charts, Lucide Icons, CSS Grid  
**Backend:** Node.js, Express, SQLite, JWT, bcrypt  
**Payments:** M-Pesa, Flutterwave  
**Deployment:** Docker, PM2, Nginx

---

## 🎯 What's Working

✅ All 11 workspaces operational  
✅ Unified Volt AI theme  
✅ Real-time charts with indicators  
✅ Bot Builder with visual + code modes  
✅ Mobile responsive design  
✅ Backend API functional  
✅ Payment integration ready  
✅ Security hardened  
✅ Ready for production  

---

## 📞 Support

### Quick Test

```bash
# Check if server is running
curl http://localhost:3000/api/health

# Should return: {"status":"ok"}
```

### View Logs

```bash
# If using PM2
pm2 logs tradersbloc

# If using Docker
docker-compose logs -f
```

---

## 📝 License

Proprietary - All rights reserved

---

**Built for traders worldwide** 🌍
