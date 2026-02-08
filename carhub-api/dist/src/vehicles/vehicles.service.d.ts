import { PrismaService } from 'src/prisma.service';
import { ObligationType } from '@prisma/client';
import { GtpService } from 'src/integration/gtp/gtp.service';
import { GoService } from 'src/integration/go/go.service';
import { HistoryService } from 'src/history/history.service';
type EnrichResponse = {
    vehicleId: string;
    results: {
        check: 'Винетка' | 'Гражданска отговорност' | 'Технически преглед';
        status: 'ok' | 'not_found' | 'needs_user' | 'failed' | 'cached';
        validUntil?: string;
        message?: string;
        challengeId?: string;
        captchaImageBase64?: string;
    }[];
};
export declare class VehiclesService {
    private prisma;
    private go;
    private gtp;
    private history;
    constructor(prisma: PrismaService, go: GoService, gtp: GtpService, history: HistoryService);
    private requireVehicleOwned;
    private statusFromDue;
    listVehicles(userId: string): Promise<{
        id: string;
        plate: string;
        make: string;
        model: string;
        status: "overdue" | "ok" | "soon";
    }[]>;
    createVehicle(userId: string, data: {
        plate: string;
        make: string;
        model: string;
    }): Promise<{
        id: string;
        plate: string;
        make: string;
        model: string;
        status: string;
    }>;
    getVehicle(userId: string, id: string): Promise<{
        id: string;
        plate: string;
        make: string;
        model: string;
        status: string;
    }>;
    updateVehicle(userId: string, id: string, data: {
        plate?: string;
        make?: string;
        model?: string;
    }): Promise<{
        id: string;
        plate: string;
        make: string;
        model: string;
        status: string;
    }>;
    deleteVehicle(userId: string, id: string): Promise<{
        status: string;
    }>;
    listObligations(userId: string, vehicleId: string): Promise<{
        id: string;
        vehicleId: string;
        type: import("@prisma/client").$Enums.ObligationType;
        dueDate: string;
        status: "overdue" | "ok" | "soon";
    }[]>;
    upsertObligation(userId: string, vehicleId: string, type: ObligationType, dueDateISO: string): Promise<{
        id: string;
        vehicleId: string;
        type: import("@prisma/client").$Enums.ObligationType;
        dueDate: string;
        status: "overdue" | "ok" | "soon";
    }>;
    createObligation(userId: string, vehicleId: string, data: {
        type: ObligationType;
        dueDate: string;
    }): Promise<{
        id: string;
        vehicleId: string;
        type: import("@prisma/client").$Enums.ObligationType;
        dueDate: string;
        status: "overdue" | "ok" | "soon";
    }>;
    enrichVehicle(userId: string, vehicleId: string, input: {
        plate?: string;
        vin?: string;
        checks?: ('Винетка' | 'Гражданска отговорност' | 'Технически преглед')[];
    }): Promise<EnrichResponse>;
    upsertIntegrationObligation(vehicleId: string, type: ObligationType, validUntilISO: string, meta: any): Promise<void>;
    private checkVignette;
}
export {};
