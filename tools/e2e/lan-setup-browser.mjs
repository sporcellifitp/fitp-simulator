// Setup page is a desktop-only wizard; never fake phone sensor availability over HTTP.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {launchLan} from '../lan/launcher.mjs';
import {launch,check,summary} from './th.mjs';
const directory=fs.mkdtempSync(path.join(os.tmpdir(),'natpf-setup-ui-'));
const app=await launchLan({setupPort:0,port:0,open:false,cert:path.join(directory,'cert.pem'),key:path.join(directory,'key.pem')});
let browser;
try{
  browser=await launch();const context=await browser.newContext();let external=0;const errors=[];
  await context.route('**/*',route=>{if(new URL(route.request().url()).hostname!=='127.0.0.1'){external++;return route.abort();}return route.continue();});
  const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
  await page.goto(`http://127.0.0.1:${app.setup.server.address().port}/lan/`);await page.waitForFunction(()=>document.querySelector('#state').textContent.includes('Manca il certificato'));
  check('LAN wizard explains missing HTTPS and does not offer an HTTP phone game',await page.locator('#launch a').count()===0&&(await page.locator('body').innerText()).includes('I sensori del telefono richiedono un certificato'));
  check('LAN wizard provides device trust, private-key and Wi-Fi isolation guidance',await page.evaluate(()=>['rootCA-key.pem','fiducia completa','isolamento','non localhost'].every(t=>document.body.innerText.includes(t))));
  await page.waitForTimeout(2100);
  check('LAN wizard polls local readiness with no external requests or browser errors',external===0&&errors.length===0,JSON.stringify({external,errors}));
}finally{await browser?.close();await app.close();fs.rmSync(directory,{recursive:true,force:true});summary();}
