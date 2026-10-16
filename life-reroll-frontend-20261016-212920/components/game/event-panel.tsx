'use client';
import {useCallback,useEffect,useRef,useState} from 'react';
import {allowed,type Page} from '@/lib/game-client';
import {money} from '@/lib/dashboard';
import type {Event} from '@/lib/game-types';
import {useResource,type GameModel} from './use-game';
import {EventMedia} from './event-media';
export function EventPanel({game}:{game:GameModel;onRewind?:()=>void}){
 const r=game.run!,params={run_id:r.id};
 const [pastEvent,setPastEvent]=useState('');
 const activeEvent=r.pending_event_id||pastEvent;
 const history=useResource<Page<Event>>(game,'D04',params,!r.pending_event_id);
 const event=useResource<Event>(game,'D05',{...params,event_id:activeEvent},!!activeEvent);
 const attempts=useRef(new Set<string>());
 const latest=useRef(game);latest.current=game;
 const settle=useCallback(async()=>{
  const current=latest.current,run=current.run;
  if(!run?.pending_event_id||current.busy||current.retry)return;
  const eventId=run.pending_event_id;
  await current.perform(async()=>{
   await current.write('D06',{run_id:run.id,event_id:eventId},{automatic:true,confirmed:true},true);
   await current.refresh();
  });
 },[]);
 useEffect(()=>{
  if(!r.pending_event_id||!['EVENT_PENDING','FUNDING'].includes(r.status)||game.busy||game.retry)return;
  const key=r.id+':'+r.pending_event_id;
  if(attempts.current.has(key))return;
  attempts.current.add(key);void settle();
 },[r.id,r.pending_event_id,r.status,game.busy,game.retry,settle]);
 const e=activeEvent?event.value:history.value?.items.at(-1);
 const resolving=!!r.pending_event_id&&['EVENT_PENDING','FUNDING'].includes(r.status);
 async function next(){
  if(resolving){await settle();return;}
  await game.perform(async()=>{
   if(r.status==='EVENT_RESULT'&&r.pending_event_id){
    await game.write('D07',{...params,event_id:r.pending_event_id},{},true);await game.refresh();
   }else if(r.status==='TURN_REVIEW'&&r.advance_id){
    await game.write('D03',{...params,advance_id:r.advance_id},{},true);await game.refresh();
   }
  });
 }
 return <section className={`event-presentation ${e?.hospital_visit?'event-medical':''}`} aria-busy={game.busy||event.loading}>
  {!r.pending_event_id&&!!history.value?.items.length&&<label className="event-history-select">事件紀錄<select value={pastEvent} onChange={ev=>setPastEvent(ev.target.value)}><option value="">最近的事件</option>{history.value.items.map(item=><option key={item.id} value={item.id}>{item.title}</option>)}</select></label>}
  {[event.error,history.error].filter(Boolean).map(error=><p role="alert" key={error}>{error}</p>)}
  {e?<article key={e.id} className="event-presentation-content"><EventMedia event={e} runId={r.id}/>{e.hospital_visit&&<div className="event-medical-speaker">醫院服務專員 · {e.hospital_visit.department} · {e.hospital_visit.service}</div>}<div className="event-presentation-copy"><h2>{e.title}</h2><p>{e.narrative}{e.outcome?.summary&&<> {e.outcome.summary}</>}</p></div><div className="event-balance-pair" aria-label="事件前後可用資金"><div><span>事件前可用資金</span><strong>{e.balance_before_minor==null?'未記錄':<>{money(e.balance_before_minor)}<small> 元</small></>}</strong></div><span className="event-balance-arrow" aria-hidden="true">→</span><div><span>事件後可用資金</span><strong>{e.balance_after_minor==null?(resolving?'結算中…':'未記錄'):<>{money(e.balance_after_minor)}<small> 元</small></>}</strong></div></div></article>:<p role="status">{event.loading||history.loading?'正在整理事件…':'目前沒有事件。'}</p>}
  {(resolving||r.status==='EVENT_RESULT'||r.status==='TURN_REVIEW')&&<div className="event-continue"><button disabled={game.busy||event.loading||!!game.retry||(!resolving&&!allowed(r,r.status==='TURN_REVIEW'?'ACK_TURN':'ACK_EVENT'))} onClick={()=>void next()}>{game.busy?'結算中…':'繼續'}<span aria-hidden="true"> →</span></button></div>}
 </section>;
}
