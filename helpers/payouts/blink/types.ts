export interface Wallet {
  id: string
  walletCurrency: string
  balance: number
}

export interface DefaultAccount {
  wallets: Wallet[]
}

export interface Me {
  defaultAccount: DefaultAccount
}

export interface GraphQLResponse {
  data: {
    me: Me
  }
}

export interface BlinkBalanceResponse {
  success: boolean
  data?: GraphQLResponse
  message?: string
}

export interface LnAddressPaymentSendInput {
  walletId: string
  amount: string
  lnAddress: string
}
