const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const ROOT = __dirname;
const DB_FILE = path.join(ROOT, 'data', 'store.json');
const PORT = Number(process.env.PORT || 3000);
const MIME = {'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.json':'application/json; charset=utf-8','.jpg':'image/jpeg','.jpeg':'image/jpeg','.png':'image/png','.svg':'image/svg+xml','.ico':'image/x-icon'};
function initialStore(){return {farms:[
{id:'farm-1',name:'Ram Singh Farm',location:'Mathura, UP',crop:'Wheat',area:1.2,status:'Active',createdAt:new Date().toISOString()},
{id:'farm-2',name:'Sharma Fields',location:'Mathura, UP',crop:'Mustard',area:0.8,status:'Active',createdAt:new Date().toISOString()},
{id:'farm-3',name:'Gupta Farm',location:'Vrindavan, UP',crop:'Wheat',area:1.5,status:'Active',createdAt:new Date().toISOString()}],
alerts:[
{id:'alert-1',date:'2026-03-14',farm:'Ram Singh Farm (Plot 2)',crop:'Wheat',risk:'High',status:'new',source:'synthetic-demo'},
{id:'alert-2',date:'2026-03-14',farm:'Sharma Fields (Plot 1)',crop:'Mustard',risk:'Medium',status:'ack',source:'synthetic-demo'},
{id:'alert-3',date:'2026-03-10',farm:'Gupta Farm (Plot 3)',crop:'Wheat',risk:'Low',status:'done',source:'synthetic-demo'}],
settings:{name:'',email:'',location:'Mathura, Uttar Pradesh',sms:true,whatsapp:true,updatedAt:null}}}
function load(){try{return JSON.parse(fs.readFileSync(DB_FILE,'utf8'))}catch{return initialStore()}}
function save(db){fs.mkdirSync(path.dirname(DB_FILE),{recursive:true});fs.writeFileSync(DB_FILE,JSON.stringify(db,null,2))}
let db=load(); if(!fs.existsSync(DB_FILE)) save(db);
function send(res,status,data,type='application/json; charset=utf-8'){res.writeHead(status,{'Content-Type':type,'Access-Control-Allow-Origin':'*','Access-Control-Allow-Methods':'GET,POST,PUT,PATCH,OPTIONS','Access-Control-Allow-Headers':'Content-Type'});res.end(type.startsWith('application/json')?JSON.stringify(data):data)}
function readBody(req){return new Promise((resolve,reject)=>{let raw='';req.on('data',c=>{raw+=c;if(raw.length>1e6){reject(new Error('Request body too large'));req.destroy()}});req.on('end',()=>{try{resolve(raw?JSON.parse(raw):{})}catch{reject(new Error('Invalid JSON body'))}});req.on('error',reject)})}
const server=http.createServer(async(req,res)=>{
 if(req.method==='OPTIONS'){res.writeHead(204,{'Access-Control-Allow-Origin':'*','Access-Control-Allow-Methods':'GET,POST,PUT,PATCH,OPTIONS','Access-Control-Allow-Headers':'Content-Type'});return res.end()}
 const url=new URL(req.url,'http://localhost'); const p=url.pathname;
 try{
  if(p==='/api/health'&&req.method==='GET')return send(res,200,{ok:true,service:'AgriSat Alert API',storage:'local JSON file',liveSatelliteData:false});
  if(p==='/api/farms'&&req.method==='GET')return send(res,200,db.farms);
  if(p==='/api/farms'&&req.method==='POST'){
   const b=await readBody(req);const name=String(b.name||'').trim(),location=String(b.location||'').trim(),crop=String(b.crop||'').trim(),area=Number(b.area);
   if(!name||!location||!crop||!Number.isFinite(area)||area<=0)return send(res,400,{error:'Enter farm name, location, crop, and a positive area.'});
   const farm={id:crypto.randomUUID(),name,location,crop,area,status:'Active',createdAt:new Date().toISOString()};db.farms.push(farm);save(db);return send(res,201,farm)
  }
  const farmMatch=p.match(/^\/api\/farms\/([^/]+)$/);
  if(farmMatch&&req.method==='DELETE'){const before=db.farms.length;db.farms=db.farms.filter(f=>f.id!==farmMatch[1]);if(before===db.farms.length)return send(res,404,{error:'Farm not found'});save(db);return send(res,200,{ok:true})}
  if(p==='/api/settings'&&req.method==='GET')return send(res,200,db.settings);
  if(p==='/api/settings'&&req.method==='PUT'){
   const b=await readBody(req);const email=String(b.email||'').trim();if(email&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))return send(res,400,{error:'Please enter a valid email address.'});
   db.settings={name:String(b.name||'').trim(),email,location:String(b.location||'').trim(),sms:!!b.sms,whatsapp:!!b.whatsapp,updatedAt:new Date().toISOString()};save(db);return send(res,200,db.settings)
  }
  if(p==='/api/alerts'&&req.method==='GET')return send(res,200,db.alerts);
  const alertMatch=p.match(/^\/api\/alerts\/([^/]+)$/);
  if(alertMatch&&req.method==='PATCH'){
   const b=await readBody(req),a=db.alerts.find(x=>x.id===alertMatch[1]);if(!a)return send(res,404,{error:'Alert not found'});if(!['new','ack','done'].includes(b.status))return send(res,400,{error:'Status must be new, ack, or done.'});a.status=b.status;save(db);return send(res,200,a)
  }
  if(p==='/api/reports.csv'&&req.method==='GET'){
   const rows=[['farm','location','crop','area_ha','status'],...db.farms.map(f=>[f.name,f.location,f.crop,f.area,f.status])];const csv=rows.map(r=>r.map(v=>'"'+String(v??'').replace(/"/g,'""')+'"').join(',')).join('\r\n');res.writeHead(200,{'Content-Type':'text/csv; charset=utf-8','Content-Disposition':'attachment; filename="agrisat-farms-report.csv"'});return res.end(csv)
  }
  // Serve the website and static assets.
  let file=path.join(ROOT,decodeURIComponent(p==='/'?'/index.html':p));if(!file.startsWith(ROOT))return send(res,403,{error:'Forbidden'});
  if(!fs.existsSync(file)||!fs.statSync(file).isFile())return send(res,404,{error:'Not found'});
  return send(res,200,fs.readFileSync(file),MIME[path.extname(file).toLowerCase()]||'application/octet-stream');
 }catch(e){console.error(e);return send(res,e.message==='Invalid JSON body'?400:500,{error:e.message||'Server error'})}
});
server.listen(PORT,'0.0.0.0',()=>console.log(`AgriSat Alert running at http://localhost:${PORT}`));
