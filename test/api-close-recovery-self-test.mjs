#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {Storage} from '../src/storage.mjs';
import {ApiCloseCoordinator,closeOperationKey} from '../src/api_close.mjs';
const config={fields:{solution:'field1004'},statuses:{closed:'2'}},root=task=>({Task:{...task},Rights:{CurrentUserId:100,Status:4,ToStatuses:[{Id:2}]},TaskType:{TaskTypeFields:[{Id:1004,Name:'Solution',Rights:4}]}});
function scenario({expenseMode='ok',taskMode='ok'}={}){const dir=fs.mkdtempSync(path.join(os.tmpdir(),'api-close-recovery-')),store=new Storage(path.join(dir,'db.sqlite3')),task={Id:10,StatusId:1,Changed:'c1',Field1004:'',ExecutorIds:'100'},rows=[],calls={task:0,expense:0},reader={async getTask(){return{data:root(task)}},async getTaskExpenses(){return{data:{Expenses:rows.map(x=>({...x}))}}}},writer={async updateTask(id,patch){calls.task++;if(taskMode==='timeout')throw Error('timeout');Object.assign(task,patch,{Changed:'c2'})},async addTaskExpense(body){calls.expense++;if(expenseMode==='before')throw Error('timeout');rows.push({Id:1,Minutes:body.Minutes,Comment:body.Comments});if(expenseMode==='after')throw Error('timeout')}};return{dir,store,task,rows,calls,coordinator:new ApiCloseCoordinator({config,store,reader,writer}),cleanup(){store.close();fs.rmSync(dir,{recursive:true,force:true})}}}
const input={taskId:'10',solution:'Verified solution',minutes:15,operationKey:closeOperationKey({scope:'single',scopeId:'rev1',taskId:'10',solution:'Verified solution',minutes:15})};
const normal=scenario();try{await normal.coordinator.run(input);await normal.coordinator.run(input);assert.equal(normal.calls.task,1);assert.equal(normal.calls.expense,1);assert.equal(normal.store.getApiClose(input.operationKey).state,'completed')}finally{normal.cleanup()}
const after=scenario({expenseMode:'after'});try{await after.coordinator.run(input);assert.equal(after.calls.expense,1);assert.equal(after.rows.length,1);assert.equal(after.store.getApiClose(input.operationKey).state,'completed')}finally{after.cleanup()}
const before=scenario({expenseMode:'before'});try{await assert.rejects(()=>before.coordinator.run(input));assert.equal(before.store.getApiClose(input.operationKey).state,'uncertain');await assert.rejects(()=>before.coordinator.run(input),/UNCERTAIN_REQUIRES_REVIEW/);assert.equal(before.calls.expense,1)}finally{before.cleanup()}
const taskTimeout=scenario({taskMode:'timeout'});try{await assert.rejects(()=>taskTimeout.coordinator.run(input),/TASK_UNCERTAIN/);assert.equal(taskTimeout.store.getApiClose(input.operationKey).state,'uncertain');assert.equal(taskTimeout.calls.expense,0)}finally{taskTimeout.cleanup()}
console.log(JSON.stringify({ok:true,idempotent:true,expenseVisibleRecovery:true,expenseInvisibleNoRetry:true,taskUncertainBlocked:true}));
