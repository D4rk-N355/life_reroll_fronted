'use client';
import {useEffect,useState} from 'react';
import {EVENT_MEDIA_READY,resolveEventMedia,type EventMediaAsset,type EventMediaManifest} from '@/lib/event-media';
import type {Event} from '@/lib/game-types';
export function EventMedia({event,runId,asset:override}:{event:Event;runId:string;asset?:EventMediaAsset}){
 const [manifest,setManifest]=useState<EventMediaManifest>({}),[failed,setFailed]=useState(false);
 const asset=override??resolveEventMedia(manifest,event);
 useEffect(()=>{const abort=new AbortController();void fetch('/event-media.json',{signal:abort.signal}).then(r=>r.ok?r.json():{}).then(value=>{if(!abort.signal.aborted)setManifest(value);}).catch(()=>{});return()=>abort.abort();},[]);
 useEffect(()=>setFailed(false),[asset?.src,event.id]);
 useEffect(()=>{window.dispatchEvent(new CustomEvent(EVENT_MEDIA_READY,{detail:{run_id:runId,event_id:event.id,visual_key:event.visual_key??null,kind:event.kind,occurred_on:event.occurred_on,status:event.status}}));},[runId,event.id,event.visual_key,event.kind,event.occurred_on,event.status]);
 return <figure className="event-media-slot" data-event-id={event.id} data-visual-key={event.visual_key??''} aria-label="事故情境圖片">{asset&&!failed?<img src={asset.src} alt={asset.alt} onError={()=>setFailed(true)}/>:<div className="event-media-placeholder"><span aria-hidden="true">◇</span><strong>事件情境圖片預留區</strong><small>圖片尚未接入，事件與保險流程可正常操作。</small></div>}</figure>;
}
