const base = process.env.DEMO_BASE_URL || 'http://localhost:3000';
const count = Number(process.env.DEMO_REQUESTS || 30);
for(let i=0;i<count;i++){
  const endpoint=['/healthz','/api/orders','/api/metrics','/api/orders/ORD-1001'][i%4];
  try{
    const r=await fetch(base+endpoint);
    console.log(r.status,endpoint);
  }catch(e){
    console.error(e.message);
    process.exitCode=1;
    break;
  }
}
