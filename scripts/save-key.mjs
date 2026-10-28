import { readFile, writeFile, rename, chmod, lstat } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

export async function saveKey(directory, input, variable = 'BUSAN_API_KEY') {
  if (!['BUSAN_API_KEY', 'PARKING_API_KEY'].includes(variable)) throw Object.assign(new Error('허용되지 않은 설정 항목'), { code: 'INVALID_VARIABLE' });
  const key = input.trim();
  if (!key) throw Object.assign(new Error('키가 입력되지 않았습니다. 인증키를 붙여넣고 Enter를 눌러 주세요.'), { code: 'EMPTY_KEY' });
  if (key.length < 10 || key.length > 1024 || !/^[A-Za-z0-9+/%=_-]+$/.test(key)) {
    throw Object.assign(new Error('입력에 공백·줄바꿈·허용되지 않는 문자가 포함됐거나 길이가 잘못됐습니다. 키만 다시 복사해 주세요.'), { code: 'INVALID_KEY' });
  }
  const target = join(directory, '.env');
  let existing = '';
  try {
    if ((await lstat(target)).isSymbolicLink()) throw Object.assign(new Error('.env 심볼릭 링크에는 저장할 수 없습니다.'), { code: 'ENV_SYMLINK' });
    existing = await readFile(target, 'utf8');
  } catch (error) { if (error.code !== 'ENOENT') throw error; }
  const line = `${variable}=${JSON.stringify(key)}`;
  const pattern = new RegExp(`^${variable}\\s*=.*$`, 'gm');
  const next = pattern.test(existing)
    ? existing.replace(pattern, line)
    : `${existing}${existing && !existing.endsWith('\n') ? '\n' : ''}${line}\n`;
  const temporary = join(directory, `.env.${process.pid}.tmp`);
  await writeFile(temporary, next, { mode: 0o600, flag: 'wx' });
  await rename(temporary, target);
  await chmod(target, 0o600);
}
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  try {
    const chunks = [];
    for await (const chunk of process.stdin) chunks.push(chunk);
    await saveKey(join(dirname(fileURLToPath(import.meta.url)), '..'), Buffer.concat(chunks).toString('utf8'), process.argv[2] || 'BUSAN_API_KEY');
    console.log('✓ 키를 프로젝트 .env에 안전하게 저장했습니다. (파일 권한 600)');
    console.log(process.argv[2] === 'PARKING_API_KEY' ? '음식점 추천 후 근처 주차장 영역의 ‘다시 조회’를 누르세요. 키는 출력되지 않습니다.' : '웹페이지에서 ‘데이터 새로고침’을 누르세요. 키는 출력되지 않습니다.');
  } catch (error) {
    const explanations = {
      EMPTY_KEY: '키가 입력되지 않았습니다. 인증키를 붙여넣고 Enter를 눌러 주세요.',
      INVALID_KEY: '입력에 공백·줄바꿈·허용되지 않는 문자가 포함됐거나 길이가 잘못됐습니다. 키만 다시 복사해 주세요.',
      ENV_SYMLINK: '.env가 심볼릭 링크여서 저장을 중단했습니다.',
      EACCES: '터미널에서 프로젝트 폴더 또는 .env에 접근할 권한이 없습니다. 터미널의 폴더 접근 권한을 확인해 주세요.',
      EPERM: '운영체제가 파일 접근을 차단했습니다. 터미널의 프로젝트 폴더 접근 권한을 확인해 주세요.',
      EEXIST: '이전 저장 작업의 임시 파일이 남아 있습니다. 등록 스크립트를 다시 실행해 주세요.',
      ENOSPC: '디스크 여유 공간이 부족합니다.',
      EROFS: '프로젝트 폴더가 읽기 전용입니다.',
      ENOENT: '저장할 프로젝트 폴더를 찾을 수 없습니다.',
      EISDIR: '.env라는 이름의 폴더가 있어 파일을 저장하지 못했습니다.',
    };
    // Do not print exception messages, paths, input values, or arbitrary error codes.
    const code = Object.hasOwn(explanations, error?.code) ? error.code : 'SAVE_FAILED';
    console.error(`저장 실패 [${code}]: ${explanations[code] || '예기치 않은 로컬 저장 오류입니다.'}`);
    process.exitCode = 1;
  }
}
