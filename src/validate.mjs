import path from 'node:path';
import {ROOT,readConfig,validateConfig,loadRuntime} from './config.mjs';

const examples=process.argv.includes('--examples');
if(examples){const errors=validateConfig(readConfig(path.join(ROOT,'config.example.json')));if(errors.length)throw Error(`Example config invalid:\n${errors.join('\n')}`);console.log(JSON.stringify({ok:true,examples:true},null,2));process.exit(0)}
const runtime=loadRuntime();const placeholders=[];for(const [k,v] of Object.entries(runtime.env))if(/replace_me|example/i.test(v))placeholders.push(k);if(placeholders.length)throw Error(`Replace placeholder values: ${placeholders.join(', ')}`);if(!/^\d{5,}:[A-Za-z0-9_-]{20,}$/u.test(runtime.env.TELEGRAM_BOT_TOKEN))throw Error('TELEGRAM_BOT_TOKEN format looks invalid');console.log(JSON.stringify({ok:true,baseUrl:new URL(runtime.config.base_url).origin,allowedUsers:runtime.allowedUsers.length,locations:runtime.config.locations.length,executors:runtime.config.executors.length,categories:runtime.config.categories.length},null,2));
