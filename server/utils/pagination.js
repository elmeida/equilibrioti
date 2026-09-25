export function readPagination(query) {
  const read = (value, fallback, min, max) => {
    if (value === undefined) return fallback;
    if (typeof value !== 'string' || !/^[1-9][0-9]*$/.test(value)) throw Object.assign(new Error('Invalid pagination'), { status: 400 });
    const number = Number(value);
    if (!Number.isSafeInteger(number) || number < min || number > max) throw Object.assign(new Error('Invalid pagination'), { status: 400 });
    return number;
  };
  const pageSize = read(query.pageSize, 25, 10, 100);
  const page = read(query.page, 1, 1, Math.floor(2147483647 / pageSize) + 1);
  return { page, pageSize, offset: (page - 1) * pageSize };
}
