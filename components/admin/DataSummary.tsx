import { useState, useEffect } from 'react';
import { calculatePercentageScore, getScoreColorClass } from '@/lib/utils';

interface SummaryItem {
  id: string;
  code: string;
  name: string;
  level: string;
  category: string;
  dimensionAverages: Record<string, number>;
  averagePercentage: number;
  submittedCount: number;
  totalAssigned: number;
  completionRate: number;
  scores: {
    evaluatorAlias: string;
    dimensionScores: Record<string, number>;
    percentage: number;
    comment: string | null;
  }[];
}

interface Dimension {
  id: string;
  code: string;
  name: string;
  category: string;
}

export default function DataSummary() {
  const [summary, setSummary] = useState<SummaryItem[]>([]);
  const [dimensions, setDimensions] = useState<Dimension[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEvaluatee, setSelectedEvaluatee] = useState<SummaryItem | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('全部');

  const categories = ['全部', ...Array.from(new Set(dimensions.map((d) => d.category).filter(Boolean)))];

  const filteredSummary = selectedCategory === '全部'
    ? summary
    : summary.filter((item) => item.category === selectedCategory);

  const displayedDimensions = selectedCategory === '全部'
    ? dimensions
    : dimensions.filter((d) => d.category === selectedCategory);

  useEffect(() => {
    fetchSummary();
  }, []);

  const fetchSummary = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/admin/summary', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setSummary(data.summary);
        setDimensions(data.dimensions);
      }
    } catch (error) {
      console.error('Fetch summary error:', error);
    } finally {
      setLoading(false);
    }
  };

  const exportCSV = () => {
    const exportDims = displayedDimensions;
    const exportSummary = filteredSummary;
    const headers = ['排名', '姓名', '等级', '分类', '平均分', ...exportDims.map((d) => d.name), '评价人数'];
    const rows = exportSummary.map((item, index) => [
      index + 1,
      item.name,
      item.level,
      item.category,
      item.averagePercentage.toFixed(1),
      ...exportDims.map((d) => (item.dimensionAverages[d.code] || 0).toFixed(1)),
      `${item.submittedCount}/${item.totalAssigned}`,
    ]);

    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `评议汇总报表_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  if (loading) {
    return <div className="text-center py-8">加载中...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900">数据汇总</h2>
          <p className="text-sm text-gray-500 mt-1">查看所有被评人的评分汇总</p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {categories.map((cat) => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
          <button
            onClick={exportCSV}
            className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700 transition-colors"
          >
            导出CSV
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-3 py-3 text-left text-xs font-medium text-gray-500">排名</th>
              <th className="px-3 py-3 text-left text-xs font-medium text-gray-500">姓名</th>
              <th className="px-3 py-3 text-left text-xs font-medium text-gray-500">等级</th>
              <th className="px-3 py-3 text-center text-xs font-medium text-gray-500">分类</th>
              <th className="px-3 py-3 text-center text-xs font-medium text-gray-500">平均分</th>
              {displayedDimensions.map((d) => (
                <th key={d.id} className="px-3 py-3 text-center text-xs font-medium text-gray-500">
                  {d.name.substring(0, 4)}
                </th>
              ))}
              <th className="px-3 py-3 text-center text-xs font-medium text-gray-500">进度</th>
              <th className="px-3 py-3 text-center text-xs font-medium text-gray-500">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {filteredSummary.map((item, index) => (
              <tr key={item.id} className="hover:bg-gray-50">
                <td className="px-3 py-3 text-sm font-medium text-gray-900">{index + 1}</td>
                <td className="px-3 py-3 text-sm font-medium text-gray-900">{item.name}</td>
                <td className="px-3 py-3 text-sm text-gray-600">{item.level}</td>
                <td className="px-3 py-3 text-center">
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded text-xs ${
                      item.category === '晋级'
                        ? 'bg-blue-100 text-blue-700'
                        : 'bg-green-100 text-green-700'
                    }`}
                  >
                    {item.category}
                  </span>
                </td>
                <td className="px-3 py-3 text-center">
                  <span className={`font-bold ${getScoreColorClass(item.averagePercentage)}`}>
                    {item.averagePercentage.toFixed(1)}
                  </span>
                </td>
                {displayedDimensions.map((d) => (
                  <td key={d.id} className="px-3 py-3 text-center text-sm text-gray-600">
                    {(item.dimensionAverages[d.code] || 0).toFixed(1)}
                  </td>
                ))}
                <td className="px-3 py-3 text-center">
                  <div className="flex items-center justify-center">
                    <div className="w-16 h-2 bg-gray-200 rounded-full mr-2">
                      <div
                        className="h-2 bg-blue-600 rounded-full"
                        style={{ width: `${item.completionRate}%` }}
                      />
                    </div>
                    <span className="text-xs text-gray-600">{item.completionRate}%</span>
                  </div>
                </td>
                <td className="px-3 py-3 text-center">
                  <button
                    onClick={() => setSelectedEvaluatee(item)}
                    className="text-sm text-blue-600 hover:text-blue-800"
                  >
                    详情
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selectedEvaluatee && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-auto p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900">
                {selectedEvaluatee.name} - 评价详情
              </h3>
              <button
                onClick={() => setSelectedEvaluatee(null)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              {selectedEvaluatee.scores.map((score, idx) => (
                <div key={idx} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-gray-900">{score.evaluatorAlias}</span>
                    <span className={`font-bold ${getScoreColorClass(score.percentage)}`}>
                      {score.percentage.toFixed(1)}分
                    </span>
                  </div>
                  <div className="grid grid-cols-7 gap-2 text-xs text-gray-600 mb-2">
                    {dimensions
                      .filter((d) => d.category === (selectedEvaluatee?.category || '默认'))
                      .map((d) => (
                        <div key={d.id} className="text-center">
                          <div className="text-gray-400">{d.name.substring(0, 2)}</div>
                          <div className="font-medium">{score.dimensionScores[d.code] || '-'}</div>
                        </div>
                      ))}
                  </div>
                  {score.comment && (
                    <div className="text-sm text-gray-600 bg-gray-50 p-2 rounded">
                      {score.comment}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
