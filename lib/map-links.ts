// Public search links only: the open datasets do not include Naver Place IDs.
// Keep venue queries short; floor/unit/address fragments can confuse place search.
export type MapPlace = { name: string; address: string; district?: string };
const districtPattern = /강서구|금정구|기장군|남구|동구|동래구|부산진구|북구|사상구|사하구|서구|수영구|연제구|영도구|중구|해운대구/;
const tidy = (value: string) => value.replace(/\s+/g, ' ').trim();
const search = (query: string) => `https://map.naver.com/p/search/${encodeURIComponent(query)}`;
export function naverPlaceQuery(place: MapPlace): string {
  const district = place.district?.match(districtPattern)?.[0] || place.address.match(districtPattern)?.[0];
  return tidy(['부산', district, place.name].filter(Boolean).join(' '));
}
export function naverPlaceLink(place: MapPlace): string {
  return search(naverPlaceQuery(place));
}
export function naverAddressQuery(address: string): string {
  return tidy(address.replace(/\([^)]*\)/g, '').split(/[,，]/)[0]);
}
export function naverAddressLink(address: string): string {
  return search(naverAddressQuery(address));
}
