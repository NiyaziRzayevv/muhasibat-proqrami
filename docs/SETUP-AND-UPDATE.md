# SmartQeyd — Setup (Installer) və Auto-Update Sistemi

## 1. Ön hazırlıq

### Git quraşdır
- https://git-scm.com/download/win adresindən yüklə və quraşdır.

### GitHub hesabı və repo yarat
1. https://github.com/new — yeni **private** repo yarat (adı: `smartqeyd`)
2. `package.json`-da `build.publish.owner` sahəsini GitHub istifadəçi adınla dəyiş:
   ```json
   "publish": {
     "provider": "github",
     "owner": "SƏNİN_GITHUB_ADI",
     "repo": "smartqeyd"
   }
   ```

### GitHub Personal Access Token (PAT) yarat
1. GitHub → Settings → Developer settings → Personal access tokens → Tokens (classic)
2. "Generate new token" → `repo` scope seç → "Generate token"
3. Token-i not et (bir dəfə göstərilir)

---

## 2. İlk dəfə repo-ya push et

```bash
cd "c:\Users\niyazi\Desktop\muhasibat proqrami"
git init
git add .
git commit -m "v1.0.0 — ilk buraxılış"
git remote add origin https://github.com/SƏNİN_GITHUB_ADI/smartqeyd.git
git push -u origin main
```

---

## 3. Setup.exe yaratmaq (Build)

```bash
# Yalnız lokal build (installer yaradır amma GitHub-a yükləmir):
npm run build

# Fayllar dist-electron/ qovluğunda yaranacaq:
#   SmartQeyd Setup 1.0.0.exe   ← bu istifadəçilərə paylanacaq fayl
#   latest.yml                   ← auto-update üçün metadata
```

---

## 4. Yeniləmə burax (Publish)

Hər dəfə yeni versiya buraxmaq istəyəndə:

### Addım 1: Versiyanı artır
```bash
# package.json-da version-ı dəyiş, məsələn:
# "version": "1.0.0"  →  "version": "1.1.0"
```

### Addım 2: Build + Publish
```bash
# GitHub token-i mühit dəyişəni kimi ver:
set GH_TOKEN=ghp_XXXXXXXXXXXXXXXX

# Build + GitHub Release-ə yüklə:
npm run publish
```

Bu əmr avtomatik olaraq:
1. Renderer-i build edir (vite build)
2. Electron setup.exe yaradır
3. GitHub-da yeni Release yaradır
4. `SmartQeyd Setup X.X.X.exe` + `latest.yml` fayllarını Release-ə yükləyir

### Addım 3: Commit + tag
```bash
git add .
git commit -m "v1.1.0 — yeniləmə təsviri"
git tag v1.1.0
git push origin main --tags
```

---

## 5. Auto-Update necə işləyir?

1. **Proqram açılanda** (5 saniyə sonra) GitHub Releases-dən `latest.yml` yoxlanılır
2. Yeni versiya varsa → istifadəçiyə **dialog** göstərilir: "Yeniləmə mövcuddur, yükləmək istəyirsiniz?"
3. İstifadəçi "Yüklə" deyirsə → arxa planda endirmə başlayır
4. Yüklənib bitdikdə → "Proqramı indi yenidən başladıb yeniləmək istəyirsiniz?" soruşulur
5. "İndi yenilə" → proqram bağlanır, yeniləmə quraşdırılır, təzədən açılır

### Manual yoxlama
İstifadəçi **Ayarlar → Proqram Yeniləməsi → Yeniləmə yoxla** düyməsinə basaraq əl ilə yoxlaya bilər.

### Avtomatik yoxlama
Hər **4 saatda bir** arxa planda yeniləmə yoxlanılır.

---

## 6. Qeydlər

- `verifyUpdateCodeSignature: false` — code signing olmadan da işləyir (development üçün). Production-da code signing (Certum, DigiCert) tövsiyə olunur.
- Auto-update **yalnız NSIS installer ilə quraşdırılmış** proqramda işləyir. `electron-packager` ilə yaradılmış portable versiyada işləməz.
- Dev rejimində (`--dev` flag) auto-update disabled olur.
- `latest.yml` faylı GitHub Release-dəki ən son versiya haqqında metadata saxlayır.
