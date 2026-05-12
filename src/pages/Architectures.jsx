import React, { useState, useEffect, useCallback } from 'react';
import { FaUpload, FaTrash, FaDownload, FaCode, FaInfoCircle } from 'react-icons/fa';
import { authFetch, getToken } from '../lib/authFetch';

const ML_URL = '/pei-ml';

const Architectures = () => {
  const [architectures, setArchitectures] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadName, setUploadName] = useState('');
  const [uploadFile, setUploadFile] = useState(null);
  const [uploadError, setUploadError] = useState(null);
  const [showHelp, setShowHelp] = useState(false);
  const [helpText, setHelpText] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  const fetchArchitectures = useCallback(async () => {
    try {
      const res = await authFetch(`${ML_URL}/v1/architectures`);
      if (!res.ok) throw new Error('Failed to fetch architectures');
      setArchitectures(await res.json());
      setError(null);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchArchitectures(); }, [fetchArchitectures]);

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!uploadFile || !uploadName.trim()) return;
    setUploading(true);
    setUploadError(null);
    try {
      const form = new FormData();
      form.append('file', uploadFile);
      const token = getToken();
      const res = await fetch(
        `${ML_URL}/v1/architectures?name=${encodeURIComponent(uploadName.trim())}&uploaded_by=frontend`,
        {
          method: 'POST',
          body: form,
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        }
      );
      const data = await res.json();
      if (!res.ok) {
        const detail = data.detail;
        throw new Error(typeof detail === 'string' ? detail : Array.isArray(detail) ? detail.map(d => d.msg).join('; ') : 'Upload failed');
      }
      setUploadName('');
      setUploadFile(null);
      e.target.reset();
      await fetchArchitectures();
    } catch (e) {
      setUploadError(e.message);
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (name) => {
    try {
      const res = await authFetch(`${ML_URL}/v1/architectures/${name}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.detail || 'Delete failed');
      }
      setDeleteConfirm(null);
      await fetchArchitectures();
    } catch (e) {
      alert(e.message);
    }
  };

  const handleDownload = async (name) => {
    const res = await authFetch(`${ML_URL}/v1/architectures/${name}/download`);
    if (!res.ok) return;
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${name}.py`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadInterface = async () => {
    const res = await authFetch(`${ML_URL}/v1/architectures/interface/download`);
    if (!res.ok) return;
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'model_interface.py';
    a.click();
    URL.revokeObjectURL(url);
  };

  const fetchHelp = async () => {
    if (helpText) { setShowHelp(true); return; }
    const res = await authFetch(`${ML_URL}/v1/architectures/help`);
    if (res.ok) {
      const data = await res.json();
      setHelpText(data.constraints);
    }
    setShowHelp(true);
  };

  return (
    <div className="space-y-6">
      {/* Header actions */}
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          <button
            onClick={fetchHelp}
            className="flex items-center gap-2 px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-600"
          >
            <FaInfoCircle /> Constraints
          </button>
          <button
            onClick={handleDownloadInterface}
            className="flex items-center gap-2 px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-600"
          >
            <FaCode /> Download Interface
          </button>
        </div>
      </div>

      {/* Help panel */}
      {showHelp && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
          <div className="flex items-start justify-between">
            <h3 className="text-sm font-semibold text-blue-800 mb-2">File Constraints</h3>
            <button onClick={() => setShowHelp(false)} className="text-blue-400 hover:text-blue-600 text-xs">✕</button>
          </div>
          <pre className="text-xs text-blue-700 whitespace-pre-wrap font-mono">{helpText}</pre>
        </div>
      )}

      {/* Upload form */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-base font-semibold text-gray-900 mb-4">Upload Architecture</h2>
        <form onSubmit={handleUpload} className="flex flex-col sm:flex-row gap-3 items-start">
          <input
            type="text"
            placeholder="Architecture name (e.g. my-transformer)"
            value={uploadName}
            onChange={(e) => setUploadName(e.target.value)}
            pattern="^[a-zA-Z0-9_\-]+$"
            required
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
          <label className="flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg text-sm cursor-pointer hover:bg-gray-50 text-gray-600 whitespace-nowrap">
            <FaUpload size={12} />
            {uploadFile ? uploadFile.name : 'Choose .py file'}
            <input
              type="file"
              accept=".py"
              className="hidden"
              onChange={(e) => setUploadFile(e.target.files[0])}
              required
            />
          </label>
          <button
            type="submit"
            disabled={uploading || !uploadFile || !uploadName.trim()}
            className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
          >
            {uploading ? 'Uploading…' : 'Upload'}
          </button>
        </form>
        {uploadError && (
          <p className="mt-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
            {uploadError}
          </p>
        )}
      </div>

      {/* Architecture list */}
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="text-base font-semibold text-gray-900">
            Registered Architectures
            {!loading && <span className="ml-2 text-sm font-normal text-gray-400">({architectures.length})</span>}
          </h2>
        </div>

        {loading ? (
          <div className="p-8 text-center text-gray-400 text-sm">Loading…</div>
        ) : error ? (
          <div className="p-8 text-center text-red-500 text-sm">{error}</div>
        ) : architectures.length === 0 ? (
          <div className="p-8 text-center text-gray-400 text-sm">No architectures uploaded yet.</div>
        ) : (
          <div className="divide-y divide-gray-100">
            {architectures.map((arch) => (
              <div key={arch.name} className="flex items-center justify-between px-6 py-4">
                <div>
                  <p className="text-sm font-medium text-gray-900">{arch.name}</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Uploaded by <span className="font-medium">{arch.uploaded_by}</span>
                    {arch.uploaded_at && (
                      <> · {new Date(arch.uploaded_at).toLocaleString()}</>
                    )}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleDownload(arch.name)}
                    title="Download source"
                    className="p-2 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                  >
                    <FaDownload size={13} />
                  </button>
                  <button
                    onClick={() => setDeleteConfirm(arch.name)}
                    title="Delete"
                    className="p-2 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                  >
                    <FaTrash size={13} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Delete confirmation modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl p-6 max-w-sm w-full mx-4">
            <h3 className="text-base font-semibold text-gray-900 mb-2">Delete Architecture</h3>
            <p className="text-sm text-gray-600 mb-4">
              Delete <span className="font-medium">{deleteConfirm}</span>? This fails if any model references it.
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deleteConfirm)}
                className="px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Architectures;
