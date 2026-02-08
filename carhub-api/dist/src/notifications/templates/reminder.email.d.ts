type ReminderEmailProps = {
    title: string;
    plate: string;
    label: string;
    dueDate: string;
    daysDiff?: number;
    kind: 'before_due' | 'overdue';
};
export declare function reminderEmailHtml({ title, plate, label, dueDate, daysDiff, kind, }: ReminderEmailProps): string;
export {};
