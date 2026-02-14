import React from 'react';
import { useDrag } from 'react-dnd';

export const OFFICER_ITEM_TYPE = 'OFFICER';

const DraggableOfficer = ({ member, source, monthId, assignCount = 0 }) => {
    const [{ isDragging }, drag] = useDrag(() => ({
        type: OFFICER_ITEM_TYPE,
        item: { member, source, monthId },
        collect: (monitor) => ({
            isDragging: !!monitor.isDragging(),
        }),
    }));

    const isAssigned = assignCount > 0;

    return (
        <div
            ref={drag}
            className={`member-item cursor-move border rounded px-2 py-1 mb-1 shadow-sm ${isDragging ? 'opacity-50' : 'opacity-100'}`}
            style={{
                cursor: 'grab',
                backgroundColor: isAssigned ? '#fef3e2' : '#fff7ed',
                borderColor: isAssigned ? '#fdba74' : '#fed7aa',
                opacity: isDragging ? 0.5 : 1,
            }}
        >
            <div className="flex justify-between items-center">
                <span className="text-sm truncate" style={{ color: '#c2410c' }}>
                    ⭐ {member.name}
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    {isAssigned && (
                        <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            backgroundColor: assignCount >= 2 ? '#ea580c' : '#f97316',
                            color: '#fff',
                            fontSize: '9px',
                            fontWeight: 'bold',
                            borderRadius: '9999px',
                            minWidth: '30px',
                            padding: '1px 5px',
                            lineHeight: '14px',
                        }}>
                            {assignCount}回
                        </span>
                    )}
                    <span className="text-xs" style={{ color: '#9a3412', opacity: 0.7 }}>
                        {member.roleStr}
                    </span>
                </span>
            </div>
        </div>
    );
};

export default DraggableOfficer;
