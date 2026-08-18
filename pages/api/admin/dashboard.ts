import type { NextApiRequest, NextApiResponse } from 'next';
import { getSupabaseClient } from '@/lib/supabase-client';
import { verifyToken } from '@/lib/auth';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

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

  try {
    // 并行获取基础统计数据
    const [
      { count: evaluatorCount, error: e1Error },
      { count: evaluateeCount, error: e2Error },
      { count: assignmentCount, error: aError },
      { count: scoreCount, error: s1Error },
      { count: submittedScoreCount, error: s2Error },
      { data: dimensions, error: dError },
    ] = await Promise.all([
      client.from('evaluators').select('*', { count: 'exact', head: true }).eq('is_active', true),
      client.from('evaluatees').select('*', { count: 'exact', head: true }).eq('is_active', true),
      client.from('assignments').select('*', { count: 'exact', head: true }),
      client.from('scores').select('*', { count: 'exact', head: true }),
      client.from('scores').select('*', { count: 'exact', head: true }).eq('status', 'submitted'),
      client.from('dimensions').select('*').order('sort', { ascending: true }),
    ]);

    if (e1Error) throw new Error(`统计失败: ${e1Error.message}`);
    if (e2Error) throw new Error(`统计失败: ${e2Error.message}`);
    if (aError) throw new Error(`统计失败: ${aError.message}`);
    if (s1Error) throw new Error(`统计失败: ${s1Error.message}`);
    if (s2Error) throw new Error(`统计失败: ${s2Error.message}`);
    if (dError) throw new Error(`查询维度失败: ${dError.message}`);

    const safeCount = (n: number | null) => n ?? 0;

    // 获取被评人列表
    const { data: evaluatees, error: evError } = await client
      .from('evaluatees')
      .select('*')
      .eq('is_active', true)
      .order('code', { ascending: true });

    if (evError) throw new Error(`查询被评人失败: ${evError.message}`);

    // 获取所有分配关系
    const { data: assignments, error: asError } = await client
      .from('assignments')
      .select('*, evaluators(*)');

    if (asError) throw new Error(`查询分配关系失败: ${asError.message}`);

    // 获取所有已提交评分
    const { data: scores, error: scError } = await client
      .from('scores')
      .select('*, dimension_scores(*), evaluators(*)')
      .eq('status', 'submitted');

    if (scError) throw new Error(`查询评分失败: ${scError.message}`);

    // 计算每个被评人的评价情况
    const evaluateeProgress = (evaluatees || []).map((ev) => {
      const evAssignments = (assignments || []).filter(
        (a) => a.evaluatee_id === ev.id
      );
      const assignedEvaluators = evAssignments.map((a) => a.evaluators);
      const evScores = (scores || []).filter((s) => s.evaluatee_id === ev.id);
      const submittedEvaluatorIds = new Set(evScores.map((s) => s.evaluator_id));

      const completedCount = evScores.length;
      const totalCount = assignedEvaluators.length;
      const pendingEvaluators = assignedEvaluators.filter(
        (e) => !submittedEvaluatorIds.has(e.id)
      );

      return {
        id: ev.id,
        code: ev.code,
        name: ev.name,
        level: ev.level,
        category: ev.category,
        totalAssigned: totalCount,
        completedCount,
        pendingCount: totalCount - completedCount,
        progress: totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0,
        pendingEvaluators: pendingEvaluators.map((e) => e.name),
      };
    });

    const ec = safeCount(evaluatorCount);
    const evc = safeCount(evaluateeCount);
    const ac = safeCount(assignmentCount);
    const sc = safeCount(scoreCount);
    const ssc = safeCount(submittedScoreCount);

    return res.status(200).json({
      stats: {
        evaluatorCount: ec,
        evaluateeCount: evc,
        assignmentCount: ac,
        scoreCount: sc,
        submittedScoreCount: ssc,
        completionRate: ac > 0 ? Math.round((ssc / ac) * 100) : 0,
      },
      evaluateeProgress,
      dimensions: dimensions || [],
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    return res.status(500).json({ error: '获取数据失败' });
  }
}
