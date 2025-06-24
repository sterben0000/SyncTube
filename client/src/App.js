import './App.css';
import VideoControls from './Video_Player/videoplayer';
import React, { useEffect, useRef, useState } from 'react';
import HomePage from "./Ana_Sayfa/homepage";
import { Routes, Route, useLocation, useNavigate } from "react-router-dom";
import io from 'socket.io-client';


const YOUTUBE_API_KEY = process.env.REACT_APP_YOUTUBE_API_KEY;
let sockett;

function setCookie(cname, cvalue, exdays) {
  const d = new Date();
  d.setTime(d.getTime() + (exdays*24*60*60*1000));
  let expires = "expires="+ d.toUTCString();
  document.cookie = cname + "=" + cvalue + ";" + expires + ";path=/";
}
function getCookie(name) {
  const cookies = document.cookie.split('; ');
  for (let cookie of cookies) {
    const [key, value] = cookie.split('=');
    if (key === name) {
      return decodeURIComponent(value);
    }
  }
  return null;
}

function App() {
  
  const [socket, setSocket] = useState(null);
  const [url, setUrl] = useState('');
  const [videoId, setVideoId] = useState(null);
  const [videoYuzde, setVideoYuzde] = useState({ width: '0%' });
  const [videoOynuyormu, setVideoOynuyormu] = useState(true);
  const [suankiZaman, setSuankiZaman]=useState('00:00');
  const [videoSuresi, setVideoSuresi]=useState('00:00');
  const [anlikSure,setAnlikSure]=useState('00:00');
  const [anlikSureKonumu, setAnlikSureKonumu]=useState({left: '0%'});
  const [videoHiz, setVideoHiz]=useState(1);
  const [mesaj, setMesaj] = useState("");
  const [oda, setOda]=useState("");
  const [kullaniciAdi, setKullaniciAdi]=useState("");
  const [playlist, setPlaylist]=useState([]);
  const [videoSirasi, setVideoSirasi]=useState(0);
  const [title, setTitle] = useState([]);
  const [kapakFotografi, setKapakFotografi]=useState([]);
  const [volume, setVolume] = useState(50);
  const [kullanicilarVisible, setKullanicilarVisible] = useState(false);
  const [odadakiKullanicilar, setOdadakiKullanicilar] = useState([]);
  const [kullaniciAdiYok, setKullaniciAdiYok] = useState(true);
  const [davetPenceresiVisible, setDavetPenceresiVisible] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);
  const [mesajlar, setMesajlar] = useState([]);
  const [loopAktif, setLoopAktif] = useState(false);

  const loopAktifRef=useRef(loopAktif);
  const videoOynuyormuRef=useRef(videoOynuyormu);
  const mesajListesiRef = useRef(null);
  const fullScreenContainerRef = useRef(null);
  const location = useLocation();
  const navigate = useNavigate();
  const playlistRef = useRef(playlist);
  const videoSirasiRef = useRef(videoSirasi);
  const titleRef = useRef(title);
  const kapakFotografiRef=useRef(kapakFotografi);
  const videoIdRef=useRef(videoId);
  const playerRef = useRef(null);
  const playerInstance = useRef(null);
  const ilerlemeIntervalRef = useRef(null);
  const zamanIntervalRef = useRef(null); 


  const odaOlustur = async (kullaniciAdi)=> {
    //Yeni Oda oluşturup oluşturan kişiye owner yetkisi olan tokeni http only cookie olarak saklama
    const response = await fetch('http://localhost:3001/create-room', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ kullaniciAdi }),
      credentials: 'include' 
    });

    await response.json();

    //Cookie oluştuktan sonra socket bağlantısı kurma
    sockett = io("http://localhost:3001",{
      withCredentials: true
    }); 

    const odaid = Math.random().toString(36).substr(2, 9); //Rastgele bir oda id'si oluşturma
    sockett.emit("oda_olustur",{odaid,kullaniciAdi});//Oluşturulan id ile odayı oluşturma

    setSocket(sockett);

    
  }
  //Var olan bir odaya katılıp normal kullanıcı yetkilerinin olduğu tokeni http only cookie olarak saklama
  const odaKatil = async (e,kullaniciAdi)=> {
    const response = await fetch('http://localhost:3001/join-room', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ e,kullaniciAdi }),
      credentials: 'include'
    });
    
    await response.json();
    
    //Cookie oluştuktan sonra socket bağlantısı kurma
    sockett = io("http://localhost:3001",{
      withCredentials: true
    }); 
    
    sockett.emit("odaya_gir",{e,kullaniciAdi});//Fonksiyondan gelen oda id ile (e) odaya katılma

    setSocket(sockett);
  }


  //Sohbet kısmına atılan metnin url olup olmadığını kontrol edecek fonksiyon
  const urlMi = (str) => {
    const pattern = new RegExp(
      '^(https?:\\/\\/)?' +                                // protokol
      '((([a-z\\d]([a-z\\d-]*[a-z\\d])*))\\.)+[a-z]{2,}' + // domain adı
      '(\\:\\d+)?(\\/[-a-z\\d%_.~+]*)*' +                  // port ve path
      '(\\?[;&a-z\\d%_.~+=-]*)?' +                         // query string
      '(\\#[-a-z\\d_]*)?$',                                // hash
      'i'
    );
    return pattern.test(str.trim());
  };

  //Atılan youtube linkinden videonun id'sini çıkaran fonksiyon
  const extractVideoId = (url) => {
    const regex = /(?:youtube\.com\/.*v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/;
    const match = url.match(regex);
    return match ? match[1] : null;
  };

  //React'de state'ler hemen render olmadığı için en güncel değere ulaşabilmek için aşağıdaki gibi bir referans oluşturuyoruz.
  //Her setVideoId useState'i kullanıldığında aşağıdaki useEffect çalışıyor.
  useEffect(()=>{
    videoIdRef.current=videoId;
  },[videoId]);

  useEffect(() => { 
    //Kullanıcı /chat sayfasına gelince aşağıdaki fonksiyon çalışıyor
    if (location.pathname === "/chat") {
      const params = new URLSearchParams(location.search);
      const odaID = params.get("oda");
      if (odaID) {
        if(socket==null){
          if(getCookie("username")==null){
            setKullaniciAdiYok(true);
          }
        }
        setOda(odaID);
        setCookie("oda",odaID,1);
      }
    }
  }, [location,socket]);

  //React'de state'ler hemen render olmadığı için en güncel değere ulaşabilmek için aşağıdaki gibi bir referans oluşturuyoruz.
  useEffect(()=>{
    videoOynuyormuRef.current=videoOynuyormu;
  },[videoOynuyormu])


  useEffect(()=>{
    loopAktifRef.current=loopAktif;
  },[loopAktif])

  //Oluşturduğumuz player'ın ilerleme çubuğunun ilerlemesini sağlayan fonksiyon
  const ilerlemeCubugu = () => {
    
    if (ilerlemeIntervalRef.current) clearInterval(ilerlemeIntervalRef.current);
    ilerlemeIntervalRef.current = setInterval(() => { //Her 100 milisaniyede bir çalışan bir interval başlatıyoruz
      if (playerInstance.current && playerInstance.current.getDuration) {
        const videoSaniyesi = playerInstance.current.getCurrentTime(); 
        const videoSuresi = playerInstance.current.getDuration();
        if (videoSuresi > 0) {
          const yuzde = (videoSaniyesi / videoSuresi) * 100; //Videonun yüzde kaçında olduğumuzu hesaplayıp aşağıdaki satırda ilerleme çubuğu barının o yüzdede güncellenmesini sağlıyoruz
          setVideoYuzde({ width: yuzde + '%' });
        }
      }
    }, 100);
  };

  //Videonun süresini ve anlık saniyesini görmemizi sağlayan fonksiyon
  const videoZamani = () => {
    
    if (zamanIntervalRef.current) clearInterval(zamanIntervalRef.current);
    zamanIntervalRef.current = setInterval(() => {
      if (playerInstance.current && playerInstance.current.getDuration()) {
        const current = playerInstance.current.getCurrentTime(); //Videonun kaçıncı saniyede olduğu bilgisini alıyoruz
        const duration = playerInstance.current.getDuration(); //Videonun toplam kaç saniye olduğu bilgisini alıyoruz
        
        setSuankiZaman(saniyeyiCevir(current));
        setVideoSuresi(saniyeyiCevir(duration));
        
      }

    }, 100);
  }
  
  //Yukarıda bize gelen saniye bilgilerini bu fonksiyonlar saat/dakika/saniye formatına çevirip return ediyoruz.
  const saniyeyiCevir = (saniye) =>{
    if (!saniye) return "00:00";
    const saat = Math.floor(saniye/3600);
    const dk = Math.floor((saniye%3600)/60);
    const sn = Math.floor(saniye%60);

    const cevrilmisSaat= saat>0 ? `${saat.toString().padStart(2,'0')}:`:'';
    const cevrilmisDakika= dk.toString().padStart(2,'0');
    const cevrilmisSaniye= sn.toString().padStart(2,'0');


    return `${cevrilmisSaat}${cevrilmisDakika}:${cevrilmisSaniye}`;
  }

  //Fareyi ilerleme çubuğunda gezdirdiğimizde farenin olduğu kısmın kaçıncı saniyede olduğunu göstermesini sağlayan fonksiyon
  const fareHareketi=(e)=>{
    const ilerlemeCubugu_Alani = e.currentTarget;
    const rect = ilerlemeCubugu_Alani.getBoundingClientRect();
    const fareKonumu = e.clientX - rect.left;
    const width = rect.width;
    const yeniYuzde = fareKonumu / width;
    setAnlikSureKonumu({left: (yeniYuzde*100)+'%'});

    const player=playerInstance.current;
    if(player){
      const saniye=player.getDuration()*yeniYuzde;
      setAnlikSure(saniyeyiCevir(saniye));
      
    }

  }

  useEffect(() => {
    
    if (location.pathname !== "/chat") return; //Kullanıcı bir odaya girmezse bu kısmın çalışmasını engelliyoruz
    if (kullaniciAdiYok) return; //Kullanıcı linkten giriş yaptığı zaman kullanıcı adını girmeden bu kısmın çalışmasını engelliyoruz
    
    //Gerekli state'lerin referansı alınıyor
    videoSirasiRef.current = videoSirasi;
    playlistRef.current = playlist;
    kapakFotografiRef.current=kapakFotografi;
    titleRef.current=title;
    loopAktifRef.current=loopAktif;



    if (!window.YT && socket ) { //Youtube iframe api yüklenmediyse veya socket bağlantısı kurulmadıysa api'ın yüklenmesini engelliyoruz
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      document.body.appendChild(tag);
    }

    window.onYouTubeIframeAPIReady = () => {
      try {
        if (playerRef.current) {
          playerInstance.current = new window.YT.Player(playerRef.current, {
            height: '360',
            width: '640',
            videoId: '',
            playerVars: {
              controls: 0,
              modestbranding: 1,
              rel: 0,
              
            },
            events: {
              onReady: ()=>{
                socket.emit("odaya_katildi",{kullanici:getCookie("username"),socketId: socket.id,oda :getCookie("oda")},()=>{ //iFrame Api yüklendiği zaman kullanıcının odaya katıldığı bilgisi odadaki kişilere gidiyor
                  socket.emit("url_cek",{oda :getCookie("oda"),socketId: socket.id}); //En son katılan kişi odadaki Playlist'i veya açık olan videoyu çekmek için sunucuya "url_cek" olayını gönderiyor. 
                });
              },
              onStateChange: (event) => {
                 
                if (event.data === window.YT.PlayerState.PLAYING) { //Video oynuyorken ilerleme çubuğu ve video zamanı intervalleri başlatılıyor
                  
                  ilerlemeCubugu();
                  videoZamani();
                  
                } else if (
                  event.data === window.YT.PlayerState.PAUSED || //Video durduysa veya bittiyse intervaller durduruluyor
                  event.data === window.YT.PlayerState.ENDED
                ) {   
                      clearInterval(ilerlemeIntervalRef.current);
                      clearInterval(zamanIntervalRef.current); 
                }
                if(event.data === window.YT.PlayerState.ENDED){//Video bittiği zaman bir sonraki videoya geçiyor
                    
                    if((videoSirasiRef.current===playlistRef.current.length-1) && loopAktifRef.current){
                      
                      setVideoSirasi((onceki) => { 
                      const yeniVideoSirasi = 0;
                      if(playlistRef.current[yeniVideoSirasi]){
                      videoyuAc(playlistRef.current[yeniVideoSirasi]);} 
                      return yeniVideoSirasi; 
                    }); 
                    }
                    else{
                      
                      setVideoSirasi((onceki) => { 
                        const yeniVideoSirasi = onceki + 1;
                        if(playlistRef.current[yeniVideoSirasi]){
                        videoyuAc(playlistRef.current[yeniVideoSirasi]);} 
                        return yeniVideoSirasi; 
                      });  
                    }


                }
                if(event.data === window.YT.PlayerState.PAUSED){ //Kullanıcı videoyu bizim yaptığımız player'ı kullanmadan durdurmaya çalışırsa engelleniyor
                  if(videoOynuyormuRef.current===true){
                    playerInstance.current.playVideo();
                  }
                }
                if(event.data === window.YT.PlayerState.PLAYING){////Kullanıcı videoyu bizim yaptığımız player'ı kullanmadan başlatmaya çalışırsa engelleniyor
                  if(videoOynuyormuRef.current===false){
                    playerInstance.current.pauseVideo();
                  }
                }
                
              }
            }
          });
        }
        
        
      } catch (err) {
        console.error("YouTube Player oluşturulurken hata:", err);
      }
    };

  
  }, [location,playlist,videoSirasi,title,kapakFotografi,kullaniciAdiYok,loopAktif]);

  useEffect( () => {
    console.log(socket);
    if (!socket) return; //Socket bağlantısı yoksa veya kullanıcı adı girilmemişse bu useEffect durduruluyor
    if (kullaniciAdiYok) return;
    
      //Sunucudan gelen olayları dinleyen kodlar

      socket.on("odaOlusturuldu",data=>{
        setCookie("username",data.username,1);
        navigate(`/chat?oda=${data.oda}`);
        setOda(data.oda);
      })

      socket.on("odayaGirildi",data=>{
        setCookie("username",data.username,1);
        navigate(`/chat?oda=${data.oda}`);
        setOda(data.oda);

      })


      socket.on("url_al", (data) => { //Sonradan odaya giren kişiye odadaki diğer kişilerden gelen bilgiler alınıyor
        if(data.hedefID){
          setVideoSirasi(data.videoSirasi);
          setPlaylist(data.playlist);
          setTitle(data.basliklar);
          setKapakFotografi(data.kapaklar);
          setLoopAktif(data.loop);
          
          if (playerInstance.current && data.videoID) { //Odada herhangi bir video oynuyorsa video başlatılıyor
            console.log(videoIdRef.current);
            playerInstance.current.loadVideoById({
              videoId: data.videoID,       
              startSeconds: data.saniye+0.7,
            });
          }
        }
        else{
          setVideoSirasi(data.videoSirasi);
          videoyuAc(data.x);
        }
        
        
      });

      socket.on("gonderPlaylist",data=>{ //Bir kişi video eklediğinde playlist odadaki kişiler için güncelleniyor
        setPlaylist(data.playlist);
        setTitle(data.basliklar);
        setKapakFotografi(data.kapaklar); 
      })
      


      socket.on("temizlePlaylist",()=>{
        setPlaylist([]);
        setKapakFotografi([]);
        setTitle([]);
      })

      socket.on("kaldir_Playlistten",data=>{
        setPlaylist(data.yeniPlaylist);
        setTitle(data.basliklar);
        setKapakFotografi(data.kapaklar); 
      })

      socket.on("katildi",data=>{
        mesajGoster("Odaya Katıldı",data.kullanici);   
        socket.emit("getUsersInRoom",getCookie("oda"),(users)=>{
          setOdadakiKullanicilar(users);
        });

      })
      socket.on("odadanAyrildi",data=>{
        mesajGoster("Odadan Ayrıldı",data);   
        socket.emit("getUsersInRoom",getCookie("oda"),(users)=>{
          setOdadakiKullanicilar(users);
        });
      })

      socket.on("yeniKatilana_gonder", (hedefID) => { //Yeni katılan kişiye odadaki kişiler tarafından playlist gönderiliyor
        socket.emit("url_gonder", {
          playlist: playlistRef.current,
          videoSirasi: videoSirasiRef.current,
          oda,
          hedefID,
          basliklar: titleRef.current,
          kapaklar: kapakFotografiRef.current,
          saniye: playerInstance.current.getCurrentTime(),
          videoID: videoIdRef.current,
          loop: loopAktifRef.current,
        });
      });
      
      //Sunucudan aşağıdaki eventler gelirse gerekli işlemler yapılıyor
      socket.on("durdur_Video",()=>{
        setVideoOynuyormu(false);
        playerInstance.current.pauseVideo();
      });

      socket.on("baslat_Video",()=>{
        setVideoOynuyormu(true);
        playerInstance.current.playVideo();
      });

      socket.on("geriSar_video",()=>{
        geriSar();
      });


      socket.on("ileriSar_video",()=>{
        ileriSar();
      });

      //Bir kişi videoyu ileri sardığında saniye bilgisi sunucu üzerinden odadaki kişilere aktarılıyor
      socket.on("guncelleSaniye",(data)=>{
        const player = playerInstance.current;
        if(player){
          player.seekTo((data.yeniSaniye),true);
          setVideoYuzde({ width: `${data.yeniYuzde * 100}%` });
        }
      })
      socket.on("video_hiziDegistir",(data)=>{
        videoHizi(data.hiz);
      })

      socket.on("acLoop",()=>{
        setLoopAktif(true);
      });

      socket.on("kapaLoop",()=>{
        setLoopAktif(false);
      })
      
      socket.on("mesaj_al",data=>{
        mesajGoster(data.x,data.kullanici);
      });

      //Odanın sahibi herhangi bir kişinin yetkisin kaldırırsa aşağıdaki olaylar yetkisi kaldırılan kişi üzerinde çalışıyor
      socket.on("kaldirYetkiPlaylist",async (data)=>{
        const response = await fetch('http://localhost:3001/remove-playlist-permission',{
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username: data.username }),
          credentials: 'include'
        });
        
        var veri=await response.json() //Yeni tokenin gelmesi bekleniyor
        socket.emit("yeniToken",veri) //Yeni token sunucuya gönderiliyor ve odadaki kullanıcıların tutulduğu dizide yetkiler tokendeki yetkilere göre düzenleniyor
        socket.emit("getUsersInRoom",getCookie("oda"),(users)=>{ //Odadaki kullanıcılar dizisini yeni yetki bilgileriyle beraber güncelliyor
          setOdadakiKullanicilar(users);
        });

      });
      socket.on("verYetkiPlaylist",async (data)=>{
        const response = await fetch('http://localhost:3001/give-playlist-permission',{
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username: data.username }),
          credentials: 'include'
        });
        
        var veri=await response.json()
        socket.emit("yeniToken",veri)
        socket.emit("getUsersInRoom",getCookie("oda"),(users)=>{
          setOdadakiKullanicilar(users);
        });
        

      });
      socket.on("kaldirYetkiVideoControls",async (data)=>{
        const response = await fetch('http://localhost:3001/remove-videoControls-permission',{
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username: data.username }),
          credentials: 'include'
        });
        
        var veri=await response.json()
        socket.emit("yeniToken",veri)
        socket.emit("getUsersInRoom",getCookie("oda"),(users)=>{
          setOdadakiKullanicilar(users);
        });

      });
      socket.on("verYetkiVideoControls",async (data)=>{
        const response = await fetch('http://localhost:3001/give-videoControls-permission',{
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username: data.username }),
          credentials: 'include'
        });
        
        var veri=await response.json()
        socket.emit("yeniToken",veri)
        socket.emit("getUsersInRoom",getCookie("oda"),(users)=>{
          setOdadakiKullanicilar(users);
        });

      });




      return () => {
        socket.off("url_al");
        socket.off("baslat_Video");
        socket.off("durdur_Video");
        socket.off("geriSar_video");
        socket.off("ileriSar_video");
        socket.off("guncelleSaniye");
        socket.off("mesaj_al");
        socket.off("katildi");
        socket.off("yeniKatilana_gonder");
        socket.off("gonderPlaylist");
      };
  
  }, [socket,kullaniciAdiYok]);


  //Gelen video id sine karşılık gelen videoyu başlatıyor
  const videoyuAc = (x) => {
    setUrl(x);
    const id = extractVideoId(x);
    if (id) {
      setVideoId(id);
      if (playerInstance.current) {
        playerInstance.current.loadVideoById({
          videoId: id,
          suggestedQuality: 'hd1080'
        });
      }
    } else {
      alert("Geçerli bir YouTube URL’si giriniz.");
    }
  };

  //Playlistten herhangi bir video seçildiğinde video sırası güncelleniyor ve playlistten o video sırasına karşılık gelen video açılıyor.
  const videoSec = (x) => {
    setVideoSirasi((prevSirasi) => {
      const yeniSira = x;
      videoyuAc(playlist[yeniSira]);
      socket.emit("url_gonder", { oda, x: playlist[yeniSira], videoSirasi: yeniSira }); //Oda bilgisi, açılan videonun id'si ve video sırası sunucu üzerinden odada ki diğer kişilere gönderiliyor
      return yeniSira;
    });
  };

  const videoEkle = async (link) => { //Playliste video ekleme fonksiyonu
    const yetkiVarMi = await new Promise((resolve) => { //Kullanıcının video ekleme yetkisi var mı diye kontrol ediliyor
        socket.emit("yetki_kontrolPlaylist",(izinVar) => {
          resolve(izinVar);
        });
      });
      console.log("yetki: "+yetkiVarMi);
      if(!yetkiVarMi){
        console.log("yetkin yok!");
        return;
      }
      
      const { title: yeniBaslik, thumbnail: yeniKapak } = await baslikCek(link); //Url üzerinden videonun kapak fotoğrafı ve başlık bilgisi çekiliyor
      setPlaylist((prev) => {//Yeni video playliste ekleniyor.
        const updatedPlaylist = [...prev, link];
        const updatedTitles = [...title, yeniBaslik];
        const updatedThumbnails = [...kapakFotografi, yeniKapak];

        setTitle(updatedTitles);
        setKapakFotografi(updatedThumbnails);

        socket.emit("playlistGonder", { //Bilgiler sunucu üzerinden odaya gönderiliyor
          playlist: updatedPlaylist,
          oda,
          basliklar: updatedTitles,
          kapaklar: updatedThumbnails
        });
        return updatedPlaylist;
      });

  };
  
  const baslikCek = async (link) => {
      const videoId = extractVideoId(link);
      if (!videoId) return;
      const apiUrl = `https://www.googleapis.com/youtube/v3/videos?id=${videoId}&key=${YOUTUBE_API_KEY}&part=snippet`;

      try {
        const response = await fetch(apiUrl);
        const data = await response.json();
        const videoTitle = data.items[0]?.snippet?.title || "Başlık bulunamadı";
        const thumbnailUrl = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
        
        return { title: videoTitle, thumbnail: thumbnailUrl };
      } catch (error) {
        console.error("Başlık alınamadı:", error);
        setTitle("Hata oluştu");
      }
    };


  const playPauseVideo = () => {
    
    if (playerInstance.current) {
      const state = playerInstance.current.getPlayerState();
      if (state === window.YT.PlayerState.PLAYING) {
        setVideoOynuyormu(false);
        socket.emit("videoDurdur",oda); //Videonun durdurulduğu bilgisi sunucu üzerinden diğer kişilere gidiyor
        playerInstance.current.pauseVideo();
        
      } else if(state === window.YT.PlayerState.PAUSED) {
        setVideoOynuyormu(true);
        socket.emit("videoBaslat",oda);
        playerInstance.current.playVideo();
      }
    }
  };

  const geriSar = () => { //Video başa sarılıyor
    if(playerInstance.current){
      playerInstance.current.seekTo(0, true);
      setVideoYuzde({
        width: '0%'
      });
    }
  }

  const ileriSar = () => { //Video sona sarılıyor
    
    if(playerInstance.current){
      playerInstance.current.seekTo((playerInstance.current.getDuration()), true);
      setVideoYuzde({
        width: '100%'
      });
    }
  }
  const sesiKapat=()=>{
    const player = playerInstance.current;
    if(player){
      if(player?.isMuted()){
        player.unMute();
      }
      else player.mute()
    }
  }
  const videoHizi=(hiz)=>{
    const player = playerInstance.current;
    if(player){
      player.setPlaybackRate(hiz);
      setVideoHiz(hiz);
    }
  }

  const playlistTemizle = async () => {
    const yetkiVarMi = await new Promise((resolve) => {
        socket.emit("yetki_kontrolPlaylist",(izinVar) => {
          resolve(izinVar);
        });
      });
      console.log("yetki: "+yetkiVarMi);
      if(!yetkiVarMi){
        console.log("yetkin yok!");
        return;
      }
    setPlaylist([]);
    setKapakFotografi([]);
    setTitle([]);
    socket.emit("playlistTemizle",{oda :getCookie("oda")});
  }

  const kaldir =async (x) => {
    const yetkiVarMi = await new Promise((resolve) => {
        socket.emit("yetki_kontrolPlaylist",(izinVar) => {
          resolve(izinVar);
        });
      });
      console.log("yetki: "+yetkiVarMi);
      if(!yetkiVarMi){
        console.log("yetkin yok!");
        return;
      }
    const yeniPlaylist=[...playlist];
    const basliklar = [...title];
    const kapaklar=[...kapakFotografi];
    yeniPlaylist.splice(x,1);
    basliklar.splice(x,1)
    kapaklar.splice(x,1)
    socket.emit("playlistten_Kaldir",{yeniPlaylist,basliklar,oda :getCookie("oda"),kapaklar});
    setPlaylist(yeniPlaylist);
    setTitle(basliklar);
    setKapakFotografi(kapaklar);

  }
  

  const ilerlemeCubugu_click = async (e) => { //Videoyu ilerleme çubuğunda tıklanan saniyeye getiriyor
    const ilerlemeCubugu_Alani = e.currentTarget;
    const yetkiVarMi = await new Promise((resolve) => {
      socket.emit("yetki_kontrolVideoControls",(izinVar) => {
        resolve(izinVar);
      });
    });
    console.log("yetki: "+yetkiVarMi);
    if(!yetkiVarMi){
      console.log("yetkin yok!");
      return;
    }
    
    const rect = ilerlemeCubugu_Alani.getBoundingClientRect();
    const clickLocation = e.clientX - rect.left;
    const width = rect.width;
    const yeniYuzde = clickLocation / width;

    const player = playerInstance.current;
    if (player && player.getDuration) {
      const yeniSaniye = player.getDuration() * yeniYuzde;
      player.seekTo(yeniSaniye, true);
      setSuankiZaman(saniyeyiCevir(yeniSaniye));
      socket.emit("saniyeGuncelle",{oda,yeniSaniye,yeniYuzde});
      setVideoYuzde({ width: `${yeniYuzde * 100}%` });
    }
 
  }

  const tamEkranYap = () => {
    const elem = document.querySelector(".kutu"); 

    if (!document.fullscreenElement) {
      if (elem.requestFullscreen) {
        elem.requestFullscreen();
      } else if (elem.webkitRequestFullscreen) {
        elem.webkitRequestFullscreen();
      } else if (elem.msRequestFullscreen) {
        elem.msRequestFullscreen();
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      } else if (document.webkitExitFullscreen) {
        document.webkitExitFullscreen();
      } else if (document.msExitFullscreen) {
        document.msExitFullscreen();
      }
    }
  };

  const sesAyarla=(e)=>{
    setVolume(parseInt(e.target.value));
  }

  useEffect(() => {
    const player=playerInstance.current;
    if (player && player.setVolume) {
      player.setVolume(volume);
    }
  }, [volume]);
    
 

  const mesajGoster = (message, kullanici) => { //Sohbet penceresinde mesaj gösterme
    setMesajlar(prev => [...prev, { kullanici, message }]);
  };

  useEffect(() => { //Herhangi bir yeni mesaj geldiği zaman sohbet penceresini aşağıya kaydırma
    if (mesajListesiRef.current) {
      mesajListesiRef.current.scrollTop = mesajListesiRef.current.scrollHeight;
    }
  }, [mesajlar]);

  const mesajGonder=(x)=>{ //Mesaj gönderme fonksiyonu
    if(x){
      
      if(!urlMi(x)){ //Mesajın url olup olmadığı kontrol ediliyor
        const kullanici=getCookie("username");
        mesajGoster(x,kullanici);
        setMesaj("");
        socket.emit("mesaj_gonder",{x,oda :getCookie("oda"),kullanici});//Mesajı gönderen ve mesaj içeriği sunucu üzerinden herkese gönderiliyor
      }else{
        setUrl(x);
        videoEkle(x);
        setMesaj("");
      }
    };
  }

  const odadanAyril = async ()=>{
    const response = await fetch('http://localhost:3001/odadan-cik', {
      method: 'POST',
      credentials: 'include'
    })
    await response.json(); //HTTP only token cookie'si siliniyor

    socket.emit("odadan_ayril",{oda :getCookie("oda"),kullanici: getCookie("username")});//Odadan ayrılındığı bilgisi diğer kullanıcılara gidiyor
    document.cookie = "username=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;"; //Cookieler siliniyor
    document.cookie = "oda=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
    socket.disconnect();
    window.location.href = "/";

  }

  const kullanicilarGoster = () => {
    setKullanicilarVisible(!kullanicilarVisible);
    if (!kullanicilarVisible) {
      socket.emit("getUsersInRoom",getCookie("oda"),(users)=>{
        setOdadakiKullanicilar(users);
      });
    }
  }
  const playlistYetkiToggle = async (data)=>{
    
    const yetkiVarMi = await new Promise((resolve) => {
      socket.emit("yetki_kontrolOwner",(izinVar) => {
        resolve(izinVar);
      });
    });
    console.log("yetki: "+yetkiVarMi);
    if(!yetkiVarMi){
      console.log("yetkin yok!");
      return;
    }
    const user=odadakiKullanicilar[data.index];
    if(!user.yetkiPlaylist){
      setOdadakiKullanicilar((prevUsers) => {
        const updatedUsers = [...prevUsers];
        updatedUsers[data.index].yetkiPlaylist = true;
        return updatedUsers;
      });
      const username=data.username;
      const id=data.id;
      socket.emit("yetki_verPlaylist",{username,id});
      
    }
    else{
      setOdadakiKullanicilar((prevUsers) => {
        const updatedUsers = [...prevUsers];
        updatedUsers[data.index].yetkiPlaylist = false;
        return updatedUsers;
      });
      
      const username=data.username;
      const id=data.id;
      socket.emit("yetki_kaldirPlaylist",{username,id});
    }
  }
  const videoControlsYetkiToggle = async (data)=>{
    const yetkiVarMi = await new Promise((resolve) => {
      socket.emit("yetki_kontrolOwner",(izinVar) => {
        resolve(izinVar);
      });
    });
    console.log("yetki: "+yetkiVarMi);
    if(!yetkiVarMi){
      console.log("yetkin yok!");
      return;
    }
    const user=odadakiKullanicilar[data.index];
    if(!user.yetkiVideoControls){
      setOdadakiKullanicilar((prevUsers) => {
        const updatedUsers = [...prevUsers];
        updatedUsers[data.index].yetkiVideoControls =true;
        return updatedUsers;
      });
      
      const username=data.username;
      const id=data.id;
      socket.emit("yetki_verVideoControls",{username,id});
      
    }
    else{
      setOdadakiKullanicilar((prevUsers) => {
        const updatedUsers = [...prevUsers];
        updatedUsers[data.index].yetkiVideoControls =false;
        return updatedUsers;
      });
      const username=data.username;
      const id=data.id;
      socket.emit("yetki_kaldirVideoControls",{username,id});
    }
    
    
  }

  const kullaniciAdiAl = (e) =>{ //Bu fonksiyon odaya url üzerinden giriş yapanlar için kullanıcı adı alıyor

    setCookie("username",e,1);
    setKullaniciAdiYok(false);
    odaKatil(getCookie("oda"),getCookie("username"));


  }

  const davetPenceresiAc = () => {
    setDavetPenceresiVisible(true);
  };

  const davetPenceresiKapat = () => {
    setDavetPenceresiVisible(false);
    setCopySuccess(false);
  };

  // Link kopyalama fonksiyonu
  const linkKopyala = async () => {
    try {
      const currentUrl = window.location.href;
      await navigator.clipboard.writeText(currentUrl);
      setCopySuccess(true);
      
      setTimeout(() => {
        setCopySuccess(false);
      }, 2000);
    } catch (err) {
      console.error('Kopyalama başarısız:', err);
      const textArea = document.createElement('textarea');
      textArea.value = window.location.href;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopySuccess(true);
      
      setTimeout(() => {
        setCopySuccess(false);
      }, 2000);
    }
  };
  

  const döngü = ()=>{
    setLoopAktif(!loopAktif);
    if(!loopAktifRef.current){
      socket.emit("loopAc",getCookie("oda"));
      console.log("accc");
    }else{
      console.log("Kapaaa");
      socket.emit("loopKapa",getCookie("oda"));
    }
  }




return (
    <Routes>
      <Route
        path="/"
        element={
          <HomePage
            oda={oda}
            setOda={setOda}
            kullaniciAdi={kullaniciAdi}
            setKullaniciAdi={setKullaniciAdi}
            socket={socket}
            odaOlustur={odaOlustur}
            odaKatil={odaKatil}
            setKullaniciAdiYok={setKullaniciAdiYok}
          />
        }
      />
      <Route
        path="/chat"
        element={
          <div className="App">      
          {kullaniciAdiYok && (
              <div className="username-overlay">
                <div className="username-modal">
                  <h2>Kullanıcı Adı Girin</h2>
                  <input
                    type="text"
                    value={kullaniciAdi}
                    onChange={(e) => setKullaniciAdi(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && kullaniciAdi.trim()) {
                        kullaniciAdiAl(e);
                      }
                    }}
                    placeholder="Kullanıcı adınızı girin..."
                    autoFocus
                  />
                  <button 
                    onClick={() => {
                      if (kullaniciAdi.trim()) {
                        kullaniciAdiAl(kullaniciAdi);
                        
                      }
                    }}
                  >
                    Devam Et
                  </button>
                </div>
              </div>
            )}  
                {davetPenceresiVisible && (
                  <div className="davet-overlay" onClick={davetPenceresiKapat}>
                    <div className="davet-modal" onClick={(e) => e.stopPropagation()}>
                      <h2>Arkadaşlarını Davet Et</h2>
                      <p>Bu linki paylaşarak arkadaşlarının odaya katılmasını sağla:</p>
                      
                      <div className="link-container">
                        <input
                          type="text"
                          value={window.location.href}
                          readOnly
                          className="link-input"
                          onClick={(e) => e.target.select()}
                        />
                        <button 
                          className={`copy-button ${copySuccess ? 'copied' : ''}`}
                          onClick={linkKopyala}
                        >
                          {copySuccess ? '✓ Kopyalandı' : 'Kopyala'}
                        </button>
                      </div>

                      <div className="modal-actions">
                        <button className="close-button" onClick={davetPenceresiKapat}>
                          Kapat
                        </button>
                      </div>

                      <div className={`success-message ${copySuccess ? 'show' : ''}`}>
                        Link başarıyla kopyalandı!
                      </div>
                    </div>
                  </div>
                )}  

            <div className="content-wrapper">
              <div className="left-panel">
                <div className="kutu" ref={fullScreenContainerRef}>
                  <div className="wrapper">
                    <VideoControls 
                      socket={socket}
                      videoOynuyormu={videoOynuyormu} 
                      playPauseVideo={playPauseVideo}
                      videoYuzde={videoYuzde}
                      geriSar={geriSar}
                      ileriSar={ileriSar}
                      ilerlemeCubugu_click={ilerlemeCubugu_click}
                      suankiZaman={suankiZaman}
                      videoSuresi={videoSuresi}
                      anlikSure={anlikSure}
                      fareHareketi={fareHareketi}
                      anlikSureKonumu={anlikSureKonumu}
                      sesiKapat={sesiKapat}
                      videoHizi={videoHizi}
                      videoHiz={videoHiz}
                      oda={oda}
                      tamEkranYap={tamEkranYap}
                      sesAyarla={sesAyarla}
                      volume={volume}
                      döngü={döngü}
                      loopAktif={loopAktif}
                      setLoopAktif={setLoopAktif}
                    />
                  </div>
                  <div ref={playerRef} className="video-player"></div>
                </div>
                
              </div>
              
              <div className="right-panel">
                <div className="playlist-container">
                  <div class="playlist-header">
                  
                  <h3>Playlist</h3><button onClick={playlistTemizle}>Playlist Temizle</button></div>
                  <div className='video-listesi'>
                    {playlist.map((url, index) => (
                      <div key={index} className="video-item">
                        <div className="thumbnail-section" onClick={() => videoSec(index)}>
                          <img src={kapakFotografi[index]} alt="Video Thumbnail" />
                        </div>
                        <div className="video-details">
                          <div className="video-title" onClick={() => videoSec(index)}>
                            {title[index]}
                          </div>
                        </div>
                        {/* Delete button now positioned absolutely */}
                        <button className="delete-button" onClick={() => kaldir(index)}>X</button>
                      </div>
                    ))}
                  </div>
                </div>

                
                <div className="chat-container">
                  <div className='oda-basligi'>
                    <button className="davet-button" onClick={davetPenceresiAc}>Davet Et</button>
                    <div className="oda-controls">
                      <button onClick={kullanicilarGoster}>
                        {kullanicilarVisible ? '💬' : '👥'}
                      </button>
                      <button onClick={odadanAyril}>Odadan Ayrıl</button>
                    </div>
                  </div>
                  
                  {kullanicilarVisible && (
                    <div className="kullanicilar-paneli-content">
                    
                      <div className="kullanicilar-listesi">
                        {odadakiKullanicilar.map((kullanici, index) => (
                          <div key={index} className="kullanici-item">
                            <span className="kullanici-adi">{kullanici.username}</span>
                            <div className="kullanici-controls">
                              <div className="yetki-label">
                                <span className="yetki-text">Playlist</span>
                                <label className="switch">
                                  <input 
                                    type="checkbox" 
                                    checked={kullanici.yetkiPlaylist} 
                                    onChange={() => playlistYetkiToggle({ 
                                      username: kullanici.username, 
                                      id: kullanici.id, 
                                      index 
                                    })}
                                  />
                                  <span className="slider round"></span>
                                </label>
                              </div>
                              <div className="yetki-label">
                                <span className="yetki-text">Video</span>
                                <label className="switch">
                                  <input 
                                    type="checkbox" 
                                    checked={kullanici.yetkiVideoControls} 
                                    onChange={() => videoControlsYetkiToggle({ 
                                      username: kullanici.username, 
                                      id: kullanici.id, 
                                      index 
                                    })}
                                  />
                                  <span className="slider round"></span>
                                </label>
                              </div>
                            </div>
                          </div>
                        ))}
                        {odadakiKullanicilar.length === 0 && (
                          <div className="bos-kullanici">Henüz kimse yok</div>
                        )}
                      </div>
                    </div>
                  )}
                      <div className="mesaj-listesi" ref={mesajListesiRef} >
                          {mesajlar.map((msg, i) => (
                            <div key={i}>
                              <span style={{ fontWeight: "bold" }}>{msg.kullanici}: </span>
                              <span>{msg.message}</span>
                            </div>
                          ))}
                      </div>
                      <div className="gonder-paneli">
                        <input
                          type="text"
                          value={mesaj}
                          onChange={(e) => setMesaj(e.target.value)}
                          onKeyDown={(e) => e.key === "Enter" && mesajGonder(mesaj)}
                          placeholder="Mesaj veya URL gir..."
                        />
                        <button onClick={() => mesajGonder(mesaj)}>Gönder</button>
                      </div>
                </div>
              </div>
            </div>
          </div>
        }
      />
    </Routes>
  );
}

export default App;
