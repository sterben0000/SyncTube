const express = require('express');
const app= express();
const http = require("http");
const { Server } = require('socket.io');
const cors = require("cors");
const jwt = require('jsonwebtoken');
require('dotenv').config();
const cookie = require('cookie');
const cookieParser = require('cookie-parser');

const PORT=3000
app.use(cors({
  origin: 'http://192.168.1.170:3000',
  credentials: true
}));
app.use(express.json());
app.use(cookieParser());

const SECRET_KEY = process.env.SECRET_KEY;
const server = http.createServer(app);

app.post('/create-room',(req,res)=>{
    const { kullaniciAdi } = req.body;
    payload = {
            "username" : kullaniciAdi,
            "permissions" : ["owner"]
        }
    const token = jwt.sign(payload, SECRET_KEY, { expiresIn: '12h' });

    res.cookie('token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 3600000,
    });

    res.json({ message: 'Token cookie olarak set edildi' });

})

app.post('/join-room',(req,res)=>{
    const { oda,kullaniciAdi } = req.body;

    payload = {
        "username" : kullaniciAdi,
        "permissions" : ["videoControls","playlist"],
    }
    const token = jwt.sign(payload, SECRET_KEY, { expiresIn: '12h' });

    res.cookie('token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 3600000,
    });

    res.json({ message: 'Token cookie olarak set edildi' });

})

app.post('/remove-permission',(req,res)=>{
    const { username,yetki } = req.body;
    const eskiToken=req.cookies.token;
    const decoded=jwt.verify(eskiToken, SECRET_KEY);
    const yetkiler = decoded.permissions || [];
    const yeniYetkiler=yetkiler.filter(item => item !== yetki);

    payload = {
        "username" : username,
        "permissions" : yeniYetkiler
    }
    const token = jwt.sign(payload, SECRET_KEY, { expiresIn: '12h' });

    res.cookie('token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 3600000,
    });

    res.json(token);

})

app.post('/odadan-cik',(req,res)=>{
    res.cookie('token', '', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        expires: new Date(0), // Unix epoch time = geçmiş
    });
    res.json({ message: 'Token cookie olarak set edildi' });
})
app.listen(PORT, () => {
  console.log(`Sunucu ${PORT} portunda çalışıyor`);
});

const io = new Server(server, {
    cors: {
        origin: "http://192.168.1.170:3000",
        credentials: true
        
    }
})
function yetkiKaldir(tok,silinecekYetki,username){
    const decoded = jwt.verify(tok, SECRET_KEY);
    const yetkiler = decoded.permissions || [];
    const yeniYetkiler=yetkiler.filter(item => item !== silinecekYetki);

    payload = {
        "username" : username,
        "permissions" : yeniYetkiler,
     }
    return jwt.sign(payload, SECRET_KEY, { expiresIn: '12h' });

} 
function yetkiKaldir(tok,verilecekYetki,username){
    const decoded = jwt.verify(tok, SECRET_KEY);
    const yetkiler = decoded.permissions || [];
    yetkiler.push(verilecekYetki);

    payload = {
        "username" : username,
        "permissions" : yeniYetkiler,
     }
    return jwt.sign(payload, SECRET_KEY, { expiresIn: '12h' });

} 

io.use((socket, next) => {
  const cookies = socket.handshake.headers.cookie;
  if (!cookies) {
    return next(new Error("Cookie bulunamadı"));
  }

  const parsedCookies = cookie.parse(cookies);
  const token = parsedCookies.token;

  if (!token) {
    return next(new Error("Token cookie'si yok"));
  }


  socket.token = token; 
  next();
});

io.on("connection",(socket)=>{
    
    
    console.log(`User connected: ${socket.id}`);

    socket.on("getRooms", () => {
        const rooms = Array.from(io.sockets.adapter.rooms);
        const filtered = rooms.filter(([name, members]) => !io.sockets.sockets.get(name));
    });
    socket.on("getUsersInRoom", (roomName,cb) => {
        io.in(roomName).allSockets().then((socketIds) => {
            const users = [];
            socketIds.forEach((id) => {
                const s = io.sockets.sockets.get(id);
                users.push({
                    id: id,
                    username: s?.username || "(isimsiz)",
                });
            });
            cb(users);
        }).catch((err) => {
        console.error("Hata:", err);
        });
    });
    
    socket.on("oda_olustur",(data)=>{

        if(socket.currentRoom!=data.odaid){
            console.log(data);
            io.to(socket.id).emit("delete_Cookies");
            socket.leave(socket.currentRoom);
        }

        socket.username = data.kullaniciAdi;
        username=data.kullaniciAdi;  
        socket.join(data.odaid);
        oda=data.odaid;
        socket.currentRoom = oda;
        socket.emit("odaOlusturuldu", { oda,username });
        
    })
    socket.on("odaya_gir",data=>{

        if(socket.currentRoom!=data.e){
            console.log(data);
            io.to(socket.id).emit("delete_Cookies");
            socket.leave(socket.currentRoom);
        }
        
        socket.username = data.kullaniciAdi;  
        username=data.kullaniciAdi;
        socket.join(data.e);
        socket.currentRoom = data.e;
        socket.emit("odayaGirildi", { oda: data.e,username});

    })
    socket.on("odadan_ayril",data=>{

        socket.leave(data);
        console.log(`odadan ayrildi: ${socket.id}`)
    })
    socket.on("odaya_katildi",(data,cb)=>{
        
        socket.to(data.oda).emit("katildi",data);
        cb();
    })

    socket.on("url_cek",data=>{
        const hedefID=data.socketId;

        socket.to(data.oda).emit("yeniKatilana_gonder",hedefID);
    })

    socket.on("url_gonder",(data) => {
        if (data.hedefID) {
            io.to(data.hedefID).emit("url_al", data);
        }
        else{
            socket.to(data.oda).emit("url_al",data);
        }
    })

    socket.on("playlistGonder",data=>{
        socket.to(data.oda).emit("gonderPlaylist",data);
    })

    socket.on("playlistTemizle",data=>{
        socket.to(data).emit("temizlePlaylist");
    })

    socket.on("playlistten_Kaldir",data=>{
        socket.to(data.oda).emit("kaldir_Playlistten",data);
    })

    socket.on("video_baslatDurdur",(data)=>{
        socket.to(data).emit("baslatDurdur_video");
    })

    socket.on("video_geriSar",(data)=>{
        socket.to(data).emit("geriSar_video");
    })

    socket.on("video_ileriSar",(data)=>{
        socket.to(data).emit("ileriSar_video");
    })

    socket.on("saniyeGuncelle",(data)=>{
        socket.to(data.oda).emit("guncelleSaniye",data);
    })

    socket.on("videoHizi_degistir",(data)=>{
        socket.to(data.oda).emit("video_hiziDegistir",data);
    })

    socket.on("mesaj_gonder",(data)=>{
        console.log(data);
        socket.to(data.oda).emit("mesaj_al",{x: data.x,kullanici: data.kullanici});
    })

    socket.on("yetki_kontrol",(data,cb)=>{
        const token = socket.token;
        const decoded = jwt.verify(token, SECRET_KEY);
        const yetkiler = decoded.permissions || [];
        if(yetkiler.includes(data)|| yetkiler.includes("owner")){
            cb(true);
        }
        else{
            cb(false);
        }
    })

    socket.on("yetki_kaldir",(data)=>{
        const hedef=data.id;
        console.log("hedef: "+hedef)
        socket.to(hedef).emit("kaldirYetki",data);
    })
    socket.on("yeniToken",data=>{
        socket.token=data;
        console.log(socket.token);
    })



})


server.listen(3001,()=>{
    console.log("Server is running");
})