import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { supabaseAdmin } from './supabase-client';

const JWT_SECRET = process.env.JWT_SECRET || 'default-secret-change-in-production';

export interface TokenPayload {
  userId: string;
  role: 'admin' | 'evaluator';
  name: string;
}

export function generateToken(payload: TokenPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}

export function verifyToken(token: string): TokenPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as TokenPayload;
  } catch {
    return null;
  }
}

export async function verifyAdminPassword(password: string): Promise<boolean> {
  const { data: config } = await supabaseAdmin
    .from('configs')
    .select('value')
    .eq('key', 'adminPassword')
    .single();

  if (!config) {
    // 默认密码验证
    return password === 'admin123';
  }

  return bcrypt.compare(password, config.value);
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}
