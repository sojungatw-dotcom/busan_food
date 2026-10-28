import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, stat, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fetchAll, parsePage, normalize } from '../lib/restaurants.ts';
import { saveKey } from '../scripts/save-key.mjs';

const row = (id) => ({ bsnsNm: `식당${id}`, addrRoad: `부산 수영구 ${id}`, gugun: '수영구', bsnsCond: '한식', menu: '국밥', lat: '35.1', lng: '129.1' });
const page = (rows, total) => ({ response: { header: { resultCode: '00' }, body: { items: { item: rows }, totalCount: total } } });
test('normalizes singleton, optional fields and coordinates', () => {
  assert.equal(parsePage(page(row(1), 1)).items.length, 1);
  assert.equal(normalize({ bsnsNm: '식당', addrRoad: 'null', addrJibun: '지번', tel: null }).address, '지번');
  assert.equal(normalize({ lat: '', lng: 'NaN' }).latitude, null);
  assert.equal(normalize(row(1)).longitude, 129.1);
  assert.deepEqual(parsePage(page('', 0)), { items: [], total: 0 });
  assert.throws(() => parsePage({ response: { body: {} } }), /형식/);
});
test('collects every page and encodes either key format exactly once', async () => {
  for (const key of ['test+key/with=suffix', 'test%2Bkey%2Fwith%3Dsuffix']) {
    const seen = [];
    const items = await fetchAll(key, async url => {
      const parsed = new URL(url);
      assert.equal(parsed.protocol, 'https:');
      assert.equal(parsed.searchParams.get('ServiceKey'), 'test+key/with=suffix');
      seen.push(parsed.searchParams.get('pageNo'));
      return Response.json(seen.length === 1 ? page(Array.from({ length: 100 }, (_, i) => row(i)), 101) : page(row(100), 101));
    });
    assert.equal(items.length, 101);
    assert.deepEqual(seen, ['1', '2']);
  }
});
test('handles provider envelope variants', () => {
  assert.equal(parsePage({ getTblFnrstrnStusInfo: { header: { resultCode: '00' }, item: [row(1)], totalCount: 1 } }).items[0].name, '식당1');
});
test('provider and network errors never reveal raw responses or secrets', async () => {
  const secret = 'test-secret-credential';
  for (const body of [JSON.stringify({ response: { header: { resultCode: '30', resultMsg: secret } } }), `<error><returnReasonCode>30</returnReasonCode><secret>${secret}</secret></error>`]) {
    await assert.rejects(fetchAll(secret, async () => new Response(body)), e => !e.message.includes(secret) && e.code === 'PROVIDER_ERROR');
  }
  await assert.rejects(fetchAll(secret, async () => { throw new Error(secret); }), e => !e.message.includes(secret) && e.code === 'NETWORK_ERROR');
  await assert.rejects(fetchAll(secret, async () => new Response(secret, { status: 403 })), e => !e.message.includes(secret));
});
test('truncated provider pages fail instead of producing biased recommendations', async () => {
  await assert.rejects(fetchAll('sample-key-only', async () => Response.json(page([], 100))), /모두 가져오지/);
});
test('saves key privately, preserves unrelated values, rejects injected lines', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'busan-key-test-'));
  try {
    await writeFile(join(dir, '.env'), 'OTHER=keep\n');
    await saveKey(dir, 'test+key/with=suffix');
    assert.equal((await stat(join(dir, '.env'))).mode & 0o777, 0o600);
    assert.match(await readFile(join(dir, '.env'), 'utf8'), /^OTHER=keep\nBUSAN_API_KEY="test\+key\/with=suffix"\n$/);
    await saveKey(dir, 'replacement-key');
    assert.equal((await readFile(join(dir, '.env'), 'utf8')).match(/BUSAN_API_KEY=/g).length, 1);
    await assert.rejects(saveKey(dir, 'bad\nNEXT_PUBLIC_KEY=leak'));
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('registration CLI accepts hex keys without echoing credentials', async () => {
  const { cp, mkdir } = await import('node:fs/promises');
  const { spawnSync } = await import('node:child_process');
  const dir = await mkdtemp(join(tmpdir(), 'busan-registration-cli-'));
  const key = 'a'.repeat(64);
  try {
    await mkdir(join(dir, 'scripts'));
    await cp(new URL('../scripts/save-key.mjs', import.meta.url), join(dir, 'scripts/save-key.mjs'));
    await cp(new URL('../scripts/register-key.command', import.meta.url), join(dir, 'scripts/register-key.command'));
    const env = { ...process.env, PATH: `${join(process.execPath, '..')}:${process.env.PATH || ''}` };
    const result = spawnSync('/bin/bash', [join(dir, 'scripts/register-key.command')], { input: `${key}\n`, encoding: 'utf8', env });
    assert.equal(result.status, 0);
    assert.equal((result.stdout + result.stderr).includes(key), false);
    assert.equal(JSON.parse((await readFile(join(dir, '.env'), 'utf8')).split('=')[1]), key);
    for (const [input, code] of [['\n', 'EMPTY_KEY'], ['invalid key value\n', 'INVALID_KEY']]) {
      const failed = spawnSync('/bin/bash', [join(dir, 'scripts/register-key.command')], { input, encoding: 'utf8', env });
      assert.equal(failed.status, 1);
      assert.match(failed.stderr, new RegExp(code));
      assert.equal((failed.stdout + failed.stderr).includes(input.trim() || 'not-present-test'), false);
    }
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('Vercel reads only server environment variables without needing a local .env', async () => {
  const { readApiKey } = await import('../lib/restaurants.ts');
  const original = { VERCEL: process.env.VERCEL, BUSAN_API_KEY: process.env.BUSAN_API_KEY, PARKING_API_KEY: process.env.PARKING_API_KEY };
  try {
    process.env.VERCEL = '1';
    process.env.BUSAN_API_KEY = 'server-restaurant-test-key';
    process.env.PARKING_API_KEY = 'server-parking-test-key';
    assert.equal(await readApiKey(), 'server-restaurant-test-key');
    assert.equal(await readApiKey('PARKING_API_KEY'), 'server-parking-test-key');
    delete process.env.PARKING_API_KEY;
    assert.equal(await readApiKey('PARKING_API_KEY'), '');
  } finally {
    for (const [name, value] of Object.entries(original)) {
      if (value === undefined) delete process.env[name]; else process.env[name] = value;
    }
  }
});
