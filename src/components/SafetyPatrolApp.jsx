import React, { useState, useEffect, useCallback, useRef } from 'react';
import { parseCSV } from '../utils/csvParser';
import { generateFiscalYearSchedule, getDayOfWeek, assignOfficersToSchedule } from '../utils/scheduleGenerator';
import { Upload, Calendar, User, Download, FolderOpen, Search, Undo2, Redo2, ChevronDown } from 'lucide-react';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import DraggableMember from './DraggableMember';
import DraggableOfficer from './DraggableOfficer';
import DroppableMonthCard from './DroppableMonthCard';
import PrintLayout from './PrintLayout';
import { initialMembers } from '../data/initialMembers';
import '../styles/App.css';
import '../styles/Print.css';

const STORAGE_KEY = 'safety-patrol-planner';
const MAX_MEMBERS_PER_MONTH = 5;
const MAX_HISTORY = 30;

// --- Custom hook for undo/redo ---
function useUndoRedo() {
    const [history, setHistory] = useState([]);
    const [future, setFuture] = useState([]);
    const isUndoRedoRef = useRef(false);

    const pushState = useCallback((state) => {
        if (isUndoRedoRef.current) {
            isUndoRedoRef.current = false;
            return;
        }
        setHistory(prev => {
            const next = [...prev, state];
            if (next.length > MAX_HISTORY) next.shift();
            return next;
        });
        setFuture([]);
    }, []);

    const undo = useCallback(() => {
        if (history.length < 2) return null;
        const prev = history[history.length - 2];
        const current = history[history.length - 1];
        setHistory(h => h.slice(0, -1));
        setFuture(f => [current, ...f]);
        isUndoRedoRef.current = true;
        return prev;
    }, [history]);

    const redo = useCallback(() => {
        if (future.length === 0) return null;
        const next = future[0];
        setFuture(f => f.slice(1));
        setHistory(h => [...h, next]);
        isUndoRedoRef.current = true;
        return next;
    }, [future]);

    return { pushState, undo, redo, canUndo: history.length >= 2, canRedo: future.length > 0 };
}


const SafetyPatrolApp = () => {
    const [fiscalYear, setFiscalYear] = useState(2026);
    const [schedule, setSchedule] = useState([]);
    const [members, setMembers] = useState([]);
    const [officers, setOfficers] = useState([]);
    const [unassignedOfficers, setUnassignedOfficers] = useState([]);
    const [generalMembers, setGeneralMembers] = useState([]);
    const [isDragging, setIsDragging] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [isInitialized, setIsInitialized] = useState(false);

    const { pushState, undo, redo, canUndo, canRedo } = useUndoRedo();

    // --- Snapshot helper for undo ---
    const getSnapshot = useCallback(() => ({
        schedule, unassignedOfficers, generalMembers,
    }), [schedule, unassignedOfficers, generalMembers]);

    const applySnapshot = useCallback((snap) => {
        setSchedule(snap.schedule);
        setUnassignedOfficers(snap.unassignedOfficers);
        setGeneralMembers(snap.generalMembers);
    }, []);

    // Push snapshot whenever schedule or assignments change (after init)
    useEffect(() => {
        if (isInitialized && schedule.length > 0) {
            pushState(getSnapshot());
        }
    }, [schedule, unassignedOfficers, generalMembers]);

    // --- Undo / Redo handlers ---
    const handleUndo = () => {
        const prev = undo();
        if (prev) applySnapshot(prev);
    };

    const handleRedo = () => {
        const next = redo();
        if (next) applySnapshot(next);
    };

    // Keyboard shortcuts for undo/redo
    useEffect(() => {
        const handler = (e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'z') {
                e.preventDefault();
                if (e.shiftKey) handleRedo();
                else handleUndo();
            }
            if ((e.metaKey || e.ctrlKey) && e.key === 'y') {
                e.preventDefault();
                handleRedo();
            }
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [canUndo, canRedo, undo, redo]);

    // --- Auto-save to LocalStorage ---
    useEffect(() => {
        if (!isInitialized || members.length === 0) return;
        const saveData = {
            fiscalYear,
            schedule,
            unassignedOfficers,
            generalMembers,
            members,
            officers,
        };
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(saveData));
        } catch (e) {
            console.warn('Auto-save failed:', e);
        }
    }, [fiscalYear, schedule, unassignedOfficers, generalMembers, members, officers, isInitialized]);

    // --- Load from LocalStorage or initialMembers ---
    useEffect(() => {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
            try {
                const data = JSON.parse(saved);
                if (data.schedule && data.schedule.length > 0) {
                    setFiscalYear(data.fiscalYear || 2026);
                    setSchedule(data.schedule);
                    setMembers(data.members || []);
                    setOfficers(data.officers || []);
                    setUnassignedOfficers(data.unassignedOfficers || []);
                    setGeneralMembers(data.generalMembers || []);
                    setIsInitialized(true);
                    return;
                }
            } catch (e) {
                console.warn('Failed to load saved data:', e);
            }
        }

        // Fall back to initial data
        if (initialMembers && initialMembers.length > 0) {
            const data = initialMembers;
            setMembers(data);
            const newOfficers = data.filter(m => m.type === 'officer');
            const newGeneral = data.filter(m => m.type === 'general');
            setOfficers(newOfficers);
            setGeneralMembers(newGeneral);
            setUnassignedOfficers([...newOfficers]);
            setSchedule(generateFiscalYearSchedule(2026));
        }
        setIsInitialized(true);
    }, []);

    // --- Fiscal year change (only when user changes it, not on first load) ---
    const handleFiscalYearChange = (newYear) => {
        const confirmChange = window.confirm(
            `年度を${newYear}に変更しますか？\n割り当て状況はクリアされます。`
        );
        if (!confirmChange) return;

        setFiscalYear(newYear);
        const newSchedule = generateFiscalYearSchedule(newYear);
        setSchedule(newSchedule);

        // Reset assignments
        const allOfficers = members.filter(m => m.type === 'officer');
        const allGeneral = members.filter(m => m.type === 'general');
        setUnassignedOfficers([...allOfficers]);
        setGeneralMembers([...allGeneral]);
    };

    const handleDateChange = (monthId, newDate) => {
        setSchedule(prev => prev.map(slot => {
            if (slot.monthId === monthId) {
                const day = getDayOfWeek(newDate);
                return { ...slot, date: newDate, dayOfWeek: day };
            }
            return slot;
        }));
    };

    // --- Note change handler ---
    const handleNoteChange = (monthId, note) => {
        setSchedule(prev => prev.map(slot => {
            if (slot.monthId === monthId) {
                return { ...slot, note };
            }
            return slot;
        }));
    };

    // Handle Drop of general member
    const handleDropMember = (item, targetMonthId) => {
        const { member, source, monthId: sourceMonthId } = item;

        if (source === 'calendar' && sourceMonthId === targetMonthId) return;

        setSchedule(prev => prev.map(slot => {
            if (slot.monthId === targetMonthId) {
                if (slot.members.find(m => m.id === member.id)) return slot;
                return { ...slot, members: [...slot.members, member] };
            }
            if (source === 'calendar' && slot.monthId === sourceMonthId) {
                return { ...slot, members: slot.members.filter(m => m.id !== member.id) };
            }
            return slot;
        }));

        if (source === 'sidebar') {
            setGeneralMembers(prev => prev.filter(m => m.id !== member.id));
        }
    };

    // Handle Drop of officer onto officer slot
    const handleDropOfficer = (item, targetMonthId) => {
        const { member, source, monthId: sourceMonthId } = item;

        // Prevent assigning the same officer to the same month
        const targetSlot = schedule.find(s => s.monthId === targetMonthId);
        if (targetSlot && targetSlot.officer && targetSlot.officer.id === member.id) return;

        setSchedule(prev => prev.map(slot => {
            if (slot.monthId === targetMonthId) {
                return { ...slot, officer: member };
            }
            if (source === 'officer-slot' && slot.monthId === sourceMonthId) {
                return { ...slot, officer: null };
            }
            return slot;
        }));

        // Note: Officers are NOT removed from the sidebar list.
        // They remain available for assignment to other months.
    };

    const handleRemoveOfficer = (officerId, monthId) => {
        setSchedule(prev => prev.map(slot => {
            if (slot.monthId === monthId) {
                return { ...slot, officer: null };
            }
            return slot;
        }));
    };

    const handleRemoveMember = (memberId, monthId) => {
        const currentSlot = schedule.find(s => s.monthId === monthId);
        let memberToRestore = null;
        if (currentSlot) {
            memberToRestore = currentSlot.members.find(m => m.id === memberId);
        }

        setSchedule(prev => prev.map(slot => {
            if (slot.monthId === monthId) {
                return { ...slot, members: slot.members.filter(m => m.id !== memberId) };
            }
            return slot;
        }));

        if (memberToRestore) {
            setGeneralMembers(prev => [...prev, memberToRestore]);
        }
    };

    const handleFileUpload = async (event) => {
        const file = event.target.files[0];
        if (!file) return;

        try {
            const data = await parseCSV(file);
            setMembers(data);
            const newOfficers = data.filter(m => m.type === 'officer');
            const newGeneral = data.filter(m => m.type === 'general');
            setOfficers(newOfficers);
            setGeneralMembers(newGeneral);
            setUnassignedOfficers([...newOfficers]);
            alert(`読み込み完了: 全${data.length}件 (役員: ${newOfficers.length}件, 一般: ${newGeneral.length}件)`);
        } catch (error) {
            console.error("Failed to parse CSV", error);
            alert("CSVの読み込みに失敗しました。");
        }
    };

    const handleDragOver = (e) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = () => {
        setIsDragging(false);
    };

    const handleDrop = async (e) => {
        e.preventDefault();
        setIsDragging(false);
        const file = e.dataTransfer.files[0];
        if (file && file.type.match(/csv/)) {
            try {
                const data = await parseCSV(file);
                setMembers(data);
                const newOfficers = data.filter(m => m.type === 'officer');
                const newGeneral = data.filter(m => m.type === 'general');
                setOfficers(newOfficers);
                setGeneralMembers(newGeneral);
                setUnassignedOfficers([...newOfficers]);
                alert(`読み込み完了: 全${data.length}件 (役員: ${newOfficers.length}件, 一般: ${newGeneral.length}件)`);
            } catch (error) {
                console.error(error);
                alert("CSV読み込みエラー");
            }
        }
    };

    // --- JSON Export ---
    const handleExportJSON = () => {
        const exportData = {
            version: 1,
            exportDate: new Date().toISOString(),
            fiscalYear,
            schedule: schedule.map(slot => ({
                monthId: slot.monthId,
                month: slot.month,
                date: slot.date,
                dayOfWeek: slot.dayOfWeek,
                officer: slot.officer || null,
                members: slot.members || [],
                note: slot.note || '',
            })),
            unassignedOfficers,
            generalMembers,
        };

        const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `safety-patrol-${fiscalYear}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    // --- JSON Import ---
    const handleImportJSON = (event) => {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = JSON.parse(e.target.result);
                if (!data.schedule || !Array.isArray(data.schedule)) {
                    alert('無効なJSONファイルです。');
                    return;
                }

                if (data.fiscalYear) setFiscalYear(data.fiscalYear);
                setSchedule(data.schedule);
                if (data.unassignedOfficers) setUnassignedOfficers(data.unassignedOfficers);
                if (data.generalMembers) setGeneralMembers(data.generalMembers);

                const allMembers = new Map();
                if (data.generalMembers) data.generalMembers.forEach(m => allMembers.set(m.id, m));
                if (data.unassignedOfficers) data.unassignedOfficers.forEach(m => allMembers.set(m.id, m));
                data.schedule.forEach(slot => {
                    if (slot.officer) allMembers.set(slot.officer.id, slot.officer);
                    slot.members.forEach(m => allMembers.set(m.id, m));
                });
                setMembers(Array.from(allMembers.values()));
                setOfficers(Array.from(allMembers.values()).filter(m => m.type === 'officer'));
                alert('計画データを読み込みました。');
            } catch (err) {
                console.error('JSON import error:', err);
                alert('JSONファイルの読み込みに失敗しました。');
            }
        };
        reader.readAsText(file);
        event.target.value = '';
    };

    // --- Filtered members for search ---
    const filteredGeneralMembers = searchQuery
        ? generalMembers.filter(m =>
            m.name.toLowerCase().includes(searchQuery.toLowerCase())
        )
        : generalMembers;

    // --- Count officer assignments from schedule ---
    const getOfficerAssignCount = (officerId) => {
        return schedule.filter(slot => slot.officer && slot.officer.id === officerId).length;
    };

    // --- Year options for dropdown ---
    const yearOptions = [];
    for (let y = 2024; y <= 2030; y++) yearOptions.push(y);

    return (
        <DndProvider backend={HTML5Backend}>
            <div className="container">
                <header className="mb-8 text-center">
                    <h1 className="app-title mb-2">八親会 安全パトロール計画策定システム</h1>
                </header>

                {members.length === 0 ? (
                    <div
                        className={`upload-area ${isDragging ? 'dragging' : ''}`}
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onDrop={handleDrop}
                    >
                        <div className="flex flex-col items-center justify-center">
                            <div className="upload-icon-wrapper">
                                <Upload size={32} />
                            </div>
                            <div>
                                <p className="upload-text-main">CSVファイルをドラッグ＆ドロップ</p>
                                <p className="upload-text-sub mt-1">または</p>
                            </div>
                            <label className="upload-button">
                                ファイルを選択
                                <input
                                    type="file"
                                    accept=".csv"
                                    className="hidden"
                                    style={{ display: 'none' }}
                                    onChange={handleFileUpload}
                                />
                            </label>
                            <p className="upload-note">対応フォーマット: .csv (Shift-JIS)</p>
                        </div>
                    </div>
                ) : (
                    <div>
                        <div className="dashboard-card">
                            <div className="grid-2-cols" style={{ gridTemplateColumns: '260px 1fr' }}>
                                {/* Sidebar */}
                                <div>
                                    <div className="sticky top-4">
                                        {/* Toolbar Row 1 */}
                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', alignItems: 'center', marginBottom: '8px' }}>
                                            <span className="text-sm font-bold" style={{ color: '#1e40af', marginRight: '4px' }}>計: {members.length}社</span>

                                            {/* Year Selector */}
                                            <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}>
                                                <select
                                                    value={fiscalYear}
                                                    onChange={(e) => handleFiscalYearChange(Number(e.target.value))}
                                                    style={{
                                                        appearance: 'none',
                                                        background: '#f3f4f6',
                                                        border: '1px solid #d1d5db',
                                                        borderRadius: '4px',
                                                        padding: '3px 22px 3px 8px',
                                                        fontSize: '11px',
                                                        fontWeight: 'bold',
                                                        cursor: 'pointer',
                                                        color: '#1f2937',
                                                    }}
                                                >
                                                    {yearOptions.map(y => (
                                                        <option key={y} value={y}>{y}年度</option>
                                                    ))}
                                                </select>
                                                <ChevronDown size={12} style={{ position: 'absolute', right: '6px', pointerEvents: 'none', color: '#6b7280' }} />
                                            </div>
                                        </div>

                                        {/* Toolbar Row 2: Action buttons */}
                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '3px', alignItems: 'center', marginBottom: '10px' }}>
                                            <button
                                                onClick={() => window.print()}
                                                className="toolbar-btn"
                                                style={{ background: '#1f2937', color: '#fff' }}
                                                title="印刷プレビュー"
                                            >
                                                <Calendar size={13} /> 印刷
                                            </button>
                                            <button
                                                onClick={handleExportJSON}
                                                className="toolbar-btn"
                                                style={{ background: '#059669', color: '#fff' }}
                                                title="計画をJSONファイルに保存"
                                            >
                                                <Download size={13} /> 保存
                                            </button>
                                            <label
                                                className="toolbar-btn"
                                                style={{ background: '#2563eb', color: '#fff' }}
                                                title="JSONファイルから計画を読み込み"
                                            >
                                                <FolderOpen size={13} /> 読込
                                                <input
                                                    type="file"
                                                    accept=".json"
                                                    style={{ display: 'none' }}
                                                    onChange={handleImportJSON}
                                                />
                                            </label>
                                            <button
                                                onClick={handleUndo}
                                                disabled={!canUndo}
                                                className="toolbar-btn"
                                                style={{
                                                    background: canUndo ? '#6b7280' : '#e5e7eb',
                                                    color: canUndo ? '#fff' : '#9ca3af',
                                                    cursor: canUndo ? 'pointer' : 'not-allowed',
                                                }}
                                                title="元に戻す (Ctrl+Z)"
                                            >
                                                <Undo2 size={13} />
                                            </button>
                                            <button
                                                onClick={handleRedo}
                                                disabled={!canRedo}
                                                className="toolbar-btn"
                                                style={{
                                                    background: canRedo ? '#6b7280' : '#e5e7eb',
                                                    color: canRedo ? '#fff' : '#9ca3af',
                                                    cursor: canRedo ? 'pointer' : 'not-allowed',
                                                }}
                                                title="やり直し (Ctrl+Shift+Z)"
                                            >
                                                <Redo2 size={13} />
                                            </button>
                                        </div>

                                        {/* Officer list - always show all officers */}
                                        <h3 className="list-header" style={{ color: '#c2410c', borderColor: '#fed7aa', backgroundColor: '#fff7ed' }}>
                                            ⭐ 役員 ({officers.length}名)
                                        </h3>
                                        <div style={{ maxHeight: '240px', overflowY: 'auto', marginBottom: '12px' }}>
                                            {officers.map(m => (
                                                <DraggableOfficer
                                                    key={m.id}
                                                    member={m}
                                                    source="officer-sidebar"
                                                    assignCount={getOfficerAssignCount(m.id)}
                                                />
                                            ))}
                                        </div>

                                        {/* General member list with search */}
                                        <h3 className="list-header" style={{ color: '#1e40af', borderColor: '#bfdbfe', backgroundColor: '#eff6ff' }}>
                                            未割り当て会員 ({generalMembers.length})
                                        </h3>
                                        {/* Search box */}
                                        <div style={{ position: 'relative', marginBottom: '6px' }}>
                                            <Search size={14} style={{ position: 'absolute', left: '8px', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
                                            <input
                                                type="text"
                                                placeholder="会員名で検索..."
                                                value={searchQuery}
                                                onChange={(e) => setSearchQuery(e.target.value)}
                                                style={{
                                                    width: '100%',
                                                    padding: '5px 8px 5px 28px',
                                                    border: '1px solid #d1d5db',
                                                    borderRadius: '6px',
                                                    fontSize: '12px',
                                                    outline: 'none',
                                                    boxSizing: 'border-box',
                                                }}
                                            />
                                            {searchQuery && (
                                                <button
                                                    onClick={() => setSearchQuery('')}
                                                    style={{
                                                        position: 'absolute', right: '6px', top: '50%', transform: 'translateY(-50%)',
                                                        background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', fontSize: '14px',
                                                    }}
                                                >✕</button>
                                            )}
                                        </div>
                                        <div className="member-list-container" style={{ height: 'calc(100vh - 520px)', overflowY: 'auto' }}>
                                            <ul className="member-list space-y-1">
                                                {filteredGeneralMembers.map(m => (
                                                    <li key={m.id}>
                                                        <DraggableMember member={m} source="sidebar" />
                                                    </li>
                                                ))}
                                                {searchQuery && filteredGeneralMembers.length === 0 && (
                                                    <li style={{ padding: '12px', textAlign: 'center', color: '#9ca3af', fontSize: '12px' }}>
                                                        該当なし
                                                    </li>
                                                )}
                                            </ul>
                                        </div>
                                    </div>
                                </div>

                                {/* Main Content / Calendar */}
                                <div>
                                    <div className="schedule-grid">
                                        {schedule.map((slot) => (
                                            <DroppableMonthCard
                                                key={slot.monthId}
                                                slot={slot}
                                                onDateChange={handleDateChange}
                                                onDropMember={handleDropMember}
                                                onDropOfficer={handleDropOfficer}
                                                removeMember={handleRemoveMember}
                                                removeOfficer={handleRemoveOfficer}
                                                onNoteChange={handleNoteChange}
                                                maxMembers={MAX_MEMBERS_PER_MONTH}
                                            />
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Print Layout (Invisible on screen) */}
            <PrintLayout fiscalYear={fiscalYear} schedule={schedule} />
        </DndProvider>
    );
};

export default SafetyPatrolApp;
