// Local setup runs on loopback; the phone game is served only with valid TLS files.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {X509Certificate} from 'node:crypto';
import {createSecureContext} from 'node:tls';
import {spawn} from 'node:child_process';
import {createLanServer,lanAddresses} from './server.mjs';
const directory=fileURLToPath(new URL('.',import.meta.url));
export function inspectCertificate(certPath,keyPath,addresses=lanAddresses()){
  if(!fs.existsSync(certPath)||!fs.existsSync(keyPath))return {valid:false,message:'Manca il certificato HTTPS. Completa la prima configurazione qui sotto.',addresses,matching:[]};
  try{
    const cert=fs.readFileSync(certPath),key=fs.readFileSync(keyPath);createSecureContext({cert,key});
    const parsed=new X509Certificate(cert),now=Date.now();
    if(now<Date.parse(parsed.validFrom)||now>Date.parse(parsed.validTo))throw Error('Il certificato è scaduto o non è ancora valido.');
    const matching=addresses.filter(ip=>parsed.checkIP(ip));
    return {valid:true,addresses,matching,message:matching.length?'Server HTTPS pronto.':'Il certificato non copre gli indirizzi LAN attuali. Rigeneralo con gli indirizzi mostrati sotto.'};
  }catch(error){return {valid:false,addresses,matching:[],message:`Certificato HTTPS non utilizzabile: ${error.message}`};}
}
export async function launchLan({port=8443,setupPort=8080,open=true,cert=path.join(directory,'certs/cert.pem'),key=path.join(directory,'certs/key.pem'),handler=null,gamePath='/tennis/?lan=1',title='NATPF Simulator',extraStatus=null}={}){
  let game=null,last='',busy=false,problem=null,inspection=inspectCertificate(cert,key);
  const status=()=>({ready:!!game&&inspection.matching.length>0,message:problem||inspection.message,addresses:inspection.addresses,urls:game?inspection.matching.map(ip=>`https://${ip}:${game.server.address().port}${gamePath}`):[],registered:game?.clients.size||0,...(extraStatus?extraStatus():{})});
  const setup=createLanServer({port:setupPort,host:'127.0.0.1',setupOnly:true,status});await setup.listen();
  async function refresh(){if(busy)return;busy=true;try{
    inspection=inspectCertificate(cert,key);
    const signature=[cert,key].map(p=>{try{const s=fs.statSync(p);return `${s.mtimeMs}:${s.size}`;}catch{return '-';}}).join('|');
    if(signature!==last){last=signature;problem=null;if(game){await game.close();game=null;}if(inspection.valid){try{game=createLanServer({cert,key,port,status,handler});await game.listen();}catch(error){game=null;problem=`Il server HTTPS non si avvia: ${error.message}. Controlla che la porta ${port} sia libera.`;}}}
  }finally{busy=false;}}
  await refresh();const interval=setInterval(refresh,2000);
  const url=`http://127.0.0.1:${setup.server.address().port}/lan/`;
  console.log(`${title} · avvio guidato: ${url}`);console.log('Tieni aperta questa finestra mentre giochi. Il telefono userà HTTPS, non questo indirizzo di configurazione.');
  if(open){const command=process.platform==='win32'?['cmd',['/c','start','',url]]:process.platform==='darwin'?['open',[url]]:['xdg-open',[url]];const child=spawn(command[0],command[1],{stdio:'ignore',detached:true});child.on('error',()=>console.log(`Apri manualmente ${url}`));child.unref();}
  return {setup,status,get game(){return game;},close:async()=>{clearInterval(interval);while(busy)await new Promise(resolve=>setTimeout(resolve,10));if(game)await game.close();await setup.close();}};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  const args=Object.fromEntries(process.argv.slice(2).map(v=>{const i=v.indexOf('=');return i<0?[v.replace(/^--/,''),true]:[v.slice(0,i).replace(/^--/,''),v.slice(i+1)];}));
  try{const launcher=await launchLan({port:Number(args.port||8443),setupPort:Number(args['setup-port']||8080),open:!args['no-open'],...(args.cert?{cert:args.cert}:{}),...(args.key?{key:args.key}:{})});for(const signal of ['SIGINT','SIGTERM'])process.once(signal,async()=>{await launcher.close();process.exit();});}catch(error){console.error(`Avvio guidato non riuscito: ${error.message}`);process.exitCode=1;}
}
