# 🔧 DEPLOYMENT FIX - STEP BY STEP

## Yang Sudah Saya Fix:
✅ package.json - Updated dependencies  
✅ index.js - Removed cors dependency  
✅ Node version - Set ke 20 (compatible)

---

## Sekarang Anda tinggal execute 3 commands ini:

### Command 1: Clean up & reinstall
```powershell
cd "C:\Users\Rifqi Adli Hernawan\OneDrive\Desktop\AsramaApp\functions"
Remove-Item node_modules -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item package-lock.json -ErrorAction SilentlyContinue
npm install
```

### Command 2: Verify install
```powershell
npm list
```

Expected output:
```
functions@1.0.0
├── firebase-admin@12.0.0
└── firebase-functions@5.0.0
```

### Command 3: Deploy!
```powershell
cd ..
firebase deploy --only functions
```

---

## Jika masih error, screenshot + paste error message ya!

Tips:
- Make sure Node.js installed (`node --version`)
- Run PowerShell as Administrator jika ada permission error
- Pastikan internet connection stabil

