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
  addCompareRoutes(rows);routes=rows;$('route').replaceChildren(...rows.map(r=>option(r.route_key,r.route_label+' · '+fmt(r.passengers)+' pax')));
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
 setCompareAvailableMonths(periods);
 $('period').disabled=false;$('coverage').textContent='2025 full year / 2026 through '+new Date(periods[0].year,periods[0].month-1,1).toLocaleDateString('en-US',{month:'long'});
 await findRoutes();
}catch(e){status(e.message,true);}})();

/* Searchable comparison of selected departure months and routes. */
const comparePeriod=$('compare-periods'),compareRoutes=$('compare-routes');
const compareMonthSearch=$('compare-month-search'),compareRouteSearch=$('compare-route-search');
let compareMonthCatalog=[];
const compareRouteCatalog=new Map(),selectedCompareMonths=new Set(),selectedCompareRoutes=new Set();
let comparisonRequest=0,compareRouteSearchRequest=0;

function compareMessage(message,error=false){
 $('compare-status').textContent=message;
 $('compare-status').className=error?'error':'';
}
function setCompareAvailableMonths(periods){
 compareMonthCatalog=periods.map(p=>({
  value:String(p.date_key),
  label:new Date(p.year,p.month-1,1).toLocaleDateString('en-US',{month:'short',year:'numeric'})
 }));
 selectedCompareMonths.clear();
 if(compareMonthCatalog.length)selectedCompareMonths.add(compareMonthCatalog[0].value);
 renderCompareMonths();
}
function renderCompareMonths(){
 const q=compareMonthSearch.value.trim().toLowerCase();
 const matching=compareMonthCatalog.filter(p=>p.label.toLowerCase().includes(q)||p.value.includes(q));
 comparePeriod.replaceChildren(...matching.map(p=>{
  const o=option(p.value,p.label);o.selected=selectedCompareMonths.has(p.value);return o;
 }));
 $('compare-month-count').textContent=selectedCompareMonths.size+' selected';
 $('compare-month-visible').textContent=matching.length+' matching month(s)'+(q?' · selections outside search retained':'');
}
function routeSearchMatch(item,query){
 const words=query.trim().toLowerCase().split(/\s+/).filter(Boolean);
 return words.every(word=>item.searchable.includes(word));
}
function renderCompareRoutes(){
 const query=compareRouteSearch.value;
 const matching=[...compareRouteCatalog.values()].filter(item=>routeSearchMatch(item,query));
 compareRoutes.replaceChildren(...matching.map(item=>{
  const o=option(item.value,item.label);o.selected=selectedCompareRoutes.has(item.value);return o;
 }));
 $('compare-route-count').textContent=selectedCompareRoutes.size+' selected';
 $('compare-route-visible').textContent=matching.length+' matching route(s)'+(query?' · selections outside search retained':'');
}
function addCompareRoutes(rows){
 const first=compareRouteCatalog.size===0&&selectedCompareRoutes.size===0;
 for(const r of rows){
  if(!r.route_key)continue;
  const value=String(r.route_key);
  const label=String(r.route_label||value);
  const searchable=[label,r.origin_city||'',r.destination_city||''].join(' ').toLowerCase();
  compareRouteCatalog.set(value,{value,label,searchable});
 }
 if(first&&rows.length&&rows[0].route_key)selectedCompareRoutes.add(String(rows[0].route_key));
 renderCompareRoutes();
}
function compareSyncVisible(select,chosen,render){
 for(const o of select.options){
  if(o.selected)chosen.add(o.value);
  else chosen.delete(o.value);
 }
 render();
}
function compareAddVisible(select,chosen,limit,render,kind){
 const values=[...select.options].map(o=>o.value);
 if(!values.length){compareMessage('No matching '+kind+' to select.',true);return;}
 const distinctNew=values.filter(value=>!chosen.has(value));
 if(chosen.size+distinctNew.length>limit){
  compareMessage('Adding all matching '+kind+' would exceed the '+limit+'-selection limit. Narrow your search or clear existing selections.',true);return;
 }
 distinctNew.forEach(value=>chosen.add(value));
 render();
 compareMessage(chosen.size+' '+kind+' selected. Selections outside the current search are retained.');
}
function compareClear(chosen,render,kind){
 chosen.clear();render();compareMessage('Cleared selected '+kind+'.');
}
compareMonthSearch.addEventListener('input',renderCompareMonths);
compareRouteSearch.addEventListener('input',renderCompareRoutes);
comparePeriod.addEventListener('change',()=>compareSyncVisible(comparePeriod,selectedCompareMonths,renderCompareMonths));
compareRoutes.addEventListener('change',()=>compareSyncVisible(compareRoutes,selectedCompareRoutes,renderCompareRoutes));
$('compare-month-add').addEventListener('click',()=>compareAddVisible(comparePeriod,selectedCompareMonths,12,renderCompareMonths,'months'));
$('compare-month-clear').addEventListener('click',()=>compareClear(selectedCompareMonths,renderCompareMonths,'months'));
$('compare-route-add').addEventListener('click',()=>compareAddVisible(compareRoutes,selectedCompareRoutes,5,renderCompareRoutes,'routes'));
$('compare-route-clear').addEventListener('click',()=>compareClear(selectedCompareRoutes,renderCompareRoutes,'routes'));

async function findCompareRoutes(){
 const raw=compareRouteSearch.value.trim();
 const q=raw.replace(/[^a-zA-Z0-9 -]/g,'').trim().split(/\s+/)[0]?.slice(0,40);
 if(!q||q.length<2){compareMessage('Enter at least two letters of an airport, city or route before finding more routes.',true);return;}
 const months=[...selectedCompareMonths];
 const params={
  select:'route_key,route_label,origin_city,destination_city,passengers',
  date_key:months.length?'in.('+months.join(',')+')':'eq.'+$('period').value,
  or:'(route_label.ilike.*'+q+'*,origin_city.ilike.*'+q+'*,destination_city.ilike.*'+q+'*)',
  order:'passengers.desc',limit:'250'
 };
 const id=++compareRouteSearchRequest;
 const btn=$('compare-route-find');btn.disabled=true;
 compareMessage('Searching the reporting model for matching routes…');
 try{
  const rows=await api('aviation_routes',params);
  if(id!==compareRouteSearchRequest)return;
  addCompareRoutes(rows);
  const visible=[...compareRouteCatalog.values()].filter(item=>routeSearchMatch(item,raw)).length;
  compareMessage(visible+' matching route(s) available. Select one or more below; search results are based on the selected departure months.');
 }catch(e){if(id===compareRouteSearchRequest)compareMessage(e.message,true);}
 finally{if(id===compareRouteSearchRequest)btn.disabled=false;}
}
$('compare-route-find').addEventListener('click',findCompareRoutes);
compareRouteSearch.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();findCompareRoutes();}});

function comparisonAirlines(rows){
 const combined=new Map();
 rows.forEach(r=>{
  const code=String(r.airline_code||'—'),pax=Number(r.passengers||0);
  const prev=combined.get(code)||{code,name:r.airline_name||code,pax:0};
  prev.pax+=pax;
  combined.set(code,prev);
 });
 return [...combined.values()].sort((a,b)=>b.pax-a.pax||a.code.localeCompare(b.code));
}
function comparisonAirlineCell(airline){
 return '<div class="table-airline">'+operatorMark({airline_code:airline.code,airline_name:airline.name})+
  '<span><strong>'+escapeHtml(airline.code)+'</strong><small>'+escapeHtml(airline.name)+'</small></span></div>';
}
function comparisonShare(ratio){
 const amount=Number.isFinite(ratio)?Math.max(0,Math.min(100,ratio*100)):0;
 return '<div class="compare-share"><div class="compare-share-meter" aria-hidden="true"><span style="width:'+amount.toFixed(1)+'%"></span></div><strong>'+pct(ratio)+'</strong></div>';
}
function compareMonthlyPax(route,month){
 return route.monthly.filter(r=>String(r.date_key)===month).reduce((total,r)=>total+Number(r.passengers||0),0);
}
async function runComparison(){
 const months=[...selectedCompareMonths],keys=[...selectedCompareRoutes],both=$('compare-direction').value==='both';
 if(!months.length||!keys.length){compareMessage('Select at least one departure month and one route.',true);return;}
 if(months.length>12||keys.length>5){compareMessage('Limit comparisons to 12 months and 5 routes.',true);return;}
 const canonical=key=>key.split('-').sort((a,b)=>Number(a)-Number(b)).join('-');
 const routeKeys=both?[...new Set(keys.map(canonical))]:keys;
 const monthFilter='in.('+months.join(',')+')';
 const btn=$('compare-run'),id=++comparisonRequest;
 btn.disabled=true;$('compare-results').hidden=true;compareMessage('Aggregating selected routes, months and airline passenger shares…');
 try{
  const data=await Promise.all(routeKeys.map(async key=>{
   const airports=key.split('-'),reverse=airports[1]+'-'+airports[0];
   const routeFilter=both&&reverse!==key?'in.('+key+','+reverse+')':'eq.'+key;
   const [monthly,airlines]=await Promise.all([
    api('aviation_routes',{select:'date_key,route_key,route_label,passengers,seats,departures',date_key:monthFilter,route_key:routeFilter,order:'date_key.asc',limit:'250'}),
    api('aviation_market_share',{select:'date_key,route_key,airline_code,airline_name,passengers',date_key:monthFilter,route_key:routeFilter,limit:'1000'})
   ]);
   if(airlines.length===1000)throw new Error('The airline result reached the reporting API limit; select fewer months or routes.');
   return {key,monthly,airlines};
  }));
  if(id!==comparisonRequest)return;
  const routesSummarized=data.map(d=>{
   const sum=field=>d.monthly.reduce((total,r)=>total+Number(r[field]||0),0);
   const routeName=d.monthly[0]?.route_label||compareRouteCatalog.get(d.key)?.label||d.key;
   const label=both?routeName.replace(' → ',' ↔ '):routeName;
   return {...d,label,pax:sum('passengers'),seats:sum('seats'),departures:sum('departures')};
  });
  const sumAll=field=>routesSummarized.reduce((total,route)=>total+route[field],0);
  const total={pax:sumAll('pax'),seats:sumAll('seats'),departures:sumAll('departures')};
  const observedMonths=new Set(routesSummarized.flatMap(route=>route.monthly.map(r=>String(r.date_key)))).size;
  $('compare-total-pax').textContent=fmt(total.pax);
  $('compare-total-seats').textContent=fmt(total.seats);
  $('compare-total-departures').textContent=fmt(total.departures);
  $('compare-total-lf').textContent=total.seats?pct(total.pax/total.seats):'N/A';
  $('compare-group-label').textContent=routeKeys.length+(both?' route pair(s)':' directional route(s)')+' · '+months.length+' selected departure month(s)';

  const groupAirlines=comparisonAirlines(data.flatMap(route=>route.airlines));
  $('compare-group-airlines').innerHTML=groupAirlines.map(airline=>{
   const share=total.pax?airline.pax/total.pax:null;
   return '<tr style="'+brandStyle(airline.code)+'"><td>'+comparisonAirlineCell(airline)+'</td><td>'+fmt(airline.pax)+'</td><td>'+comparisonShare(share)+'</td></tr>';
  }).join('')||'<tr><td colspan="3">No airline observations for this selection.</td></tr>';
  $('compare-group-airlines-footer').innerHTML='<tr class="compare-grand-total"><td>ALL SELECTED AIRLINES</td><td>'+fmt(total.pax)+'</td><td>'+(total.pax?'100.0%':'N/A')+'</td></tr>';

  $('compare-summary').innerHTML=routesSummarized.map(route=>
   '<tr><td>'+escapeHtml(route.label)+'</td><td>'+fmt(route.pax)+'</td><td>'+fmt(route.seats)+'</td><td>'+fmt(route.departures)+'</td><td>'+(route.seats?pct(route.pax/route.seats):'N/A')+'</td><td>'+new Set(route.monthly.map(r=>String(r.date_key))).size+'</td></tr>'
  ).join('');
  $('compare-summary-total').innerHTML='<tr class="compare-grand-total"><td>ALL SELECTED ROUTES</td><td>'+fmt(total.pax)+'</td><td>'+fmt(total.seats)+'</td><td>'+fmt(total.departures)+'</td><td>'+(total.seats?pct(total.pax/total.seats):'N/A')+'</td><td>'+observedMonths+'</td></tr>';

  const sortedMonths=[...months].sort();
  $('compare-trend').innerHTML='<table><thead><tr><th>Departure month</th>'+
   routesSummarized.map(route=>'<th>'+escapeHtml(route.label)+'</th>').join('')+
   '<th>ALL ROUTES</th></tr></thead><tbody>'+
   sortedMonths.map(month=>{
    const values=routesSummarized.map(route=>compareMonthlyPax(route,month));
    return '<tr><td>'+month.slice(0,4)+'-'+month.slice(4,6)+'</td>'+
     values.map(value=>'<td>'+fmt(value)+'</td>').join('')+
     '<td><strong>'+fmt(values.reduce((total,value)=>total+value,0))+'</strong></td></tr>';
   }).join('')+'</tbody></table>';

  $('compare-airlines').innerHTML=routesSummarized.flatMap(route=>
   comparisonAirlines(route.airlines).map(airline=>
    '<tr style="'+brandStyle(airline.code)+'"><td>'+escapeHtml(route.label)+'</td><td>'+
    comparisonAirlineCell(airline)+'</td><td>'+fmt(airline.pax)+'</td><td>'+
    comparisonShare(route.pax?airline.pax/route.pax:null)+'</td></tr>'
   )
  ).join('')||'<tr><td colspan="4">No airline observations for this selection.</td></tr>';
  $('compare-results').hidden=false;

  const groupAirlinePax=groupAirlines.reduce((n,airline)=>n+airline.pax,0);
  const incomplete=groupAirlinePax!==total.pax;
  compareMessage('Showing '+routeKeys.length+' '+(both?'bidirectional route pair(s)':'directional route(s)')+
   ' across '+months.length+' selected departure month(s). Missing route-month observations appear as zero in the trend.'+
   (incomplete?' Warning: the summed airline observations do not reconcile to the route passenger total.':''),
   incomplete);
 }catch(e){if(id===comparisonRequest)compareMessage(e.message,true);}
 finally{if(id===comparisonRequest)btn.disabled=false;}
}
$('compare-run').addEventListener('click',runComparison);
