const $ = id => document.getElementById(id);
async function get(path){const r=await fetch(path);if(!r.ok)throw Error(path+' '+r.status);return r.json();}
async function update(){
  try{
    const [health,metrics,orders]=await Promise.all([get('/healthz'),get('/api/metrics'),get('/api/orders')]);
    $('health').textContent=health.status;
    $('requests').textContent=metrics.requests;
    $('orders-count').textContent=orders.count;
    const table=document.createElement('table');
    const head=document.createElement('tr');
    for(const v of ['Order','Customer','Amount','Status']){const th=document.createElement('th');th.textContent=v;head.append(th);}table.append(head);
    for(const o of orders.orders){const row=document.createElement('tr');for(const v of [o.id,o.customer,'$'+o.amount,o.status]){const td=document.createElement('td');td.textContent=v;row.append(td);}table.append(row);}
    $('orders').replaceChildren(table);
  }catch(e){$('result').textContent='API error: '+e.message;}
}
$('refresh').addEventListener('click',update);
$('checkout').addEventListener('click',async()=>{
 try{const r=await fetch('/api/checkout',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({quantity:2})});$('result').textContent=JSON.stringify(await r.json(),null,2);}
 catch(e){$('result').textContent=e.message;}
 await update();
});
$('traffic').addEventListener('click',async()=>{
 try{await Promise.all(Array.from({length:10},()=>fetch('/api/orders')));$('result').textContent='Generated 10 API requests';}
 catch(e){$('result').textContent=e.message;} await update();
});
update();
