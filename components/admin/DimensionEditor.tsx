import { useState, useEffect, useRef, useCallback } from 'react';
import { Pencil, Trash2, Plus, Save, X, Download, Upload, AlertTriangle, ChevronDown } from 'lucide-react';
import * as XLSX from 'xlsx';

interface Dimension {
  id: string;
  code: string;
  name: string;
  sort: number;
  category: string;
  standard1: string;
  standard2: string;
  standard3: string;
  standard4: string;
  standard5: string;
  isEditing?: boolean;
}

export default function DimensionEditor() {
  const [dimensions, setDimensions] = useState<Dimension[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('默认');
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showDeleteAllModal, setShowDeleteAllModal] = useState(false);
  const [showNewCategoryModal, setShowNewCategoryModal] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [error, setError] = useState('');
  const [importError, setImportError] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [newDimension, setNewDimension] = useState({
    name: '',
    code: '',
    standard1: '',
    standard2: '',
    standard3: '',
    standard4: '',
    standard5: '',
  });

  const fetchCategories = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/dimensions?categories=true', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      if (res.ok) {
        const data = await res.json();
        const cats = data.categories || [];
        setCategories(cats);
        if (cats.length > 0 && !cats.includes(selectedCategory)) {
          setSelectedCategory(cats[0]);
        }
      }
    } catch (err) {
      console.error(err);
    }
  }, [selectedCategory]);

  const fetchDimensions = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/dimensions?category=${encodeURIComponent(selectedCategory)}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      if (res.ok) {
        const data = await res.json();
        setDimensions((data.dimensions || []).map((d: Dimension) => ({ ...d, isEditing: false })));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [selectedCategory]);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  useEffect(() => {
    fetchDimensions();
  }, [fetchDimensions]);

  const handleCreateCategory = async () => {
    const trimmedName = String(newCategoryName || '').trim();
    if (!trimmedName) return;
    if (categories.includes(trimmedName)) {
      setError('该标准集名称已存在');
      return;
    }
    const name = trimmedName;
    try {
      const res = await fetch('/api/admin/dimensions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          name: '示例维度',
          category: name,
          standard1: '1分标准',
          standard2: '2分标准',
          standard3: '3分标准',
          standard4: '4分标准',
          standard5: '5分标准',
        }),
      });
      if (!res.ok) throw new Error('创建失败');
    } catch (err) {
      console.error(err);
      setError('创建标准集失败');
      return;
    }
    setSelectedCategory(name);
    setCategories([...categories, name]);
    setNewCategoryName('');
    setShowNewCategoryModal(false);
    setDimensions([]);
    fetchCategories();
  };

  const handleAddDimension = async () => {
    if (!String(newDimension.name || '').trim()) {
      setError('维度名称为必填项');
      return;
    }

    try {
      const res = await fetch('/api/admin/dimensions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          ...newDimension,
          category: selectedCategory,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || '创建失败');
      }

      setShowAddModal(false);
      setNewDimension({ name: '', code: '', standard1: '', standard2: '', standard3: '', standard4: '', standard5: '' });
      setError('');
      fetchDimensions();
      fetchCategories();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleUpdateDimension = async (dimension: Dimension) => {
    try {
      const res = await fetch('/api/admin/dimensions', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          id: dimension.id,
          name: dimension.name,
          standard1: dimension.standard1,
          standard2: dimension.standard2,
          standard3: dimension.standard3,
          standard4: dimension.standard4,
          standard5: dimension.standard5,
        }),
      });

      if (!res.ok) throw new Error('更新失败');

      setDimensions(
        dimensions.map((d) => (d.id === dimension.id ? { ...dimension, isEditing: false } : d))
      );
    } catch (err) {
      console.error(err);
      setError('更新失败');
    }
  };

  const handleDeleteDimension = async (id: string) => {
    try {
      const res = await fetch(`/api/admin/dimensions?id=${encodeURIComponent(id)}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (!res.ok) throw new Error('删除失败');

      setDimensions(dimensions.filter((d) => d.id !== id));
      setShowDeleteModal(false);
      setDeletingId(null);
      fetchCategories();
    } catch (err) {
      console.error(err);
      setError('删除失败');
    }
  };

  const handleDeleteAll = async () => {
    try {
      const res = await fetch(`/api/admin/dimensions?all=true&category=${encodeURIComponent(selectedCategory)}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      if (!res.ok) throw new Error('批量删除失败');
      setDimensions([]);
      setShowDeleteAllModal(false);
      fetchCategories();
    } catch (err) {
      console.error(err);
      setError('批量删除失败');
    }
  };

  const downloadTemplate = () => {
    const data = [
      {
        维度名称: '示例维度',
        标准5分: '表现优秀，完全超出预期',
        标准4分: '表现良好，符合预期',
        标准3分: '表现一般，基本符合要求',
        标准2分: '表现较差，需要改进',
        标准1分: '表现很差，无法胜任',
      },
    ];
    const ws = XLSX.utils.json_to_sheet(data);
    // 调整列宽
    ws['!cols'] = [
      { wch: 12 }, { wch: 16 }, { wch: 30 }, { wch: 30 },
      { wch: 30 }, { wch: 30 }, { wch: 30 },
    ];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, '维度导入模板');
    XLSX.writeFile(wb, `维度导入模板_${selectedCategory}.xlsx`);
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportError('');

    try {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const data = event.target?.result;
        if (!data) {
          setImportError('文件读取失败');
          return;
        }

        let workbook;
        try {
          workbook = XLSX.read(data, { type: 'binary' });
        } catch (err) {
          setImportError('无法解析 Excel 文件，请确认格式正确');
          return;
        }

        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(firstSheet);

        if (!jsonData || jsonData.length === 0) {
          setImportError('Excel 中未检测到数据，请检查表头和内容');
          if (fileInputRef.current) fileInputRef.current.value = '';
          return;
        }

        const items = jsonData.map((row: any, idx: number) => {
          const name = String(row['维度名称'] || row.name || row['名称'] || '').trim();
          if (!name) {
            console.warn(`第 ${idx + 2} 行缺少维度名称，已跳过`);
          }
          return {
            code: '',
            name,
            standard5: String(row['标准5分'] || row.standard5 || row['5分'] || '').trim(),
            standard4: String(row['标准4分'] || row.standard4 || row['4分'] || '').trim(),
            standard3: String(row['标准3分'] || row.standard3 || row['3分'] || '').trim(),
            standard2: String(row['标准2分'] || row.standard2 || row['2分'] || '').trim(),
            standard1: String(row['标准1分'] || row.standard1 || row['1分'] || '').trim(),
            category: selectedCategory,
          };
        }).filter((item: any) => item.name);

        if (items.length === 0) {
          setImportError('未找到有效的维度数据，请检查表头是否包含"维度名称"列');
          if (fileInputRef.current) fileInputRef.current.value = '';
          return;
        }

        try {
          const res = await fetch('/api/admin/dimensions', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${localStorage.getItem('token')}`,
            },
            body: JSON.stringify({ items, category: selectedCategory }),
          });

          if (!res.ok) {
            const d = await res.json().catch(() => ({}));
            throw new Error(d.error || `导入失败 (${res.status})`);
          }

          await fetchDimensions();
          await fetchCategories();
          setImportError('');
        } catch (err: any) {
          setImportError(err.message || '导入请求失败');
        } finally {
          if (fileInputRef.current) fileInputRef.current.value = '';
        }
      };
      reader.onerror = () => {
        setImportError('文件读取失败');
      };
      reader.readAsBinaryString(file);
    } catch (err: any) {
      setImportError(err.message || '导入处理失败');
      if (fileInputRef.current) fileInputRef.current.value = '';
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
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold">评分标准编辑</h2>
            <p className="text-sm text-gray-500 mt-1">编辑各维度的5级评分标准</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={downloadTemplate}
              className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 text-sm"
            >
              <Download size={16} /> 下载模板
            </button>
            <label className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 rounded hover:bg-blue-100 cursor-pointer text-sm">
              <Upload size={16} /> 批量导入
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls"
                className="hidden"
                onChange={handleImport}
              />
            </label>
            <button
              onClick={() => setShowNewCategoryModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-700 rounded hover:bg-indigo-100 text-sm"
            >
              <Plus size={16} /> 新增标准集
            </button>
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 text-sm"
            >
              <Plus size={16} /> 添加维度
            </button>
            <button
              onClick={() => setShowDeleteAllModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-700 rounded hover:bg-red-100 text-sm"
            >
              <Trash2 size={16} /> 删除标准集
            </button>
          </div>
        </div>

        {importError && (
          <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded mb-4">
            {importError}
          </div>
        )}

        {/* 标准集选择 */}
        <div className="mb-6 flex items-center gap-3">
          <label className="text-sm font-medium text-gray-700">选择标准集：</label>
          <div className="relative">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="appearance-none bg-white border border-gray-300 rounded px-4 py-2 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 min-w-[160px]"
            >
              {categories.map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
            <ChevronDown size={14} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          </div>
          {categories.length === 0 && (
            <span className="text-sm text-gray-500">暂无标准集，请先创建</span>
          )}
        </div>

        {/* 维度列表 */}
        <div className="space-y-4">
          {dimensions.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              该标准集暂无维度，点击"添加维度"创建
            </div>
          ) : (
            dimensions.map((dimension, index) => (
              <div key={dimension.id} className="border border-gray-200 rounded-lg p-4">
                {dimension.isEditing ? (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        维度名称
                      </label>
                      <input
                        type="text"
                        value={dimension.name}
                        onChange={(e) =>
                          setDimensions(
                            dimensions.map((d) =>
                              d.id === dimension.id ? { ...d, name: e.target.value } : d
                            )
                          )
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div className="grid grid-cols-5 gap-2">
                      {[
                        { key: 'standard5', label: '5分标准' },
                        { key: 'standard4', label: '4分标准' },
                        { key: 'standard3', label: '3分标准' },
                        { key: 'standard2', label: '2分标准' },
                        { key: 'standard1', label: '1分标准' },
                      ].map(({ key, label }) => (
                        <div key={key}>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            {label}
                          </label>
                          <textarea
                            value={(dimension as any)[key]}
                            onChange={(e) =>
                              setDimensions(
                                dimensions.map((d) =>
                                  d.id === dimension.id
                                    ? { ...d, [key]: e.target.value }
                                    : d
                                )
                              )
                            }
                            rows={3}
                            className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleUpdateDimension(dimension)}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                      >
                        <Save size={16} /> 保存
                      </button>
                      <button
                        onClick={() =>
                          setDimensions(
                            dimensions.map((d) =>
                              d.id === dimension.id ? { ...d, isEditing: false } : d
                            )
                          )
                        }
                        className="flex items-center gap-2 px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
                      >
                        <X size={16} /> 取消
                      </button>
                    </div>
                  </div>
                ) : (
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span className="bg-blue-600 text-white rounded-full w-8 h-8 flex items-center justify-center text-sm font-semibold">
                          {index + 1}
                        </span>
                        <h3 className="text-lg font-semibold">
                          {dimension.name}
                        </h3>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() =>
                            setDimensions(
                              dimensions.map((d) =>
                                d.id === dimension.id ? { ...d, isEditing: true } : d
                              )
                            )
                          }
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded"
                          title="编辑"
                        >
                          <Pencil size={16} />
                        </button>
                        <button
                          onClick={() => { setDeletingId(dimension.id); setShowDeleteModal(true); }}
                          className="p-2 text-red-600 hover:bg-red-50 rounded"
                          title="删除"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                    <div className="space-y-2">
                      {[5, 4, 3, 2, 1].map((level) => {
                        const key = `standard${level}` as keyof Dimension;
                        return (
                          <div key={level} className="flex items-start gap-3">
                            <span
                              className={`w-6 h-6 rounded flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                                level >= 4
                                  ? 'bg-green-100 text-green-800'
                                  : level >= 3
                                  ? 'bg-blue-100 text-blue-800'
                                  : level >= 2
                                  ? 'bg-yellow-100 text-yellow-800'
                                  : 'bg-red-100 text-red-800'
                              }`}
                            >
                              {level}
                            </span>
                            <p className="text-sm text-gray-700 flex-1">{(dimension[key] as string) || '-'}</p>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* 删除确认弹窗 */}
      {showDeleteModal && deletingId && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex items-center gap-3 text-red-600 mb-4">
              <AlertTriangle size={24} />
              <h3 className="text-lg font-semibold">确认删除</h3>
            </div>
            <p className="text-gray-600 mb-6">
              确定要删除维度"{dimensions.find(d => d.id === deletingId)?.name}"吗？此操作不可恢复。
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => { handleDeleteDimension(deletingId); setDeletingId(null); }}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
              >
                删除
              </button>
              <button
                onClick={() => { setShowDeleteModal(false); setDeletingId(null); }}
                className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
              >
                取消
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 新增标准集弹窗 */}
      {showNewCategoryModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">新增标准集</h3>
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded mb-4">
                {error}
              </div>
            )}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                标准集名称
              </label>
              <input
                type="text"
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                placeholder="如：管理类、技术类..."
                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-gray-500 mt-1">
                标准集名称将同步作为被评人分类选项使用
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleCreateCategory}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                创建
              </button>
              <button
                onClick={() => { setShowNewCategoryModal(false); setNewCategoryName(''); setError(''); }}
                className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
              >
                取消
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 添加维度弹窗 */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold mb-4">
              添加维度（标准集：{selectedCategory}）
            </h3>
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded mb-4">
                {error}
              </div>
            )}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  维度名称 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={newDimension.name}
                  onChange={(e) => setNewDimension({ ...newDimension, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  { key: 'standard5', label: '5分标准' },
                  { key: 'standard4', label: '4分标准' },
                  { key: 'standard3', label: '3分标准' },
                  { key: 'standard2', label: '2分标准' },
                  { key: 'standard1', label: '1分标准' },
                ].map(({ key, label }) => (
                  <div key={key}>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
                    <textarea
                      value={(newDimension as any)[key]}
                      onChange={(e) => setNewDimension({ ...newDimension, [key]: e.target.value })}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                ))}
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={handleAddDimension}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                保存
              </button>
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setNewDimension({ name: '', code: '', standard1: '', standard2: '', standard3: '', standard4: '', standard5: '' });
                  setError('');
                }}
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
              <h3 className="text-lg font-semibold">确认删除标准集</h3>
            </div>
            <p className="text-gray-600 mb-6">
              确定要删除「{selectedCategory}」标准集下的所有维度吗？此操作不可恢复。
            </p>
            <div className="flex gap-3">
              <button
                onClick={handleDeleteAll}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
              >
                确认删除
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
