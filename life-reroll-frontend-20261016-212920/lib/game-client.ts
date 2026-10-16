import registry from './contracts/operations.json';
import type {Campaign, RunState, Session, Job, MutationReceipt} from './game-types';
export {registry};
export type RequestPlan={method:string;path:string;body?:unknown;key:string};
const messages:Record<string,string>={STALE_VERSION:'進度已在其他頁面更新，請重讀後重新確認。',QUOTE_STALE:'資產已改變，請重新取得確認單。',QUOTE_EXPIRED:'確認單已過期，請重新預覽。',UNAUTHENTICATED:'登入已失效，請重新登入。',CSRF_INVALID:'登入狀態已改變，請重讀後再操作。',INVALID_CREDENTIALS:'信箱或密碼不正確。',FORBIDDEN:'目前帳號不符合此操作條件，請確認服務設定與帳號狀態。',ACTIVE_CAMPAIGN_EXISTS:'已有進行中的人生，請繼續目前遊戲。',ACTION_NOT_ALLOWED:'目前狀態不允許這項操作。',STATE_CONFLICT:'目前人生狀態已改變，請重新讀取。',CLAIM_DUPLICATE:'這份保障已申請過本事件理賠。',INSUFFICIENT_FUNDS:'目前可用資金不足。',RATE_LIMITED:'操作太頻繁，請稍後再試。'};
export class GameApiError extends Error {
 constructor(public code:string,public status:number,detail?:string){super(messages[code]??detail??code);}
}
export class GameClient {
 csrf='';devToken='';
 // Keep native fetch bound to the browser global, not this GameClient instance.
 constructor(private transport:typeof fetch=(input,init)=>globalThis.fetch(input,init)){}
 plan(id:string,params:Record<string,string>={},body?:unknown,query:Record<string,string>={}):RequestPlan {
  const op=registry.find(x=>x.id===id);if(!op)throw Error('Unknown operation '+id);
  const path=op.path.replace(/\{([^}]+)\}/g,(_,key:string)=>{if(!params[key])throw Error('Missing '+key);return encodeURIComponent(params[key]);});
  const search=new URLSearchParams(query).toString();
  return {method:op.method,path:path+(search?'?'+search:''),body,key:crypto.randomUUID()};
 }
 async send<T>(plan:RequestPlan,signal?:AbortSignal):Promise<T>{
  const headers:Record<string,string>={Accept:'application/json'};
  if(plan.method!=='GET'){
   headers['Idempotency-Key']=plan.key;
   if(this.csrf)headers['X-CSRF-Token']=this.csrf;
   if(plan.body!==undefined)headers['Content-Type']='application/json';
  }
  let response:Response;
  try{response=await this.transport(plan.path,{method:plan.method,headers,credentials:'same-origin',body:plan.body===undefined?undefined:JSON.stringify(plan.body),signal:signal??AbortSignal.timeout(20000)});}catch(e){if(signal?.aborted)throw e;throw new GameApiError('CONNECTION_UNCERTAIN',0,'連線中斷。操作可能已提交，請先重讀進度；重試會沿用原請求識別。');}
  const token=response.headers.get('X-Dev-Verification-Token');if(token)this.devToken=token;
  if(response.status===204)return undefined as T;
  const envelope=await response.json().catch(()=>null) as {data:T;error?:{code:string;message:string}}|null;
  if(!response.ok&&response.status>=500&&plan.method!=='GET')throw new GameApiError('CONNECTION_UNCERTAIN',0,'伺服器未能確認操作結果，請使用原操作安全重試。');
  if(!response.ok)throw new GameApiError(envelope?.error?.code??'HTTP_ERROR',response.status,envelope?.error?.message??'後端暫時無法使用');
  if(!envelope||!Object.hasOwn(envelope,'data'))throw new GameApiError(plan.method==='GET'?'BACKEND_UNAVAILABLE':'CONNECTION_UNCERTAIN',0,'目前無法確認遊戲回應，請先重讀進度或安全重試。');
  return envelope.data;
 }
 call<T>(id:string,params:Record<string,string>={},body?:unknown,query:Record<string,string>={},signal?:AbortSignal){return this.send<T>(this.plan(id,params,body,query),signal);}
 async session(signal?:AbortSignal){const session=await this.call<Session>('A03',{},undefined,{},signal);this.csrf=session.csrf_token;return session;}
 async current(signal?:AbortSignal):Promise<{session:Session;campaign:Campaign|null;run:RunState|null}>{
  const session=await this.session(signal);if(!session.user)return {session,campaign:null,run:null};
  let campaign=await this.call<Campaign|null>('C02',{},undefined,{},signal);
  if(!campaign){const history=await this.call<{items:Campaign[]}>('C03',{},undefined,{},signal);campaign=history.items[0]??null;}
  const run=campaign?.current_run_id?await this.call<RunState>('C06',{run_id:campaign.current_run_id},undefined,{},signal):null;
  return {session,campaign,run};
 }
 async waitJob(job:Job,onProgress:(job:Job)=>void,signal?:AbortSignal):Promise<Job>{
  let current=job;
  while(!['SUCCEEDED','FAILED'].includes(current.status)){
   onProgress(current);
   await new Promise<void>((resolve,reject)=>{const timer=setTimeout(done,Math.max(500,Math.min(current.poll_after_ms||2000,10000)));function done(){signal?.removeEventListener('abort',abort);resolve();}function abort(){clearTimeout(timer);reject(new DOMException('Aborted','AbortError'));}signal?.addEventListener('abort',abort,{once:true});if(signal?.aborted)abort();});
   current=await this.call<Job>('C12',{job_id:current.id},undefined,{},signal);
  }
  onProgress(current);return current;
 }
}
export const allowed=(run:RunState|null,action:string)=>!!run?.allowed_actions.some(a=>a.action===action&&a.enabled);
export function receiptRun(value:unknown):RunState|null {const v=value as Partial<MutationReceipt>|null;return v?.run?.id?v.run:null;}

export type Page<T>={items:T[];next_cursor:string|null;total:number};
