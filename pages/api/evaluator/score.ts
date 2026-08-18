import type { NextApiRequest, NextApiResponse } from 'next';
import { getSupabaseClient } from '@/lib/supabase-client';
import { verifyToken } from '@/lib/auth';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: '未登录' });
  }

  const payload = verifyToken(authHeader.substring(7));
  if (!payload || payload.role !== 'evaluator') {
    return res.status(403).json({ error: '无权访问' });
  }

  const client = getSupabaseClient();

  if (req.method === 'GET') {
    const { evaluateeId } = req.query;

    try {
      // 先查被评人的分类
      const { data: evaluatee, error: eError } = await client
        .from('evaluatees')
        .select('category')
        .eq('id', evaluateeId)
        .single();

      if (eError) throw new Error(`查询被评人失败: ${eError.message}`);

      const category = evaluatee?.category && evaluatee.category !== '无' ? evaluatee.category : '默认';

      // 查询该分类下的维度
      const { data: dimensions, error: dError } = await client
        .from('dimensions')
        .select('*')
        .eq('category', category)
        .order('sort', { ascending: true });

      if (dError) throw new Error(`查询维度失败: ${dError.message}`);

      // 如果没有该分类的维度，尝试查默认分类
      let finalDimensions = dimensions || [];
      if (finalDimensions.length === 0 && category !== '默认') {
        const { data: defaultDims } = await client
          .from('dimensions')
          .select('*')
          .eq('category', '默认')
          .order('sort', { ascending: true });
        finalDimensions = defaultDims || [];
      }

      // 查询已有的评分
      const { data: scores, error: sError } = await client
        .from('scores')
        .select('*, dimension_scores(*)')
        .eq('evaluator_id', payload.userId)
        .eq('evaluatee_id', evaluateeId)
        .single();

      if (sError && sError.code !== 'PGRST116') {
        console.error('Score query error:', sError);
      }

      // 将 dimension_scores 数组转换为 dimensionScores 映射（key = dimension_id）
      const formattedScore = scores
        ? {
            ...scores,
            dimensionScores: (scores.dimension_scores || []).reduce(
              (acc: Record<string, number>, ds: { dimension_id: string; score: number }) => {
                acc[ds.dimension_id] = ds.score;
                return acc;
              },
              {} as Record<string, number>
            ),
          }
        : null;

      return res.status(200).json({
        dimensions: finalDimensions,
        score: formattedScore,
      });
    } catch (error) {
      console.error('Get score error:', error);
      return res.status(500).json({ error: '获取数据失败' });
    }
  }

  if (req.method === 'POST') {
    const { evaluateeId, dimensionScores, comment, status: reqStatus } = req.body;
    const status = reqStatus === 'submitted' ? 'submitted' : 'draft';

    try {
      // 检查是否有已存在的评分
      const { data: existingScore } = await client
        .from('scores')
        .select('id')
        .eq('evaluator_id', payload.userId)
        .eq('evaluatee_id', evaluateeId)
        .single();

      let scoreId: string;

      if (existingScore) {
        // 更新评分记录
        const updateData: Record<string, unknown> = {
          comment,
          status,
          updated_at: new Date().toISOString(),
        };
        if (status === 'submitted') {
          updateData.submit_time = new Date().toISOString();
        }

        const { data: updatedScore, error: updateError } = await client
          .from('scores')
          .update(updateData)
          .eq('id', existingScore.id)
          .select()
          .single();

        if (updateError) throw new Error(`更新评分失败: ${updateError.message}`);
        scoreId = updatedScore.id;

        // 删除旧的维度分数
        await client.from('dimension_scores').delete().eq('score_id', scoreId);
      } else {
        // 创建新的评分记录
        const insertData: Record<string, unknown> = {
          evaluator_id: payload.userId,
          evaluatee_id: evaluateeId,
          comment,
          status,
        };
        if (status === 'submitted') {
          insertData.submit_time = new Date().toISOString();
        }

        const { data: newScore, error: createError } = await client
          .from('scores')
          .insert(insertData)
          .select()
          .single();

        if (createError) throw new Error(`创建评分失败: ${createError.message}`);
        scoreId = newScore.id;
      }

      // 插入新的维度分数
      const dimensionScoreRecords = Object.entries(dimensionScores).map(
        ([dimensionId, score]) => ({
          score_id: scoreId,
          dimension_id: dimensionId,
          score: Number(score),
        })
      );

      if (dimensionScoreRecords.length > 0) {
        const { error: dsError } = await client
          .from('dimension_scores')
          .insert(dimensionScoreRecords);

        if (dsError) throw new Error(`保存维度分数失败: ${dsError.message}`);
      }

      return res.status(200).json({ message: '保存成功', status });
    } catch (error) {
      console.error('Save score error:', error);
      const msg = error instanceof Error ? error.message : '保存失败';
      return res.status(500).json({ error: msg });
    }
  }
}
