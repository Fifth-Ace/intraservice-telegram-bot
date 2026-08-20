#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import {once} from 'node:events';
import {readConfig,ROOT} from '../src/config.mjs';
import {Storage} from '../src/storage.mjs';
import {HybridIntraServiceClient} from '../src/intraservice_hybrid_client.mjs';
import {IntraServiceApiClient} from '../src/intraservice_api_client.mjs';
const config=readConfig(path.join(ROOT,'config.example.json')),tasks=new Map(),expenses=new Map(),requests=[];let forceConflict=false;
const makeTask=(id,name='Synthetic ticket')=>({Task:{Id:Number(id),Name:name,Description:name,StatusId:1,StatusName:'Open',Changed:'c1',ExecutorIds:'100',ExecutorNames:'Example User',CategoryIds:'1',CategoryNames:'Workstation',Field1001:'Example Requester',Field1002:'1',Field1003:'101',Field1004:''},Rights:{CurrentUserId:100,Status:4,AssignExecutors:true,ToStatuses:[{Id:2}]},TaskType:{TaskTypeFields:[{Id:1001,Name:'Requester',Rights:4},{Id:1002,Name:'Location',Rights:4},{Id:1003,Name:'Cabinet',Rights:4},{Id:1004,Name:'Solution',Rights:4}]}});
tasks.set('123',makeTask('123'));expenses.set('123',[]);
const server=http.createServer(async(req,res)=>{const chunks=[];for await(const chunk of req)chunks.push(chunk);const body=chunks.length?JSON.parse(Buffer.concat(chunks).toString('utf8')):null,url=new URL(req.url,'http://local');requests.push({method:req.method,path:url.pathname,authorization:Boolean(req.headers.authorization)});res.setHeader('Content-Type','application/json');
 if(url.pathname==='/api/task'&&req.method==='GET')return res.end(JSON.stringify({Tasks:[...tasks.values()].map(x=>x.Task)}));
 if(url.pathname==='/api/newtask')return res.end(JSON.stringify({...makeTask('0'),Task:{...makeTask('0').Task,CreatorId:100,PriorityId:1,WorkflowId:1,ReactionDate:'2026-01-01',Deadline:'2026-01-02'}}));
 if(url.pathname==='/api/task'&&req.method==='POST'){const id='124',root=makeTask(id,body.Name);Object.assign(root.Task,body,{Id:Number(id),Changed:'c1',StatusName:'Open'});tasks.set(id,root);expenses.set(id,[]);res.statusCode=201;return res.end(JSON.stringify({Task:{Id:Number(id)}}))}
 const taskMatch=url.pathname.match(/^\/api\/task\/(\d+)$/u);if(taskMatch){const id=taskMatch[1],root=tasks.get(id);if(!root){res.statusCode=404;return res.end('{}')}if(req.method==='GET')return res.end(JSON.stringify(root));if(req.method==='PUT'){if(forceConflict||String(body.Changed)!==String(root.Task.Changed)){forceConflict=false;res.statusCode=409;return res.end(JSON.stringify({code:'conflict'}))}Object.assign(root.Task,body,{Changed:`c${Date.now()}`,StatusName:String(body.StatusId)==='2'?'Closed':'Open'});return res.end(JSON.stringify({ok:true}))}}
 if(url.pathname==='/api/taskexpenses'&&req.method==='GET'){const id=url.searchParams.get('taskid');return res.end(JSON.stringify({Expenses:expenses.get(id)||[]}))}
 if(url.pathname==='/api/taskexpenses'&&req.method==='POST'){const id=String(body.TaskId),rows=expenses.get(id)||[];rows.push({Id:rows.length+1,TaskId:Number(id),Minutes:body.Minutes,UserId:body.UserId,Comment:body.Comments});expenses.set(id,rows);res.statusCode=201;return res.end(JSON.stringify({Id:rows.length}))}
 res.statusCode=404;res.end('{}')});server.listen(0,'127.0.0.1');await once(server,'listening');
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'intraservice-api-beta-')),store=new Storage(path.join(dir,'test.sqlite3')),baseUrl=`http://127.0.0.1:${server.address().port}`,cfg={...config,base_url:baseUrl,api:{...config.api,enabled:true,mutations:{create:true,close:true,batch_close:true}}};
try{
 const readOnly=new IntraServiceApiClient({baseUrl,credentials:{login:'example',password:'example'}});await assert.rejects(()=>readOnly.request('task',{method:'POST',body:{}}),/API_READ_ONLY_CLIENT/);
 const hybrid=new HybridIntraServiceClient({config:cfg,credentials:{login:'example',password:'example'},root:dir,store});
 const list=await hybrid.listTasks();assert.equal(list.length,1);assert.equal(list[0].id,'123');
 const card=await hybrid.getTask('123');assert.equal(card.cabinet,'101');assert.equal(card.executors[0].id,'100');
 const created=await hybrid.createTask({title:'API beta create',description:'API beta create',requester:'Example Requester',locationId:'1',cabinet:'102',categoryIds:['1'],executorIds:['100']});assert.equal(created.id,'124');assert.equal(created.cabinet,'102');
 const first=await hybrid.closeTask('123',{solution:'Synthetic verified solution',minutes:15,operationId:'abcdef123456',scope:'single'}),second=await hybrid.closeTask('123',{solution:'Synthetic verified solution',minutes:15,operationId:'abcdef123456',scope:'single'});assert.equal(first.state,'closed');assert.equal(second.state,'closed');assert.equal(expenses.get('123').length,1);assert.equal(store.db.prepare("SELECT state FROM api_close_operations WHERE task_id='123'").get().state,'completed');
 const stale=tasks.get('124').Task.Changed;await hybrid.writer.updateTask('124',{Description:'first',Changed:stale});await assert.rejects(()=>hybrid.writer.updateTask('124',{Description:'stale',Changed:stale}),error=>error.status===409&&error.code==='API_CONFLICT');
 let legacyCloseCalls=0;hybrid.legacy.closeTask=async()=>{legacyCloseCalls++;return{state:'closed'}};forceConflict=true;await assert.rejects(()=>hybrid.closeTask('124',{solution:'Conflict must stop',minutes:5,operationId:'conflict-revision',scope:'single'}),/TASK_UNCERTAIN/);assert.equal(legacyCloseCalls,0);assert.equal(expenses.get('124').length,0);
 assert.ok(requests.every(x=>x.authorization));
 console.log(JSON.stringify({ok:true,apiRead:true,apiCreate:true,changed409:true,conflictBlocksFallback:true,durableClose:true,idempotentExpense:true,playwrightNotLaunched:true,requests:requests.length}));
}finally{store.close();server.close();await once(server,'close');fs.rmSync(dir,{recursive:true,force:true})}
