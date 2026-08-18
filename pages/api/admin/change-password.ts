import type { NextApiRequest, NextApiResponse } from 'next';
import { verifyToken, verifyAdminPassword } from '@/lib/auth';
import { getSupabaseClient } from '@/lib/supabase-client';
import bcrypt from 'bcryptjs';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'PUT') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: '未登录' });
  }

  const payload = verifyToken(authHeader.substring(7));
  if (!payload || payload.role !== 'admin') {
    return res.status(403).json({ error: '无权访问' });
  }

  const { oldPassword, newPassword } = req.body;
  if (!oldPassword || !newPassword || newPassword.length < 6) {
    return res.status(400).json({ error: '请提供正确的旧密码和新密码（至少6位）' });
  }

  try {
    const isMatch = await verifyAdminPassword(oldPassword);
    if (!isMatch) {
      return res.status(400).json({ error: '旧密码不正确' });
    }

    const hashedNew = await bcrypt.hash(newPassword, 10);
    const client = getSupabaseClient();

    const { error } = await client
      .from('configs')
      .upsert({ key: 'adminPassword', value: hashedNew, updated_at: new Date().toISOString() });

    if (error) {
      throw new Error(error.message);
    }

    return res.status(200).json({ success: true, message: '密码修改成功' });
  } catch (error) {
    console.error('Change admin password error:', error);
    return res.status(500).json({ error: '修改密码失败' });
  }
}
