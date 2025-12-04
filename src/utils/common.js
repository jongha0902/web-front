
// function isEmpty(value)
// null, undefined	비었음
// 문자열	.trim() 후 길이 0이면 비었음
// 배열	길이 0이면 비었음
// 객체	키가 없으면 비었음
export function isEmpty(value) {
    return (
      value === null ||
      value === undefined ||
      (typeof value === 'string' && value.trim() === '') ||
      (Array.isArray(value) && value.length === 0) ||
      (typeof value === 'object' && !Array.isArray(value) && Object.keys(value).length === 0)
    );
  }

// 쿠키 관련 유틸리티 함수들
export function getCookie(name) {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) {
    return decodeURIComponent(parts.pop().split(';').shift());
  }
  return null;
}

export function setCookie(name, value, options = {}) {
  const { path = '/', maxAge = 3600 } = options;
  document.cookie = `${name}=${encodeURIComponent(value)}; path=${path}; max-age=${maxAge}`;
}

export function deleteCookie(name) {
  document.cookie = `${name}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
}
  