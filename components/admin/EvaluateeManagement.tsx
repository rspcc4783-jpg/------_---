import { useState, useEffect } from 'react';
import { Plus, Pencil, Trash2, Search, X, Upload, Download, AlertTriangle } from 'lucide-react';
import * as XLSX from 'xlsx';

interface Evaluatee {
  id: string;
  code: string;
  name: string;
  level: string;
  category: string;
  isActive: boolean;
}



interface EvaluateeManagementProps {
  onUpdate?: () => void;
}

export default function EvaluateeManagement({ onUpdate }: EvaluateeManagementProps) {
  const [evaluatees, setEvaluatees] = useState<Evaluatee[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showDeleteAllModal, setShowDeleteAllModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    level: '',
    category: '无',
  });
  const [error, setError] = useState('');
  const [importError, setImportError] = useState('');

  const fetchEvaluatees = async () => {
    try {
      const res = await fetch('/api/admin/evaluatees', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      if (res.ok) {
        const data = await res.json();
        setEvaluatees(data.evaluatees || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const res = await fetch('/api/admin/dimensions?categories=true', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      if (res.ok) {
        const data = await res.json();
        setCategories(data.categories || []);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchEvaluatees();
    fetchCategories();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setError('姓名不能为空');
      return;
    }

    try {
      const url = editingId ? '/api/admin/evaluatees' : '/api/admin/evaluatees';
      const method = editingId ? 'PUT' : 'POST';
      const body = editingId
        ? JSON.stringify({ id: editingId, ...formData })
        : JSON.stringify(formData);

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body,
      });

      if (res.ok) {
        setShowModal(false);
        setFormData({ code: '', name: '', level: '', category: '无' });
        setEditingId(null);
        setError('');
        fetchEvaluatees();
        onUpdate?.();
      } else {
        const data = await res.json();
        setError(data.error || '操作失败');
      }
    } catch (err) {
      console.error(err);
      setError('网络错误');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/admin/evaluatees?id=${id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (res.ok) {
        fetchEvaluatees();
        setShowDeleteModal(false);
        onUpdate?.();
      } else {
        const data = await res.json().catch(() => ({}));
        setError(data.error || '删除失败');
      }
    } catch (err) {
      console.error(err);
      setError('删除失败');
    }
  };

  const handleDeleteAll = async () => {
    try {
      const res = await fetch('/api/admin/evaluatees?all=true', {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      if (res.ok) {
        fetchEvaluatees();
        setShowDeleteAllModal(false);
        onUpdate?.();
      } else {
        setError('批量删除失败');
      }
    } catch (err) {
      console.error(err);
      setError('批量删除失败');
    }
  };

  const openEditModal = (evaluatee: Evaluatee) => {
    setFormData({
      code: evaluatee.code,
      name: evaluatee.name,
      level: evaluatee.level,
      category: evaluatee.category,
    });
    setEditingId(evaluatee.id);
    setShowModal(true);
    setError('');
  };

  const openAddModal = () => {
    setFormData({ code: '', name: '', level: '', category: '无' });
    setEditingId(null);
    setShowModal(true);
    setError('');
  };

  const filteredEvaluatees = evaluatees.filter(
    (e) =>
      e.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      e.code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const downloadTemplate = () => {
    const data = [
      {
        编号: 'E001',
        姓名: '张三',
        等级: '正处级',
        分类: '无',
      },
    ];
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, '被评人导入模板');
    XLSX.writeFile(wb, '被评人导入模板.xlsx');
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportError('');

    try {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const data = event.target?.result;
        if (!data) return;
        const workbook = XLSX.read(data, { type: 'binary' });
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(firstSheet);

        const items = jsonData.map((row: any) => ({
          code: row['编号'] || row.code,
          name: row['姓名'] || row.name,
          level: row['等级'] || row.level,
          category: row['分类'] || row.category || '无',
        }));

        const res = await fetch('/api/admin/evaluatees', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${localStorage.getItem('token')}`,
          },
          body: JSON.stringify({ items }),
        });

        if (!res.ok) {
          const d = await res.json();
          throw new Error(d.error || '导入失败');
        }

        fetchEvaluatees();
        onUpdate?.();
        if (e.target) e.target.value = '';
      };
      reader.readAsBinaryString(file);
    } catch (err: any) {
      setImportError(err.message);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded">
          {error}
        </div>
      )}

      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <h2 className="text-xl font-bold">被评人管理</h2>
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={downloadTemplate}
              className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 text-sm"
            >
              <Download size={16} /> 下载模板
            </button>
            <label className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 rounded hover:bg-blue-100 cursor-pointer text-sm">
              <Upload size={16} /> 批量导入
              <input type="file" accept=".xlsx,.xls" className="hidden" onChange={handleImport} />
            </label>
            <button
              onClick={() => setShowDeleteAllModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-700 rounded hover:bg-red-100 text-sm"
            >
              <Trash2 size={16} /> 批量删除
            </button>
            <button
              onClick={openAddModal}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
            >
              <Plus size={16} /> 添加被评人
            </button>
          </div>
        </div>

        {importError && (
          <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded mb-4">
            {importError}
          </div>
        )}

        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            placeholder="搜索姓名或编号..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-4 py-3 text-sm font-medium text-gray-700">编号</th>
                <th className="px-4 py-3 text-sm font-medium text-gray-700">姓名</th>
                <th className="px-4 py-3 text-sm font-medium text-gray-700">等级</th>
                <th className="px-4 py-3 text-sm font-medium text-gray-700">分类</th>
                <th className="px-4 py-3 text-sm font-medium text-gray-700">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filteredEvaluatees.map((evaluatee) => (
                <tr key={evaluatee.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm">{evaluatee.code}</td>
                  <td className="px-4 py-3 text-sm font-medium">{evaluatee.name}</td>
                  <td className="px-4 py-3 text-sm">{evaluatee.level}</td>
                  <td className="px-4 py-3 text-sm">
                    {evaluatee.category && evaluatee.category !== '无' ? (
                      <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs">
                        {evaluatee.category}
                      </span>
                    ) : null}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <div className="flex gap-2">
                      <button
                        onClick={() => openEditModal(evaluatee)}
                        className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                        title="编辑"
                      >
                        <Pencil size={16} />
                      </button>
                      <button
                        onClick={() => {
                          setEditingId(evaluatee.id);
                          setShowDeleteModal(true);
                        }}
                        className="p-1 text-red-600 hover:bg-red-50 rounded"
                        title="删除"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 添加/编辑弹窗 */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">{editingId ? '编辑被评人' : '添加被评人'}</h3>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">编号</label>
                <input
                  type="text"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  姓名 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">等级</label>
                <input
                  type="text"
                  value={formData.level}
                  onChange={(e) => setFormData({ ...formData, level: e.target.value })}
                  placeholder="请输入等级"
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">分类</label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="无">无</option>
                  {categories.map((cat) => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
                {categories.length === 0 && (
                  <p className="text-xs text-gray-500 mt-1">
                    暂无评分标准集，请先前往【评价标准】页面创建
                  </p>
                )}
              </div>
              <div className="flex gap-3">
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  {editingId ? '保存' : '创建'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
                >
                  取消
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 删除确认 */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex items-center gap-3 text-red-600 mb-4">
              <AlertTriangle size={24} />
              <h3 className="text-lg font-semibold">确认删除</h3>
            </div>
            <p className="text-gray-600 mb-6">确定要删除该被评人吗？此操作不可恢复。</p>
            <div className="flex gap-3">
              <button
                onClick={() => editingId && handleDelete(editingId)}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
              >
                删除
              </button>
              <button
                onClick={() => setShowDeleteModal(false)}
                className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
              >
                取消
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 批量删除确认 */}
      {showDeleteAllModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex items-center gap-3 text-red-600 mb-4">
              <AlertTriangle size={24} />
              <h3 className="text-lg font-semibold">确认批量删除</h3>
            </div>
            <p className="text-gray-600 mb-6">
              确定要清空所有被评人吗？此操作不可恢复。
            </p>
            <div className="flex gap-3">
              <button
                onClick={handleDeleteAll}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
              >
                确认清空
              </button>
              <button
                onClick={() => setShowDeleteAllModal(false)}
                className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
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
