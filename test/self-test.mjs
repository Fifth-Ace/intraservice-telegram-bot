#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {readConfig,validateConfig,parseEnv,ROOT} from '../src/config.mjs';
import {Storage} from '../src/storage.mjs';
import {ticketListView,templatePickerKeyboard,minuteKeyboard,PAGE_SIZE} from '../src/ui.mjs';
import {parseCreateInput,parseTemplateInput} from '../src/app.mjs';

const cfg=readConfig(path.join(ROOT,'config.example.json'));assert.deepEqual(validateConfig(cfg),[]);assert.equal(parseEnv('A=1\nB="two"\n').B,'two');
const create=parseCreateInput('Printer issue | 101 | main | workstation | admin',cfg);assert.equal(create.ok,true);assert.equal(create.draft.locationId,'1');assert.equal(parseCreateInput('bad',cfg).ok,false);
const template=parseTemplateInput('Restart printing | Printers | 15 | Print service restarted.');assert.equal(template.ok,true);assert.equal(template.value.minutes,15);assert.equal(parseTemplateInput('bad').ok,false);
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'intraservice-community-')),store=new Storage(path.join(dir,'test.sqlite3'));try{const id=store.addTemplate({name:'Restart',category:'Printers',solution:'Restarted.',minutes:15});assert.equal(store.getTemplate(id).name,'Restart');store.markTemplateUsed(id);assert.equal(store.getTemplate(id).use_count,1);assert.equal(store.toggleTemplate(id).active,0);assert.equal(store.listTemplates({active:true}).length,0);for(let i=1;i<=10;i++)store.toggleSelection('chat','user',String(i));assert.equal(store.getSelection('chat','user').length,10);assert.throws(()=>store.toggleSelection('chat','user','11'),/SELECTION_LIMIT/);store.toggleSelection('chat','user','1');assert.equal(store.getSelection('chat','user').length,9);store.clearSelection('chat','user');assert.equal(store.getSelection('chat','user').length,0)}finally{store.close();fs.rmSync(dir,{recursive:true,force:true})}
const tasks=Array.from({length:8},(_,i)=>({id:String(1000+i),title:`Long public test ticket title ${i}`,status:'Open'})),normal=ticketListView(tasks,{page:0}),select=ticketListView(tasks,{page:0,selectionMode:true,selected:['1000']});const normalItems=normal.reply_markup.inline_keyboard.filter(r=>r.some(x=>x.callback_data?.startsWith('view:'))),selectItems=select.reply_markup.inline_keyboard.filter(r=>r.some(x=>x.callback_data?.startsWith('sel:')));assert.equal(normalItems.length,PAGE_SIZE);assert.ok(normalItems.every(r=>r.length===1));assert.equal(selectItems.length,PAGE_SIZE);assert.ok(selectItems.every(r=>r.length===1));assert.ok(selectItems[0][0].text.startsWith('☑ #1000'));const keyboards=[normal.reply_markup,select.reply_markup,templatePickerKeyboard([{id:1,name:'Template',default_minutes:15}]),minuteKeyboard()];const callbacks=keyboards.flatMap(k=>k.inline_keyboard.flat()).map(x=>x.callback_data).filter(Boolean);assert.equal(callbacks.filter(x=>Buffer.byteLength(x,'utf8')>64).length,0);
console.log(JSON.stringify({ok:true,config:true,storage:true,parsers:true,fullWidthModes:true,callbacks:callbacks.length},null,2));
