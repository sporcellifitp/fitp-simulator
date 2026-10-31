import http from 'node:http';
import https from 'node:https';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {networkInterfaces} from 'node:os';
import {WebSocketServer} from 'ws';
const root=path.resolve(fileURLToPath(new URL('../../site/',import.meta.url)));
// Indirizzi di rete del computer, i più probabili per il telefono prima: Wi-Fi ed Ethernet, poi il resto. Fuori le schede
// virtuali (WSL, Hyper-V, VirtualBox, VMware, Docker, VPN) e gli indirizzi automatici 169.254: un telefono non li raggiunge.
const VIRTUAL=/vethernet|virtualbox|vmware|vmnet|hyper-v|wsl|docker|vbox|tailscale|zerotier|hamachi|tap-|tun|wireguard|loopback|bluetooth/i;
export function rankAddresses(interfaces){
  const rank=(name,ip)=>(/wi-?fi|wlan|wireless|en0/i.test(name)?0:/ethernet|eth|en\d/i.test(name)?1:2)+(/^192\.168\./.test(ip)?0:/^10\./.test(ip)?.1:.2);
  const list=Object.entries(interfaces||{}).flatMap(([name,items])=>(items||[]).filter(a=>a.family==='IPv4'&&!a.internal&&!/^169\.254\./.test(a.address)&&!VIRTUAL.test(name)).map(a=>({ip:a.address,r:rank(name,a.address)})));
  return [...new Set(list.sort((a,b)=>a.r-b.r).map(a=>a.ip))];
}
export function lanAddresses(){let addresses={};try{addresses=networkInterfaces();}catch{}const ranked=rankAddresses(addresses);return ranked.length?ranked:[...new Set(Object.values(addresses).flatMap(items=>(items||[]).filter(a=>a.family==='IPv4'&&!a.internal).map(a=>a.address)))];}
export function createLanServer(options={}){
const tls=!!(options.cert&&options.key),port=Number(options.port??(tls?8443:8080));
const clients=new Map();
const status=()=>options.status?options.status():({ready:tls,message:tls?'Server HTTPS pronto.':'HTTP: solo test desktop. Per i sensori del telefono servono HTTPS e certificato attendibile.',addresses:lanAddresses(),urls:tls?lanAddresses().map(ip=>`https://${ip}:${server.address()?.port||port}/tennis/?lan=1`):[],registered:clients.size});
const mime={'.html':'text/html','.js':'text/javascript','.json':'application/json','.css':'text/css','.png':'image/png','.jpg':'image/jpeg','.svg':'image/svg+xml','.webp':'image/webp','.woff2':'font/woff2','.glb':'model/gltf-binary'};
const serve=(req,res)=>{
  let pathname;try{pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);}catch{res.writeHead(400).end();return;}
  if(pathname==='/lan/status'){res.writeHead(200,{'Content-Type':'application/json','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}).end(JSON.stringify(status()));return;}
  if(pathname==='/lan/'||pathname==='/lan'){res.writeHead(200,{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store','Content-Security-Policy':"default-src 'self'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'"});fs.createReadStream(fileURLToPath(new URL('./setup.html',import.meta.url))).pipe(res);return;}
  if(options.setupOnly){res.writeHead(302,{Location:'/lan/'}).end();return;}
  // Another game (e.g. natpf-tennis) can reuse TLS, /lan/status and /lan-signal with its own request handler.
  if(options.handler){options.handler(req,res);return;}
  if(pathname==='/'){res.writeHead(302,{Location:'/tennis/?lan=1'}).end();return;}
  const filename=pathname==='/js/vendor/three.module.js'?fileURLToPath(new URL('node_modules/three/build/three.module.js',import.meta.url)):path.resolve(root,'.'+pathname+(pathname.endsWith('/')?'index.html':''));
  if(pathname!=='/js/vendor/three.module.js'&&!filename.startsWith(root+path.sep)){res.writeHead(403).end();return;}
  fs.stat(filename,(error,stat)=>{if(error||!stat.isFile()){res.writeHead(404).end();return;}res.writeHead(200,{'Content-Type':mime[path.extname(filename)]||'application/octet-stream','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});fs.createReadStream(filename).pipe(res);});
};
const server=tls?https.createServer({cert:fs.readFileSync(options.cert),key:fs.readFileSync(options.key)},serve):http.createServer(serve);
// NATPF (31/10): keep-alive HTTP lungo. Con i 5 s di Node, dopo una pausa tra i punti il POST del lancio o del colpo del
// computer del P2 apriva spesso una connessione TLS nuova (due andate e ritorno in Wi-Fi e una firma TLS sul PC).
server.keepAliveTimeout=65000;server.headersTimeout=66000;
const wss=new WebSocketServer({server,path:'/lan-signal',maxPayload:32768});
// NATPF (31/10): ping della segnalazione. Prima un id restava registrato finché il TCP non si chiudeva: dopo
// un'interruzione della Wi-Fi il telefono o il computer del P2 che si ricollegava riceveva «id-unavailable» e i segnali
// verso di lui finivano nel socket morto. Ora chi non risponde al ping precedente viene chiuso (al massimo ~2 giri).
const pingMs=Number(options.pingMs??10000);
const heartbeat=pingMs>0?setInterval(()=>{for(const ws of wss.clients){if(ws.isAlive===false){ws.terminate();continue;}ws.isAlive=false;try{ws.ping();}catch{}}},pingMs):null;
heartbeat?.unref?.();
wss.on('close',()=>{heartbeat&&clearInterval(heartbeat);});
wss.on('connection',(ws,request)=>{
  ws.isAlive=true;ws.on('pong',()=>{ws.isAlive=true;});
  if(options.setupOnly){ws.close(1008,'setup-only');return;}
  // Browser signaling is same-origin; reject cross-site attempts to the local service.
  const origin=request.headers.origin;try{if(origin&&new URL(origin).host!==request.headers.host){ws.close(1008,'origin');return;}}catch{ws.close(1008);return;}
  let id=null,count=0;const quota=setInterval(()=>{count=0;},1000);
  ws.on('message',raw=>{
    if(++count>120){ws.close(1008,'rate');return;}
    let data;try{data=JSON.parse(raw);}catch{return;}
    if(!id){if(data.t!=='register'||typeof data.id!=='string'||!/^[a-z0-9-]{10,90}$/.test(data.id))return ws.close(1008);if(clients.has(data.id)){ws.send(JSON.stringify({t:'error',why:'id-unavailable'}));return;}id=data.id;clients.set(id,ws);ws.send(JSON.stringify({t:'registered'}));return;}
    if(data.t==='signal'&&typeof data.to==='string'&&data.payload&&typeof data.payload==='object'){const recipient=clients.get(data.to);if(recipient?.readyState===1)recipient.send(JSON.stringify({t:'signal',from:id,payload:data.payload}));else ws.send(JSON.stringify({t:'error',why:'peer-unavailable'}));}
  });
  ws.on('close',()=>{clearInterval(quota);if(clients.get(id)===ws)clients.delete(id);});ws.on('error',()=>{});
});
return {server,wss,clients,listen:()=>new Promise((resolve,reject)=>{server.once('error',reject);server.listen(port,options.host||'0.0.0.0',()=>{server.removeListener('error',reject);resolve(server.address());});}),close:()=>new Promise(resolve=>{for(const ws of wss.clients)ws.terminate();wss.close(()=>server.close(resolve));})};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
const args=Object.fromEntries(process.argv.slice(2).map(v=>{const i=v.indexOf('=');return i<0?[v.replace(/^--/,''),true]:[v.slice(0,i).replace(/^--/,''),v.slice(i+1)];}));
const app=createLanServer(args);try{const {port}=await app.listen();const scheme=args.cert&&args.key?'https':'http';console.log(`NATPF LAN: ${scheme}://localhost:${port}/tennis/?lan=1`);for(const ip of lanAddresses())console.log(`Telefono/desktop: ${scheme}://${ip}:${port}/tennis/?lan=1`);if(scheme==='http')console.log('HTTP: solo test desktop. I sensori del telefono richiedono HTTPS attendibile.');}catch(error){console.error(`Avvio LAN non riuscito: ${error.message}`);process.exitCode=1;}
}
