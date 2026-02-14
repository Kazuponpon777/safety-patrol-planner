import React, { useState, useEffect } from 'react';
import { parseCSV } from '../utils/csvParser';
import { generateFiscalYearSchedule, getDayOfWeek, assignOfficersToSchedule } from '../utils/scheduleGenerator';
import { Upload, Calendar, User } from 'lucide-react';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import DraggableMember from './DraggableMember';
import DraggableOfficer from './DraggableOfficer';
import DroppableMonthCard from './DroppableMonthCard';
import PrintLayout from './PrintLayout';
import { initialMembers } from '../data/initialMembers';
import '../styles/App.css';
import '../styles/Print.css';

const SafetyPatrolApp = () => {
    const [fiscalYear, setFiscalYear] = useState(2026);
    const [schedule, setSchedule] = useState([]);
    const [members, setMembers] = useState([]);
    const [officers, setOfficers] = useState([]);
    const [unassignedOfficers, setUnassignedOfficers] = useState([]);
    const [generalMembers, setGeneralMembers] = useState([]);
    const [isDragging, setIsDragging] = useState(false);

    // Initial Schedule Generation & Data Loading
    useEffect(() => {
        const newSchedule = generateFiscalYearSchedule(fiscalYear);

        // Load embedded data initially
        if (members.length === 0 && initialMembers && initialMembers.length > 0) {
            const data = initialMembers;
            setMembers(data);

            const newOfficers = data.filter(m => m.type === 'officer');
            const newGeneral = data.filter(m => m.type === 'general');

            setOfficers(newOfficers);
            setGeneralMembers(newGeneral);
            // Initially all officers are unassigned
            setUnassignedOfficers([...newOfficers]);
            setSchedule(newSchedule);
        } else {
            setSchedule(newSchedule);
        }
    }, [fiscalYear]);

    const handleDateChange = (monthId, newDate) => {
        setSchedule(prev => prev.map(slot => {
            if (slot.monthId === monthId) {
                const day = getDayOfWeek(newDate);
                return { ...slot, date: newDate, dayOfWeek: day };
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

        setSchedule(prev => prev.map(slot => {
            if (slot.monthId === targetMonthId) {
                // If same officer is already assigned here, do nothing
                if (slot.officer && slot.officer.id === member.id) return slot;

                // If there was already an officer here, return them to the unassigned list
                const previousOfficer = slot.officer;
                if (previousOfficer) {
                    // We need to add the displaced officer back to unassigned
                    // Since we can't call setUnassignedOfficers inside setSchedule safely,
                    // we'll handle it outside
                }
                return { ...slot, officer: member };
            }
            // If source was another calendar slot, remove from there
            if (source === 'officer-slot' && slot.monthId === sourceMonthId) {
                return { ...slot, officer: null };
            }
            return slot;
        }));

        // Handle displaced officer (the one who was in the target slot before)
        const targetSlot = schedule.find(s => s.monthId === targetMonthId);
        if (targetSlot && targetSlot.officer && targetSlot.officer.id !== member.id) {
            setUnassignedOfficers(prev => [...prev, targetSlot.officer]);
        }

        // Remove from unassigned officers list if dragged from sidebar
        if (source === 'officer-sidebar') {
            setUnassignedOfficers(prev => prev.filter(o => o.id !== member.id));
        }
    };

    // Remove officer from a month slot back to unassigned list
    const handleRemoveOfficer = (officerId, monthId) => {
        const targetSlot = schedule.find(s => s.monthId === monthId);
        if (targetSlot && targetSlot.officer) {
            setUnassignedOfficers(prev => [...prev, targetSlot.officer]);
        }
        setSchedule(prev => prev.map(slot => {
            if (slot.monthId === monthId) {
                return { ...slot, officer: null };
            }
            return slot;
        }));
    };

    // Remove general member from calendar back to list
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
                                        {/* Toolbar */}
                                        <div className="flex gap-2 items-center mb-3">
                                            <span className="text-sm font-bold" style={{ color: '#1e40af' }}>計: {members.length}社</span>
                                            <button
                                                onClick={() => window.print()}
                                                className="bg-gray-800 text-white px-3 py-1 rounded text-xs flex items-center gap-1"
                                            >
                                                <Calendar size={14} /> 印刷
                                            </button>
                                        </div>

                                        {/* Officer list */}
                                        <h3 className="list-header" style={{ color: '#c2410c', borderColor: '#fed7aa', backgroundColor: '#fff7ed' }}>
                                            ⭐ 役員 ({unassignedOfficers.length})
                                        </h3>
                                        <div style={{ maxHeight: '200px', overflowY: 'auto', marginBottom: '12px' }}>
                                            {unassignedOfficers.map(m => (
                                                <DraggableOfficer key={m.id} member={m} source="officer-sidebar" />
                                            ))}
                                            {unassignedOfficers.length === 0 && (
                                                <div className="text-xs" style={{ color: '#9ca3af', padding: '8px', textAlign: 'center' }}>全員割り当て済み</div>
                                            )}
                                        </div>

                                        {/* General member list */}
                                        <h3 className="list-header" style={{ color: '#1e40af', borderColor: '#bfdbfe', backgroundColor: '#eff6ff' }}>
                                            未割り当て会員 ({generalMembers.length})
                                        </h3>
                                        <div className="member-list-container" style={{ height: 'calc(100vh - 420px)', overflowY: 'auto' }}>
                                            <ul className="member-list space-y-1">
                                                {generalMembers.map(m => (
                                                    <li key={m.id}>
                                                        <DraggableMember member={m} source="sidebar" />
                                                    </li>
                                                ))}
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
