import { useState, useEffect } from 'react';

interface DashboardStats {
  evaluatorCount: number;
  evaluateeCount: number;
  assignmentCount: number;
  scoreCount: number;
  submittedScoreCount: number;
  completionRate: number;
}

interface EvaluateeProgress {
  id: string;
  code: string;
  name: string;
  level: string;
  category: string;
  totalAssigned: number;
  completedCount: number;
  pendingCount: number;
  progress: number;
  pendingEvaluators: string[];
}

export default function DashboardOverview() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [progress, setProgress] = useState<EvaluateeProgress[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/admin/dashboard', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setStats(data.stats);
        setProgress(data.evaluateeProgress);
      }
    } catch (error) {
      console.error('Fetch dashboard error:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="text-center py-8">加载中...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-gray-900">仪表盘</h2>
        <p className="text-sm text-gray-500 mt-1">系统数据总览</p>
      </div>

      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="bg-blue-50 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-blue-600">{stats.evaluatorCount}</div>
            <div className="text-xs text-gray-500">评价人</div>
          </div>
          <div className="bg-green-50 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-green-600">{stats.evaluateeCount}</div>
            <div className="text-xs text-gray-500">被评人</div>
          </div>
          <div className="bg-purple-50 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-purple-600">{stats.assignmentCount}</div>
            <div className="text-xs text-gray-500">评价关系</div>
          </div>
          <div className="bg-orange-50 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-orange-600">{stats.submittedScoreCount}</div>
            <div className="text-xs text-gray-500">已完成</div>
          </div>
          <div className="bg-red-50 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-red-600">{stats.completionRate}%</div>
            <div className="text-xs text-gray-500">完成率</div>
          </div>
        </div>
      )}

      <div>
        <h3 className="font-semibold text-gray-900 mb-4">未评价清单</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">被评人</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500">应评人数</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500">已评人数</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500">进度</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">未评价人</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {progress.map((item) => (
                <tr key={item.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-900">{item.name}</div>
                    <div className="text-xs text-gray-500">{item.level}</div>
                  </td>
                  <td className="px-4 py-3 text-center">{item.totalAssigned}</td>
                  <td className="px-4 py-3 text-center">{item.completedCount}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center">
                      <div className="flex-1 h-2 bg-gray-200 rounded-full mr-2">
                        <div
                          className="h-2 bg-blue-600 rounded-full"
                          style={{ width: `${item.progress}%` }}
                        />
                      </div>
                      <span className="text-xs text-gray-600">{item.progress}%</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {item.pendingEvaluators.length > 0
                      ? item.pendingEvaluators.join('、')
                      : '已完成'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
