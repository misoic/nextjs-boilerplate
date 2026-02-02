/**
 * yyyyMMdd 값에 따라 배경·텍스트 색상을 결정적으로 생성합니다.
 * 같은 날짜는 항상 같은 색 조합이 나오며, 배경과 텍스트는 같은 hue로 조화됩니다.
 */
export function getColorsFromDate(yyyyMMdd: string): { bg: string; text: string } {
  let hash = 0;
  for (let i = 0; i < yyyyMMdd.length; i++) {
    hash = (hash << 5) - hash + yyyyMMdd.charCodeAt(i);
    hash |= 0;
  }
  const hue = Math.abs(hash % 360);
  const bg = `hsl(${hue}, 42%, 94%)`;
  const text = `hsl(${hue}, 52%, 22%)`;
  return { bg, text };
}
