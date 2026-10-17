import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {createLanServer} from '../server.mjs';
import {inspectCertificate,launchLan} from '../launcher.mjs';
import {WebSocket} from '../node_modules/ws/wrapper.mjs';

test('setup HTTP is loopback-only, serves no game and reports missing certificates honestly',async()=>{
  const temp=fs.mkdtempSync(path.join(os.tmpdir(),'natpf-lan-'));
  const launcher=await launchLan({setupPort:0,port:0,open:false,cert:path.join(temp,'cert.pem'),key:path.join(temp,'key.pem')});
  try{
    assert.equal(launcher.setup.server.address().address,'127.0.0.1');
    const base=`http://127.0.0.1:${launcher.setup.server.address().port}`;
    const status=await fetch(base+'/lan/status').then(r=>r.json());assert.equal(status.ready,false);assert.deepEqual(status.urls,[]);assert.match(status.message,/Manca il certificato/);assert.equal(status.registered,0);
    const redirect=await fetch(base+'/tennis/?lan=1',{redirect:'manual'});assert.equal(redirect.status,302);assert.equal(redirect.headers.get('location'),'/lan/');
    const html=await fetch(base+'/lan/').then(r=>r.text());assert.match(html,/rootCA-key.pem/);assert.match(html,/non basta/);assert.ok(!html.includes('<script src="http'));
    fs.writeFileSync(path.join(temp,'cert.pem'),'invalid');fs.writeFileSync(path.join(temp,'key.pem'),'invalid');assert.equal(inspectCertificate(path.join(temp,'cert.pem'),path.join(temp,'key.pem'),['192.168.1.20']).valid,false);
  }finally{await launcher.close();fs.rmSync(temp,{recursive:true,force:true});}
});

test('TLS certificate validation matches exact IP SAN and launcher starts HTTPS without leaking files',async()=>{
  const temp=fs.mkdtempSync(path.join(os.tmpdir(),'natpf-tls-')),cert=path.join(temp,'cert.pem'),key=path.join(temp,'key.pem');
  execFileSync('openssl',['req','-x509','-newkey','rsa:2048','-nodes','-days','1','-subj','/CN=NATPF-test','-addext','subjectAltName=IP:127.0.0.1','-keyout',key,'-out',cert],{stdio:'ignore'});
  const inspected=inspectCertificate(cert,key,['127.0.0.1','192.168.1.20']);assert.equal(inspected.valid,true);assert.deepEqual(inspected.matching,['127.0.0.1']);
  const launcher=await launchLan({setupPort:0,port:0,open:false,cert,key});
  try{const base=`http://127.0.0.1:${launcher.setup.server.address().port}`;const raw=await fetch(base+'/lan/status').then(r=>r.text());assert.ok(!raw.includes('PRIVATE KEY'));assert.ok(!raw.includes(temp));assert.ok(!raw.includes('-----BEGIN'));}finally{await launcher.close();fs.rmSync(temp,{recursive:true,force:true});}
});

test('LAN diagnostics count signaling registration and remove it on disconnect',async()=>{
  const app=createLanServer({port:0,host:'127.0.0.1'});await app.listen();let ws;
  try{
    const base=`http://127.0.0.1:${app.server.address().port}`;
    ws=new WebSocket(base.replace('http:','ws:')+'/lan-signal',{origin:base});await new Promise((resolve,reject)=>{ws.once('open',resolve);ws.once('error',reject);});
    const reply=new Promise(resolve=>ws.once('message',resolve));ws.send(JSON.stringify({t:'register',id:'phone-test-registration'}));await reply;
    assert.equal((await fetch(base+'/lan/status').then(r=>r.json())).registered,1);
    const closed=new Promise(resolve=>ws.once('close',resolve));ws.close();await closed;
    assert.equal((await fetch(base+'/lan/status').then(r=>r.json())).registered,0);
    const response=await fetch(base+'/tools/lan/certs/key.pem');assert.equal(response.status,404);
  }finally{ws?.terminate();await app.close();}
});

test('a custom request handler (natpf-argon) replaces the site files but keeps /lan/status and signaling',async()=>{
  const app=createLanServer({port:0,host:'127.0.0.1',handler:(req,res)=>res.writeHead(200,{'Content-Type':'text/plain'}).end('game '+req.url)});await app.listen();
  try{
    const base=`http://127.0.0.1:${app.server.address().port}`;
    assert.equal(await fetch(base+'/?lan=1').then(r=>r.text()),'game /?lan=1');
    assert.equal(await fetch(base+'/tennis/').then(r=>r.text()),'game /tennis/');
    assert.equal((await fetch(base+'/lan/status').then(r=>r.json())).registered,0);
  }finally{await app.close();}
});
