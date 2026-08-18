import type { NextApiRequest, NextApiResponse } from 'next';
import { getSupabaseClient } from '@/lib/supabase-client';
import { verifyToken } from '@/lib/auth';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
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

  const client = getSupabaseClient();
  const backup = req.body;

  if (!backup || typeof backup !== 'object') {
    return res.status(400).json({ error: '无效的备份数据' });
  }

  try {
    // 按依赖顺序清空现有数据
    await client.from('dimension_scores').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await client.from('scores').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await client.from('assignments').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await client.from('evaluators').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await client.from('evaluatees').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await client.from('dimensions').delete().neq('id', '00000000-0000-0000-0000-000000000000');

    // 按反向依赖顺序插入数据
    if (Array.isArray(backup.dimensions) && backup.dimensions.length > 0) {
      const dims = backup.dimensions.map((d: any) => ({
        id: d.id,
        code: d.code,
        name: d.name,
        sort: d.sort ?? 0,
        standard5: d.standard5,
        standard4: d.standard4,
        standard3: d.standard3,
        standard2: d.standard2,
        standard1: d.standard1,
        created_at: d.created_at ?? new Date().toISOString(),
      }));
      const { error } = await client.from('dimensions').insert(dims);
      if (error) throw new Error(`导入维度失败: ${error.message}`);
    }

    if (Array.isArray(backup.evaluatees) && backup.evaluatees.length > 0) {
      const evs = backup.evaluatees.map((e: any) => ({
        id: e.id,
        code: e.code,
        name: e.name,
        level: e.level,
        category: e.category,
        is_active: e.is_active ?? true,
        created_at: e.created_at ?? new Date().toISOString(),
      }));
      const { error } = await client.from('evaluatees').insert(evs);
      if (error) throw new Error(`导入被评人失败: ${error.message}`);
    }

    if (Array.isArray(backup.evaluators) && backup.evaluators.length > 0) {
      const evas = backup.evaluators.map((e: any) => ({
        id: e.id,
        code: e.code,
        name: e.name,
        password: e.password,
        is_active: e.is_active ?? true,
        created_at: e.created_at ?? new Date().toISOString(),
      }));
      const { error } = await client.from('evaluators').insert(evas);
      if (error) throw new Error(`导入评价人失败: ${error.message}`);
    }

    if (Array.isArray(backup.assignments) && backup.assignments.length > 0) {
      const asgs = backup.assignments.map((a: any) => ({
        id: a.id,
        evaluator_id: a.evaluator_id ?? a.evaluatorId,
        evaluatee_id: a.evaluatee_id ?? a.evaluateeId,
        created_at: a.created_at ?? new Date().toISOString(),
      }));
      const { error } = await client.from('assignments').insert(asgs);
      if (error) throw new Error(`导入评价关系失败: ${error.message}`);
    }

    if (Array.isArray(backup.scores) && backup.scores.length > 0) {
      const scs = backup.scores.map((s: any) => ({
        id: s.id,
        status: s.status ?? 'draft',
        comment: s.comment,
        submit_time: s.submit_time,
        evaluator_id: s.evaluator_id ?? s.evaluatorId,
        evaluatee_id: s.evaluatee_id ?? s.evaluateeId,
        created_at: s.created_at ?? new Date().toISOString(),
      }));
      const { error } = await client.from('scores').insert(scs);
      if (error) throw new Error(`导入评分记录失败: ${error.message}`);
    }

    if (Array.isArray(backup.dimension_scores) && backup.dimension_scores.length > 0) {
      const ds = backup.dimension_scores.map((d: any) => ({
        id: d.id,
        score: d.score,
        score_id: d.score_id ?? d.scoreId,
        dimension_id: d.dimension_id ?? d.dimensionId,
      }));
      const { error } = await client.from('dimension_scores').insert(ds);
      if (error) throw new Error(`导入维度分数失败: ${error.message}`);
    }

    return res.status(200).json({ success: true, message: '数据导入成功' });
  } catch (error: any) {
    console.error('Import error:', error);
    return res.status(500).json({ error: error.message || '导入失败' });
  }
}
