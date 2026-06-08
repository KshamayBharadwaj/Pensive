export type ApiSuccess<T = unknown> = { success: true; data: T };
export type ApiError = {
  success: false;
  error: { code: string; message: string };
};
