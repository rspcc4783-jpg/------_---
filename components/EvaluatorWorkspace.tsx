import { useState, useEffect } from 'react';
import { User } from '@/pages/index';
import { calculatePercentageScore, getScoreColorClass } from '@/lib/utils';
import { KeyRound } from 'lucide-react';

interface EvaluatorWorkspaceProps {
  currentUser: User;
  onLogout: () => void;
}

interface Evaluatee {
  id: string;
  code: string;
  name: string;
  level: string;
  category: string;
}

interface Task {
  evaluatee: Evaluatee;
  status: 'pending' | 'draft' | 'submitted';
  score: {
    dimensionScores: Record<string, number>;
    comment: string | null;
  } | null;
}

interface Dimension {
  id: string;
  code: string;
  name: string;
  standard5: string;
  standard4: string;
  standard3: string;
  standard2: string;
  standard1: string;
}

export default function EvaluatorWorkspace({ currentUser, onLogout }: EvaluatorWorkspaceProps) {
  const [view, setView] = useState<'list' | 'evaluate'>('list');
  const [tasks, setTasks] = useState<Task[]>([]);
  const [filter, setFilter] = useState<'all' | 'pending' | 'draft' | 'submitted'>('all');
  const [selectedEvaluatee, setSelectedEvaluatee] = useState<Evaluatee | null>(null);
  const [dimensions, setDimensions] = useState<Dimension[]>([]);
  const [loading, setLoading] = useState(true);

  // 修改密码弹窗状态
  const [showChangePwd, setShowChangePwd] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [changingPwd, setChangingPwd] = useState(false);

  useEffect(() => {
    fetchTasks();
  }, []);

  const fetchTasks = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/evaluator/tasks', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setTasks(data.tasks);
      }
    } catch (error) {
      console.error('Fetch tasks error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEvaluate = async (evaluatee: Evaluatee) => {
    setSelectedEvaluatee(evaluatee);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/evaluator/score?evaluateeId=${evaluatee.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setDimensions(data.dimensions || []);
      }
    } catch (error) {
      console.error('Fetch dimensions error:', error);
    }
    setView('evaluate');
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword.trim()) {
      alert('请输入新密码');
      return;
    }
    setChangingPwd(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/evaluator/change-password', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ password: newPassword.trim() }),
      });
      if (res.ok) {
        alert('密码修改成功，请使用新密码重新登录');
        setShowChangePwd(false);
        setNewPassword('');
        onLogout();
      } else {
        const data = await res.json();
        alert(data.error || '修改密码失败');
      }
    } catch (error) {
      console.error('Change password error:', error);
      alert('修改密码失败');
    } finally {
      setChangingPwd(false);
    }
  };

  const filteredTasks = tasks.filter((t) => filter === 'all' || t.status === filter);

  const completedCount = tasks.filter((t) => t.status === 'submitted').length;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-lg text-gray-600">加载中...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center mr-3">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">周边民主评议系统</h1>
                <p className="text-xs text-gray-500">评价人工作台</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <span className="text-sm text-gray-600">{currentUser.name}</span>
              <button
                onClick={() => {
                  setNewPassword('');
                  setShowChangePwd(true);
                }}
                className="inline-flex items-center gap-1 px-3 py-1.5 bg-amber-50 text-amber-600 rounded-md text-xs hover:bg-amber-100 transition-colors"
                title="修改密码"
              >
                <KeyRound size={13} />
                修改密码
              </button>
              <button
                onClick={onLogout}
                className="text-sm text-gray-500 hover:text-gray-700 px-3 py-2 rounded-md hover:bg-gray-100 transition-colors"
              >
                退出登录
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {view === 'list' ? (
          <TaskList
            tasks={filteredTasks}
            filter={filter}
            setFilter={setFilter}
            completedCount={completedCount}
            totalCount={tasks.length}
            onEvaluate={handleEvaluate}
          />
        ) : selectedEvaluatee ? (
          <EvaluationForm
            evaluatee={selectedEvaluatee}
            dimensions={dimensions}
            onBack={() => {
              setView('list');
              setSelectedEvaluatee(null);
              fetchTasks();
            }}
          />
        ) : null}
      </main>

      {/* 修改密码弹窗 */}
      {showChangePwd && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-1">修改密码</h3>
            <p className="text-sm text-gray-500 mb-4">
              当前用户：<span className="font-medium text-gray-700">{currentUser.name}</span>
            </p>
            <form onSubmit={handleChangePassword} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">新密码</label>
                <input
                  type="text"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-amber-500 focus:border-amber-500"
                  placeholder="请输入新密码"
                  required
                  autoFocus
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  disabled={changingPwd}
                  className="flex-1 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors disabled:opacity-50"
                >
                  {changingPwd ? '保存中...' : '确认修改'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowChangePwd(false);
                    setNewPassword('');
                  }}
                  className="flex-1 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                >
                  取消
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

interface TaskListProps {
  tasks: Task[];
  filter: string;
  setFilter: (filter: 'all' | 'pending' | 'draft' | 'submitted') => void;
  completedCount: number;
  totalCount: number;
  onEvaluate: (evaluatee: Evaluatee) => void;
}

function TaskList({ tasks, filter, setFilter, completedCount, totalCount, onEvaluate }: TaskListProps) {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900">我的待评任务</h2>
          <p className="text-sm text-gray-500 mt-1">
            共 {totalCount} 个待评任务，已完成 {completedCount} 个
          </p>
        </div>
        <div className="flex gap-2">
          {(['all', 'pending', 'draft', 'submitted'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                filter === f ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {f === 'all' ? '全部' : f === 'pending' ? '待评价' : f === 'draft' ? '草稿' : '已提交'}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {tasks.map(({ evaluatee, status, score }) => {
          const percentage = score
            ? calculatePercentageScore(score.dimensionScores)
            : 0;
          return (
            <div
              key={evaluatee.id}
              className={`bg-white rounded-lg border p-5 transition-shadow hover:shadow-md ${
                status === 'submitted'
                  ? 'border-green-200 bg-green-50/30'
                  : status === 'draft'
                  ? 'border-yellow-200 bg-yellow-50/30'
                  : 'border-gray-200'
              }`}
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-bold text-lg text-gray-900">{evaluatee.name}</h3>
                  <p className="text-sm text-gray-500">{evaluatee.level}</p>
                </div>
                <StatusBadge status={status} />
              </div>

              {evaluatee.category !== '无' && (
                <div className="flex items-center gap-2 mb-4">
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded text-xs ${
                      evaluatee.category === '晋级'
                        ? 'bg-blue-100 text-blue-700'
                        : 'bg-green-100 text-green-700'
                    }`}
                  >
                    {evaluatee.category}
                  </span>
                </div>
              )}

              {status === 'submitted' && score && (
                <div className="mb-4 p-3 bg-white rounded border border-gray-200">
                  <div className="text-sm text-gray-500">您的评分</div>
                  <div className={`text-2xl font-bold ${getScoreColorClass(percentage)}`}>
                    {percentage.toFixed(1)}分
                  </div>
                </div>
              )}

              <button
                onClick={() => onEvaluate(evaluatee)}
                disabled={status === 'submitted'}
                className={`w-full py-2 rounded-lg text-sm font-medium transition-colors ${
                  status === 'submitted'
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
              >
                {status === 'submitted' ? '已完成评价' : status === 'draft' ? '继续评价' : '开始评价'}
              </button>
            </div>
          );
        })}
      </div>

      {tasks.length === 0 && (
        <div className="text-center py-12">
          <span className="text-4xl mb-4 block">🎉</span>
          <p className="text-gray-500">暂无待评任务</p>
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles = {
    submitted: 'bg-green-100 text-green-800',
    draft: 'bg-yellow-100 text-yellow-800',
    pending: 'bg-gray-100 text-gray-800',
  };
  const labels = {
    submitted: '已提交',
    draft: '草稿',
    pending: '待评价',
  };
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${styles[status as keyof typeof styles]}`}>
      {labels[status as keyof typeof labels]}
    </span>
  );
}

interface EvaluationFormProps {
  evaluatee: Evaluatee;
  dimensions: Dimension[];
  onBack: () => void;
}

function EvaluationForm({ evaluatee, dimensions, onBack }: EvaluationFormProps) {
  const [scores, setScores] = useState<Record<string, number>>({});
  const [comment, setComment] = useState('');
  const [showConfirm, setShowConfirm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('token');
    fetch(`/api/evaluator/score?evaluateeId=${evaluatee.id}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.score) {
          setScores(data.score.dimensionScores || {});
          setComment(data.score.comment || '');
          // 如果已有提交的评分，标记为已提交（防止自动保存覆盖）
          if (data.score.status === 'submitted') {
            setSubmitted(true);
          }
        }
      });
  }, [evaluatee.id]);

  useEffect(() => {
    // 已提交或评分为空时不自动保存
    if (submitted || Object.keys(scores).length === 0) return;

    const timer = setTimeout(() => {
      saveScore('draft');
    }, 2000);

    return () => clearTimeout(timer);
  }, [scores, comment, submitted]);

  const saveScore = async (status: 'draft' | 'submitted'): Promise<boolean> => {
    if (saving) return false; // 防止并发保存
    setSaving(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/evaluator/score', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          evaluateeId: evaluatee.id,
          dimensionScores: scores,
          comment,
          status,
        }),
      });
      
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: '保存失败' }));
        console.error('Save score error:', errorData);
        return false;
      }
      
      return true;
    } catch (error) {
      console.error('Save score error:', error);
      return false;
    } finally {
      setSaving(false);
    }
  };

  const handleSubmit = () => {
    const missingDimensions = dimensions.filter((d) => !scores[d.id]);
    if (missingDimensions.length > 0) {
      alert(`请完成以下维度的评分：${missingDimensions.map((d) => d.name).join('、')}`);
      return;
    }
    setShowConfirm(true);
  };

  const confirmSubmit = async () => {
    const success = await saveScore('submitted');
    if (success) {
      setSubmitted(true);
      alert('评价提交成功！');
      onBack();
    } else {
      alert('评价提交失败，请重试');
    }
  };

  const completedCount = Object.keys(scores).length;
  const progress = dimensions.length > 0 ? Math.round((completedCount / dimensions.length) * 100) : 0;

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <button
              onClick={onBack}
              className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1 mb-2"
            >
              ← 返回列表
            </button>
            <h2 className="text-2xl font-bold text-gray-900">{evaluatee.name}</h2>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-gray-600">{evaluatee.level}</span>
              {evaluatee.category !== '无' && (
                <>
                  <span className="text-gray-400">|</span>
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded text-xs ${
                      evaluatee.category === '晋级'
                        ? 'bg-blue-100 text-blue-700'
                        : 'bg-green-100 text-green-700'
                    }`}
                  >
                    {evaluatee.category}
                  </span>
                </>
              )}
            </div>
          </div>
          <div className="text-right">
            <div className="text-sm text-gray-500">完成进度</div>
            <div className="text-2xl font-bold text-blue-600">{progress}%</div>
            <div className="text-xs text-gray-500">
              {completedCount}/{dimensions.length} 项
            </div>
          </div>
        </div>

        <div className="mt-4">
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
        {saving && <div className="mt-2 text-xs text-yellow-600">保存中...</div>}
      </div>

      <div className="space-y-6">
        {dimensions.map((dimension, index) => (
          <DimensionCard
            key={dimension.id}
            index={index}
            dimension={dimension}
            score={scores[dimension.id]}
            onChange={(score) => setScores({ ...scores, [dimension.id]: score })}
          />
        ))}

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="font-semibold text-gray-900 mb-3">评语（可选）</h3>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="请填写对被评人的评价依据、优势或不足之处..."
            rows={4}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none resize-none"
          />
        </div>

        <div className="flex gap-4">
          <button
            onClick={handleSubmit}
            className="flex-1 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
          >
            确认提交
          </button>
          <button
            onClick={onBack}
            className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-300 transition-colors"
          >
            返回
          </button>
        </div>
      </div>

      {showConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-yellow-100 rounded-full flex items-center justify-center">
                <span className="text-yellow-600">!</span>
              </div>
              <h3 className="text-lg font-bold text-gray-900">确认提交</h3>
            </div>
            <p className="text-gray-600 mb-6">提交后将无法修改评价内容，请确认是否继续？</p>
            <div className="flex gap-3">
              <button
                onClick={confirmSubmit}
                className="flex-1 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                确认提交
              </button>
              <button
                onClick={() => setShowConfirm(false)}
                className="flex-1 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
              >
                取消
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

interface DimensionCardProps {
  index: number;
  dimension: Dimension;
  score?: number;
  onChange: (score: number) => void;
}

function DimensionCard({ index, dimension, score, onChange }: DimensionCardProps) {
  const [expanded, setExpanded] = useState(true);

  const standards = [
    { level: 5, text: dimension.standard5 },
    { level: 4, text: dimension.standard4 },
    { level: 3, text: dimension.standard3 },
    { level: 2, text: dimension.standard2 },
    { level: 1, text: dimension.standard1 },
  ];

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <div
        className="px-6 py-4 bg-gray-50 border-b border-gray-200 flex items-center justify-between cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-3">
          <span className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold">
            {index + 1}
          </span>
          <h3 className="font-semibold text-gray-900">{dimension.name}</h3>
          {score && (
            <span
              className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                score >= 4
                  ? 'bg-green-100 text-green-800'
                  : score >= 3
                  ? 'bg-blue-100 text-blue-800'
                  : score >= 2
                  ? 'bg-yellow-100 text-yellow-800'
                  : 'bg-red-100 text-red-800'
              }`}
            >
              已选 {score} 分
            </span>
          )}
        </div>
        <svg
          className={`w-5 h-5 text-gray-400 transition-transform ${expanded ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </div>

      {expanded && (
        <div className="p-4 space-y-2 bg-gray-50/50">
          {standards.map((s) => (
            <div
              key={s.level}
              onClick={() => onChange(s.level)}
              className={`p-3 rounded-lg cursor-pointer transition-all ${
                score === s.level
                  ? 'bg-blue-100 border-2 border-blue-500'
                  : 'bg-white border border-gray-200 hover:border-blue-300'
              }`}
            >
              <div className="flex items-start gap-3">
                <span
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${
                    score === s.level ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  {s.level}
                </span>
                <p className={`text-sm ${score === s.level ? 'text-blue-900' : 'text-gray-700'}`}>
                  {s.text}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="px-6 py-3 border-t border-gray-200 flex items-center gap-2">
        <span className="text-sm text-gray-500 mr-2">快速选择：</span>
        {[1, 2, 3, 4, 5].map((level) => (
          <button
            key={level}
            onClick={() => onChange(level)}
            className={`w-10 h-10 rounded-lg font-bold transition-all ${
              score === level ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {level}
          </button>
        ))}
        <button
          onClick={() => setExpanded(!expanded)}
          className="ml-auto text-sm text-blue-600 hover:text-blue-800"
        >
          {expanded ? '收起详情' : '查看标准'}
        </button>
      </div>
    </div>
  );
}
