# NFT Rewards System Deployment Guide

🎉 **Bağış yapanlara NFT hediyesi sistemi hazır!**

## 🆕 Yeni Özellikler

### Smart Contract Güncellemeleri
- ✅ NFT minting fonksiyonu eklendi
- ✅ Bağış miktarı takibi (minimum 10 ALGO)
- ✅ Kullanıcı başına tek NFT sınırı
- ✅ Unique NFT URL generation

### Frontend Güncellemeleri
- ✅ NFT sayfası gerçek blockchain verisini çekiyor
- ✅ Proje detay sayfasında NFT mint butonu
- ✅ NFT eligibility kontrolü
- ✅ Bağış sonrası NFT bildirimleri

## 🚀 Deployment Adımları

### 1. Yeni Smart Contract'ı Deploy Et

```bash
cd smart-contracts
python deploy_nft_contract.py
```

Bu işlem:
- NFT destekli smart contract'ı Testnet'e deploy eder
- Yeni App ID verir
- Bu ID'yi frontend'te güncellemen gerekir

### 2. Frontend App ID'yi Güncelle

`frontend/src/utils/algorand.ts` dosyasında:
```typescript
export const APP_ID = YENI_APP_ID // Deployment sonrası aldığın ID
```

### 3. Frontend'i Test Et

```bash
cd frontend
npm run dev
```

## 🎁 NFT Sistem Özellikleri

### Bağış Yapanlar İçin
- **Minimum 10 ALGO** bağış yapanlar NFT alabilir
- Proje tamamlandığında "Mint NFT" butonu aktif olur
- Her proje için tek NFT alabilir
- NFT'ler benzersiz hash ile oluşturulur

### NFT Detayları
- **İsim:** "Reward NFT - [Proje Adı]"
- **Symbol:** "RWDNFT"
- **Total Supply:** 1 (Her NFT unique)
- **URL:** ipfs://reward-based-hash

### Kullanım Akışı
1. 🏗️ Proje oluşturulur
2. 💰 Kullanıcı 10+ ALGO bağış yapar
3. ⏰ Proje süresi dolar
4. 🎁 Eligible kullanıcılar NFT mint eder

## 📱 Kullanıcı Arayüzü

### Proje Listesi
- NFT reward threshold gösterimi
- Bağış sonrası NFT eligibility bildirimi

### Proje Detayı
- NFT eligibility status
- Real-time contribution tracking
- Mint NFT button (when eligible)

### NFT Sayfası
- Kullanıcının sahip olduğu NFT'ler
- Proje bilgileri ve contribution miktarı
- Asset ID ve IPFS URL'leri

## 🔧 Test Senaryoları

1. **Normal Bağış (10 ALGO altı):**
   - Bağış yap → Bildirim: "NFT için 10+ ALGO gerek"

2. **NFT Eligible Bağış (10+ ALGO):**
   - Bağış yap → Bildirim: "NFT için eligible oldun!"
   - Proje bitince → Mint NFT butonu aktif
   - NFT mint et → Success message

3. **NFT Sayfası Test:**
   - Wallet connect → NFT'leri görüntüle
   - Asset details ve proje bilgileri

## ⚠️ Önemli Notlar

- **Testnet** üzerinde çalışıyor
- Gerçek ALGO gerekmez (testnet tokens)
- Her kullanıcı proje başına 1 NFT alabilir
- NFT mint için proje deadline'ının geçmesi gerek

## 🎯 Next Steps

1. Deploy yap
2. App ID güncelle  
3. Test et
4. Mainnet'e geç (production için)

**Artık bağış yapanlar exclusive NFT rewards alacak! 🚀**