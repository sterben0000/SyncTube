# 🎬 SyncTube

SyncTube, kullanıcıların aynı odaya girerek senkronize bir şekilde YouTube videoları izleyebileceği bir web uygulamasıdır.

## 🚀 Özellikler

- Gerçek zamanlı senkron video oynatma (Socket.io ile)
- Oda oluşturma ve odaya kullanıcı katılımı
- Oda sahipliği kontrolü
- YouTube API ile video arama ve oynatma
- Basit ve kullanıcı dostu arayüz

## 🛠️ Kurulum

### 1. Depoyu Klonlayın

```bash
git clone https://github.com/sterben0000/SyncTube--Watch2gather-Klonu.git
cd SyncTube--Watch2gather-Klonu
```

### 2. Bağımlılıkları Yükleyin

```bash
npm install
```

### 3. Ortam Değişkenlerini Ayarlayın

Client ve Server dizininde `.env` dosyası oluşturun ve içine aşağıdaki değerleri girin:

server dizininde:
```env
PORT=3001
SECRET_KEY=bir_sifre_belirle

```
client dizininde:
```
REACT_APP_YOUTUBE_API_KEY=YourYouTubeApiKey
```
### 4. Uygulamayı Başlatın

Tek komutla istemci ve sunucu birlikte başlatılır:

```bash
npm start
```

## 📦 Kullanılan Teknolojiler

- React.js (frontend)
- Node.js + Express (backend)
- Socket.io (gerçek zamanlı iletişim)
- YouTube Data API v3
- JWT (kimlik doğrulama)
- Cookie tabanlı oturum yönetimi

## 💡 Geliştirici Notu

Bu proje yerel ağda test edilmiştir. Uygulamanın farklı cihazlarda erişilebilir olması için istemci ve sunucu IP adreslerini `.env` ve `cors` ayarlarında güncellemeyi unutmayın.

