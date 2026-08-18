import type { NextApiRequest, NextApiResponse } from 'next';
import { verifyToken } from '../../../lib/auth';
import { getSupabaseClient } from '../../../lib/supabase-client';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) {
    return res.status(401).json({ error: '未授权' });
  }

  try {
    const payload = verifyToken(token);
    if (!payload || payload.role !== 'admin') {
      return res.status(403).json({ error: '仅管理员可执行此操作' });
    }

    if (req.method !== 'POST') {
      return res.status(405).json({ error: '方法不允许' });
    }

    const { evaluatorId } = req.body;
    if (!evaluatorId) {
      return res.status(400).json({ error: '缺少评价人ID' });
    }

    const client = getSupabaseClient();

    // 先删除关联的 dimension_scores（虽然外键有 cascade，但显式删除更安全）
    const { data: scores } = await client
      .from('scores')
      .select('id')
      .eq('evaluator_id', evaluatorId);

    if (scores && scores.length > 0) {
      const scoreIds = scores.map((s) => s.id);
      // 分批删除 dimension_scores（避免 in() 空数组问题）
      for (let i = 0; i < scoreIds.length; i += 50) {
        const batch = scoreIds.slice(i, i + 50);
        const { error: dsError } = await client
          .from('dimension_scores')
          .delete()
          .in('score_id', batch);
        if (dsError) throw new Error(`删除维度分数失败: ${dsError.message}`);
      }
    }

    // 删除 Score 记录
    const { error } = await client
      .from('scores')
      .delete()
      .eq('evaluator_id', evaluatorId);

    if (error) throw new Error(`删除评分失败: ${error.message}`);

    return res.status(200).json({
      success: true,
      deletedCount: scores?.length || 0,
    });
  } catch (error) {
    console.error('Reset scores error:', error);
    return res.status(500).json({ error: '重置评价失败' });
  }
}
