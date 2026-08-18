import type { NextApiRequest, NextApiResponse } from 'next';
import bcrypt from 'bcryptjs';
import { getSupabaseClient } from '@/lib/supabase-client';
import { verifyToken } from '@/lib/auth';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'PUT') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: '未登录' });
  }

  const payload = verifyToken(authHeader.substring(7));
  if (!payload) {
    return res.status(401).json({ error: '登录已过期' });
  }

  if (payload.role !== 'evaluator') {
    return res.status(403).json({ error: '无权访问' });
  }

  const { password } = req.body;
  if (!password || typeof password !== 'string' || password.trim().length === 0) {
    return res.status(400).json({ error: '请输入新密码' });
  }

  try {
    const hashedPassword = await bcrypt.hash(password.trim(), 10);
    const client = getSupabaseClient();
    const { error } = await client
      .from('evaluators')
      .update({ password: hashedPassword })
      .eq('id', payload.userId);

    if (error) throw new Error(`修改密码失败: ${error.message}`);
    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Change password error:', error);
    return res.status(500).json({ error: '修改密码失败' });
  }
}
