"use client";
import { useEffect,useState } from "react";
import { Check,Search,ChevronsUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover,PopoverTrigger,PopoverContent } from "@/components/ui/popover";
import { Command,CommandInput,CommandList,CommandItem } from "@/components/ui/command";
type Choice={id:string;name:string};
export function StatisticsSearch({id,label,value,selectedLabel,placeholder,clearLabel,kind,filters={},disabled=false,onChange}:{id:string;label:string;value:string;selectedLabel?:string;placeholder:string;clearLabel:string;kind:'subject'|'organization'|'teacher';filters?:Record<string,string>;disabled?:boolean;onChange:(value:string)=>void}){
 const [open,setOpen]=useState(false);const [search,setSearch]=useState('');const [result,setResult]=useState<{key:string;options:Choice[];hasMore:boolean;error:string}|null>(null);const [chosen,setChosen]=useState<Choice|null>(null);
 const params=new URLSearchParams({kind,...filters,search}).toString();
 useEffect(()=>{
  if(!open)return;
  const controller=new AbortController();const timer=setTimeout(()=>{void fetch('/api/statistics/options?'+params,{signal:controller.signal}).then(async response=>{const data=await response.json();if(!response.ok)throw new Error(data.error);if(!controller.signal.aborted)setResult({key:params,options:data.options,hasMore:data.hasMore,error:''});}).catch(e=>{if(!controller.signal.aborted)setResult({key:params,options:[],hasMore:false,error:e.message||'Hledání selhalo.'});});},200);
  return()=>{clearTimeout(timer);controller.abort();};
 },[open,params]);
 const loading=result?.key!==params;const current=result?.key===params?result:null;
 function choose(option:Choice){setChosen(option);setOpen(false);if(option.id!==value)onChange(option.id);}
 return <Popover open={open} onOpenChange={next=>{setOpen(next);if(next)setSearch('');}}><PopoverTrigger asChild><Button id={id} type="button" variant="outline" role="combobox" aria-label={label} aria-expanded={open} disabled={disabled} className="mt-2 h-10 w-full min-w-0 justify-between font-normal"><span className="flex min-w-0 items-center gap-2"><Search className="size-4 shrink-0 text-muted-foreground"/><span className="truncate">{value?(selectedLabel||(chosen?.id===value?chosen.name:'Vybraný záznam')):placeholder}</span></span><ChevronsUpDown className="ml-2 size-4 shrink-0 opacity-50"/></Button></PopoverTrigger><PopoverContent className="w-[min(32rem,calc(100vw-2rem))] p-0" align="start"><Command shouldFilter={false}><CommandInput aria-label={'Hledat: '+label} placeholder={kind==='subject'?'Název, kód nebo rok předmětu…':'Začněte psát jméno nebo název…'} value={search} onValueChange={setSearch}/><CommandList aria-label={'Výsledky hledání: '+label}>{!search.trim()&&<CommandItem value="__clear__" onSelect={()=>choose({id:'',name:clearLabel})}>{!value&&<Check className="size-4"/>}{clearLabel}</CommandItem>}{loading?<p role="status" className="p-4 text-sm text-muted-foreground">Hledání…</p>:current?.error?<p role="alert" className="p-4 text-sm text-destructive">{current.error}</p>:<>{current?.options.map(option=><CommandItem key={option.id} value={option.id} onSelect={()=>choose(option)}><Check className={'size-4 shrink-0 '+(value===option.id?'opacity-100':'opacity-0')}/><span>{option.name}</span></CommandItem>)}{!current?.options.length&&<p role="status" className="p-4 text-sm text-muted-foreground">Žádné odpovídající výsledky.</p>}{current?.hasMore&&<p className="border-t p-3 text-xs text-muted-foreground">Zobrazeno prvních 20 výsledků. Upřesněte hledání.</p>}</>}</CommandList></Command></PopoverContent></Popover>;
}
