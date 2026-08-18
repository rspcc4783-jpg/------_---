import { useState, useEffect, useRef } from 'react';
import { Pencil, KeyRound, Trash2, RotateCcw, Upload, Download, Trash } from 'lucide-react';
import * as XLSX from 'xlsx';

interface Evaluator {
  id: string;
  code: string;
  name: string;
}

interface EvaluatorManagementProps {
  onUpdate: () => void;
}

type ModalType = 'add' | 'edit' | 'resetPwd' | 'delete' | 'resetScores' | 'batchDelete' | null;

export default function EvaluatorManagement({ onUpdate }: EvaluatorManagementProps) {
  const [evaluators, setEvaluators] = useState<Evaluator[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalType, setModalType] = useState<ModalType>(null);
  const [currentEvaluator, setCurrentEvaluator] = useState<Evaluator | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 添加表单
  const [addForm, setAddForm] = useState({ name: '', code: '', password: '123456' });
  // 编辑表单
  const [editForm, setEditForm] = useState({ name: '' });
  // 重置密码表单
  const [pwdForm, setPwdForm] = useState({ password: '' });

  useEffect(() => {
    fetchEvaluators();
  }, []);

  const fetchEvaluators = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const res = await fetch('/api/admin/evaluators', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setEvaluators(data.evaluators);
      }
    } catch (error) {
      console.error('Fetch evaluators error:', error);
    } finally {
      setLoading(false);
    }
  };

  const openModal = (type: ModalType, evaluator?: Evaluator) => {
    if (evaluator) setCurrentEvaluator(evaluator);
    setModalType(type);
    if (type === 'edit' && evaluator) {
      setEditForm({ name: evaluator.name });
    }
    if (type === 'resetPwd') {
      setPwdForm({ password: '' });
    }
  };

  const closeModal = () => {
    setModalType(null);
    setCurrentEvaluator(null);
    setAddForm({ name: '', code: '', password: '123456' });
    setEditForm({ name: '' });
    setPwdForm({ password: '' });
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/admin/evaluators', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(addForm),
      });
      if (res.ok) {
        closeModal();
        fetchEvaluators();
        onUpdate();
      } else {
        const err = await res.json();
        alert(err.error || '添加失败');
      }
    } catch (error) {
      console.error('Add evaluator error:', error);
      alert('添加失败');
    }
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentEvaluator) return;
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/admin/evaluators', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          id: currentEvaluator.id,
          name: editForm.name,
        }),
      });
      if (res.ok) {
        closeModal();
        fetchEvaluators();
        onUpdate();
      } else {
        const err = await res.json();
        alert(err.error || '编辑失败');
      }
    } catch (error) {
      console.error('Edit evaluator error:', error);
      alert('编辑失败');
    }
  };

  const handleResetPwd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentEvaluator) return;
    if (!pwdForm.password.trim()) {
      alert('请输入新密码');
      return;
    }
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/admin/evaluators', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          id: currentEvaluator.id,
          password: pwdForm.password,
        }),
      });
      if (res.ok) {
        closeModal();
        alert(`已重置「${currentEvaluator.name}」的密码`);
        fetchEvaluators();
        onUpdate();
      } else {
        const err = await res.json();
        alert(err.error || '重置密码失败');
      }
    } catch (error) {
      console.error('Reset password error:', error);
      alert('重置密码失败');
    }
  };

  const handleDelete = async () => {
    if (!currentEvaluator) return;
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/admin/evaluators?id=${currentEvaluator.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        closeModal();
        fetchEvaluators();
        onUpdate();
      } else {
        const err = await res.json();
        alert(err.error || '删除失败');
      }
    } catch (error) {
      console.error('Delete evaluator error:', error);
      alert('删除失败');
    }
  };

  const handleResetScores = async () => {
    if (!currentEvaluator) return;
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/admin/reset-scores', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ evaluatorId: currentEvaluator.id }),
      });
      if (res.ok) {
        const data = await res.json();
        closeModal();
        alert(`已清除「${currentEvaluator.name}」的 ${data.deletedCount} 条评价记录，该评价人可重新评价。`);
        onUpdate();
      } else {
        const err = await res.json();
        alert(err.error || '重置评价失败');
      }
    } catch (error) {
      console.error('Reset scores error:', error);
      alert('重置评价失败');
    }
  };

  // 下载模板
  const downloadTemplate = () => {
    const data = [
      { 编号: 'E001', 姓名: '张三', 初始密码: '123456' },
      { 编号: 'E002', 姓名: '李四', 初始密码: '123456' },
    ];
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, '评价人模板');
    XLSX.writeFile(wb, '评价人导入模板.xlsx');
  };

  // 批量导入
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const data = new Uint8Array(event.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet) as Array<{
          编号?: string;
          姓名?: string;
          初始密码?: string;
          code?: string;
          name?: string;
          password?: string;
        }>;

        const items = jsonData
          .map((row) => ({
            code: String(row['编号'] || row['code'] || '').trim(),
            name: String(row['姓名'] || row['name'] || '').trim(),
            password: String(row['初始密码'] || row['password'] || '123456').trim(),
          }))
          .filter((item) => item.code && item.name);

        if (items.length === 0) {
          alert('未检测到有效数据，请检查Excel格式');
          return;
        }

        const token = localStorage.getItem('token');
        const res = await fetch('/api/admin/evaluators', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ items }),
        });

        if (res.ok) {
          alert(`成功导入 ${items.length} 位评价人`);
          fetchEvaluators();
          onUpdate();
        } else {
          const err = await res.json();
          alert(err.error || '导入失败');
        }
      } catch (error) {
        console.error('Import error:', error);
        alert('文件解析失败，请检查Excel格式');
      }
    };
    reader.readAsArrayBuffer(file);

    // 重置 input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // 批量删除
  const handleBatchDelete = async () => {
    if (!confirm('确定要删除所有评价人吗？此操作不可恢复！')) return;
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/admin/evaluators?all=true', {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        closeModal();
        fetchEvaluators();
        onUpdate();
        alert('已清空所有评价人');
      } else {
        const err = await res.json();
        alert(err.error || '批量删除失败');
      }
    } catch (error) {
      console.error('Batch delete error:', error);
      alert('批量删除失败');
    }
  };

  if (loading) {
    return <div className="text-center py-8">加载中...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">评价人管理</h2>
          <p className="text-sm text-gray-500 mt-1">管理评价人信息（共{evaluators.length}位）</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={downloadTemplate}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm hover:bg-gray-200 transition-colors"
            title="下载导入模板"
          >
            <Download size={14} />
            下载模板
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-indigo-50 text-indigo-600 rounded-lg text-sm hover:bg-indigo-100 transition-colors"
            title="批量导入"
          >
            <Upload size={14} />
            批量导入
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls"
            onChange={handleFileUpload}
            className="hidden"
          />
          <button
            onClick={() => openModal('add')}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition-colors"
          >
            添加评价人
          </button>
          {evaluators.length > 0 && (
            <button
              onClick={() => openModal('batchDelete')}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-red-50 text-red-600 rounded-lg text-sm hover:bg-red-100 transition-colors"
              title="批量删除"
            >
              <Trash size={14} />
              批量删除
            </button>
          )}
        </div>
      </div>

      <div className="overflow-x-auto border border-gray-200 rounded-lg">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">编号</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">姓名</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">密码</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">编辑/操作</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {evaluators.map((item) => (
              <tr key={item.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{item.code}</td>
                <td className="px-4 py-3 text-sm font-medium text-gray-900 whitespace-nowrap">{item.name}</td>
                <td className="px-4 py-3 text-sm text-gray-500 whitespace-nowrap">******</td>
                <td className="px-4 py-3 text-sm whitespace-nowrap">
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => openModal('edit', item)}
                      className="inline-flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-600 rounded-md text-xs hover:bg-blue-100 transition-colors"
                      title="编辑"
                    >
                      <Pencil size={12} />
                      编辑
                    </button>
                    <button
                      onClick={() => openModal('resetPwd', item)}
                      className="inline-flex items-center gap-1 px-2 py-1 bg-amber-50 text-amber-600 rounded-md text-xs hover:bg-amber-100 transition-colors"
                      title="重置密码"
                    >
                      <KeyRound size={12} />
                      重置密码
                    </button>
                    <button
                      onClick={() => openModal('resetScores', item)}
                      className="inline-flex items-center gap-1 px-2 py-1 bg-emerald-50 text-emerald-600 rounded-md text-xs hover:bg-emerald-100 transition-colors"
                      title="重置评价"
                    >
                      <RotateCcw size={12} />
                      重置评价
                    </button>
                    <button
                      onClick={() => openModal('delete', item)}
                      className="inline-flex items-center gap-1 px-2 py-1 bg-red-50 text-red-600 rounded-md text-xs hover:bg-red-100 transition-colors"
                      title="删除"
                    >
                      <Trash2 size={12} />
                      删除
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {evaluators.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-sm text-gray-500">
                  暂无评价人数据
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* 添加评价人弹窗 */}
      {modalType === 'add' && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">添加评价人</h3>
            <form onSubmit={handleAdd} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">编号</label>
                <input
                  type="text"
                  value={addForm.code}
                  onChange={(e) => setAddForm({ ...addForm, code: e.target.value })}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                  placeholder="如：E008"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">姓名</label>
                <input
                  type="text"
                  value={addForm.name}
                  onChange={(e) => setAddForm({ ...addForm, name: e.target.value })}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">初始密码</label>
                <input
                  type="text"
                  value={addForm.password}
                  onChange={(e) => setAddForm({ ...addForm, password: e.target.value })}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  className="flex-1 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  确认添加
                </button>
                <button
                  type="button"
                  onClick={closeModal}
                  className="flex-1 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                >
                  取消
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 编辑评价人弹窗 */}
      {modalType === 'edit' && currentEvaluator && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">编辑评价人</h3>
            <p className="text-sm text-gray-500 mb-4">
              编号：<span className="font-medium text-gray-700">{currentEvaluator.code}</span>
            </p>
            <form onSubmit={handleEdit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">姓名</label>
                <input
                  type="text"
                  value={editForm.name}
                  onChange={(e) => setEditForm({ name: e.target.value })}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  className="flex-1 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  保存修改
                </button>
                <button
                  type="button"
                  onClick={closeModal}
                  className="flex-1 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                >
                  取消
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 重置密码弹窗 */}
      {modalType === 'resetPwd' && currentEvaluator && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-1">重置密码</h3>
            <p className="text-sm text-gray-500 mb-4">
              评价人：<span className="font-medium text-gray-700">{currentEvaluator.name}（{currentEvaluator.code}）</span>
            </p>
            <form onSubmit={handleResetPwd} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">新密码</label>
                <input
                  type="text"
                  value={pwdForm.password}
                  onChange={(e) => setPwdForm({ password: e.target.value })}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-amber-500 focus:border-amber-500"
                  placeholder="请输入新密码"
                  required
                  autoFocus
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  className="flex-1 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors"
                >
                  确认重置
                </button>
                <button
                  type="button"
                  onClick={closeModal}
                  className="flex-1 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                >
                  取消
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 重置评价确认弹窗 */}
      {modalType === 'resetScores' && currentEvaluator && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center">
                <RotateCcw size={20} className="text-emerald-600" />
              </div>
              <h3 className="text-lg font-bold text-gray-900">确认重置评价</h3>
            </div>
            <p className="text-sm text-gray-600 mb-2">
              确定要清除评价人 <span className="font-medium text-gray-900">「{currentEvaluator.name}」</span> 的所有评价数据吗？
            </p>
            <p className="text-xs text-emerald-600 mb-6">
              清除后该评价人将可以重新进行评价，此操作不可恢复。
            </p>
            <div className="flex gap-3">
              <button
                onClick={handleResetScores}
                className="flex-1 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
              >
                确认重置
              </button>
              <button
                onClick={closeModal}
                className="flex-1 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
              >
                取消
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 删除确认弹窗 */}
      {modalType === 'delete' && currentEvaluator && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                <Trash2 size={20} className="text-red-600" />
              </div>
              <h3 className="text-lg font-bold text-gray-900">确认删除</h3>
            </div>
            <p className="text-sm text-gray-600 mb-2">
              确定要删除评价人 <span className="font-medium text-gray-900">「{currentEvaluator.name}」</span> 吗？
            </p>
            <p className="text-xs text-red-500 mb-6">
              删除后将无法恢复，该评价人的所有评分记录也将被一并删除。
            </p>
            <div className="flex gap-3">
              <button
                onClick={handleDelete}
                className="flex-1 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                确认删除
              </button>
              <button
                onClick={closeModal}
                className="flex-1 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
              >
                取消
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 批量删除确认弹窗 */}
      {modalType === 'batchDelete' && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                <Trash size={20} className="text-red-600" />
              </div>
              <h3 className="text-lg font-bold text-gray-900">确认批量删除</h3>
            </div>
            <p className="text-sm text-gray-600 mb-2">
              确定要删除 <span className="font-medium text-gray-900">所有评价人</span> 吗？
            </p>
            <p className="text-xs text-red-500 mb-6">
              共 {evaluators.length} 位评价人将被删除，此操作不可恢复。
            </p>
            <div className="flex gap-3">
              <button
                onClick={handleBatchDelete}
                className="flex-1 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                确认删除全部
              </button>
              <button
                onClick={closeModal}
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
