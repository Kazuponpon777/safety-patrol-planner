import { startOfMonth, endOfMonth, eachDayOfInterval, isFriday, getYear, getMonth, format, addMonths } from 'date-fns';
import { ja } from 'date-fns/locale';

/**
 * Generate a schedule for the fiscal year.
 * Fiscal Year 2025 -> April 2025 to March 2026.
 * Rule: Default to 2nd Friday of each month.
 */
export const generateFiscalYearSchedule = (fiscalYear) => {
    const schedule = [];
    const startDate = new Date(fiscalYear, 3, 1); // April 1st of fiscalYear (Note: month is 0-indexed)

    for (let i = 0; i < 12; i++) {
        const currentMonthDate = addMonths(startDate, i);
        const month = getMonth(currentMonthDate) + 1;
        const year = getYear(currentMonthDate);

        // Find the 2nd Friday
        const fridays = eachDayOfInterval({
            start: startOfMonth(currentMonthDate),
            end: endOfMonth(currentMonthDate)
        }).filter(date => isFriday(date));

        // Default to 2nd Friday (index 1), if not available (rare), use 1st
        const targetDate = fridays[1] || fridays[0];

        schedule.push({
            monthId: `${year}-${month}`, // Unique ID for Drag & Drop
            year,
            month,
            date: format(targetDate, 'yyyy-MM-dd'),
            originalDate: format(targetDate, 'yyyy-MM-dd'), // Keep strictly calculated date
            dayOfWeek: '金', // Default is Friday
            officer: null, // To be assigned
            members: [], // To be assigned (max 5-6)
            note: ''
        });
    }

    return schedule;
};

/**
 * Helper to get day of week string from 'yyyy-MM-dd'
 */
export const getDayOfWeek = (dateStr) => {
    if (!dateStr) return '';
    try {
        const date = new Date(dateStr);
        return format(date, 'EE', { locale: ja });
    } catch (e) {
        return '';
    }
}

/**
 * Assign officers to the schedule in rotation.
 */
export const assignOfficersToSchedule = (schedule, officers) => {
    if (!officers || officers.length === 0) return schedule;

    return schedule.map((slot, index) => {
        // Simple rotation
        const officerIndex = index % officers.length;
        return {
            ...slot,
            officer: officers[officerIndex]
        };
    });
};
