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


  const videoOynuyormuRef=useRef(videoOynuyormu);
  const fullScreenContainerRef = useRef(null);
  const location = useLocation();
  const navigate = useNavigate();
  const playlistRef = useRef(playlist);
  const videoSirasiRef = useRef(videoSirasi);
  const titleRef = useRef(title);
  const kapakFotografiRef=useRef(kapakFotografi);
  const videoIdRef=useRef(videoId);
  const messageContainerRef = useRef(null);
  const playerRef = useRef(null);
  const playerInstance = useRef(null);
  const ilerlemeIntervalRef = useRef(null); // İlerleme çubuğu için ayrı bir interval referansı
  const zamanIntervalRef = useRef(null); // Video zamanı için ayrı bir interval referansı


  const odaOlustur = async (kullaniciAdi)=> {
    console.log(kullaniciAdi);
    const response = await fetch('http://192.168.1.171:3001/create-room', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ kullaniciAdi }),
      credentials: 'include' 
    });

    await response.json();

    
    sockett = io("http://192.168.1.171:3001",{
      withCredentials: true
    }); 

    const odaid = Math.random().toString(36).substr(2, 9);
    sockett.emit("oda_olustur",{odaid,kullaniciAdi});

    setSocket(sockett);

    
  }

  const odaKatil = async (e,kullaniciAdi)=> {
    const response = await fetch('http://192.168.1.171:3001/join-room', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ e,kullaniciAdi }),
      credentials: 'include'
    });

    await response.json();
    
    sockett = io("http://192.168.1.171:3001",{
      withCredentials: true
    }); 
    
    sockett.emit("odaya_gir",{e,kullaniciAdi});

    setSocket(sockett);
  }


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

  // 🧩 YouTube video ID çıkarma fonksiyonu
  const extractVideoId = (url) => {
    const regex = /(?:youtube\.com\/.*v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/;
    const match = url.match(regex);
    return match ? match[1] : null;
  };


  useEffect(()=>{
    videoIdRef.current=videoId;
  },[videoId]);

  useEffect(() => { 


    // Sadece chat sayfasında çalışsın
    if (location.pathname === "/chat") {
      const params = new URLSearchParams(location.search);
      const urlOda = params.get("oda");
      if (urlOda) {
        setOda(urlOda);
      }
    }
  }, [location]);

  useEffect(()=>{
    videoOynuyormuRef.current=videoOynuyormu;
  },[videoOynuyormu])

  // 🔄 Videonun ilerleme yüzdesini güncelle
  const ilerlemeCubugu = () => {
    
    if (ilerlemeIntervalRef.current) clearInterval(ilerlemeIntervalRef.current);
    ilerlemeIntervalRef.current = setInterval(() => {
      if (playerInstance.current && playerInstance.current.getDuration) {
        const videoSaniyesi = playerInstance.current.getCurrentTime();
        const videoSuresi = playerInstance.current.getDuration();
        if (videoSuresi > 0) {
          const yuzde = (videoSaniyesi / videoSuresi) * 100;
          setVideoYuzde({ width: yuzde + '%' });
        }
      }
    }, 100);
  };

  // 🔄 Videonun süresini ve mevcut zamanını güncelle
  const videoZamani = () => {
    
    if (zamanIntervalRef.current) clearInterval(zamanIntervalRef.current);
    zamanIntervalRef.current = setInterval(() => {
      if (playerInstance.current && playerInstance.current.getDuration()) {
        const current = playerInstance.current.getCurrentTime();
        const duration = playerInstance.current.getDuration();
        
        setSuankiZaman(saniyeyiCevir(current));
        setVideoSuresi(saniyeyiCevir(duration));
        
      }

    }, 100);
  }
  

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
    
    if (location.pathname !== "/chat") return;


    videoSirasiRef.current = videoSirasi;
    playlistRef.current = playlist;
    kapakFotografiRef.current=kapakFotografi;
    titleRef.current=title;


    // YouTube API Script'i ekle
    if (!window.YT) {
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
                socket.emit("odaya_katildi",{kullanici:getCookie("username"),socketId: socket.id,oda},()=>{
                  socket.emit("url_cek",{oda,socketId: socket.id});
                });
              },
              onStateChange: (event) => {
                 
                if (event.data === window.YT.PlayerState.PLAYING) {
                  playerInstance.current.setPlaybackQuality("highres");
                  ilerlemeCubugu();
                  videoZamani();
                  
                } else if (
                  event.data === window.YT.PlayerState.PAUSED ||
                  event.data === window.YT.PlayerState.ENDED
                ) {   
                      clearInterval(ilerlemeIntervalRef.current);
                      clearInterval(zamanIntervalRef.current); 
                }
                if(event.data === window.YT.PlayerState.ENDED){
                    
                    setVideoSirasi((onceki) => {
                      const yeniVideoSirasi = onceki + 1; // Video sırasını artır
                      if(playlistRef.current[yeniVideoSirasi]){
                      videoyuAc(playlistRef.current[yeniVideoSirasi]);} // Yeni sıradaki videoyu oynat
                      return yeniVideoSirasi; // State'i güncelle
                    });  
                }
                if(event.data === window.YT.PlayerState.PAUSED){
                  if(videoOynuyormuRef.current===true){
                    playerInstance.current.playVideo();
                  }
                }
                if(event.data === window.YT.PlayerState.PLAYING){
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

  
  }, [location,playlist,videoSirasi,title,kapakFotografi]);

  useEffect( () => {
    console.log(socket);
    if (!socket) return;
    
      socket.on("odaOlusturuldu",data=>{
        console.log("çalışıyor");
        setCookie("username",data.username,1);
        navigate(`/chat?oda=${data.oda}`);
        setOda(data.oda);
      })

      socket.on("odayaGirildi",data=>{
        setCookie("username",data.username,1);
        navigate(`/chat?oda=${data.oda}`);
        setOda(data.oda);

      })

    // 📥 URL alındığında oynat
      socket.on("url_al", (data) => {
        if(data.hedefID){
          setVideoSirasi(videoSirasi);
          setPlaylist(data.playlist);
          setTitle(data.basliklar);
          setKapakFotografi(data.kapaklar);
          if (playerInstance.current && data.videoID) {
            console.log(videoIdRef.current);
            playerInstance.current.loadVideoById({
              videoId: data.videoID,       
              startSeconds: data.saniye+0.7,
            });
          }
        }
        else{
          setVideoSirasi(videoSirasi);
          videoyuAc(data.x);
        }
        
        
      });

      socket.on("gonderPlaylist",data=>{
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
        mesajGoster("Odaya Katıldı:",data.kullanici);    

      })

      socket.on("yeniKatilana_gonder", (hedefID) => {
        socket.emit("url_gonder", {
          playlist: playlistRef.current,
          videoSirasi,
          oda,
          hedefID,
          basliklar: titleRef.current,
          kapaklar: kapakFotografiRef.current,
          saniye: playerInstance.current.getCurrentTime(),
          videoID: videoIdRef.current,
        });
      });
      
      // ⏯ Video başlat/durdur komutu alındığında
      socket.on("baslatDurdur_video", () => {
        playPauseVideo();
      });

      socket.on("geriSar_video",()=>{
        geriSar();
      });


      socket.on("ileriSar_video",()=>{
        ileriSar();
      });

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
      
      socket.on("mesaj_al",data=>{
        mesajGoster(data.x,data.kullanici);
      });

      socket.on("kaldirYetkiPlaylist",async (data)=>{
        const response = await fetch('http://192.168.1.171:3001/remove-playlist-permission',{
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username: data.username }),
          credentials: 'include'
        });
        
        var data=await response.json()
        socket.emit("yeniToken",data)
        socket.emit("getUsersInRoom",oda,(users)=>{
          setOdadakiKullanicilar(users);
        });

      });
      socket.on("verYetkiPlaylist",async (data)=>{
        const response = await fetch('http://192.168.1.171:3001/give-playlist-permission',{
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username: data.username }),
          credentials: 'include'
        });
        
        var data=await response.json()
        socket.emit("yeniToken",data)
        socket.emit("getUsersInRoom",oda,(users)=>{
          setOdadakiKullanicilar(users);
        });
        

      });
      socket.on("kaldirYetkiVideoControls",async (data)=>{
        const response = await fetch('http://192.168.1.171:3001/remove-videoControls-permission',{
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username: data.username }),
          credentials: 'include'
        });
        
        var data=await response.json()
        socket.emit("yeniToken",data)
        socket.emit("getUsersInRoom",oda,(users)=>{
          setOdadakiKullanicilar(users);
        });

      });
      socket.on("verYetkiVideoControls",async (data)=>{
        const response = await fetch('http://192.168.1.171:3001/give-videoControls-permission',{
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username: data.username }),
          credentials: 'include'
        });
        
        var data=await response.json()
        socket.emit("yeniToken",data)
        socket.emit("getUsersInRoom",oda,(users)=>{
          setOdadakiKullanicilar(users);
        });

      });



      // 🔚 Temizlik
      return () => {
        socket.off("url_al");
        socket.off("baslatDurdur_video");
        socket.off("geriSar_video");
        socket.off("ileriSar_video");
        socket.off("guncelleSaniye");
        socket.off("mesaj_al");
        socket.off("katildi");
        socket.off("yeniKatilana_gonder");
        socket.off("gonderPlaylist");
      };
  
  }, [socket]);

  // 📤 Video URL gönderme ve oynatma
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

  const videoSec = (x) => {
    setVideoSirasi((prevSirasi) => {
      const yeniSira = x;
      videoyuAc(playlist[yeniSira]);
      socket.emit("url_gonder", { oda, x: playlist[yeniSira], videoSirasi: yeniSira });
      return yeniSira;
    });
  };

  const videoEkle = async (link) => {
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
      
      const { title: yeniBaslik, thumbnail: yeniKapak } = await baslikCek(link);
      setPlaylist((prev) => {
        const updatedPlaylist = [...prev, link];
        const updatedTitles = [...title, yeniBaslik];
        const updatedThumbnails = [...kapakFotografi, yeniKapak];

        setTitle(updatedTitles);
        setKapakFotografi(updatedThumbnails);

        socket.emit("playlistGonder", {
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

  // ⏯ Video oynat/duraklat
  const playPauseVideo = () => {
    
    if (playerInstance.current) {
      const state = playerInstance.current.getPlayerState();
      if (state === window.YT.PlayerState.PLAYING) {
        setVideoOynuyormu(false);
        playerInstance.current.pauseVideo();
        
      } else {
        setVideoOynuyormu(true);
        playerInstance.current.playVideo();
      }
    }
  };

  const geriSar = () => {
    if(playerInstance.current){
      playerInstance.current.seekTo(0, true);
      setVideoYuzde({
        width: '0%'
      });
    }
  }

  const ileriSar = () => {
    
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
    socket.emit("playlistTemizle",oda);
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
    socket.emit("playlistten_Kaldir",{yeniPlaylist,basliklar,oda,kapaklar});
    setPlaylist(yeniPlaylist);
    setTitle(basliklar);
    setKapakFotografi(kapaklar);

  }
  

  const ilerlemeCubugu_click = async (e) => {
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
    const elem = document.querySelector(".kutu"); // ya da playerRef.current.parentNode gibi

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

    
  const mesajGoster = (message,kullanici) => {
    const messageElement = document.createElement('div');
    const userSpan = document.createElement('span');
    userSpan.style.fontWeight = "bold";
    userSpan.textContent = kullanici + ": ";

    const msgSpan = document.createElement('span');
    msgSpan.textContent = message;

    messageElement.append(userSpan, msgSpan);
      if (messageContainerRef.current) {
        messageContainerRef.current.append(messageElement);
        messageContainerRef.current.scrollTop = messageContainerRef.current.scrollHeight;
      }
  };

  const mesajGonder=(x)=>{
    if(x!==""){
      
      if(!urlMi(x)){
        const kullanici=getCookie("username");
        mesajGoster(x,kullanici);
        setMesaj("");
        socket.emit("mesaj_gonder",{x,oda,kullanici});
      }else{
        setUrl(x);
        videoEkle(x);
        setMesaj("");
      }
    };
  }

  const odadanAyril = async ()=>{
    const response = await fetch('http://192.168.1.171:3001/odadan-cik', {
      method: 'POST',
      credentials: 'include'
    })
    await response.json();

    document.cookie = "username=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
    socket.emit("odadan_ayril",oda);
    socket.disconnect();
    setOda("");
    setKullaniciAdi("");
    setOdadakiKullanicilar([]);
    setPlaylist([]);
    setSocket(null);
    window.location.href = "/";

  }

  const kullanicilarGoster = () => {
    setKullanicilarVisible(!kullanicilarVisible);
    if (!kullanicilarVisible) {
      socket.emit("getUsersInRoom",oda,(users)=>{
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
           
          />
        }
      />
      <Route
        path="/chat"
        element={
          <div className="App">
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
                    />
                  </div>
                  <div ref={playerRef} className="video-player"></div>
                </div>
                
              </div>
              
              <div className="right-panel">
                <div className="playlist-container">
                  <h3>Playlist</h3><button onClick={playlistTemizle}>Playlist Temizle</button>
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
                    {oda} 
                    <div className="oda-controls">
                      <button onClick={kullanicilarGoster}>
                        {kullanicilarVisible ? '💬' : '👥'}
                      </button>
                      <button onClick={odadanAyril}>Odadan Ayrıl</button>
                    </div>
                  </div>
                  
                  {kullanicilarVisible ? (
                    <div className="kullanicilar-paneli-content">
                      <div className="kullanicilar-basligi">
                        <span>Odadaki Kullanıcılar</span>
                      </div>
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
                  ) : (
                    <>
                      <div className="mesaj-listesi" ref={messageContainerRef}></div>
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
                    </>
                  )}
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
