export const BASE_PATH = "/48toNone";

// next/link and router.push add basePath automatically; fetch() does not.
export const api = (path: string) => `${BASE_PATH}${path}`;
