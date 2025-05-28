import React, { useState } from 'react';

const VideoControls = ({ 
    socket,
    videoOynuyormu, 
    playPauseVideo, 
    videoYuzde, 
    geriSar, 
    ileriSar, 
    ilerlemeCubugu_click, 
    videoSuresi, 
    suankiZaman,
    anlikSure,
    fareHareketi,
    anlikSureKonumu,
    sesiKapat,
    videoHizi,
    videoHiz,
    oda,
    tamEkranYap,
    sesAyarla,
    volume
}) => {
    const [isMuted, setIsMuted] = useState(false);

    const yetkiKontrol_videoControls=()=>{
        return new Promise((resolve) => {
            socket.emit("yetki_kontrolVideoControls", resolve);
        });
    }

    const durdurBaslat_butonu = async () => {
        const yetki = await yetkiKontrol_videoControls();
        if(!yetki){
            console.log("yetkin yok!");
            return;
        }
        socket.emit("video_baslatDurdur", oda);
        playPauseVideo();
    }

    const geriSarma_butonu = async () => {
        const yetki = await yetkiKontrol_videoControls();
        if(!yetki){
            console.log("yetkin yok!");
            return;
        }
        socket.emit("video_geriSar", oda);
        geriSar();
    }

    const ileriSarma_butonu = async () => {
        const yetki = await yetkiKontrol_videoControls();
        if(!yetki){
            console.log("yetkin yok!");
            return;
        }
        socket.emit("video_ileriSar", oda);
        ileriSar();
    }

    const cubuk_tiklama = async (e) => {
        const yetki = await yetkiKontrol_videoControls();
        if(!yetki){
            console.log("yetkin yok!");
            return;
        }
        ilerlemeCubugu_click(e);
    }
    
    const hareket = (e) => {
        fareHareketi(e);
    }
    
    const sustur = () => {
        setIsMuted(!isMuted);
        sesiKapat();
    }
    
    const handleVolumeChange = (e) => {
        sesAyarla(e);
    }
    
    const hizDegistir = async (hiz) => {
        const yetki = await yetkiKontrol_videoControls();
        if(!yetki){
            console.log("yetkin yok!");
            return;
        }
        socket.emit("videoHizi_degistir", {hiz, oda});
        videoHizi(hiz);
    }

    return (
        <>
            <div className="video-timeline">
                <div className="progress-area" onClick={cubuk_tiklama} onMouseMove={hareket}>
                    <span style={anlikSureKonumu}>{anlikSure}</span>
                    <div className="progress-bar" style={videoYuzde}></div>
                </div>
            </div>

            <ul className="video-controls">
                <li className="options left">
                    <button className="skip-backward" onClick={geriSarma_butonu}><i className="fas fa-backward"></i></button>
                    <button className="play-pause" onClick={durdurBaslat_butonu}>
                        {videoOynuyormu ? <i className="fas fa-pause"></i> : <i className="fas fa-play"></i>}
                    </button>
                    <button className="skip-forward" onClick={ileriSarma_butonu}><i className="fas fa-forward"></i></button>
                    
                    <div className="volume-wrapper">
                        <button className="volume" onClick={sustur}>
                            <i className={isMuted || volume===0 ? "fa-solid fa-volume-xmark" : "fa-solid fa-volume-high"}></i>
                        </button>
                        <div className="volume-container">
                            <input 
                                type="range" 
                                min="0" 
                                max="100" 
                                step="1" 
                                value={volume}
                                onChange={handleVolumeChange}
                                className="volume-slider" 
                            />
                        </div>
                    </div>
                </li>

                <li className="options right">
                    <div className="video-timer">
                        <p className="current-time">{suankiZaman}</p>
                        <p className="separator">/</p>
                        <p className="video-duration">{videoSuresi}</p>
                    </div>
                    <div className="playback-content">
                        <button className="playback-speed">
                            <span className="material-symbols-rounded">slow_motion_video</span>
                        </button>
                        <ul className="speed-options">
                            <li onClick={() => hizDegistir(2)} className={videoHiz === 2 ? "active" : ""}>2x</li>
                            <li onClick={() => hizDegistir(1.5)} className={videoHiz === 1.5 ? "active" : ""}>1.5x</li>
                            <li onClick={() => hizDegistir(1)} className={videoHiz === 1 ? "active" : ""}>1x</li>
                            <li onClick={() => hizDegistir(0.75)} className={videoHiz === 0.75 ? "active" : ""}>0.75x</li>
                            <li onClick={() => hizDegistir(0.5)} className={videoHiz === 0.5 ? "active" : ""}>0.5x</li>
                        </ul>
                    </div>
                    
                    <button className="skip-fullscreen" onClick={tamEkranYap}><i className="fa-solid fa-expand"></i></button>
                </li>
            </ul>
        </>
    );
};

export default VideoControls;