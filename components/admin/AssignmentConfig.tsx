import { useState, useEffect } from 'react';

interface Evaluator {
  id: string;
  code: string;
  name: string;
}

interface Evaluatee {
  id: string;
  code: string;
  name: string;
}

interface Assignment {
  evaluatorId: string;
  evaluateeId: string;
}

export default function AssignmentConfig() {
  const [evaluators, setEvaluators] = useState<Evaluator[]>([]);
  const [evaluatees, setEvaluatees] = useState<Evaluatee[]>([]);
  const [assignments, setAssignments] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const token = localStorage.getItem('token');
      const [evaluatorsRes, evaluateesRes, assignmentsRes] = await Promise.all([
        fetch('/api/admin/evaluators', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/admin/evaluatees', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/admin/assignments', { headers: { Authorization: `Bearer ${token}` } }),
      ]);

      if (evaluatorsRes.ok && evaluateesRes.ok && assignmentsRes.ok) {
        const [evaluatorsData, evaluateesData, assignmentsData] = await Promise.all([
          evaluatorsRes.json(),
          evaluateesRes.json(),
          assignmentsRes.json(),
        ]);

        setEvaluators(evaluatorsData.evaluators);
        setEvaluatees(evaluateesData.evaluatees);
        setAssignments(
          new Set(
            assignmentsData.assignments.map(
              (a: Assignment) => `${a.evaluatorId}-${a.evaluateeId}`
            )
          )
        );
      }
    } catch (error) {
      console.error('Fetch data error:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleAssignment = async (evaluatorId: string, evaluateeId: string) => {
    const key = `${evaluatorId}-${evaluateeId}`;
    const isAssigned = assignments.has(key);
    const token = localStorage.getItem('token');

    try {
      if (isAssigned) {
        const res = await fetch(`/api/admin/assignments?evaluatorId=${evaluatorId}&evaluateeId=${evaluateeId}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          setAssignments((prev) => {
            const next = new Set(prev);
            next.delete(key);
            return next;
          });
        } else {
          alert('取消分配失败，请重试');
        }
      } else {
        const res = await fetch('/api/admin/assignments', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ evaluatorId, evaluateeId }),
        });
        if (res.ok) {
          setAssignments((prev) => new Set(prev).add(key));
        } else {
          alert('分配失败，请重试');
        }
      }
    } catch (error) {
      console.error('Toggle assignment error:', error);
      alert('操作失败，请检查网络连接');
    }
  };

  if (loading) {
    return <div className="text-center py-8">加载中...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">评价关系配置</h2>
          <p className="text-sm text-gray-500 mt-1">配置评价人与被评人的对应关系</p>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 sticky left-0 bg-gray-50">
                被评人 \ 评价人
              </th>
              {evaluators.map((e) => (
                <th key={e.id} className="px-2 py-3 text-center text-xs font-medium text-gray-500">
                  <div className="w-16">{e.name.substring(0, 2)}</div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {evaluatees.map((evaluatee) => (
              <tr key={evaluatee.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 text-sm font-medium text-gray-900 sticky left-0 bg-white">
                  {evaluatee.name}
                </td>
                {evaluators.map((evaluator) => {
                  const key = `${evaluator.id}-${evaluatee.id}`;
                  const isAssigned = assignments.has(key);
                  return (
                    <td key={evaluator.id} className="px-2 py-3 text-center">
                      <button
                        onClick={() => toggleAssignment(evaluator.id, evaluatee.id)}
                        className={`w-6 h-6 rounded ${
                          isAssigned ? 'bg-blue-600' : 'bg-gray-200 hover:bg-gray-300'
                        }`}
                      >
                        {isAssigned && <span className="text-white text-xs">✓</span>}
                      </button>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
