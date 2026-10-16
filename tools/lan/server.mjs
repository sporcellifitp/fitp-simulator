import http from 'node:http';
import https from 'node:https';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {networkInterfaces} from 'node:os';
import {WebSocketServer} from 'ws';
const root=path.resolve(fileURLToPath(new URL('../../site/',import.meta.url)));
const args=Object.fromEntries(process.argv.slice(2).map(v=>{const i=v.indexOf('=');return i<0?[v.replace(/^--/,''),true]:[v.slice(0,i).replace(/^--/,''),v.slice(i+1)];}));
const tls=!!(args.cert&&args.key), port=Number(args.port || (tls?8443:8080));
const mime={'.html':'text/html','.js':'text/javascript','.json':'application/json','.css':'text/css','.png':'image/png','.jpg':'image/jpeg','.svg':'image/svg+xml','.webp':'image/webp','.woff2':'font/woff2','.glb':'model/gltf-binary'};
const serve=(req,res)=>{
  let pathname;try{pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);}catch{res.writeHead(400).end();return;}
  if(pathname==='/'){res.writeHead(302,{Location:'/tennis/?lan=1'}).end();return;}
  const filename=pathname==='/js/vendor/three.module.js'?fileURLToPath(new URL('node_modules/three/build/three.module.js',import.meta.url)):path.resolve(root,'.'+pathname+(pathname.endsWith('/')?'index.html':''));
  if(pathname!=='/js/vendor/three.module.js'&&!filename.startsWith(root+path.sep)){res.writeHead(403).end();return;}
  fs.stat(filename,(error,stat)=>{if(error||!stat.isFile()){res.writeHead(404).end();return;}res.writeHead(200,{'Content-Type':mime[path.extname(filename)]||'application/octet-stream','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});fs.createReadStream(filename).pipe(res);});
};
const server=tls?https.createServer({cert:fs.readFileSync(args.cert),key:fs.readFileSync(args.key)},serve):http.createServer(serve);
const wss=new WebSocketServer({server,path:'/lan-signal',maxPayload:32768}), clients=new Map();
wss.on('connection',(ws,request)=>{
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
server.listen(port,'0.0.0.0',()=>{console.log(`NATPF LAN: ${tls?'https':'http'}://localhost:${port}/tennis/?lan=1`);let addresses={};try{addresses=networkInterfaces();}catch{}for(const interfaces of Object.values(addresses))for(const address of interfaces||[])if(address.family==='IPv4'&&!address.internal)console.log(`Telefono/desktop: ${tls?'https':'http'}://${address.address}:${port}/tennis/?lan=1`);if(!tls)console.log('HTTP: solo test desktop. I sensori del telefono richiedono HTTPS attendibile.');});
