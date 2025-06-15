import { useNavigate } from "react-router-dom";
import { useState } from "react";
import './homepage.css';

function setCookie(cname, cvalue, exdays) {
  const d = new Date();
  d.setTime(d.getTime() + (exdays*24*60*60*1000));
  let expires = "expires="+ d.toUTCString();
  document.cookie = cname + "=" + cvalue + ";" + expires + ";path=/";
}

function HomePage({ oda, setOda, kullaniciAdi, setKullaniciAdi, odaOlustur, odaKatil }) {
  const navigate = useNavigate();
  
  const handleCreateRoom = () => {
    if (kullaniciAdi.trim()) {
      odaOlustur(kullaniciAdi);
    } else {
      alert("Lütfen kullanıcı adınızı girin!");
    }
  };

  const handleJoinRoom = () => {
    if (kullaniciAdi.trim() && oda.trim()) {
      odaKatil(oda, kullaniciAdi);
    } else {
      alert("Lütfen kullanıcı adınızı ve oda adını girin!");
    }
  };

  return (
    <div className="homepage-container">
      <div className="homepage-content">
        {/* Header Section */}
        <div className="homepage-header">
          <h1 className="homepage-title">
            <i className="fas fa-play-circle"></i>
            Video Watch Party
          </h1>
          <p className="homepage-subtitle">
            Arkadaşlarınızla birlikte video izleyin ve sohbet edin
          </p>
        </div>

        {/* Main Form Section */}
        <div className="homepage-form">
          <div className="form-section">
            <h2 className="section-title">
              <i className="fas fa-user"></i>
              Kullanıcı Bilgileri
            </h2>
            <div className="input-group">
              <input
                type="text"
                value={kullaniciAdi}
                onChange={(e) => setKullaniciAdi(e.target.value)}
                placeholder="Kullanıcı adınızı girin..."
                className="homepage-input"
                maxLength={20}
              />
            </div>
          </div>

          {/* Action Buttons Section */}
          <div className="actions-section">
            <div className="action-card create-room">
              <div className="card-icon">
                <i className="fas fa-plus-circle"></i>
              </div>
              <h3 className="card-title">Yeni Oda Oluştur</h3>
              <p className="card-description">
                Kendi odanızı oluşturun ve arkadaşlarınızı davet edin
              </p>
              <button 
                onClick={handleCreateRoom}
                className="action-button create-btn"
                disabled={!kullaniciAdi.trim()}
              >
                <i className="fas fa-plus"></i>
                Oda Oluştur
              </button>
            </div>

            <div className="action-card join-room">
              <div className="card-icon">
                <i className="fas fa-sign-in-alt"></i>
              </div>
              <h3 className="card-title">Odaya Katıl</h3>
              <p className="card-description">
                Mevcut bir odaya katılın ve izlemeye başlayın
              </p>
              <div className="input-group">
                <input
                  type="text"
                  value={oda}
                  onChange={(e) => setOda(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleJoinRoom()}
                  placeholder="Oda kodunu girin..."
                  className="homepage-input"
                  maxLength={20}
                />
              </div>
              <button 
                onClick={handleJoinRoom}
                className="action-button join-btn"
                disabled={!kullaniciAdi.trim() || !oda.trim()}
              >
                <i className="fas fa-arrow-right"></i>
                Odaya Katıl
              </button>
            </div>
          </div>
        </div>

        {/* Features Section */}
        <div className="features-section">
          <h3 className="features-title">Özellikler</h3>
          <div className="features-grid">
            <div className="feature-item">
              <i className="fas fa-video"></i>
              <span>Senkron Video İzleme</span>
            </div>
            <div className="feature-item">
              <i className="fas fa-comments"></i>
              <span>Canlı Sohbet</span>
            </div>
            <div className="feature-item">
              <i className="fas fa-list"></i>
              <span>Çalma Listesi</span>
            </div>
            <div className="feature-item">
              <i className="fas fa-users"></i>
              <span>Çoklu Kullanıcı</span>
            </div>
          </div>
        </div>
      </div>

      {/* Background Animation */}
      <div className="homepage-bg">
        <div className="bg-circle circle-1"></div>
        <div className="bg-circle circle-2"></div>
        <div className="bg-circle circle-3"></div>
      </div>
    </div>
  );
}

export default HomePage;