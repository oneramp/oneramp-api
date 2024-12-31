export interface CustomMetadata {
    userId: string;
    email: string;
}

export type PossibleEventNames =
    | "verification_started"
    | "step_completed"
    | "verification_inputs_completed"
    | "verification_completed"
    | "verification_updated";
    
export type VerificationStatus = "verified" | "reviewNeeded" | "rejected";

export type VerificationStatusMap = {
    [key in VerificationStatus] : any;
};


export interface UserKycData {
    status?: string;
    kycAddress?: string;
    email?: string;
    dateOfBirth?: string;
    documentNumber?: string;
    documentSubType?: string; // Defaults to 'LICENCE'
    documentType?: string;    // Defaults to 'ID'
    surname?: string;
    firstName?: string;
    fullName?: string;
    nationality?: string;
    gender?: string;
}
  

export interface WebhookPayload {
    eventName: PossibleEventNames;
    resource: string;
    flowID: string;
    timestamp: string;
    identityStatus: VerificationStatus; // real-time status - mutable
    status: VerificationStatus; // originally assigned status - immutable
    metadata?: CustomMetadata;
}

// possible payload validation errors
export const MISSING_ENV_VARIABLE_MESSAGE =
    "The `METAMAP_WEBHOOK_SECRET` environment variable is missing. Please ensure it is set.";
export const EMPTY_SIGNATURE_MESSAGE = "The signature value is empty";
export const EMPTY_PAYLOAD_MESSAGE = "The payload value is empty";
export const INVALID_PAYLOAD_MESSAGE = "Invalid payload";
export const INVALID_PAYLOAD_FORMAT_MESSAGE = "Invalid payload format";

export const METAMAP_WEBHOOK_SECRET = process.env.METAMAP_WEBHOOK_SECRET;
export const METAMAP_CLIENT_ID = process.env.METAMAP_CLIENT_ID;
export const METAMAP_CLIENT_SECRET = process.env.METAMAP_CLIENT_SECRET;
export const METAMAP_ACCESS_TOKEN_URL = 'https://api.getmati.com/oauth'
export const ENCRYPTION_ALGO = "sha256";
export const HMAC_DIGEST = "hex";
export const verificationStatusMap: VerificationStatusMap = {
    verified: "VERIFIED",
    reviewNeeded: "IN_REVIEW",
    rejected: "REJECTED",
};