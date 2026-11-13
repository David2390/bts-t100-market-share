'use strict';
const BASE='https://zlzkijtsyrlisfjydnln.supabase.co/rest/v1/';
// Public client key: SELECT-only RLS policies protect the reporting data.
const KEY='sb_publishable_GkulMqSzrZowvuWBXhSvOA_eBB0t_OI';
const $=id=>document.getElementById(id), number=new Intl.NumberFormat('en-US');
const fmt=n=>number.format(Math.round(Number(n))), pct=n=>n==null?'N/A':(100*Number(n)).toFixed(1)+'%';
const escapeHtml=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const brandFor=code=>AIRLINE_BRANDS[String(code)]||{color:'#46536A',kind:'operator badge'};
const brandStyle=code=>`--airline:${brandFor(code).color}`;
function operatorMark(row){
 const code=String(row.airline_code),kind=brandFor(code).kind;
 const description=kind==='logo'?`${row.airline_name} logo`:`${code} operator badge`;
 return `<img class="operator-mark" src="assets/airlines/${encodeURIComponent(code)}.png" alt="${escapeHtml(description)}" loading="lazy">`;
}
let routes=[], current=[], requestId=0, routeRequest=0;
async function api(view,params){
 const u=new URL(BASE+view);Object.entries(params).forEach(([k,v])=>u.searchParams.set(k,v));
 const response=await fetch(u,{headers:{apikey:KEY},cache:'no-store'});
 if(!response.ok)throw new Error('The reporting service is unavailable ('+response.status+'). Please try again.');
 return response.json();
}
function status(text,error=false){$('status').textContent=text;$('status').className=error?'error':'';}
function option(value,label){const o=document.createElement('option');o.value=value;o.textContent=label;return o;}
async function findRoutes(){
 const id=++routeRequest;++requestId;$('report').hidden=true;$('route').disabled=true;
 status('Finding routes for this reporting month…');
 try{
  const params={select:'*',date_key:'eq.'+$('period').value,order:'passengers.desc',limit:'75'};
  const q=$('search').value.replace(/[^a-zA-Z0-9 -]/g,'').trim().slice(0,40);
  if(q)params.or='(route_label.ilike.*'+q+'*,origin_city.ilike.*'+q+'*,destination_city.ilike.*'+q+'*)';
  const rows=await api('aviation_routes',params);if(id!==routeRequest)return;
  routes=rows;$('route').replaceChildren(...rows.map(r=>option(r.route_key,r.route_label+' · '+fmt(r.passengers)+' pax')));
  if(!rows.length){status('No routes found. Try a three-letter airport code such as JFK or LAX.');return;}
  $('route').disabled=false;await showRoute();
 }catch(e){if(id===routeRequest)status(e.message,true);}
}
async function showRoute(){
 const id=++requestId;const key=$('route').value,period=$('period').value;
 const summary=routes.find(r=>r.route_key===key);if(!summary)return;
 status('Loading airline shares…');$('report').hidden=true;
 try{
  const [rows,trend]=await Promise.all([
   api('aviation_market_share',{select:'*',date_key:'eq.'+period,route_key:'eq.'+key,order:'passengers.desc',limit:'1000'}),
   api('aviation_routes',{select:'date_key,passengers',route_key:'eq.'+key,order:'date_key.asc',limit:'100'})]);
  if(id!==requestId)return;
  if(!rows.length){status('No airline observations are available for this route-month.');return;}
  current=rows;
  $('route-title').textContent=summary.route_label;
  $('route-cities').textContent=summary.origin_city+' / '+summary.destination_city;
  $('report-period').textContent=$('period').selectedOptions[0].textContent;
  $('lineup').innerHTML=rows.slice(0,5).map(r=>`<div class="carrier-card" style="${brandStyle(r.airline_code)}"><div class="carrier-card-main">${operatorMark(r)}<div class="carrier-card-name">${escapeHtml(r.airline_code)}<small>${escapeHtml(r.airline_name)}</small></div></div><div></div><div class="carrier-card-value">${pct(r.passenger_share)}<span>PASSENGER SHARE</span></div></div>`).join('');
  $('pax').textContent=fmt(summary.passengers);$('seats').textContent=fmt(summary.seats);
  $('lf').textContent=pct(summary.load_factor);$('operators').textContent=summary.airlines;
  $('departures').textContent=fmt(summary.departures)+' operated departures';
  $('share-chart').innerHTML=rows.map(r=>`<div class="bar-row" style="${brandStyle(r.airline_code)}"><div class="bar-name">${operatorMark(r)}<span>${escapeHtml(r.airline_code)}<small>${escapeHtml(r.airline_name)}</small></span></div><div><div class="bar-line"><div class="bar" style="width:${Math.max(0,Math.min(100,100*r.passenger_share))}%"></div><span class="bar-value">${pct(r.passenger_share)}</span></div><div class="bar-line"><div class="bar proxy" style="width:${Math.max(0,Math.min(100,100*(r.qsi_share??0)))}%"></div><span class="bar-value">${pct(r.qsi_share)}</span></div></div></div>`).join('');
  const available=rows.filter(r=>r.share_gap_pp!=null&&r.scheduled_departures>0);
  const lead=available.reduce((best,r)=>!best||Math.abs(r.share_gap_pp)>Math.abs(best.share_gap_pp)?r:best,null);
  if(lead){
   $('signal-title').textContent=lead.airline_code+(lead.share_gap_pp>=0?' carries above its benchmark.':' carries below its benchmark.');
   $('signal-text').textContent=lead.airline_name+' carries '+pct(lead.passenger_share)+' of passengers, against a '+pct(lead.qsi_share)+' QSI proxy share. This is the largest absolute gap among operators with reported scheduled departures.';
   $('signal-gap').textContent=(lead.share_gap_pp>=0?'+':'')+lead.share_gap_pp.toFixed(1)+' pp';
  }else{$('signal-title').textContent='Schedule benchmark unavailable.';$('signal-text').textContent='Scheduled departure data is insufficient for this route. Passenger shares remain available.';$('signal-gap').textContent='N/A';}
  $('airlines').innerHTML=rows.map(r=>`<tr style="${brandStyle(r.airline_code)}"><td><div class="table-airline">${operatorMark(r)}<span><strong>${escapeHtml(r.airline_code)}</strong><small>${escapeHtml(r.airline_name)}</small></span></div></td><td>${fmt(r.passengers)}</td><td>${pct(r.passenger_share)}</td><td>${pct(r.qsi_share)}</td><td class="${r.share_gap_pp>=0?'positive':'negative'}">${r.share_gap_pp==null?'N/A':(r.share_gap_pp>=0?'+':'')+r.share_gap_pp.toFixed(1)}</td><td>${pct(r.load_factor)}</td></tr>`).join('');
  const anomalies=rows.filter(r=>r.passengers>r.seats).length;
  $('quality-note').textContent=(anomalies?'Source warning: '+anomalies+' operator observation(s) report passengers above available seats. Values are retained, not corrected. ':'')+'QSI is an uncalibrated proxy. A zero reported schedule may yield a zero score; an all-zero route schedule yields N/A. Regional operators are shown separately.';
  const maximum=Math.max(...trend.map(r=>r.passengers),1);
  $('trend').innerHTML='<div class="trend-bars" role="img" aria-label="Monthly route passengers; exact values are in the bar tooltips">'+trend.map(r=>{const label=String(r.date_key).slice(0,4)+'-'+String(r.date_key).slice(4,6);return `<div class="trend-item ${String(r.date_key)===period?'latest':''}" title="${label}: ${fmt(r.passengers)} passengers"><div class="trend-bar" style="height:${Math.max(1,120*r.passengers/maximum)}px"></div><span>${label}</span></div>`;}).join('')+'</div>';
  $('report').hidden=false;status('Showing all '+rows.length+' reporting operators on this route. Top 75 routes are listed; search to explore others.');
 }catch(e){if(id===requestId)status(e.message,true);}
}
$('period').addEventListener('change',findRoutes);$('route').addEventListener('change',showRoute);$('find').addEventListener('click',findRoutes);$('search').addEventListener('keydown',e=>{if(e.key==='Enter')findRoutes();});
$('export').addEventListener('click',()=>{
 if(!current.length)return;
 const fields=['year','month','airline_id','airline_code','airline_name','passengers','seats','departures','scheduled_departures','passenger_share','qsi_share','share_gap_pp','load_factor'];
 const quote=v=>'"'+String(v??'').replace(/"/g,'""')+'"';
 const csv=[fields.join(','),...current.map(r=>fields.map(k=>quote(r[k])).join(','))].join('\r\n');
 const url=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8;'}));const a=document.createElement('a');a.href=url;a.download='flightpath-'+$('route').value+'-'+$('period').value+'.csv';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
});
(async()=>{try{
 const [periods,snapshot]=await Promise.all([api('aviation_periods',{select:'*',order:'date_key.desc'}),api('aviation_status',{select:'refreshed_at'})]);
 if(snapshot[0])$('refreshed').textContent='Last successful load: '+new Date(snapshot[0].refreshed_at).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric',timeZone:'America/La_Paz'});
 if(!periods.length)throw new Error('The first data load is not yet available.');
 $('period').replaceChildren(...periods.map(p=>option(p.date_key,new Date(p.year,p.month-1,1).toLocaleDateString('en-US',{month:'long',year:'numeric'}))));
 $('period').disabled=false;$('coverage').textContent='2025 full year / 2026 through '+new Date(periods[0].year,periods[0].month-1,1).toLocaleDateString('en-US',{month:'long'});
 await findRoutes();
}catch(e){status(e.message,true);}})();
