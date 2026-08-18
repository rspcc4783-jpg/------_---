import { useState, useEffect, useRef } from 'react';

export default function DataBackup() {
  const [stats, setStats] = useState({
    evaluatorCount: 0,
    evaluateeCount: 0,
    assignmentCount: 0,
    scoreCount: 0,
  });
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/admin/dashboard', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setStats({
          evaluatorCount: data.stats.evaluatorCount,
          evaluateeCount: data.stats.evaluateeCount,
          assignmentCount: data.stats.assignmentCount,
          scoreCount: data.stats.scoreCount,
        });
      }
    } catch (error) {
      console.error('Fetch stats error:', error);
    }
  };

  const handleExport = async () => {
    try {
      const token = localStorage.getItem('token');
      const [evRes, eeRes, asRes, dimRes, scRes] = await Promise.all([
        fetch('/api/admin/evaluators', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/admin/evaluatees', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/admin/assignments', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/admin/dimensions', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/admin/summary', { headers: { Authorization: `Bearer ${token}` } }),
      ]);

      const [evaluators, evaluatees, assignments, dimensions, summary] = await Promise.all([
        evRes.json(),
        eeRes.json(),
        asRes.json(),
        dimRes.json(),
        scRes.json(),
      ]);

      // 获取所有评分记录
      const scoresRes = await fetch('/api/admin/summary?raw=1', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const scoresData = scoresRes.ok ? await scoresRes.json() : { scores: [] };

      const data = {
        evaluators: evaluators.evaluators,
        evaluatees: evaluatees.evaluatees,
        assignments: assignments.assignments,
        dimensions: dimensions.dimensions,
        scores: scoresData.scores || [],
        dimension_scores: scoresData.dimensionScores || [],
        exportTime: new Date().toISOString(),
      };

      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `周边评议系统备份_${new Date().toISOString().split('T')[0]}.json`;
      link.click();
      setMessage({ type: 'success', text: '数据导出成功' });
      setTimeout(() => setMessage(null), 3000);
    } catch (error) {
      console.error('Export error:', error);
      setMessage({ type: 'error', text: '导出失败' });
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImporting(true);
    setMessage(null);

    try {
      const text = await file.text();
      const backup = JSON.parse(text);

      if (!backup.evaluators || !backup.evaluatees) {
        setMessage({ type: 'error', text: '无效的备份文件格式' });
        setImporting(false);
        return;
      }

      const token = localStorage.getItem('token');
      const res = await fetch('/api/admin/import', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(backup),
      });

      if (res.ok) {
        setMessage({ type: 'success', text: '数据导入成功，页面即将刷新' });
        setTimeout(() => window.location.reload(), 1500);
      } else {
        const err = await res.json();
        setMessage({ type: 'error', text: err.error || '导入失败' });
      }
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || '导入失败' });
    } finally {
      setImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-gray-900">数据备份与恢复</h2>
        <p className="text-sm text-gray-500 mt-1">导出数据进行备份，或导入之前的备份数据</p>
      </div>

      <div className="bg-gray-50 rounded-lg border border-gray-200 p-4">
        <h3 className="text-sm font-medium text-gray-700 mb-3">当前数据概览</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">{stats.evaluatorCount}</div>
            <div className="text-xs text-gray-500">评价人</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">{stats.evaluateeCount}</div>
            <div className="text-xs text-gray-500">被评人</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600">{stats.assignmentCount}</div>
            <div className="text-xs text-gray-500">评价关系</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-orange-600">{stats.scoreCount}</div>
            <div className="text-xs text-gray-500">评分记录</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-blue-50 rounded-lg border border-blue-200 p-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-gray-900">导出备份</h3>
              <p className="text-sm text-gray-600 mt-1">将所有数据导出为JSON文件，可用于备份</p>
              <button
                onClick={handleExport}
                className="mt-3 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition-colors"
              >
                导出JSON文件
              </button>
            </div>
          </div>
        </div>

        <div className="bg-green-50 rounded-lg border border-green-200 p-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-gray-900">导入备份</h3>
              <p className="text-sm text-gray-600 mt-1">从之前导出的JSON文件恢复数据</p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                onChange={handleFileSelect}
                className="hidden"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={importing}
                className="mt-3 px-4 py-2 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700 transition-colors disabled:opacity-50"
              >
                {importing ? '导入中...' : '选择备份文件'}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <svg className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <div className="text-sm text-yellow-800">
            <p className="font-medium">重要提示</p>
            <p className="mt-1">
              1. 导入备份将覆盖现有所有数据，请谨慎操作
              <br />
              2. 建议先导出当前数据作为备份后再导入
            </p>
          </div>
        </div>
      </div>

      {message && (
        <div
          className={`rounded-lg p-4 ${
            message.type === 'success'
              ? 'bg-green-50 border border-green-200 text-green-800'
              : 'bg-red-50 border border-red-200 text-red-800'
          }`}
        >
          {message.text}
        </div>
      )}
    </div>
  );
}
