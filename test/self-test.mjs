#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {readConfig,validateConfig,parseEnv,ROOT} from '../src/config.mjs';
import {Storage} from '../src/storage.mjs';
import {ticketListView,templateCategoriesKeyboard,templateCategoryKey,templatePickerKeyboard,templatesKeyboard,minuteKeyboard,confirmKeyboard,createConfirmKeyboard,PAGE_SIZE,TEMPLATE_PICKER_PAGE_SIZE,TEMPLATE_CATALOG_PAGE_SIZE} from '../src/ui.mjs';
import {parseCreateInput,parseTemplateInput} from '../src/app.mjs';
import {normalizeNonNegativeInt,resolveCategoryByKey,validateCloseConfirmation,validateCreateConfirmation,executeCloseConfirmation} from '../src/navigation.mjs';

const cfg=readConfig(path.join(ROOT,'config.example.json'));
assert.deepEqual(validateConfig(cfg),[]);
assert.equal(parseEnv('A=1\nB="two"\n').B,'two');
const create=parseCreateInput('Printer issue | 101 | main | workstation | admin',cfg);
assert.equal(create.ok,true);
assert.equal(create.draft.locationId,'1');
assert.equal(parseCreateInput('bad',cfg).ok,false);
const parsedTemplate=parseTemplateInput('Restart printing | Printing | 15 | Print service restarted.');
assert.equal(parsedTemplate.ok,true);
assert.equal(parsedTemplate.value.minutes,15);
assert.equal(parseTemplateInput('bad').ok,false);

const dir=fs.mkdtempSync(path.join(os.tmpdir(),'intraservice-community-'));
const store=new Storage(path.join(dir,'test.sqlite3'));
let categories=[];
let templates=[];
let disabledTemplates=[];
try{
 const id=store.addTemplate({name:'Temporary',category:'Hardware',solution:'Completed.',minutes:15});
 assert.equal(store.getTemplate(id).name,'Temporary');
 store.markTemplateUsed(id);
 assert.equal(store.getTemplate(id).use_count,1);
 assert.equal(store.toggleTemplate(id).active,0);
 assert.equal(store.listTemplates({active:true}).length,0);
 const names=['Hardware','Printing','Software'];
 for(let i=1;i<=29;i++)store.addTemplate({name:`Template ${String(i).padStart(2,'0')}`,category:names[(i-1)%names.length],solution:`Generic solution ${i}.`,minutes:15+(i%3)*15});
 assert.equal(store.countTemplates({active:true}),29);
 assert.equal(store.countTemplates({active:false}),1);
 disabledTemplates=store.listTemplates({active:false,order:'name'});
 assert.equal(disabledTemplates[0].name,'Temporary');
 assert.equal(store.toggleTemplate(disabledTemplates[0].id).active,1);
 assert.equal(store.getTemplate(disabledTemplates[0].id,{activeOnly:true}).name,'Temporary');
 assert.equal(store.toggleTemplate(disabledTemplates[0].id).active,0);
 assert.doesNotThrow(()=>store.listTemplates({active:true,offset:1.9,limit:8.7}));
 assert.equal(store.listTemplates({active:true,offset:1.9,limit:8.7}).length,8);
 assert.doesNotThrow(()=>store.listTemplates({active:true,offset:Infinity,limit:Infinity}));
 assert.equal(store.countTemplates({active:true,category:'Hardware'}),10);
 assert.equal(store.countTemplates({active:true,category:"Hardware' OR 1=1 --"}),0);
 categories=store.listTemplateCategories({active:true});
 assert.deepEqual(categories.map(x=>x.category),names);
 assert.deepEqual(categories.map(x=>x.count),[10,10,9]);
 assert.equal(store.listTemplates({active:true,order:'name',limit:8,offset:24}).length,5);
 assert.ok(store.listTemplates({active:true,category:'Printing',order:'name',limit:50}).every(x=>x.category==='Printing'));
 templates=store.listTemplates({active:true,order:'name',limit:50});
 for(let i=1;i<=10;i++)store.toggleSelection('chat','user',String(i));
 assert.equal(store.getSelection('chat','user').length,10);
 assert.throws(()=>store.toggleSelection('chat','user','11'),/SELECTION_LIMIT/);
 store.toggleSelection('chat','user','1');
 assert.equal(store.getSelection('chat','user').length,9);
 store.clearSelection('chat','user');
 assert.equal(store.getSelection('chat','user').length,0);
}finally{
 store.close();
 fs.rmSync(dir,{recursive:true,force:true});
}

const tasks=Array.from({length:8},(_,i)=>({id:String(1000+i),title:`Long public test ticket title ${i}`,status:'Open'}));
const normal=ticketListView(tasks,{page:0});
const select=ticketListView(tasks,{page:0,selectionMode:true,selected:['1000']});
const normalItems=normal.reply_markup.inline_keyboard.filter(r=>r.some(x=>x.callback_data?.startsWith('view:')));
const selectItems=select.reply_markup.inline_keyboard.filter(r=>r.some(x=>x.callback_data?.startsWith('sel:')));
assert.equal(normalItems.length,PAGE_SIZE);
assert.ok(normalItems.every(r=>r.length===1));
assert.equal(selectItems.length,PAGE_SIZE);
assert.ok(selectItems.every(r=>r.length===1));
assert.ok(selectItems[0][0].text.startsWith('☑ #1000'));

const keys=categories.map(x=>templateCategoryKey(x.category));
assert.equal(new Set(keys).size,categories.length);
const longCategory='Very long neutral category — '+('設備とソフトウェア '.repeat(20));
const longKey=templateCategoryKey(longCategory);
assert.equal(Buffer.byteLength(`pcat:${longKey}:999`,'utf8')<=64,true);
assert.equal(longKey.includes(longCategory),false);
const pickCategories=templateCategoriesKeyboard(categories,{purpose:'pick'});
const batchCategories=templateCategoriesKeyboard(categories,{purpose:'pick',batch:true});
const manageCategories=templateCategoriesKeyboard(categories,{purpose:'manage'});
assert.ok(pickCategories.inline_keyboard.some(r=>r[0].text.includes('Hardware · 10')));
assert.ok(pickCategories.inline_keyboard.flat().some(x=>x.callback_data==='manual'));
assert.ok(batchCategories.inline_keyboard.flat().some(x=>x.callback_data==='bmanual'));
assert.ok(manageCategories.inline_keyboard.flat().some(x=>x.callback_data==='mall:0'));
assert.ok(manageCategories.inline_keyboard.flat().some(x=>x.callback_data==='mdis:0'));

const pickIds=[];
const catalogIds=[];
const keyboards=[normal.reply_markup,select.reply_markup,pickCategories,batchCategories,manageCategories,minuteKeyboard()];
for(let page=0;page<Math.ceil(templates.length/TEMPLATE_PICKER_PAGE_SIZE);page++){
 const rows=templates.slice(page*TEMPLATE_PICKER_PAGE_SIZE,(page+1)*TEMPLATE_PICKER_PAGE_SIZE);
 const kb=templatePickerKeyboard(rows,{page,total:templates.length,scope:'all'});
 keyboards.push(kb);
 pickIds.push(...kb.inline_keyboard.flat().filter(x=>x.callback_data?.startsWith('tpl:')).map(x=>Number(x.callback_data.split(':')[1])));
}
for(let page=0;page<Math.ceil(templates.length/TEMPLATE_CATALOG_PAGE_SIZE);page++){
 const rows=templates.slice(page*TEMPLATE_CATALOG_PAGE_SIZE,(page+1)*TEMPLATE_CATALOG_PAGE_SIZE);
 const kb=templatesKeyboard(rows,{page,total:templates.length,scope:'all'});
 keyboards.push(kb);
 catalogIds.push(...kb.inline_keyboard.flat().filter(x=>x.callback_data?.startsWith('template:')).map(x=>Number(x.callback_data.split(':')[1])));
}
const categoryRows=templates.filter(x=>x.category==='Hardware');
const categoryKey=templateCategoryKey('Hardware');
const categoryPicker=templatePickerKeyboard(categoryRows.slice(8),{page:1,total:categoryRows.length,scope:'category',categoryKey,batch:true});
const categoryCatalog=templatesKeyboard(categoryRows,{page:0,total:categoryRows.length,scope:'category',categoryKey});
const disabledCatalog=templatesKeyboard(disabledTemplates,{page:0,total:disabledTemplates.length,scope:'disabled'});
const clampedPicker=templatePickerKeyboard([],{page:999,total:29,scope:'all'});
const clampedCatalog=templatesKeyboard([],{page:999,total:29,scope:'all'});
keyboards.push(categoryPicker,categoryCatalog,disabledCatalog,clampedPicker,clampedCatalog);
assert.ok(clampedPicker.inline_keyboard.flat().some(x=>x.text==='4/4'));
assert.ok(clampedPicker.inline_keyboard.flat().some(x=>x.callback_data==='pall:2'));
assert.ok(clampedCatalog.inline_keyboard.flat().some(x=>x.text==='3/3'));
assert.ok(clampedCatalog.inline_keyboard.flat().some(x=>x.callback_data==='mall:1'));
assert.ok(disabledCatalog.inline_keyboard.flat().some(x=>x.callback_data===`template:${disabledTemplates[0].id}`));
assert.ok(categoryPicker.inline_keyboard.flat().some(x=>x.callback_data===`pcat:${categoryKey}:0`));
assert.ok(categoryPicker.inline_keyboard.flat().some(x=>x.callback_data?.startsWith('btpl:')));
assert.ok(categoryCatalog.inline_keyboard.flat().some(x=>x.callback_data?.startsWith('template:')));
assert.deepEqual(new Set(pickIds),new Set(templates.map(x=>x.id)));
assert.deepEqual(new Set(catalogIds),new Set(templates.map(x=>x.id)));

for(const [raw,expected] of [[undefined,0],['bad',0],[-4,0],[1.9,1],['2.8',2],[Infinity,0],['999999999999999999999',Number.MAX_SAFE_INTEGER]])assert.equal(normalizeNonNegativeInt(raw),expected);
assert.equal(resolveCategoryByKey(categories,categoryKey,templateCategoryKey).category,'Hardware');
assert.equal(resolveCategoryByKey(categories,'stale-category',templateCategoryKey),null);
assert.equal(resolveCategoryByKey([{category:'A'},{category:'B'}],'collision',()=> 'collision'),null);

const revision='abcdef123456',singleDraft={ids:['101'],solution:'Generic solution.',minutes:15,revision,confirmMessageId:501};
assert.equal(validateCloseConfirmation({data:`confirm:single:${revision}`,draft:singleDraft,mode:'close_confirm',messageId:501}).kind,'single');
assert.equal(validateCloseConfirmation({data:`confirm:batch:${revision}`,draft:singleDraft,mode:'close_confirm',messageId:501}),null);
assert.equal(validateCloseConfirmation({data:'confirm:single:000000000000',draft:singleDraft,mode:'close_confirm',messageId:501}),null);
assert.equal(validateCloseConfirmation({data:`confirm:single:${revision}`,draft:singleDraft,mode:'close_confirm',messageId:999}),null);
assert.equal(validateCreateConfirmation({data:`confirm:create:${revision}`,draft:{revision,confirmMessageId:601},mode:'create_confirm',messageId:601}).revision,revision);
assert.equal(validateCreateConfirmation({data:`confirm:create:${revision}`,draft:{revision,confirmMessageId:601},mode:'create_confirm',messageId:602}),null);

const mutations=[];
let acceptedState=null;
const closeState={mode:'close_confirm',closeDraft:{...singleDraft}};
const rejected=await executeCloseConfirmation({data:'confirm:single:000000000000',state:closeState,messageId:501,closeOne:async(...args)=>{mutations.push(args);return{state:'Closed'}}});
assert.equal(rejected,null);
assert.equal(mutations.length,0);
assert.ok(closeState.closeDraft);
const executed=await executeCloseConfirmation({data:`confirm:single:${revision}`,state:closeState,messageId:501,onAccepted:()=>{acceptedState={mode:closeState.mode,draft:closeState.closeDraft}},closeOne:async(...args)=>{mutations.push(args);return{state:'Closed'}}});
assert.deepEqual(acceptedState,{mode:'closing',draft:null});
assert.equal(mutations.length,1);
assert.deepEqual(mutations[0],['101',{solution:'Generic solution.',minutes:15}]);
assert.equal(executed.results[0].state,'Closed');
assert.equal(closeState.mode,null);
assert.equal(closeState.closeDraft,null);
assert.equal(await executeCloseConfirmation({data:`confirm:single:${revision}`,state:closeState,messageId:501,closeOne:async()=>{throw Error('must not run')}}),null);

const batchState={mode:'close_confirm',closeDraft:{ids:['201','202'],solution:'Batch solution.',minutes:30,revision,confirmMessageId:701}};
assert.equal(await executeCloseConfirmation({data:`confirm:single:${revision}`,state:batchState,messageId:701,closeOne:async()=>{throw Error('must not run')}}),null);
const batchCalls=[];
const batchExecuted=await executeCloseConfirmation({data:`confirm:batch:${revision}`,state:batchState,messageId:701,closeOne:async(id,payload)=>{batchCalls.push([id,payload]);if(id==='202')throw Error('synthetic failure');return{state:'Closed'}}});
assert.deepEqual(batchCalls.map(x=>x[0]),['201','202']);
assert.deepEqual(batchExecuted.results,[{id:'201',state:'Closed'},{id:'202',state:'failed'}]);
assert.equal(batchState.closeDraft,null);

const confirmationKeyboard=confirmKeyboard('single',revision),creationKeyboard=createConfirmKeyboard(revision);
keyboards.push(confirmationKeyboard,creationKeyboard);
assert.ok(confirmationKeyboard.inline_keyboard.flat().some(x=>x.callback_data===`confirm:single:${revision}`));
assert.ok(creationKeyboard.inline_keyboard.flat().some(x=>x.callback_data===`confirm:create:${revision}`));
const callbacks=keyboards.flatMap(k=>k.inline_keyboard.flat()).map(x=>x.callback_data).filter(Boolean);
const maxCallbackBytes=Math.max(...callbacks.map(x=>Buffer.byteLength(x,'utf8')));
assert.ok(maxCallbackBytes<=64);

console.log(JSON.stringify({ok:true,config:true,storage:true,parsers:true,fullWidthModes:true,categories:categories.length,templatesReachable:pickIds.length,catalogReachable:catalogIds.length,callbacks:callbacks.length,maxCallbackBytes},null,2));
