import React from 'react';
import { format } from 'date-fns';

const PrintLayout = ({ fiscalYear, schedule }) => {
    // Group schedule by year for the year sidebar
    const startYear = fiscalYear;
    const endYear = fiscalYear + 1;

    // April~December = startYear, January~March = endYear
    const firstYearSlots = schedule.filter(s => s.month >= 4);
    const secondYearSlots = schedule.filter(s => s.month <= 3);

    const renderRow = (slot, isFirst, rowSpan, yearLabel, yearClass) => (
        <tr key={slot.monthId}>
            {isFirst && (
                <td className={`print-year-cell ${yearClass}`} rowSpan={rowSpan}>
                    <span className="print-year-text">{yearLabel}年</span>
                </td>
            )}
            <td className="print-cell print-date-cell">
                {slot.date ? `${slot.month}/${format(new Date(slot.date), 'd')}` : `${slot.month}/`}
            </td>
            <td className="print-cell print-day-cell">
                ({slot.dayOfWeek})
            </td>
            <td className="print-cell print-officer-cell">
                {slot.officer ? slot.officer.name : ''}
            </td>
            {/* 5 member columns */}
            {[0, 1, 2, 3, 4].map(idx => (
                <td key={idx} className="print-cell print-member-cell">
                    {slot.members[idx] ? slot.members[idx].name : ''}
                </td>
            ))}
            <td className="print-cell print-remarks-cell">
                {slot.note || ''}
            </td>
        </tr>
    );

    return (
        <div className="print-layout">
            {/* Header */}
            <div className="print-header">
                <div className="print-header-left">
                    <div>自　{startYear}年　4月</div>
                    <div>至　{endYear}年　3月</div>
                </div>
                <div className="print-header-center">
                    <h1>八 親 会 安 全 パ ト ロ ー ル 日 程 表</h1>
                </div>
                <div className="print-header-right">
                    <div>八 洲 建 設 (株)</div>
                    <div>八 　親　 会</div>
                </div>
            </div>

            {/* Table */}
            <table className="print-table">
                <thead>
                    <tr className="print-thead-row">
                        <th className="print-th" style={{ width: '40px' }}></th>
                        <th className="print-th" style={{ width: '60px' }}>年月日</th>
                        <th className="print-th" style={{ width: '40px' }}>曜日</th>
                        <th className="print-th" style={{ width: '140px' }}>安全委員</th>
                        <th className="print-th print-member-header" colSpan="5">会　　員</th>
                        <th className="print-th" style={{ width: '60px' }}>備考</th>
                    </tr>
                </thead>
                <tbody>
                    {/* First year rows (April~December) */}
                    {firstYearSlots.map((slot, idx) =>
                        renderRow(slot, idx === 0, firstYearSlots.length, startYear, 'year-first')
                    )}
                    {/* Second year rows (January~March) */}
                    {secondYearSlots.map((slot, idx) =>
                        renderRow(slot, idx === 0, secondYearSlots.length, endYear, 'year-second')
                    )}
                </tbody>
            </table>

            {/* Footer */}
            <div className="print-footer">
                <div className="print-footer-left">
                    <div className="print-footer-line">◇　安全委員長　　　　　　　　安全副委員長　　　　　　</div>
                    <div className="print-footer-line">◇　上記日程表にもとづき、一週間前に連絡のこと。</div>
                    <div className="print-footer-line">◇　会員は安全パトロールに協力し、災害防止活動を推進すること。</div>
                    <div className="print-footer-line">◇　集合場所　八洲建設(株)　分室内　八親会室　午前11時00分までに集合のこと。</div>
                </div>
                <div className="print-footer-right">
                    昼食 ( 11:15 ～ 12:15 )
                </div>
            </div>
        </div>
    );
};

export default PrintLayout;
