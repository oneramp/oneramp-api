import crypto from "crypto"
import dotenv from "dotenv"
import { PayCrestSupportChainAndToken } from "./SharedConstants"
import { createAPIMethod } from "./SharedFunction"
import { OfframpTransactionRequest, OrderStatusResponseI } from "./Types"
dotenv.config()
const { PAYCREST_URL, PAYCREST_API_KEY, PAYCREST_SECRET_KEY } = process.env

class PayCrestService {
  async getSupportedBanks(data: { currency_code: string }) {
    const getBanks = createAPIMethod({
      method: "GET",
      url: `${PAYCREST_URL}/institutions/${data.currency_code}`,
      headers: {
        "API-Key": `${PAYCREST_API_KEY}`,
      },
    })

    return await getBanks(data)
  }

  async getSupportedChainsAndToken() {
    const chains = PayCrestSupportChainAndToken.networks
    return chains
  }

  async getRate(data: { token: string; amount: string; fiat: string }) {
    const { token, amount, fiat } = data

    const url = `${PAYCREST_URL}/rates/${token}/${amount}/${fiat}`

    try {
      const response = createAPIMethod({
        method: "GET",
        url,
      })

      return await response(data)
    } catch (error) {
      throw error // Re-throw the error to propagate it to the caller
    }
  }

  async getCurrencies() {
    const url = `${PAYCREST_URL}/currencies`

    try {
      const response = createAPIMethod({
        method: "GET",
        url,
      })

      return await response({})
    } catch (error) {
      throw error // Re-throw the error to propagate it to the caller
    }
  }

  async offRamp(data: OfframpTransactionRequest) {
    const {
      amount,
      token,
      rate,
      network,
      recipient: { bankId, accountNumber, accountName },
      returnAddress,
    } = data

    const payloadRequest = {
      amount: amount,
      token: token,
      rate: rate,
      network: network,
      recipient: {
        institution: bankId,
        accountIdentifier: accountNumber,
        accountName: accountName,
        memo: `${"Payment order from "} ${accountName}`,
      },
      returnAddress: returnAddress,
    }

    const url = `${PAYCREST_URL}/sender/orders`

    try {
      const response = createAPIMethod({
        method: "POST",
        url,
        headers: {
          "API-Key": `${PAYCREST_API_KEY}`,
        },
      })

      return await response(payloadRequest)
    } catch (error) {
      throw error
    }
  }

  async verifyAccountName(data: { bankId: string; accountNumber: string }) {
    const { bankId, accountNumber } = data

    const payloadRequest = {
      institution: bankId,
      accountIdentifier: accountNumber,
    }

    const url = `${PAYCREST_URL}/verify-account`

    try {
      const response = createAPIMethod({
        method: "POST",
        url,
        headers: {
          "API-Key": `${PAYCREST_API_KEY}`,
        },
      })

      return await response(payloadRequest)
    } catch (error) {
      throw error
    }
  }

  async getOrderStatus(reference: string) {
    const url = `${PAYCREST_URL}/sender/orders/${reference}`

    try {
      const getStatus = createAPIMethod({
        method: "GET",
        url,
        headers: {
          "API-Key": `${PAYCREST_API_KEY}`,
        },
      })

      return await getStatus({} as OrderStatusResponseI)
    } catch (error) {
      throw error
    }
  }

  async verifyPaycrestSignature(
    signatureHeader: string,
    requestBody: string
  ): Promise<boolean> {
    const secretKey = PAYCREST_SECRET_KEY as string
    const calculatedSignature = await this.calculateHmacSignature(
      requestBody,
      secretKey
    )
    return signatureHeader === calculatedSignature
  }

  async calculateHmacSignature(
    data: string,
    secretKey: string
  ): Promise<string> {
    const key = Buffer.from(secretKey)
    const hash = crypto.createHmac("sha256", key)
    hash.update(data)
    return hash.digest("hex")
  }
}

export default new PayCrestService()
