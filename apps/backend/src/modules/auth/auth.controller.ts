import type { Request, Response } from 'express';
import { ok } from '../../utils/http.js';
import * as authService from './auth.service.js';

export async function register(req: Request, res: Response) {
  const result = await authService.register(req.body);
  return ok(res, result, 201);
}

export async function login(req: Request, res: Response) {
  const result = await authService.login(req.body);
  return ok(res, result);
}

export async function refresh(req: Request, res: Response) {
  const result = await authService.refresh(req.body.refreshToken);
  return ok(res, result);
}

export async function me(req: Request, res: Response) {
  const user = await authService.me(req.auth!.sub);
  return ok(res, user);
}

export async function changePassword(req: Request, res: Response) {
  const { currentPassword, newPassword } = req.body as { currentPassword: string; newPassword: string };
  const result = await authService.changePassword(req.auth!.sub, currentPassword, newPassword);
  return ok(res, result);
}
