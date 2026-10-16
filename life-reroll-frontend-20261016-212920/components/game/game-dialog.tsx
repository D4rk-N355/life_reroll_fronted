'use client';
import {useLayoutEffect,useRef,type ReactNode} from 'react';
export function GameDialog({title,children,onClose,drawer=false,wide=false}:{title:string;children:ReactNode;onClose:()=>void;drawer?:boolean;wide?:boolean}){
 const ref=useRef<HTMLDialogElement>(null),close=useRef(onClose);close.current=onClose;
 useLayoutEffect(()=>{const dialog=ref.current!,previous=document.activeElement as HTMLElement|null;dialog.showModal();return()=>{dialog.close();if(previous?.isConnected)previous.focus();};},[]);
 return <dialog ref={ref} className={`game-dialog ${drawer?'game-dialog-compact':''} ${wide?'game-dialog-wide':''}`} aria-label={title} onCancel={e=>{e.preventDefault();close.current();}}><header><h2>{title}</h2><button autoFocus className="secondary" aria-label={`關閉${title}`} onClick={onClose}>關閉 ×</button></header><div className="game-dialog-body">{children}</div></dialog>;
}
