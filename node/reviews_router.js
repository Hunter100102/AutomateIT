
const fs = require('fs');
const path = require('path');
const express = require('express');
const router = express.Router();
const DATA = path.join(__dirname,'data','reviews.json');

function load(){
  try { return JSON.parse(fs.readFileSync(DATA,'utf8')); } catch(e){ return []; }
}
function save(arr){
  fs.mkdirSync(path.dirname(DATA), { recursive: true });
  fs.writeFileSync(DATA, JSON.stringify(arr, null, 2), 'utf8');
}
function sanitize(s){
  return String(s||'').replace(/[<>]/g,'');
}
router.get('/', (req,res)=>{
  const items = load();
  // approved first
  items.sort((a,b)=> (b.status==='approved') - (a.status==='approved') );
  res.json({items});
});

router.post('/', (req,res)=>{
  const { name, stars, content } = req.body||{};
  const hp = req.body?.website || '';
  if((hp||'').trim()!==''){ return res.status(400).json({ok:false}); }
  const s = Math.max(1, Math.min(5, parseInt(stars||5)));
  const nm = sanitize(name).slice(0,120);
  const ct = sanitize(content).slice(0,1000);
  if(nm.length<2 || ct.length<10){ return res.status(400).json({ok:false}); }
  const bad = ['http://','https://','viagra','sex','porn'];
  if(bad.some(b => ct.toLowerCase().includes(b))) return res.status(400).json({ok:false});
  const items = load();
  const id = (items.at(-1)?.id || 0) + 1;
  items.push({ id, name:nm, stars:s, content:ct, status:'pending', created_at: new Date().toISOString() });
  save(items);
  res.json({ok:true, pending:true});
});

router.post('/admin', (req,res)=>{
  const { id, action } = req.body||{};
  if(!['approve','reject'].includes(action)) return res.status(400).json({ok:false});
  const items = load();
  const idx = items.findIndex(r => r.id==id);
  if(idx<0) return res.status(404).json({ok:false});
  items[idx].status = (action==='approve'?'approved':'rejected');
  save(items);
  res.json({ok:true});
});

module.exports = router;
