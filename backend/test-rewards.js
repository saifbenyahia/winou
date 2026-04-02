const BASE = 'http://localhost:5000/api';
(async() => {
  try {
    const login = await (await fetch(BASE+'/auth/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:'admin',password:'admin'})})).json();
    const token = login.token;
    
    // Create draft
    const nc = await(await fetch(BASE+'/campaigns',{method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+token},body:JSON.stringify({title:'Reward Test'})})).json();
    const id = nc.campaign.id;
    
    // Add rewards
    const r = await(await fetch(BASE+'/campaigns/'+id,{
      method:'PUT',
      headers:{'Content-Type':'application/json','Authorization':'Bearer '+token},
      body:JSON.stringify({rewards:[{title:'T-shirt',price:'50',desc:'Yo'}]})
    })).json();
    
    console.log('Update Rewards:', r.success ? 'PASS' : 'FAIL', JSON.stringify(r.campaign?.rewards));
  } catch (e) {
    console.error(e);
  }
})();
