import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, stat } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { normalizeParking, distanceMeters, nearestParking, parseParkingPage, fetchBusanParking } from '../lib/parking.ts';
import { saveKey } from '../scripts/save-key.mjs';
const row = (id, lat = 35.15, lng = 129.1) => ({ prkplceNo: String(id), prkplceNm: `주차장${id}`, lnmadr: '부산광역시 수영구 광안동', latitude: lat, longitude: lng, prkcmprt: '40', parkingchrgeInfo: '유료', basicTime: '30', basicCharge: '1000', weekdayOperOpenHhmm: '09:00', weekdayOperColseHhmm: '20:00', referenceDate: '2026-01-01' });
const page = (rows, total) => ({ response: { header: { resultCode: '00' }, body: { items: rows, totalCount: total } } });
test('parking coordinates and missing fees are never fabricated', () => {
  assert.equal(normalizeParking({ ...row(1), latitude: '' }), null);
  assert.equal(normalizeParking({ ...row(1), latitude: 0 }), null);
  assert.equal(normalizeParking({ ...row(1), longitude: 35 }), null);
  assert.equal(normalizeParking({ ...row(1), longitude: 'NaN' }), null);
  const p = normalizeParking(row(1));
  assert.equal(p.spaces, 40);
  assert.match(p.fee, /30分|30분/);
  assert.match(p.fee, /1,000원/);
  assert.equal(p.weekday, '09:00 ~ 20:00');
  const missing = normalizeParking({ ...row(1), parkingchrgeInfo: '', basicCharge: '', basicTime: '', prkcmprt: '' });
  assert.equal(missing.fee, '요금 정보 없음');
  assert.equal(missing.spaces, null);
});
test('nearby parking uses distance, a 2km limit and at most 5 results', () => {
  assert.equal(distanceMeters(35,129,35,129), 0);
  assert.ok(Math.abs(distanceMeters(35,129,35.01,129) - 1111.95) < 1);
  const near = [0.002,0.005,0.001,0.004,0.003,0.006,0.03].map((delta,i) => normalizeParking(row(i,35.15+delta,129.1)));
  const result = nearestParking(near,35.15,129.1);
  assert.equal(result.length, 5);
  assert.equal(result[0].id, '2');
  assert.ok(result.every((p,i) => p.distanceMeters <= 2000 && (!i || result[i-1].distanceMeters <= p.distanceMeters)));
  assert.equal(nearestParking([normalizeParking(row(1,36,129))],35.15,129.1).length,0);
});
test('national pages are collected before local Busan filtering and deduplication', async () => {
  const seen=[];
  const items=await fetchBusanParking('test%2Bparking%2Fkey%3D',async url => {
    const params=new URL(url).searchParams;
    assert.equal(params.get('serviceKey'),'test+parking/key=');
    assert.equal(params.get('type'),'json');
    assert.equal(params.has('lnmadr'),false);
    assert.equal(params.has('rdnmadr'),false);
    seen.push(params.get('pageNo'));
    return Response.json(params.get('pageNo')==='1'
      ? page([row(1),{...row(3),lnmadr:'경기도 포천시'}],4)
      : page([row(1),{...row(2),lnmadr:'',rdnmadr:'부산광역시 동래구'}],4));
  });
  assert.equal(items.length,2);
  assert.deepEqual(seen,['1','2']);
  assert.deepEqual(items.map(p=>p.id),['1','2']);
});
test('missing data is empty but truncated pages and bad response shapes fail', async () => {
  assert.deepEqual(parseParkingPage({response:{header:{resultCode:'03'}}}),{rows:[],total:0});
  assert.throws(()=>parseParkingPage({}),/형식/);
  await assert.rejects(fetchBusanParking('test-parking',async()=>Response.json(page([],10))),/모두 가져오지/);
});
test('upstream and network errors never reveal credentials or response bodies',async()=>{
  const secret='private-test-parking-key';
  for (const raw of [JSON.stringify({response:{header:{resultCode:'30',resultMsg:secret}}}),`<error><returnReasonCode>30</returnReasonCode>${secret}</error>`]) {
    await assert.rejects(fetchBusanParking(secret,async()=>new Response(raw)),e=>!e.message.includes(secret)&&/인증/.test(e.message));
  }
  await assert.rejects(fetchBusanParking(secret,async()=>{throw new Error(secret);}),e=>!e.message.includes(secret));
});
test('parking key is saved separately while restaurant key stays intact',async()=>{
  const dir=await mkdtemp(join(tmpdir(),'busan-parking-key-'));
  try {
    await saveKey(dir,'restaurant-test-key');
    await saveKey(dir,'parking-test-key','PARKING_API_KEY');
    await saveKey(dir,'parking-updated-key','PARKING_API_KEY');
    const env=await readFile(join(dir,'.env'),'utf8');
    assert.match(env,/BUSAN_API_KEY="restaurant-test-key"/);
    assert.match(env,/PARKING_API_KEY="parking-updated-key"/);
    assert.equal(env.match(/PARKING_API_KEY=/g).length,1);
    assert.equal((await stat(join(dir,'.env'))).mode&0o777,0o600);
    await assert.rejects(saveKey(dir,'test-value-key','NEXT_PUBLIC_KEY'));
  } finally { await rm(dir,{recursive:true,force:true}); }
});


test('parking registration command writes only PARKING_API_KEY', async () => {
  const { cp, mkdir } = await import('node:fs/promises');
  const { spawnSync } = await import('node:child_process');
  const dir = await mkdtemp(join(tmpdir(), 'parking-command-test-'));
  try {
    await mkdir(join(dir, 'scripts'));
    for (const file of ['save-key.mjs', 'register-parking-key.command']) await cp(new URL(`../scripts/${file}`, import.meta.url), join(dir, 'scripts', file));
    await saveKey(dir, 'restaurant-original-key');
    const key = 'parking-cli-secret-test';
    const result = spawnSync('/bin/bash', [join(dir, 'scripts/register-parking-key.command')], { input: `${key}\n`, encoding: 'utf8', env: { ...process.env, PATH: `${join(process.execPath, '..')}:${process.env.PATH || ''}` } });
    assert.equal(result.status, 0);
    assert.equal((result.stdout + result.stderr).includes(key), false);
    const env = await readFile(join(dir, '.env'), 'utf8');
    assert.match(env, /BUSAN_API_KEY="restaurant-original-key"/);
    assert.match(env, /PARKING_API_KEY="parking-cli-secret-test"/);
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('HTTP 403 gateway errors show the registration reason without leaking the key', async () => {
  const secret = 'private-gateway-test-key';
  const payload = { OpenAPI_ServiceResponse: { cmmMsgHeader: { errMsg: secret, returnAuthMsg: secret, returnReasonCode: '30' } } };
  assert.throws(() => parseParkingPage(payload), /오류 30/);
  await assert.rejects(fetchBusanParking(secret, async () => Response.json(payload, { status: 403 })), error => error.code === 'PARKING_PROVIDER_ERROR' && error.message.includes('오류 30') && !error.message.includes(secret));
});


test('actual unwrapped provider response and item envelope are supported', () => {
  const parsed = parseParkingPage({header:{resultCode:'00',resultMsg:'NORMAL SERVICE.'},body:{items:{item:[row(1)]},numOfRows:1000,pageNo:1,totalCount:1}});
  assert.equal(parsed.total,1);
  assert.equal(parsed.rows[0].prkplceNo,'1');
});
