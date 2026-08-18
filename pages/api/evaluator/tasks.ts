import type { NextApiRequest, NextApiResponse } from 'next';
import { getSupabaseClient } from '@/lib/supabase-client';
import { verifyToken } from '@/lib/auth';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // 验证评价人身份
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: '未登录' });
  }

  const payload = verifyToken(authHeader.substring(7));
  if (!payload || payload.role !== 'evaluator') {
    return res.status(403).json({ error: '无权访问' });
  }

  const client = getSupabaseClient();

  try {
    // 获取评价人的所有待评任务
    const { data: assignments, error: aError } = await client
      .from('assignments')
      .select('*, evaluatees(*)')
      .eq('evaluator_id', payload.userId);

    if (aError) throw new Error(`查询任务失败: ${aError.message}`);

    // 获取评价人已提交的评分
    const { data: scores, error: sError } = await client
      .from('scores')
      .select('*, dimension_scores(*)')
      .eq('evaluator_id', payload.userId);

    if (sError) throw new Error(`查询评分失败: ${sError.message}`);

    const tasks = (assignments || []).map((assignment) => {
      const score = (scores || []).find(
        (s) => s.evaluatee_id === assignment.evaluatee_id
      );
      return {
        evaluatee: assignment.evaluatees,
        status: score?.status || 'pending',
        score: score
          ? {
              dimensionScores: (score.dimension_scores || []).reduce(
                (acc: Record<string, number>, ds: { dimension_id: string; score: number }) => {
                  acc[ds.dimension_id] = ds.score;
                  return acc;
                },
                {} as Record<string, number>
              ),
              comment: score.comment,
            }
          : null,
      };
    });

    return res.status(200).json({ tasks });
  } catch (error) {
    console.error('Tasks error:', error);
    return res.status(500).json({ error: '获取数据失败' });
  }
}
