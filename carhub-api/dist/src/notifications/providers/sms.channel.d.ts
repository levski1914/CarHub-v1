export declare class SmsChannel {
    private client;
    send(to: string, body: string): Promise<void>;
}
