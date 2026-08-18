import type { NextApiRequest, NextApiResponse } from 'next';
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
      const { data: evaluatees, error } = await client
        .from('evaluatees')
        .select('*')
        .order('code', { ascending: true });

      if (error) throw new Error(`查询失败: ${error.message}`);
      return res.status(200).json({ evaluatees: evaluatees || [] });
    } catch (error) {
      console.error('Get evaluatees error:', error);
      return res.status(500).json({ error: '获取数据失败' });
    }
  }

  if (req.method === 'POST') {
    const { name, code, level, category, items } = req.body;

    // 批量导入
    if (items && Array.isArray(items)) {
      try {
        const { data, error } = await client
          .from('evaluatees')
          .upsert(
            items.map((item: { name: string; code: string; level: string; category: string }) => ({
              name: item.name,
              code: item.code,
              level: item.level,
              category: item.category,
            })),
            { onConflict: 'code', ignoreDuplicates: false }
          )
          .select();

        if (error) throw new Error(`批量导入失败: ${error.message}`);
        return res.status(201).json({ evaluatees: data || [] });
      } catch (error) {
        console.error('Batch import evaluatees error:', error);
        return res.status(500).json({ error: '批量导入失败' });
      }
    }

    // 单条添加
    try {
      const { data: evaluatee, error } = await client
        .from('evaluatees')
        .insert({ name, code, level, category })
        .select()
        .single();

      if (error) throw new Error(`创建失败: ${error.message}`);
      return res.status(201).json({ evaluatee });
    } catch (error) {
      console.error('Create evaluatee error:', error);
      return res.status(500).json({ error: '创建失败' });
    }
  }

  if (req.method === 'PUT') {
    const { id, name, level, category } = req.body;

    try {
      const { data: evaluatee, error } = await client
        .from('evaluatees')
        .update({ name, level, category })
        .eq('id', id)
        .select()
        .single();

      if (error) throw new Error(`更新失败: ${error.message}`);
      return res.status(200).json({ evaluatee });
    } catch (error) {
      console.error('Update evaluatee error:', error);
      return res.status(500).json({ error: '更新失败' });
    }
  }

  if (req.method === 'DELETE') {
    // 兼容 query 参数和 body（部分环境 DELETE body 不被支持）
    const id = req.query.id || req.body?.id;
    const all = req.query.all || req.body?.all;

    try {
      if (all === 'true') {
        const { error } = await client
          .from('evaluatees')
          .delete()
          .neq('id', '00000000-0000-0000-0000-000000000000');
        if (error) throw new Error(`批量删除失败: ${error.message}`);
        return res.status(200).json({ success: true, message: '已清空所有被评人' });
      }

      if (!id) {
        return res.status(400).json({ error: '缺少被评人ID' });
      }

      const { error } = await client
        .from('evaluatees')
        .delete()
        .eq('id', id as string);

      if (error) throw new Error(`删除失败: ${error.message}`);
      return res.status(200).json({ success: true });
    } catch (error) {
      console.error('Delete evaluatee error:', error);
      return res.status(500).json({ error: '删除失败' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
