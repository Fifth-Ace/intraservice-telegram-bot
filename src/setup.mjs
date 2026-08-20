import fs from 'node:fs';
import path from 'node:path';
import {constants} from 'node:fs';
import {ROOT,readConfig,validateConfig} from './config.mjs';

for(const [src,dst] of [['.env.example','.env'],['config.example.json','config.json']]){const from=path.join(ROOT,src),to=path.join(ROOT,dst);try{fs.copyFileSync(from,to,constants.COPYFILE_EXCL);console.log(`Created ${dst}`)}catch(e){if(e.code==='EEXIST')console.log(`Kept existing ${dst}`);else throw e}}
for(const dir of ['data','logs'])fs.mkdirSync(path.join(ROOT,dir),{recursive:true});
const errors=validateConfig(readConfig(path.join(ROOT,'config.json')));if(errors.length)throw Error(errors.join('\n'));
console.log('\nSetup files are ready. Edit .env and config.json, then run:');
console.log('  npm run validate');
console.log('  npx playwright install chromium');
console.log('  npm start');
