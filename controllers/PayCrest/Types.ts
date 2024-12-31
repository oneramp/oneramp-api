interface ApiResponse {
  message: string
  status: "success" | "error" // or more specific types if applicable
}

type Bank = {
  name: string
  code: string
  type: "bank" | "mobile_money" // limited to "bank" or "mobile_money"
}

export type BankResponse = ApiResponse & {
  data: Bank[]
}

export type RateResponse = ApiResponse & {
  data: string
}

export type PayCrestPayloadRequest = {
  amount: number
  token: string
  rate: string
  network: string
  recipient: {
    institution: string
    accountIdentifier: string
    accountName: string
    memo: string
  }
  returnAddress: string
}

export interface OfframpTransactionRequest {
  amount: number
  token: string
  rate: string
  network: string
  recipient: {
    bankId: string
    accountNumber: string
    accountName: string
    memo?: string
  }
  returnAddress: string
}

export interface OrderStatusResponseI {
  message: string
  status: "success" | "error"
  data: OrderDataI
}

export interface OrderDataI {
  id: string
  amount: string
  amountPaid: string
  amountReturned: string
  token: string
  senderFee: string
  transactionFee: string
  rate: string
  network: string
  gatewayId: string
  recipient: Recipient
  fromAddress: string
  returnAddress: string
  receiveAddress: string
  feeAddress: string
  createdAt: string // ISO date string
  updatedAt: string // ISO date string
  txHash: string
  status: "initiated" | "completed" | "failed" // add any other possible statuses here
  transactions: Transaction[]
}

export interface Recipient {
  institution: string
  accountIdentifier: string
  accountName: string
  memo: string
}

export interface Transaction {
  id: string
  gatewayId: string
  status: "crypto_deposited" | "crypto_withdrawn" | "processing" // add any other possible statuses here
  txHash: string
  createdAt: string // ISO date string
}
