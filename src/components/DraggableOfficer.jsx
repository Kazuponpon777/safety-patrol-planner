import React from 'react';
import { useDrag } from 'react-dnd';

export const OFFICER_ITEM_TYPE = 'OFFICER';

const DraggableOfficer = ({ member, source, monthId }) => {
    const [{ isDragging }, drag] = useDrag(() => ({
        type: OFFICER_ITEM_TYPE,
        item: { member, source, monthId },
        collect: (monitor) => ({
            isDragging: !!monitor.isDragging(),
        }),
    }));

    return (
        <div
            ref={drag}
            className={`member-item cursor-move border rounded px-2 py-1 mb-1 shadow-sm ${isDragging ? 'opacity-50' : 'opacity-100'}`}
            style={{
                cursor: 'grab',
                backgroundColor: '#fff7ed',
                borderColor: '#fed7aa',
            }}
        >
            <div className="flex justify-between items-center">
                <span className="text-sm truncate" style={{ color: '#c2410c' }}>
                    ⭐ {member.name}
                </span>
                <span className="text-xs" style={{ color: '#9a3412', opacity: 0.7 }}>
                    {member.roleStr}
                </span>
            </div>
        </div>
    );
};

export default DraggableOfficer;
