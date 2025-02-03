export enum CustomErrorCodes {
    GENERAL_ERROR = 0,
    MALFORMED_REQUEST = 1,
    INVALID_TOKEN = 2,
    NO_TOKEN_PROVIDED = 3,
    UNKNOWN_USER = 10001,
    UNKNOWN_ENTITY = 10002,
    UNKNOWN_USER_OR_ENTITY = 10003,
}

export type APIRequestIssue = {
    code: CustomErrorCodes;
    reason: string;
};


export class ApiError extends Error {
    constructor(message: string, public code?: CustomErrorCodes) {
        super(message);
        this.name = "ApiError";
    }
}

export async function throwApiError(res: Response): Promise<never> {
    const body = (await res.json());

    if (body.reason && body.code) throw new ApiError(body.reason, body.code);
    else throw new ApiError(`Unknown API error: ${body.code || "no code provided"}: ${body.reason || "no reason provided"}`, CustomErrorCodes.GENERAL_ERROR);
}