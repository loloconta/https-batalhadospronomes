const express=require("express");
const http=require("http");
const {Server}=require("socket.io");
const path=require("path");
const app=express(), server=http.createServer(app), io=new Server(server);
app.use(express.static(path.join(__dirname,"public")));
const rooms=new Map();
const qs=[
["Na frase “Ela trouxe o livro”, qual é o pronome?",["Ela","livro","trouxe","para"],0],
["Qual é um pronome possessivo?",["meu","casa","bonito","ontem"],0],
["Em “Aquele carro é novo”, qual é o pronome demonstrativo?",["carro","novo","Aquele","é"],2],
["Qual opção tem apenas pronomes pessoais?",["eu, tu, ele","meu, seu, nosso","este, essa, aquilo","quem, qual, que"],0],
["Complete: “___ livro é interessante.” (livro perto de quem fala)",["Este","Aquele","Quem","Meu"],0],
["Em “Nós estudamos”, qual é o pronome?",["estudamos","Nós","prova","para"],1],
["Em “Nossa turma venceu”, qual é o possessivo?",["turma","venceu","Nossa","competição"],2],
["Qual é um pronome indefinido?",["alguns","este","meu","eu"],0],
["Em “Quem chegou primeiro?”, “Quem” é pronome:",["pessoal","possessivo","interrogativo","demonstrativo"],2],
["“Pedro e Ana chegaram. ___ foram para a sala.”",["Eles","Nós","Eu","Aquele"],0],
["Em “O livro que comprei é ótimo”, qual é o pronome relativo?",["livro","comprei","que","ótimo"],2],
["Qual é um pronome de tratamento?",["Vossa Excelência","Eu","Este","Alguém"],0]
];
function code(){return Math.random().toString(36).slice(2,8).toUpperCase()}
function makeShips(){let s=new Set();while(s.size<3)s.add(Math.floor(Math.random()*25));return [...s]}
function publicState(r){return {players:r.players.map(p=>({name:p.name,ready:p.ready})),turn:r.turn,ships:r.players.map(p=>p.ships.length),question:r.question}}
io.on("connection",socket=>{
 socket.on("create",name=>{let c=code();while(rooms.has(c))c=code();rooms.set(c,{players:[{id:socket.id,name:name||"Jogador 1",ships:makeShips(),ready:true},{id:null,name:"Jogador 2",ships:[],ready:false}],turn:0,question:null});socket.join(c);socket.room=c;socket.player=0;socket.emit("created",c);io.to(c).emit("state",publicState(rooms.get(c)))});
 socket.on("join",({code,name})=>{let r=rooms.get((code||"").toUpperCase());if(!r)return socket.emit("errorMsg","Sala não encontrada.");if(r.players[1].id)return socket.emit("errorMsg","Essa sala já está cheia.");r.players[1]={id:socket.id,name:name||"Jogador 2",ships:makeShips(),ready:true};socket.join(code.toUpperCase());socket.room=code.toUpperCase();socket.player=1;r.question=qs[Math.floor(Math.random()*qs.length)];io.to(socket.room).emit("state",publicState(r));io.to(socket.room).emit("question",r.question)});
 socket.on("answer",idx=>{let r=rooms.get(socket.room);if(!r||r.players[1].id===null||r.turn!==socket.player)return;if(idx===r.question[2]){socket.emit("answerResult",{ok:true});io.to(socket.room).emit("canAttack",r.turn)}else{socket.emit("answerResult",{ok:false,correct:r.question[1][r.question[2]]});r.turn=1-r.turn;io.to(socket.room).emit("state",publicState(r));r.question=qs[Math.floor(Math.random()*qs.length)];io.to(socket.room).emit("question",r.question)}});
 socket.on("attack",idx=>{let r=rooms.get(socket.room);if(!r||r.turn!==socket.player)return;let enemy=1-r.turn,ships=r.players[enemy].ships;if(ships.includes(idx)){r.players[enemy].ships=ships.filter(x=>x!==idx);io.to(socket.room).emit("attackResult",{by:r.turn,idx,hit:true,ships:r.players[enemy].ships.length});if(!r.players[enemy].ships.length){io.to(socket.room).emit("win",r.turn);return}}else io.to(socket.room).emit("attackResult",{by:r.turn,idx,hit:false});r.turn=enemy;r.question=qs[Math.floor(Math.random()*qs.length)];io.to(socket.room).emit("state",publicState(r));io.to(socket.room).emit("question",r.question)});
 socket.on("disconnect",()=>{if(socket.room&&rooms.has(socket.room)){io.to(socket.room).emit("errorMsg","Um jogador saiu da sala.");rooms.delete(socket.room)}})
});
server.listen(process.env.PORT||3000);
