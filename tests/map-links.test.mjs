import test from 'node:test';
import assert from 'node:assert/strict';
import { naverPlaceQuery, naverPlaceLink, naverAddressQuery, naverAddressLink } from '../lib/map-links.ts';

test('restaurant searches use Busan, district and name without floors or full addresses', () => {
  const r = { name: '장안매운탕', district: '기장군', address: '부산광역시 기장군 장안읍 장안로 75-4, 1,2층' };
  assert.equal(naverPlaceQuery(r), '부산 기장군 장안매운탕');
  assert.equal(decodeURIComponent(new URL(naverPlaceLink(r)).pathname), '/p/search/부산 기장군 장안매운탕');
  assert.equal(naverAddressQuery(r.address), '부산광역시 기장군 장안읍 장안로 75-4');
});
test('district is recovered from full district names and parking addresses', () => {
  assert.equal(naverPlaceQuery({ name: '포항물횟집', district: '부산광역시 수영구', address: '' }), '부산 수영구 포항물횟집');
  assert.equal(naverPlaceQuery({ name: '충무동제2공영', address: '부산광역시 서구 토성동3가 32' }), '부산 서구 충무동제2공영');
  assert.equal(naverPlaceQuery({ name: '가야마당돼지국밥', address: '부산시 부산진구 가야공원로 64' }), '부산 부산진구 가야마당돼지국밥');
});
test('address fallback strips floor and parenthetical details, preserving street numbers', () => {
  assert.equal(naverAddressQuery('부산광역시 서구 구덕로 167, 지상2층 (아미동1가)'), '부산광역시 서구 구덕로 167');
  assert.equal(naverAddressQuery('부산 수영구 남천동로9번길 41 (남천동)'), '부산 수영구 남천동로9번길 41');
  assert.equal(decodeURIComponent(new URL(naverAddressLink('부산 기장군 장안로 75-4, 1층')).pathname), '/p/search/부산 기장군 장안로 75-4');
});
test('special characters in business names remain encoded as one search path', () => {
  const url = new URL(naverPlaceLink({name:'헬로쭈꾸미&보쌈 #1',address:'부산 수영구'}));
  assert.equal(url.hash,'');
  assert.equal(url.search,'');
  assert.equal(decodeURIComponent(url.pathname),'/p/search/부산 수영구 헬로쭈꾸미&보쌈 #1');
});
