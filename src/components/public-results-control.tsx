"use client";
import {useEffect,useState} from "react";
import {useRouter} from "next/navigation";
import {useTranslations} from "next-intl";
import {Button} from "@/components/ui/button";
import {Card,CardHeader,CardTitle,CardContent} from "@/components/ui/card";
export function PublicResultsControl({classId,enabled,missingIds,locale}:{classId:string;enabled:boolean;missingIds:number;locale:string}){
 const t=useTranslations("publicResults"),router=useRouter();const [busy,setBusy]=useState(false),[message,setMessage]=useState(""),[token,setToken]=useState<string|null>(null);
 const endpoint="/api/classes/"+classId+"/public-results",url=token?"/"+locale+"/results/"+token:null;
 useEffect(()=>{const controller=new AbortController();void fetch(endpoint,{signal:controller.signal,cache:"no-store"}).then(async response=>{if(!response.ok)throw Error();const data=await response.json();if(!controller.signal.aborted)setToken(data.token);}).catch(()=>{if(!controller.signal.aborted)setMessage(t("failed"));});return()=>controller.abort();},[endpoint,enabled,t]);
 async function change(rotate=false){if((rotate||!enabled)&&!window.confirm(t(rotate?"rotateConfirm":"confirm")))return;setBusy(true);setMessage("");try{const response=await fetch(endpoint,{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({enabled:rotate||!enabled,...(rotate?{rotate:true}:{})})});if(!response.ok)throw Error();setToken((await response.json()).token);router.refresh();}catch{setMessage(t("failed"));}finally{setBusy(false);}}
 return <Card><CardHeader><CardTitle>{t("sharing")}</CardTitle></CardHeader><CardContent className="space-y-3"><p className="text-sm text-muted-foreground">{t("explanation")}</p>{missingIds>0&&<p className="text-sm">{t("missing",{count:missingIds})}</p>}<div className="flex flex-wrap gap-3"><Button disabled={busy} onClick={()=>change()} variant={enabled?"outline":"default"}>{busy?t("saving"):t(enabled?"disable":"enable")}</Button>{enabled&&url&&<><a href={url} target="_blank" rel="noreferrer" className="self-center text-primary underline">{t("open")}</a><Button variant="outline" onClick={async()=>{try{await navigator.clipboard.writeText(new URL(url,window.location.origin).href);setMessage(t("copied"));}catch{setMessage(new URL(url,window.location.origin).href);}}}>{t("copy")}</Button></>}{enabled&&<Button variant="outline" disabled={busy} onClick={()=>change(true)}>{t("rotate")}</Button>}</div>{message&&<p role="status">{message}</p>}</CardContent></Card>;
}
