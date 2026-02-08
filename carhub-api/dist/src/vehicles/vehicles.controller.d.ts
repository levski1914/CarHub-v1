import { VehiclesService } from './vehicles.service';
import { ObligationType } from '@prisma/client';
export declare class VehiclesController {
    private svc;
    constructor(svc: VehiclesService);
    list(req: any): Promise<{
        id: string;
        plate: string;
        make: string;
        model: string;
        status: "overdue" | "ok" | "soon";
    }[]>;
    create(req: any, body: {
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
    get(req: any, id: string): Promise<{
        id: string;
        plate: string;
        make: string;
        model: string;
        status: string;
    }>;
    update(req: any, id: string, body: {
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
    remove(req: any, id: string): Promise<{
        status: string;
    }>;
    listObligations(req: any, id: string): Promise<{
        id: string;
        vehicleId: string;
        type: import("@prisma/client").$Enums.ObligationType;
        dueDate: string;
        status: "overdue" | "ok" | "soon";
    }[]>;
    createObligation(req: any, id: string, body: {
        type: ObligationType;
        dueDate: string;
    }): Promise<{
        id: string;
        vehicleId: string;
        type: import("@prisma/client").$Enums.ObligationType;
        dueDate: string;
        status: "overdue" | "ok" | "soon";
    }>;
    upsertObligation(req: any, vehicleId: string, type: ObligationType, body: {
        dueDate: string;
    }): Promise<{
        id: string;
        vehicleId: string;
        type: import("@prisma/client").$Enums.ObligationType;
        dueDate: string;
        status: "overdue" | "ok" | "soon";
    }>;
    enrich(req: any, id: string, body: {
        plate?: string;
        vin?: string;
        checks?: ('Винетка' | 'Гражданска отговорност' | 'Технически преглед')[];
    }): Promise<{
        vehicleId: string;
        results: {
            check: "\u0412\u0438\u043D\u0435\u0442\u043A\u0430" | "\u0413\u0440\u0430\u0436\u0434\u0430\u043D\u0441\u043A\u0430 \u043E\u0442\u0433\u043E\u0432\u043E\u0440\u043D\u043E\u0441\u0442" | "\u0422\u0435\u0445\u043D\u0438\u0447\u0435\u0441\u043A\u0438 \u043F\u0440\u0435\u0433\u043B\u0435\u0434";
            status: "ok" | "not_found" | "needs_user" | "failed" | "cached";
            validUntil?: string;
            message?: string;
            challengeId?: string;
            captchaImageBase64?: string;
        }[];
    }>;
}
