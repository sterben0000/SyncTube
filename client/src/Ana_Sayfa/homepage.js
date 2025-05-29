import { useNavigate } from "react-router-dom";
import '../App.css';

function setCookie(cname, cvalue, exdays) {
  const d = new Date();
  d.setTime(d.getTime() + (exdays*24*60*60*1000));
  let expires = "expires="+ d.toUTCString();
  document.cookie = cname + "=" + cvalue + ";" + expires + ";path=/";
}


function HomePage({ oda, setOda, kullaniciAdi, setKullaniciAdi,odaOlustur,odaKatil }) {
  const navigate = useNavigate();
  
  

  
  

  

  return (
    <div>

        <input
          type="text"
          value={kullaniciAdi}
          onChange={(e) => setKullaniciAdi(e.target.value)}
          placeholder="Kullanıcı Adı..."
        />

        <button onClick={() => odaOlustur(kullaniciAdi)}>Oda Oluştur</button>
        <input
          type="text"
          value={oda}
          onChange={(e) => setOda(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && odaKatil(e,kullaniciAdi)}
          placeholder="Oda adı..."
        />
        <button onClick={() => odaKatil(oda,kullaniciAdi)}>Odaya Katıl</button>
        
    </div>
  );
}

export default HomePage;