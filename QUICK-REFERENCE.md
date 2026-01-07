# McManager Quick Reference

## Starting McManager

### Simple - Just Run This!
```powershell
Start.bat
```

The script automatically detects PM2 and chooses the best mode:
- **With PM2:** Production mode with auto-updates
- **Without PM2:** Simple development mode

### Stopping
```powershell
Stop.bat
# or
pm2 stop all
```

---

## PM2 Commands

```powershell
pm2 status              # View all processes
pm2 logs                # View live logs
pm2 logs mcmanager      # View specific app logs
pm2 restart all         # Restart all services
pm2 stop all            # Stop all services
pm2 save                # Save current process list
```

---

## Deployment Workflow

### On Development Computer
```powershell
git add .
git commit -m "Your changes"
git push origin main
```

### On Server
**Automatic (if PM2 auto-updater is running):**
- ✅ Updates automatically within ~1 minute

**Manual:**
```powershell
.\update.bat
```

---

## File Structure

```
McManager/
├── server.js              # Main server
├── auto-update.js         # Auto-deployment service
├── ecosystem.config.js    # PM2 configuration
├── public/                # Frontend files
├── servers/               # Minecraft servers (not in Git)
├── logs/                  # PM2 logs
├── DEPLOYMENT.md          # Full deployment guide
├── PM2-GUIDE.md           # PM2 detailed guide
└── README.md              # Project overview
```

---

## Troubleshooting

### Server won't start
```powershell
pm2 logs mcmanager --err
npm install
```

### Auto-updater not working
```powershell
pm2 logs mcmanager-updater
git pull origin main  # Test manually
```

### Port already in use
Change port in `.env`:
```
PORT=8080
```

---

## Useful Links

- **Main Documentation:** [README.md](README.md)
- **Deployment Guide:** [DEPLOYMENT.md](DEPLOYMENT.md)
- **PM2 Guide:** [PM2-GUIDE.md](PM2-GUIDE.md)
- **PM2 Official Docs:** https://pm2.keymetrics.io/
