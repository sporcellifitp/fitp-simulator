// LAN signaling stays on the desktop. Gameplay and sensors travel over DTLS/SCTP WebRTC.
export const isLanMode = () => new URLSearchParams(globalThis.location?.search || '').get('lan') === '1';
class Events {
  constructor(){this.events={};}
  on(name,fn){(this.events[name] ||= []).push(fn);return this;}
  emit(name,value){for(const fn of this.events[name] || [])fn(value);}
}
export class LanConnection extends Events {
  constructor(owner,remote,offerer,id){
    super();this.id=id||crypto.randomUUID();this.localCandidates=[];this.signaled=false;this.owner=owner;this.peer=remote;this.open=false;this.closed=false;this.pending=[];
    this.pc=new RTCPeerConnection({iceServers:[],iceTransportPolicy:'all'});
    this.pc.onicecandidate=e=>{if(e.candidate){const candidate=e.candidate.toJSON();if(this.signaled)this.signal({candidate});else this.localCandidates.push(candidate);}};
    this.pc.onconnectionstatechange=()=>{if(['failed','closed'].includes(this.pc.connectionState))this.close();};
    this.pc.ondatachannel=e=>this.attach(e.channel);
    if(offerer){this.attach(this.pc.createDataChannel('control',{ordered:true}));this.attach(this.pc.createDataChannel('motion',{ordered:false,maxRetransmits:0}));}
  }
  attach(channel){
    if(!['control','motion'].includes(channel.label)||this[channel.label]){channel.close();return;}
    channel.binaryType='arraybuffer';this[channel.label]=channel;
    channel.onopen=()=>{if(channel.label==='control'){this.open=true;this.emit('open');}};
    channel.onclose=()=>{if(channel.label==='control')this.close();};
    channel.onerror=e=>this.emit('error',e);
    channel.onmessage=e=>{
      if(channel.label==='motion'){if(e.data instanceof ArrayBuffer)this.emit('motion',e.data);return;}
      if(typeof e.data!=='string'||e.data.length>32768)return;
      try{this.emit('data',JSON.parse(e.data));}catch{}
    };
  }
  signal(payload){this.owner.signal(this.peer,{...payload,id:this.id});}
  announce(){this.signal({description:this.pc.localDescription});this.signaled=true;for(const candidate of this.localCandidates.splice(0))this.signal({candidate});}
  async offer(){try{await this.pc.setLocalDescription(await this.pc.createOffer());this.announce();}catch(e){this.emit('error',e);this.close();}}
  async receive(message){
    try{
      if(message.description){await this.pc.setRemoteDescription(message.description);for(const c of this.pending.splice(0))await this.pc.addIceCandidate(c);if(message.description.type==='offer'){await this.pc.setLocalDescription(await this.pc.createAnswer());this.announce();}}
      else if(message.candidate){if(this.pc.remoteDescription)await this.pc.addIceCandidate(message.candidate);else this.pending.push(message.candidate);}
    }catch(e){this.emit('error',e);this.close();}
  }
  send(data){if(this.control?.readyState==='open'&&this.control.bufferedAmount<65536)this.control.send(JSON.stringify(data));}
  sendMotion(buffer){const c=this.motion;if(c?.readyState!=='open'||c.bufferedAmount>2048||!(buffer instanceof ArrayBuffer))return false;try{c.send(buffer);return true;}catch{return false;}}
  close(){if(this.closed)return;this.closed=true;this.open=false;this.pc.close();if(this.owner.connections.get(this.peer)===this)this.owner.connections.delete(this.peer);this.emit('close');}
}
export class LanPeer extends Events {
  constructor(id){super();this.id=id||`phone-${crypto.randomUUID()}`;this.destroyed=false;this.connections=new Map();this.reconnect();}
  reconnect(){
    if(this.destroyed||this.ws&&this.ws.readyState<2)return;
    const endpoint=new URL('/lan-signal',location.href);endpoint.protocol=location.protocol==='https:'?'wss:':'ws:';
    this.ws=new WebSocket(endpoint);
    this.ws.onopen=()=>this.ws.send(JSON.stringify({t:'register',id:this.id}));
    this.ws.onmessage=event=>{
      let message;try{message=JSON.parse(event.data);}catch{return;}
      if(message.t==='registered'){this.emit('open',this.id);return;}
      if(message.t==='error'){this.emit('error',{type:message.why});return;}
      if(message.t!=='signal'||typeof message.from!=='string')return;
      if(typeof message.payload?.id!=='string'||message.payload.id.length>64)return;
      let c=this.connections.get(message.from);
      if(c&&c.id!==message.payload.id){if(message.payload.description?.type!=='offer')return;c.close();c=null;}
      if(!c){if(message.payload?.description?.type!=='offer')return;c=new LanConnection(this,message.from,false,message.payload.id);this.connections.set(message.from,c);this.emit('connection',c);}
      c.receive(message.payload);
    };
    this.ws.onerror=()=>this.emit('error',{type:'lan-signaling'});
    this.ws.onclose=()=>{if(!this.destroyed)this.emit('disconnected');};
  }
  signal(to,payload){if(this.ws?.readyState===1)this.ws.send(JSON.stringify({t:'signal',to,payload}));}
  connect(remote){const previous=this.connections.get(remote);previous?.close();const c=new LanConnection(this,remote,true);this.connections.set(remote,c);c.offer();return c;}
  destroy(){if(this.destroyed)return;this.destroyed=true;for(const c of [...this.connections.values()])c.close();this.ws?.close();}
}
