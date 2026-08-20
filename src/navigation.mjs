export function normalizeNonNegativeInt(value,{fallback=0,max=Number.MAX_SAFE_INTEGER}={}){
 const number=Number(value);
 if(!Number.isFinite(number))return fallback;
 return Math.min(max,Math.max(0,Math.trunc(number)));
}

export function parseConfirmation(data,prefix='confirm'){
 const match=String(data||'').match(new RegExp(`^${prefix}:(single|batch):([a-f0-9]{12})$`,'u'));
 return match?{kind:match[1],revision:match[2]}:null;
}

export function validateCloseConfirmation({data,draft,mode,messageId}){
 const parsed=parseConfirmation(data);
 if(!parsed||mode!=='close_confirm'||!draft)return null;
 const ids=Array.isArray(draft.ids)?draft.ids:[];
 const cardinalityOk=parsed.kind==='single'?ids.length===1:ids.length>=2;
 if(!cardinalityOk||draft.revision!==parsed.revision||Number(draft.confirmMessageId)!==Number(messageId))return null;
 return{kind:parsed.kind,draft};
}

export function resolveCategoryByKey(rows,key,keyFor){
 if(typeof keyFor!=='function')throw Error('CATEGORY_KEY_FUNCTION_REQUIRED');
 const matches=(rows||[]).filter(row=>keyFor(row.category)===String(key));
 return matches.length===1?matches[0]:null;
}

export function validateCreateConfirmation({data,draft,mode,messageId}){
 const match=String(data||'').match(/^confirm:create:([a-f0-9]{12})$/u);
 if(!match||mode!=='create_confirm'||!draft)return null;
 if(draft.revision!==match[1]||Number(draft.confirmMessageId)!==Number(messageId))return null;
 return draft;
}

export async function executeCloseConfirmation({data,state,messageId,closeOne,onAccepted=async()=>{},onResult=()=>{}}){
 const confirmed=validateCloseConfirmation({data,draft:state.closeDraft,mode:state.mode,messageId});
 if(!confirmed)return null;
 const draft=confirmed.draft;
 state.closeDraft=null;
 state.mode='closing';
 await onAccepted(draft);
 const results=[];
 try{
  for(const id of draft.ids){
   try{
    const result=await closeOne(id,{solution:draft.solution,minutes:draft.minutes,operationId:draft.revision,scope:confirmed.kind});
    results.push({id,state:result.state});
    onResult({id,result,draft});
   }catch(error){
    results.push({id,state:'failed'});
    onResult({id,error,draft});
   }
  }
 }finally{state.mode=null}
 return{draft,results};
}
