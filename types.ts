import { Document } from "mongoose"
/* eslint-disable max-classes-per-file*/
import {
  AuthRequestBody,
  CryptoType,
  DeleteFiatAccountRequestParams,
  FiatAccountSchema,
  FiatAccountSchemas,
  FiatAccountType,
  FiatConnectError,
  FiatType,
  PostFiatAccountRequestBody,
  QuoteRequestBody,
  TransferRequestBody,
  TransferStatusRequestParams,
} from "@fiatconnect/fiatconnect-types"

export {
  AuthRequestBody,
  CryptoType,
  DeleteFiatAccountRequestParams,
  FiatAccountSchema,
  FiatAccountSchemas,
  FiatAccountType,
  FiatConnectError,
  FiatType,
  PostFiatAccountRequestBody,
  QuoteRequestBody,
  TransferRequestBody,
  TransferStatusRequestParams,
}

export interface UserCreds {
  clientId: string
  secret: string
}

export interface KYCStatusI {
  success: boolean
  response: {
    _id?: string
    storeId: string
    requireKyc: boolean
    email: string
    __v?: 0
  }
}

export interface CredentialsI {
  client: string
  secret: string
}

export interface KYCFormI {
  firstName: string
  lastName: string
  nationality: string
  birthDate: string
  email: string
  address?: string
  diverLicense?: string
  age: string | number
  citizenShip: string
  nationalId: string | number
  fullName: string
  expiryDate?: string
}

export enum EnviromentE {
  "DEV",
  "LIVE",
}

export interface TransactionI {
  store: string
  txHash: string
  amount: number
  fiat: number
  phone: string
  asset: string
  network?: string
  status: string
  createdAt?: string
}

export interface EmulatorI extends Document {
  store: string
  phone?: string
}

export interface MomoMessageI extends Document {
  emulator: string
  message?: string
}

export interface BankQuoteI extends Document {
  transferId: string
  code: string
  accountNumber: string
  accountName: string
}

/*
 * API error types
 */

export class ValidationError extends Error {
  validationError: any
  fiatConnectError: FiatConnectError
  constructor(
    msg: string,
    validationError: any,
    fiatConnectError: FiatConnectError
  ) {
    super(msg)
    this.validationError = validationError
    this.fiatConnectError = fiatConnectError
  }
}

// Define the Response interface for TypeScript
export interface ITransfer extends Document {
  quote: string
  status: string
  address: string
  operator?: string
  txHash: string
  phone?: string
  orderId?: string
  bankOrderId?: string
  kotaniRef?: string
  date: string
}

export enum Countries {
  UG = "UG",
  KE = "KE",
  GHA = "GHA",
  TZ = "TZ",
  ZM = "ZM",
  NG = "NG",
}

export enum FiatAccountSchemaEnum {
  "AccountNumber",
  "MobileMoney",
  "DuniaWallet",
  "IBANNumber",
  "IFSCAccount",
  "PIXAccount",
}

export class InvalidSiweParamsError extends Error {
  fiatConnectError: FiatConnectError

  constructor(fiatConnectError: FiatConnectError, msg?: string) {
    super(msg || fiatConnectError)
    this.fiatConnectError = fiatConnectError
  }
}

export class NotImplementedError extends Error {}

export class UnauthorizedError extends Error {
  fiatConnectError: FiatConnectError

  constructor(
    fiatConnectError: FiatConnectError = FiatConnectError.Unauthorized,
    msg?: string
  ) {
    super(msg || fiatConnectError)
    this.fiatConnectError = fiatConnectError
  }
}

export interface AssetsI {
  id: number
  name: string
  network: string[]
  fees: number
}
