import type { NextApiRequest, NextApiResponse } from 'next';
import bcrypt from 'bcryptjs';
import { getSupabaseClient } from '@/lib/supabase-client';
import { generateToken, verifyAdminPassword } from '@/lib/auth';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { username, password, role } = req.body;

  try {
    if (role === 'admin') {
      // 管理员登录
      if (username !== 'admin') {
        return res.status(401).json({ error: '用户名或密码错误' });
      }

      const isValid = await verifyAdminPassword(password);
      if (!isValid) {
        return res.status(401).json({ error: '用户名或密码错误' });
      }

      const token = generateToken({
        userId: 'admin',
        role: 'admin',
        name: '管理员',
      });

      return res.status(200).json({
        token,
        user: {
          id: 'admin',
          name: '管理员',
          role: 'admin',
        },
      });
    } else {
      // 评价人登录
      const client = getSupabaseClient();
      const { data: evaluator, error } = await client
        .from('evaluators')
        .select('*')
        .eq('name', username)
        .maybeSingle();

      if (error) throw new Error(`查询失败: ${error.message}`);

      if (!evaluator) {
        return res.status(401).json({ error: '用户名或密码错误' });
      }

      const isValid = await bcrypt.compare(password, evaluator.password);
      if (!isValid) {
        return res.status(401).json({ error: '用户名或密码错误' });
      }

      const token = generateToken({
        userId: evaluator.id,
        role: 'evaluator',
        name: evaluator.name,
      });

      return res.status(200).json({
        token,
        user: {
          id: evaluator.id,
          name: evaluator.name,
          role: 'evaluator',
        },
      });
    }
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ error: '登录失败' });
  }
}
