# Standalone Installer

This is a **standalone installer** that you can copy to any computer and run to install McManager.

## How to Use

### Step 1: Configure the Installer

1. Open `Install-Standalone.bat` in a text editor
2. Find this line near the top:
   ```batch
   set REPO_URL=YOUR_GIT_REPO_URL_HERE
   ```
3. Replace `YOUR_GIT_REPO_URL_HERE` with your actual Git repository URL, for example:
   ```batch
   set REPO_URL=https://github.com/yourusername/McManager.git
   ```
4. Save the file

### Step 2: Copy to Target Computer

Copy `Install-Standalone.bat` to any directory on your target computer where you want to install McManager.

### Step 3: Run the Installer

Double-click `Install-Standalone.bat` or run it from command line:

```powershell
Install-Standalone.bat
```

### What It Does

The installer will automatically:
1. ✅ Check for Node.js and Git
2. ✅ Clone the McManager repository
3. ✅ Install all npm dependencies
4. ✅ Optionally install PM2
5. ✅ Create .env configuration
6. ✅ Optionally start the server

**No manual steps required!**

---

## Prerequisites

The target computer must have:
- **Node.js** (v14 or higher) - [Download](https://nodejs.org/)
- **Git** - [Download](https://git-scm.com/)
- **Java** (for running Minecraft servers) - [Download](https://www.java.com/)

---

## Example Usage

```powershell
# On your server computer:
# 1. Create a folder for McManager
mkdir C:\Servers
cd C:\Servers

# 2. Copy Install-Standalone.bat to this folder
# 3. Run it
Install-Standalone.bat
```

The installer will create a `McManager` subdirectory and install everything there.

---

## Customization

You can edit the installer to change:

- **Installation directory name:**
  ```batch
  set INSTALL_DIR=McManager
  ```
  Change `McManager` to whatever you want

- **Repository URL:**
  ```batch
  set REPO_URL=https://github.com/yourusername/McManager.git
  ```

---

## Troubleshooting

### "Git is not installed"
Install Git from https://git-scm.com/ and run the installer again.

### "Node.js is not installed"
Install Node.js from https://nodejs.org/ (LTS version) and run the installer again.

### "Failed to clone repository"
- Check that the REPO_URL is correct
- Ensure you have access to the repository
- Check your internet connection

### "Directory already exists"
The installer will ask if you want to delete and reinstall. Choose Yes to proceed.

---

## After Installation

Once installed, you can:

**Start the server:**
```powershell
cd McManager
Start.bat
```

**Stop the server:**
```powershell
Stop.bat
```

**Update the server:**
```powershell
scripts\update.bat
```

Or if PM2 is installed, updates happen automatically when you push to Git!

---

## Distribution

You can distribute `Install-Standalone.bat` to anyone who needs to install McManager. They just need to:
1. Have Node.js and Git installed
2. Run the installer
3. Done!
