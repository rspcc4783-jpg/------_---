import type { NextApiRequest, NextApiResponse } from 'next';
import { getSupabaseClient } from '@/lib/supabase-client';
import { verifyToken } from '@/lib/auth';
import { calculatePercentageScore } from '@/lib/utils';

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
    const { data: allDimensions, error: dError } = await client
      .from('dimensions')
      .select('*')
      .order('sort', { ascending: true });

    if (dError) throw new Error(`查询维度失败: ${dError.message}`);

    // 获取被评人和分配关系
    const { data: evaluatees, error: evError } = await client
      .from('evaluatees')
      .select('*')
      .eq('is_active', true)
      .order('code', { ascending: true });

    if (evError) throw new Error(`查询被评人失败: ${evError.message}`);

    const { data: assignments, error: aError } = await client
      .from('assignments')
      .select('*');

    if (aError) throw new Error(`查询分配关系失败: ${aError.message}`);

    // 获取所有已提交评分及其维度分数
    const { data: scores, error: sError } = await client
      .from('scores')
      .select('*, dimension_scores(*), evaluators(*)')
      .eq('status', 'submitted');

    if (sError) throw new Error(`查询评分失败: ${sError.message}`);

    // 如果请求 raw=1，直接返回原始数据用于备份导出
    const { raw } = req.query;
    if (raw === '1') {
      return res.status(200).json({
        scores: scores || [],
        dimensionScores: scores?.flatMap((s) => s.dimension_scores || []) || [],
      });
    }

    // 计算汇总数据
    const summary = (evaluatees || []).map((ev) => {
      const evAssignments = (assignments || []).filter(
        (a) => a.evaluatee_id === ev.id
      );
      const evScores = (scores || []).filter((s) => s.evaluatee_id === ev.id);
      const submittedCount = evScores.length;
      const totalAssigned = evAssignments.length;

      // 根据被评人分类筛选对应的维度
      const evCategory = ev.category && ev.category !== '无' ? ev.category : '默认';
      const evDimensions = (allDimensions || []).filter(
        (d) => d.category === evCategory
      );

      // 计算平均分（各维度）
      const dimensionAverages: Record<string, number> = {};
      evDimensions.forEach((dim) => {
        const dimScores = evScores.flatMap((s) =>
          (s.dimension_scores || []).filter(
            (ds: { dimension_id: string; score: number }) =>
              ds.dimension_id === dim.id
          )
        );
        if (dimScores.length > 0) {
          dimensionAverages[dim.code] =
            dimScores.reduce((sum: number, ds: { score: number }) => sum + ds.score, 0) /
            dimScores.length;
        } else {
          dimensionAverages[dim.code] = 0;
        }
      });

      // 计算总体平均分（百分制）
      let totalPercentage = 0;
      evScores.forEach((score) => {
        const dimScores: Record<string, number> = {};
        (score.dimension_scores || []).forEach(
          (ds: { dimension_id: string; score: number }) => {
            const dim = evDimensions.find((d) => d.id === ds.dimension_id);
            if (dim) {
              dimScores[dim.code] = ds.score;
            }
          }
        );
        totalPercentage += calculatePercentageScore(dimScores);
      });
      const averagePercentage = submittedCount > 0 ? totalPercentage / submittedCount : 0;

      return {
        id: ev.id,
        code: ev.code,
        name: ev.name,
        level: ev.level,
        category: ev.category,
        dimensionAverages,
        averagePercentage: Math.round(averagePercentage * 10) / 10,
        submittedCount,
        totalAssigned,
        completionRate: totalAssigned > 0 ? Math.round((submittedCount / totalAssigned) * 100) : 0,
        scores: evScores.map((s, index) => {
          const dsMap: Record<string, number> = {};
          (s.dimension_scores || []).forEach(
            (ds: { dimension_id: string; score: number }) => {
              const dim = evDimensions.find((d) => d.id === ds.dimension_id);
              if (dim) {
                dsMap[dim.code] = ds.score;
              }
            }
          );
          return {
            evaluatorAlias: `评价人${['①', '②', '③', '④', '⑤', '⑥', '⑦'][index] || `(${index + 1})`}`,
            dimensionScores: dsMap,
            percentage: calculatePercentageScore(dsMap),
            comment: s.comment,
          };
        }),
      };
    });

    // 按平均分排序
    summary.sort((a, b) => b.averagePercentage - a.averagePercentage);

    return res.status(200).json({ summary, dimensions: allDimensions || [] });
  } catch (error) {
    console.error('Summary error:', error);
    return res.status(500).json({ error: '获取数据失败' });
  }
}
