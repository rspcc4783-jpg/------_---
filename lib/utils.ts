import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// 计算百分制得分（5分制）
// 公式: (sum / 5) * dimensionCount * 100 = (sum / (dimensionCount * 5)) * 100
// 例如: 11个维度，总分54，则得分 = 54/5*11*100 = 98.18分
export function calculatePercentageScore(dimensionScores: Record<string, number>): number {
  const scores = Object.values(dimensionScores);
  if (scores.length === 0) return 0;

  const sum = scores.reduce((a, b) => a + b, 0);
  const dimensionCount = scores.length;
  const percentage = (sum / (dimensionCount * 5)) * 100;
  return Math.round(percentage * 10) / 10;
}

// 评价人代号映射
export function getEvaluatorAlias(index: number): string {
  const aliases = ['①', '②', '③', '④', '⑤', '⑥', '⑦', '⑧', '⑨', '⑩'];
  return aliases[index] || `(${index + 1})`;
}

// 获取状态颜色
export function getScoreColorClass(score: number): string {
  if (score >= 90) return 'text-green-600';
  if (score >= 80) return 'text-blue-600';
  if (score >= 60) return 'text-yellow-600';
  return 'text-red-600';
}

export function getScoreBgColorClass(score: number): string {
  if (score >= 90) return 'bg-green-100 text-green-800';
  if (score >= 80) return 'bg-blue-100 text-blue-800';
  if (score >= 60) return 'bg-yellow-100 text-yellow-800';
  return 'bg-red-100 text-red-800';
}
