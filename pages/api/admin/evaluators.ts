import type { NextApiRequest, NextApiResponse } from 'next';
import bcrypt from 'bcryptjs';
import { getSupabaseClient } from '@/lib/supabase-client';
import { verifyToken } from '@/lib/auth';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // 验证管理员身份
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: '未登录' });
  }

  const payload = verifyToken(authHeader.substring(7));
  if (!payload || payload.role !== 'admin') {
    return res.status(403).json({ error: '无权访问' });
  }

  const client = getSupabaseClient();

  if (req.method === 'GET') {
    try {
      const { data: evaluators, error } = await client
        .from('evaluators')
        .select('*')
        .order('code', { ascending: true });

      if (error) throw new Error(`查询失败: ${error.message}`);
      return res.status(200).json({ evaluators: evaluators || [] });
    } catch (error) {
      console.error('Get evaluators error:', error);
      return res.status(500).json({ error: '获取数据失败' });
    }
  }

  if (req.method === 'POST') {
    const { name, code, password = '123456', items } = req.body;

    // 批量导入
    if (items && Array.isArray(items)) {
      try {
        const hashedItems = await Promise.all(
          items.map(async (item: { name: string; code: string; password?: string }) => ({
            name: item.name,
            code: item.code,
            password: await bcrypt.hash(item.password || '123456', 10),
          }))
        );
        const { data, error } = await client
          .from('evaluators')
          .upsert(hashedItems, { onConflict: 'code', ignoreDuplicates: false })
          .select();

        if (error) throw new Error(`批量导入失败: ${error.message}`);
        return res.status(201).json({ evaluators: data || [] });
      } catch (error) {
        console.error('Batch import evaluators error:', error);
        return res.status(500).json({ error: '批量导入失败' });
      }
    }

    // 单条添加
    try {
      const hashedPassword = await bcrypt.hash(password, 10);
      const { data: evaluator, error } = await client
        .from('evaluators')
        .insert({ name, code, password: hashedPassword })
        .select()
        .single();

      if (error) throw new Error(`创建失败: ${error.message}`);
      return res.status(201).json({ evaluator });
    } catch (error) {
      console.error('Create evaluator error:', error);
      return res.status(500).json({ error: '创建失败' });
    }
  }

  if (req.method === 'PUT') {
    const { id, name, password } = req.body;

    try {
      const updateData: Record<string, unknown> = {};
      if (name) updateData.name = name;
      if (password) updateData.password = await bcrypt.hash(password, 10);

      const { data: evaluator, error } = await client
        .from('evaluators')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw new Error(`更新失败: ${error.message}`);
      return res.status(200).json({ evaluator });
    } catch (error) {
      console.error('Update evaluator error:', error);
      return res.status(500).json({ error: '更新失败' });
    }
  }

  if (req.method === 'DELETE') {
    const { id, all } = req.query;

    try {
      if (all === 'true') {
        const { error } = await client
          .from('evaluators')
          .delete()
          .neq('id', '00000000-0000-0000-0000-000000000000');
        if (error) throw new Error(`批量删除失败: ${error.message}`);
        return res.status(200).json({ success: true, message: '已清空所有评价人' });
      }

      const { error } = await client
        .from('evaluators')
        .delete()
        .eq('id', id as string);

      if (error) throw new Error(`删除失败: ${error.message}`);
      return res.status(200).json({ success: true });
    } catch (error) {
      console.error('Delete evaluator error:', error);
      return res.status(500).json({ error: '删除失败' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
