# 🤝 Katkıda Bulunma Rehberi

GetTransfer projesine katkıda bulunmak istediğiniz için teşekkürler! Bu rehber, projeye nasıl katkıda bulunabileceğinizi açıklar.

---

## 📑 İçindekiler

- [Davranış Kuralları](#-davranış-kuralları)
- [Nasıl Katkıda Bulunabilirsiniz](#-nasıl-katkıda-bulunabilirsiniz)
- [Geliştirme Ortamı Kurulumu](#-geliştirme-ortamı-kurulumu)
- [Kod Standartları](#-kod-standartları)
- [Commit Mesajları](#-commit-mesajları)
- [Pull Request Süreci](#-pull-request-süreci)

---

## 📜 Davranış Kuralları

### Söz Veriyoruz

- Açık ve hoşgörülü olmak
- Fikirleri saygıyla eleştirmek
- Yapıcı geri bildirim vermek
- Topluluğun iyiliği için çalışmak

---

## 🎯 Nasıl Katkıda Bulunabilirsiniz

### Kod Katkısı

| Tür | Açıklama |
|-----|----------|
| 🐛 **Bug Fix** | Hata düzeltmeleri |
| ✨ **Feature** | Yeni özellikler |
| 📝 **Docs** | Dokümantasyon |
| 🎨 **Style** | Kod formatı, CSS |
| ♻️ **Refactor** | Kod yeniden düzenleme |

### Kod Dışı Katkı

- 📣 Projenin tanıtılması
- 🌍 Çeviri katkıları
- 🐛 Bug raporlama
- 💡 Öneri ve fikirler

---

## 🚀 Geliştirme Ortamı Kurulumu

### 1. Repoyu Fork'layın

```bash
# GitHub'da Fork butonuna tıklayın
# Sonra kendi fork'unuzu klonlayın
git clone https://github.com/YOUR_USERNAME/gettransfer.git
cd gettransfer
```

### 2. Bağımlılıkları Yükleyin

```bash
npm install
```

### 3. Environment Variables

```bash
cp .env.example .env
# .env dosyasını düzenleyin
```

### 4. Geliştirme Sunucusunu Başlatın

```bash
npm run dev
```

Tarayıcıda `http://localhost:5173` adresini açın.

### 5. Branch Oluşturun

```bash
git checkout -b feature/yeni-ozellik
# veya
git checkout -b fix/hata-duzeltmesi
```

---

## 🎨 Kod Standartları

### TypeScript

```typescript
// ✅ İyi
interface User {
  id: string
  name: string
  email: string
}

const getUser = async (id: string): Promise<User> => {
  const response = await fetch(`/api/users/${id}`)
  return response.json()
}

// ❌ Kötü
const getUser = (id: any): any => {
  return fetch('/api/users/' + id)
}
```

### React

```tsx
// ✅ İyi - Fonksiyonel bileşen, tip tanımı
interface ButtonProps {
  label: string
  onClick: () => void
  variant?: 'primary' | 'secondary'
}

export const Button: React.FC<ButtonProps> = ({ 
  label, 
  onClick, 
  variant = 'primary' 
}) => {
  return (
    <button 
      className={`btn btn-${variant}`}
      onClick={onClick}
    >
      {label}
    </button>
  )
}
```

### File Naming

| Tür | Format | Örnek |
|-----|--------|-------|
| Component | PascalCase | `Button.tsx` |
| Page | PascalCase | `Dashboard.tsx` |
| Utility | camelCase | `formatDate.ts` |

---

## 📝 Commit Mesajları

### Format

```
<tip>(<scope>): <kısa açıklama>
```

### Tipler

| Tip | Açıklama | Örnek |
|-----|----------|-------|
| `feat` | Yeni özellik | `feat: Google OAuth eklendi` |
| `fix` | Bug düzeltme | `fix: Login hatası düzeltildi` |
| `docs` | Dokümantasyon | `docs: README güncellendi` |
| `style` | Format | `style: Kod formatı düzeltildi` |
| `refactor` | Yeniden düzenleme | `refactor: Auth basitleştirildi` |
| `test` | Test | `test: Login testleri eklendi` |

---

## 🔄 Pull Request Süreci

### 1. Kodunuzu Push Edin

```bash
git add .
git commit -m "feat: Yeni özellik eklendi"
git push origin feature/yeni-ozellik
```

### 2. Pull Request Açın

1. GitHub'da fork'unuza gidin
2. "Compare & pull request" butonuna tıklayın
3. PR başlığı ve açıklaması yazın
4. "Create pull request" butonuna tıklayın

### 3. PR Açıklama Formatı

```markdown
## Değişiklik Özeti
- Değişiklik 1
- Değişiklik 2

## Test
- [ ] Manuel test yapıldı

## İlgili Issue
Fixes #123
```

---

## 🔒 Güvenlik

### Asla Yapılmaması Gerekenler

```bash
# ❌ API key'leri kod'a yazmayın
const API_KEY = 'sk_live_xxx' // YASAK!

# ✅ Environment variable kullanın
const API_KEY = process.env.API_KEY

# ❌ .env dosyasını commit etmeyin
git add .env # YASAK!
```

---

## 📄 Lisans

Katkılarınız [MIT License](LICENSE) altında lisanslanacaktır.

---

<p align="center">
  Katkılarınız için teşekkürler! 🙏
</p>
