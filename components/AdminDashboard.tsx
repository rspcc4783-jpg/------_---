import { useState, useEffect } from 'react';
import { User } from '@/pages/index';
import { KeyRound } from 'lucide-react';
import DashboardOverview from './admin/DashboardOverview';
import EvaluateeManagement from './admin/EvaluateeManagement';
import EvaluatorManagement from './admin/EvaluatorManagement';
import AssignmentConfig from './admin/AssignmentConfig';
import DimensionEditor from './admin/DimensionEditor';
import DataSummary from './admin/DataSummary';
import DataBackup from './admin/DataBackup';

interface AdminDashboardProps {
  currentUser: User;
  onLogout: () => void;
}

type TabType = 'overview' | 'evaluatees' | 'evaluators' | 'assignments' | 'dimensions' | 'summary' | 'backup';

const tabs = [
  { id: 'overview' as TabType, name: '仪表盘', icon: '📊' },
  { id: 'evaluatees' as TabType, name: '被评人管理', icon: '👥' },
  { id: 'evaluators' as TabType, name: '评价人管理', icon: '👤' },
  { id: 'assignments' as TabType, name: '评价关系配置', icon: '🔗' },
  { id: 'dimensions' as TabType, name: '评分标准', icon: '📝' },
  { id: 'summary' as TabType, name: '数据汇总', icon: '📈' },
  { id: 'backup' as TabType, name: '数据备份', icon: '💾' },
];

export default function AdminDashboard({ currentUser, onLogout }: AdminDashboardProps) {
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [refreshKey, setRefreshKey] = useState(0);

  // 修改密码弹窗状态
  const [showChangePwd, setShowChangePwd] = useState(false);
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [changingPwd, setChangingPwd] = useState(false);

  const handleUpdate = () => {
    setRefreshKey((prev) => prev + 1);
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!oldPassword.trim() || !newPassword.trim()) {
      alert('请输入旧密码和新密码');
      return;
    }
    if (newPassword.trim().length < 6) {
      alert('新密码至少6位');
      return;
    }
    setChangingPwd(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/admin/change-password', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          oldPassword: oldPassword.trim(),
          newPassword: newPassword.trim(),
        }),
      });
      if (res.ok) {
        alert('密码修改成功，请使用新密码重新登录');
        setShowChangePwd(false);
        setOldPassword('');
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
                <p className="text-xs text-gray-500">管理员后台</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <span className="text-sm text-gray-600">欢迎，{currentUser.name}</span>
              <button
                onClick={() => {
                  setOldPassword('');
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

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex flex-col lg:flex-row gap-6">
          <nav className="lg:w-64 flex-shrink-0">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full text-left px-4 py-3 flex items-center space-x-3 transition-colors ${
                    activeTab === tab.id
                      ? 'bg-blue-50 text-blue-700 border-l-4 border-blue-600'
                      : 'text-gray-700 hover:bg-gray-50 border-l-4 border-transparent'
                  }`}
                >
                  <span>{tab.icon}</span>
                  <span className="font-medium">{tab.name}</span>
                </button>
              ))}
            </div>
          </nav>

          <main className="flex-1 min-w-0">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              {activeTab === 'overview' && <DashboardOverview key={refreshKey} />}
              {activeTab === 'evaluatees' && <EvaluateeManagement onUpdate={handleUpdate} />}
              {activeTab === 'evaluators' && <EvaluatorManagement onUpdate={handleUpdate} />}
              {activeTab === 'assignments' && <AssignmentConfig key={refreshKey} />}
              {activeTab === 'dimensions' && <DimensionEditor />}
              {activeTab === 'summary' && <DataSummary />}
              {activeTab === 'backup' && <DataBackup />}
            </div>
          </main>
        </div>
      </div>

      {/* 修改密码弹窗 */}
      {showChangePwd && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-1">修改管理员密码</h3>
            <p className="text-sm text-gray-500 mb-4">
              当前用户：<span className="font-medium text-gray-700">{currentUser.name}</span>
            </p>
            <form onSubmit={handleChangePassword} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">旧密码</label>
                <input
                  type="password"
                  value={oldPassword}
                  onChange={(e) => setOldPassword(e.target.value)}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-amber-500 focus:border-amber-500"
                  placeholder="请输入旧密码"
                  required
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">新密码</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-amber-500 focus:border-amber-500"
                  placeholder="请输入新密码（至少6位）"
                  required
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
                    setOldPassword('');
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
