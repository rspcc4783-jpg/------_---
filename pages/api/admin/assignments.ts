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
      const { data: assignments, error } = await client
        .from('assignments')
        .select('*, evaluators(*), evaluatees(*)');

      if (error) throw new Error(`查询失败: ${error.message}`);

      // 格式化返回数据以兼容前端（驼峰命名）
      const formatted = (assignments || []).map((a) => ({
        id: a.id,
        evaluatorId: a.evaluator_id,
        evaluateeId: a.evaluatee_id,
        created_at: a.created_at,
        evaluator: a.evaluators,
        evaluatee: a.evaluatees,
      }));

      return res.status(200).json({ assignments: formatted });
    } catch (error) {
      console.error('Get assignments error:', error);
      return res.status(500).json({ error: '获取数据失败' });
    }
  }

  if (req.method === 'POST') {
    const { evaluatorId, evaluateeId } = req.body;

    try {
      // 检查是否已存在
      const { data: existing, error: findError } = await client
        .from('assignments')
        .select('*')
        .eq('evaluator_id', evaluatorId)
        .eq('evaluatee_id', evaluateeId)
        .maybeSingle();

      if (findError) throw new Error(`查询失败: ${findError.message}`);

      if (existing) {
        return res.status(200).json({ assignment: existing });
      }

      const { data: assignment, error } = await client
        .from('assignments')
        .insert({ evaluator_id: evaluatorId, evaluatee_id: evaluateeId })
        .select()
        .single();

      if (error) throw new Error(`创建失败: ${error.message}`);
      return res.status(201).json({ assignment });
    } catch (error) {
      console.error('Create assignment error:', error);
      return res.status(500).json({ error: '创建失败' });
    }
  }

  if (req.method === 'DELETE') {
    const { evaluatorId, evaluateeId } = req.query;

    try {
      const { error } = await client
        .from('assignments')
        .delete()
        .eq('evaluator_id', evaluatorId as string)
        .eq('evaluatee_id', evaluateeId as string);

      if (error) throw new Error(`删除失败: ${error.message}`);
      return res.status(200).json({ success: true });
    } catch (error) {
      console.error('Delete assignment error:', error);
      return res.status(500).json({ error: '删除失败' });
    }
  }

  if (req.method === 'PUT') {
    // 批量更新
    const { assignments } = req.body;

    try {
      // 先删除所有
      const { error: deleteError } = await client
        .from('assignments')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000');

      if (deleteError) throw new Error(`清空失败: ${deleteError.message}`);

      // 重新创建
      if (assignments && assignments.length > 0) {
        const { error: insertError } = await client
          .from('assignments')
          .insert(
            assignments.map((a: { evaluator_id: string; evaluatee_id: string }) => ({
              evaluator_id: a.evaluator_id,
              evaluatee_id: a.evaluatee_id,
            }))
          );

        if (insertError) throw new Error(`批量创建失败: ${insertError.message}`);
      }

      return res.status(200).json({ success: true });
    } catch (error) {
      console.error('Batch update assignments error:', error);
      return res.status(500).json({ error: '更新失败' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
