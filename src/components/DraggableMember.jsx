import React from 'react';
import { useDrag } from 'react-dnd';

export const ITEM_TYPE = 'MEMBER';

const DraggableMember = ({ member, source, monthId }) => {
    const [{ isDragging }, drag] = useDrag(() => ({
        type: ITEM_TYPE,
        item: { member, source, monthId }, // source: 'sidebar' or 'calendar'
        collect: (monitor) => ({
            isDragging: !!monitor.isDragging(),
        }),
    }));

    // member-item クラスを再利用しつつ、ドラッグ用のスタイルを追加
    // sidebar内とcalendar内での表示微調整が必要かも
    return (
        <div
            ref={drag}
            className={`member-item cursor-move bg-white border border-gray-200 rounded px-2 py-1 mb-1 shadow-sm ${isDragging ? 'opacity-50' : 'opacity-100'}`}
            style={{ cursor: 'grab' }}
        >
            <div className="flex justify-between items-center">
                <span className="text-sm truncate">{member.name}</span>
            </div>
        </div>
    );
};

export default DraggableMember;
