'use client';
import {useState,type ReactNode} from 'react';
export function PagedList<T>({items,render,pageSize=3,label='資料'}:{items:T[];render:(item:T,index:number)=>ReactNode;pageSize?:number;label?:string}){
 const [page,setPage]=useState(0),pages=Math.max(1,Math.ceil(items.length/pageSize)),current=Math.min(page,pages-1);
 return <>{items.slice(current*pageSize,(current+1)*pageSize).map((item,index)=>render(item,current*pageSize+index))}{pages>1&&<nav className="dialog-pagination" aria-label={`${label}分頁`}><button className="secondary" disabled={current===0} onClick={()=>setPage(current-1)}>上一頁</button><span>{current+1} / {pages}</span><button className="secondary" disabled={current===pages-1} onClick={()=>setPage(current+1)}>下一頁</button></nav>}</>;
}
