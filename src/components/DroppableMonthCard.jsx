import React from 'react';
import { useDrop } from 'react-dnd';
import { ITEM_TYPE } from './DraggableMember';
import DraggableMember from './DraggableMember';

const OFFICER_ITEM_TYPE = 'OFFICER';

const DroppableMonthCard = ({ slot, onDateChange, onDropMember, onDropOfficer, removeMember, removeOfficer }) => {
    // Drop zone for general members
    const [{ isOver, canDrop }, drop] = useDrop(() => ({
        accept: ITEM_TYPE,
        drop: (item) => onDropMember(item, slot.monthId),
        collect: (monitor) => ({
            isOver: !!monitor.isOver(),
            canDrop: !!monitor.canDrop(),
        }),
    }));

    // Drop zone for officers
    const [{ isOver: isOfficerOver, canDrop: canDropOfficer }, officerDrop] = useDrop(() => ({
        accept: OFFICER_ITEM_TYPE,
        drop: (item) => onDropOfficer(item, slot.monthId),
        collect: (monitor) => ({
            isOver: !!monitor.isOver(),
            canDrop: !!monitor.canDrop(),
        }),
    }));

    const isActive = canDrop && isOver;
    const isOfficerActive = canDropOfficer && isOfficerOver;
    const containerClass = `role-slot member-slot-container transition-colors ${isActive ? 'bg-blue-100 border-blue-300' : ''}`;
    const officerContainerClass = `role-slot officer-slot transition-colors ${isOfficerActive ? 'bg-orange-100 border-orange-300' : ''}`;

    return (
        <div className="schedule-card">
            <div className="schedule-header">
                <div className="month-label">{slot.month}月</div>
                <div className="date-input-wrapper">
                    <input
                        type="date"
                        value={slot.date}
                        className="date-input"
                        onChange={(e) => onDateChange(slot.monthId, e.target.value)}
                    />
                    <span className="day-badge">{slot.dayOfWeek}</span>
                </div>
            </div>

            {/* Officer drop zone */}
            <div ref={officerDrop} className={officerContainerClass}>
                <div className="slot-label">安全委員 (リーダー)</div>
                {slot.officer ? (
                    <div className="group relative">
                        <div className="font-semibold text-sm officer-name-tag">
                            {slot.officer.name}
                        </div>
                        <button
                            onClick={() => removeOfficer(slot.officer.id, slot.monthId)}
                            className="absolute top-0 right-0 text-red-400 hover:text-red-600 px-1 text-xs hidden group-hover:block bg-white rounded shadow-sm border"
                            title="解除"
                        >
                            ✕
                        </button>
                    </div>
                ) : (
                    <div className="empty-slot-placeholder">ドラッグ＆ドロップ</div>
                )}
            </div>

            {/* General members drop zone */}
            <div ref={drop} className={containerClass} style={{ minHeight: '100px' }}>
                <div className="slot-label">班員 ({slot.members.length}社)</div>

                {slot.members.length === 0 ? (
                    <div className="empty-slot-placeholder py-4">ドラッグ＆ドロップ</div>
                ) : (
                    <div className="space-y-1">
                        {slot.members.map((m, idx) => (
                            <div key={`${m.id}-${idx}`} className="group relative">
                                <DraggableMember
                                    member={m}
                                    source="calendar"
                                    monthId={slot.monthId}
                                />
                                <button
                                    onClick={() => removeMember(m.id, slot.monthId)}
                                    className="absolute top-0 right-0 text-red-400 hover:text-red-600 px-1 text-xs hidden group-hover:block bg-white rounded shadow-sm border"
                                    title="解除"
                                >
                                    ✕
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export { OFFICER_ITEM_TYPE };
export default DroppableMonthCard;
