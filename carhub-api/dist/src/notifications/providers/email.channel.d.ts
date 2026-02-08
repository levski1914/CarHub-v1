export declare class EmailChannel {
    private resend;
    sendHtml(to: string, subject: string, html: string): Promise<void>;
}
