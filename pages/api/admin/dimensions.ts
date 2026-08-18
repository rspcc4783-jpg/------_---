import type { NextApiRequest, NextApiResponse } from 'next';
import { getSupabaseClient } from '@/lib/supabase-client';
import { verifyToken } from '@/lib/auth';

// 生成规范的维度编号：标准集前缀(两位) + 维度序号(两位)，整体全局唯一
// 例：第一个标准集的维度为 01-01、01-02；第二个标准集为 02-01 ...
// 规则：同一标准集内序号取现有最大值+1；全新标准集前缀取全局最大前缀+1
async function genDimensionCode(category: string, client: any): Promise<string> {
  category = category || '默认';
  // 查询该标准集现有维度，提取前缀与最大序号
  const { data: existing } = await client
    .from('dimensions')
    .select('code, category')
    .eq('category', category);

  let prefix = '';
  let maxSeq = 0;
  (existing || []).forEach((d: any) => {
    const m = /^(.+)-(\d+)$/.exec(d.code || '');
    if (m) {
      prefix = m[1];
      maxSeq = Math.max(maxSeq, parseInt(m[2], 10));
    }
  });

  // 全新标准集：前缀取全局最大前缀 + 1
  if (!prefix) {
    const { data: all } = await client.from('dimensions').select('code, category');
    let maxPrefix = 0;
    (all || []).forEach((d: any) => {
      const m = /^(.+)-(\d+)$/.exec(d.code || '');
      if (m && /^\d+$/.test(m[1])) {
        maxPrefix = Math.max(maxPrefix, parseInt(m[1], 10));
      }
    });
    prefix = String(maxPrefix + 1).padStart(2, '0');
  }

  const seq = String(maxSeq + 1).padStart(2, '0');
  return `${prefix}-${seq}`;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
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
      // 返回所有分类列表
      if (req.query.categories === 'true') {
        const { data, error } = await client
          .from('dimensions')
          .select('category');

        if (error) throw new Error(`查询失败: ${error.message}`);
        const categories = Array.from(new Set((data || []).map((d: any) => d.category).filter(Boolean)));
        return res.status(200).json({ categories });
      }

      // 按分类查询维度
      const category = req.query.category as string | undefined;
      let query = client.from('dimensions').select('*').order('sort', { ascending: true });
      if (category) {
        query = query.eq('category', category);
      }
      const { data: dimensions, error } = await query;

      if (error) throw new Error(`查询失败: ${error.message}`);
      return res.status(200).json({ dimensions: dimensions || [] });
    } catch (error) {
      console.error('Get dimensions error:', error);
      return res.status(500).json({ error: '获取数据失败' });
    }
  }

  if (req.method === 'POST') {
    // 批量导入
    if (req.body.items && Array.isArray(req.body.items)) {
      try {
        const category = req.body.category || '默认';

        // 查询所有已存在的 code 与 category，避免唯一约束冲突并用于自动编号
        const { data: existingCodes } = await client
          .from('dimensions')
          .select('code, category');
        const codeSet = new Set((existingCodes || []).map((d: any) => d.code));
        // 每个标准集已有的编号前缀
        const catPrefix: Record<string, string> = {};
        // 每个前缀下已用的最大序号
        const seqByPrefix: Record<string, number> = {};
        (existingCodes || []).forEach((d: any) => {
          const m = /^(.+)-(\d+)$/.exec(d.code || '');
          if (m) {
            catPrefix[d.category] = m[1];
            seqByPrefix[m[1]] = Math.max(seqByPrefix[m[1]] || 0, parseInt(m[2], 10));
          }
        });

        const items = req.body.items.map((item: any, index: number) => {
          const cat = item.category || category;
          let code = item.code ? String(item.code).trim() : '';
          // 仅当传入的 code 合规（两位-两位）且未冲突时保留，否则自动生成
          const cm = /^\d{2}-\d{2}$/.exec(code);
          if (!cm || codeSet.has(code)) {
            let prefix = catPrefix[cat] || '';
            if (!prefix) {
              let maxP = 0;
              for (const p in seqByPrefix) maxP = Math.max(maxP, parseInt(p, 10));
              prefix = String(maxP + 1).padStart(2, '0');
              catPrefix[cat] = prefix;
            }
            let seq = (seqByPrefix[prefix] || 0) + 1;
            let newCode = '';
            do {
              newCode = `${prefix}-${String(seq).padStart(2, '0')}`;
              seq++;
            } while (codeSet.has(newCode));
            seqByPrefix[prefix] = seq - 1;
            code = newCode;
          } else {
            codeSet.add(code);
            const pm = /^(\d{2})-/.exec(code);
            if (pm) seqByPrefix[pm[1]] = Math.max(seqByPrefix[pm[1]] || 0, parseInt(pm[1]));
          }
          codeSet.add(code);

          return {
            code,
            name: item.name || item['维度名称'] || '',
            sort: typeof item.sort === 'number' ? item.sort : index,
            category: item.category || category,
            standard5: item.standard5 || item['标准5分'] || '',
            standard4: item.standard4 || item['标准4分'] || '',
            standard3: item.standard3 || item['标准3分'] || '',
            standard2: item.standard2 || item['标准2分'] || '',
            standard1: item.standard1 || item['标准1分'] || '',
          };
        });

        // 过滤掉名称为空的条目
        const validItems = items.filter((item: any) => item.name.trim());
        if (validItems.length === 0) {
          return res.status(400).json({ error: '导入数据为空，请检查模板内容' });
        }

        const { data, error } = await client.from('dimensions').insert(validItems).select();
        if (error) throw new Error(`批量导入失败: ${error.message}`);
        return res.status(201).json({ count: data?.length || 0 });
      } catch (error: any) {
        console.error('Batch import dimensions error:', error);
        return res.status(500).json({ error: error.message || '批量导入失败' });
      }
    }

    // 单个创建
    const { name, code, sort, category, standard1, standard2, standard3, standard4, standard5 } = req.body;
    if (!name) {
      return res.status(400).json({ error: '维度名称为必填项' });
    }

    try {
      // 如果没有提供规范 code，自动生成「标准集前缀-序号」格式的唯一编号
      let finalCode = code && code.trim() ? code.trim() : '';
      if (!/^\d{2}-\d{2}$/.test(finalCode)) {
        finalCode = await genDimensionCode(category || '默认', client);
      }
      const { data: dimension, error } = await client
        .from('dimensions')
        .insert({
          name,
          code: finalCode,
          sort: sort || 0,
          category: category || '默认',
          standard1: standard1 || '',
          standard2: standard2 || '',
          standard3: standard3 || '',
          standard4: standard4 || '',
          standard5: standard5 || '',
        })
        .select()
        .single();

      if (error) throw new Error(`创建失败: ${error.message}`);
      return res.status(201).json({ dimension });
    } catch (error) {
      console.error('Create dimension error:', error);
      return res.status(500).json({ error: '创建失败' });
    }
  }

  if (req.method === 'PUT') {
    const { id, ...data } = req.body;

    try {
      const { data: dimension, error } = await client
        .from('dimensions')
        .update(data)
        .eq('id', id)
        .select()
        .single();

      if (error) throw new Error(`更新失败: ${error.message}`);
      return res.status(200).json({ dimension });
    } catch (error) {
      console.error('Update dimension error:', error);
      return res.status(500).json({ error: '更新失败' });
    }
  }

  if (req.method === 'DELETE') {
    // 批量删除指定标准集
    if (req.query.all === 'true') {
      try {
        const category = req.query.category as string;
        if (!category) {
          return res.status(400).json({ error: '缺少标准集名称' });
        }
        const { error } = await client.from('dimensions').delete().eq('category', category);
        if (error) throw new Error(`批量删除失败: ${error.message}`);
        return res.status(200).json({ message: `已删除标准集「${category}」的全部维度` });
      } catch (error) {
        console.error('Delete all dimensions error:', error);
        return res.status(500).json({ error: '批量删除失败' });
      }
    }

    // 单个删除（支持 query 或 body）
    const id = (req.query.id as string) || req.body?.id;
    if (!id) {
      return res.status(400).json({ error: '缺少维度ID' });
    }

    try {
      const { error } = await client.from('dimensions').delete().eq('id', id);
      if (error) throw new Error(`删除失败: ${error.message}`);
      return res.status(200).json({ message: '删除成功' });
    } catch (error) {
      console.error('Delete dimension error:', error);
      return res.status(500).json({ error: '删除失败' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
