import http from 'node:http';
import https from 'node:https';
import { syncBuiltinESMExports } from 'node:module';

const deny = () => { throw new Error('UNEXPECTED_OUTBOUND_REQUEST'); };
globalThis.fetch = deny;
http.request = http.get = https.request = https.get = deny;
syncBuiltinESMExports();
