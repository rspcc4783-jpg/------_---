import bcrypt from 'bcryptjs';
import { getSupabaseClient } from '../lib/supabase-client';

// 预置数据 - 与原HTML文件保持一致
const defaultEvaluators = [
  { code: 'E001', name: '张经理', password: '123456' },
  { code: 'E002', name: '李主任', password: '123456' },
  { code: 'E003', name: '王主管', password: '123456' },
  { code: 'E004', name: '刘总监', password: '123456' },
  { code: 'E005', name: '陈经理', password: '123456' },
  { code: 'E006', name: '赵主任', password: '123456' },
  { code: 'E007', name: '孙主管', password: '123456' },
];

const defaultEvaluatees = [
  // 晋级类（9人）
  { code: 'P001', name: '李德建', level: 'M1-2', category: '晋级' },
  { code: 'P002', name: '齐宁', level: 'M1-2', category: '晋级' },
  { code: 'P003', name: '吴雪琴', level: 'P2', category: '晋级' },
  { code: 'P004', name: '王文艳', level: 'P2', category: '晋级' },
  { code: 'P005', name: '黄志强', level: 'T1-2', category: '晋级' },
  { code: 'P006', name: '庄惠红', level: 'T1-2', category: '晋级' },
  { code: 'P007', name: '陈宏勋', level: 'M1-2', category: '晋级' },
  { code: 'P008', name: '杨正', level: 'P2', category: '晋级' },
  { code: 'P009', name: '柏阳', level: 'T1-2', category: '晋级' },
  // 保级类（7人）
  { code: 'P010', name: '陈霞', level: 'M1-2', category: '保级' },
  { code: 'P011', name: '莫蕊', level: 'P2', category: '保级' },
  { code: 'P012', name: '康巧媚', level: 'T1-2', category: '保级' },
  { code: 'P013', name: '俞艺涵', level: 'M1-2', category: '保级' },
  { code: 'P014', name: '唐娟娟', level: 'P2', category: '保级' },
  { code: 'P015', name: '赵志凯', level: 'T1-2', category: '保级' },
  { code: 'P016', name: '郭露', level: 'M1-2', category: '保级' },
];

const defaultDimensions = [
  {
    code: 'D1',
    name: '工作态度',
    sort: 1,
    standard5: '服从领导安排，积极主动，工作热情高涨，对待工作极其认真负责',
    standard4: '服从领导安排，工作积极主动，有热情，对工作认真负责',
    standard3: '基本能服从安排，工作态度一般，能完成基本任务',
    standard2: '有时不服从安排，工作态度消极，需督促才能完成',
    standard1: '经常不服从安排，工作态度极差，消极怠工',
  },
  {
    code: 'D2',
    name: '劳动纪律',
    sort: 2,
    standard5: '严格遵守各项规章制度，从不迟到早退，出勤率100%，无违纪行为',
    standard4: '遵守规章制度，偶有特殊情况，出勤率95%以上，无严重违纪',
    standard3: '基本遵守规章制度，偶尔迟到早退，出勤率90%以上',
    standard2: '纪律性较差，经常迟到早退，有违纪行为',
    standard1: '严重违反规章制度，经常旷工，多次违纪',
  },
  {
    code: 'D3',
    name: '工作效率及质量',
    sort: 3,
    standard5: '工作效率极高，质量优秀，经常超额完成任务，出错率极低',
    standard4: '工作效率高，质量良好，能按时完成任务，出错率低',
    standard3: '工作效率一般，质量合格，基本能按时完成任务',
    standard2: '工作效率低，质量不稳定，经常延期或出错',
    standard1: '工作效率极低，质量差，经常无法完成任务',
  },
  {
    code: 'D4',
    name: '责任心',
    sort: 4,
    standard5: '极强的责任心，主动承担责任，对工作结果负责到底',
    standard4: '责任心强，能承担工作责任，对工作结果负责',
    standard3: '有一定责任心，基本能承担工作责任',
    standard2: '责任心较弱，遇到困难容易推卸责任',
    standard1: '毫无责任心，遇到问题逃避责任',
  },
  {
    code: 'D5',
    name: '团队合作',
    sort: 5,
    standard5: '积极主动协作，乐于助人，是团队的核心凝聚力量',
    standard4: '能良好协作，愿意帮助他人，与团队成员关系融洽',
    standard3: '基本能配合团队工作，与团队成员关系一般',
    standard2: '协作意识差，不愿意配合他人，与团队有隔阂',
    standard1: '完全不合作，经常与团队成员发生冲突',
  },
  {
    code: 'D6',
    name: '问题解决能力',
    sort: 6,
    standard5: '能独立解决复杂问题，善于创新方法，经常提出有效解决方案',
    standard4: '能独立解决一般问题，方法得当，效果良好',
    standard3: '在指导下能解决一般问题，方法基本正确',
    standard2: '解决问题能力弱，经常需要他人帮助',
    standard1: '完全无法独立解决问题，依赖性强',
  },
  {
    code: 'D7',
    name: '学习能力',
    sort: 7,
    standard5: '学习能力强，快速掌握新知识，能举一反三，持续自我提升',
    standard4: '学习能力较好，能较快掌握新知识，主动学习',
    standard3: '学习能力一般，能掌握基本知识，需要一定时间',
    standard2: '学习能力较弱，掌握新知识慢，学习被动',
    standard1: '学习能力差，拒绝学习新知识',
  },
];

async function main() {
  console.log('开始初始化 Supabase 数据库...');
  const client = getSupabaseClient();

  // 检查是否已有数据（幂等：有数据则跳过）
  const { data: existingEvaluators, count: evaluatorCount } = await client
    .from('evaluators')
    .select('*', { count: 'exact', head: true });

  if ((evaluatorCount ?? 0) > 0) {
    console.log('数据库已有数据，跳过种子初始化。');
    return;
  }

  console.log('数据库为空，执行种子初始化...');

  // 创建评价人
  console.log('创建评价人...');
  const evaluatorData = await Promise.all(
    defaultEvaluators.map(async (ev) => ({
      code: ev.code,
      name: ev.name,
      password: await bcrypt.hash(ev.password, 10),
    }))
  );
  const { error: evError } = await client.from('evaluators').upsert(evaluatorData);
  if (evError) throw new Error(`创建评价人失败: ${evError.message}`);

  // 创建被评人
  console.log('创建被评人...');
  const { error: eeError } = await client.from('evaluatees').upsert(defaultEvaluatees);
  if (eeError) throw new Error(`创建被评人失败: ${eeError.message}`);

  // 创建评价维度
  console.log('创建评价维度...');
  const { error: dimError } = await client.from('dimensions').upsert(defaultDimensions);
  if (dimError) throw new Error(`创建维度失败: ${dimError.message}`);

  // 创建系统配置
  console.log('创建系统配置...');
  const adminPasswordHash = await bcrypt.hash('admin123', 10);
  const { error: cfgError } = await client.from('configs').upsert([
    { key: 'isAnonymous', value: 'true' },
    { key: 'passScore', value: '60' },
    { key: 'adminPassword', value: adminPasswordHash },
  ]);
  if (cfgError) throw new Error(`创建配置失败: ${cfgError.message}`);

  console.log('Supabase 数据库初始化完成！');
  console.log(`- 评价人: ${defaultEvaluators.length} 位`);
  console.log(`- 被评人: ${defaultEvaluatees.length} 位（晋级9位 + 保级7位）`);
  console.log(`- 评价维度: ${defaultDimensions.length} 个`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
