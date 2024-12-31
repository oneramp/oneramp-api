import axios from "axios"
import dotenv from "dotenv"
import {
  kotaniApiKey,
  kotaniUrl,
  kotaniWalletIds,
  onerampRootUrl,
} from "../../../constants"
import { getKotaniTxStatus } from "../status"

dotenv.config()

const apiKey = kotaniApiKey
const apiUrl = kotaniUrl

export const createKotaniDeposit = async (
  customerKey: string,
  amount: number,
  country: string
) => {

  const walletId = kotaniWalletIds[country]



  if (!walletId) {
    throw new Error("Invalid country")
  }

  try {
    const depositOptions = {
      method: "POST",
      url: `${apiUrl}/deposit/mobile-money`,
      headers: {
        accept: "application/json",
        "content-type": "application/json",
        authorization: `Bearer ${apiKey}`,
      },
      data: {
        customer_key: customerKey,
        amount: amount,
        wallet_id: walletId,
        callback_url: `${onerampRootUrl}/merchant/callback`,
        // "https://webhook.site/04e3e265-b5de-4518-93b1-e71789d5846a",
        //   reference_id: 'refID'
      },
    }
    const response = await axios.request(depositOptions)
    const result = response.data

    if (result.success && result.data.reference_id) {
      // Call the reference id to get the deposit status
      const txStatus = await getKotaniTxStatus(result.data.reference_id)

      if (
        txStatus.status === "CANCELLED" ||
        txStatus.status === "FAILED" ||
        txStatus.status === "DECLINED" ||
        txStatus.status === "PENDING"
      ) {
        // Make the payment here....
      }
    }

    return result
  } catch (error) {
    // console.error(error)
    return error
  }
}

export const getWalletBalance = async (walletId: string) => {
  try {
    const balanceOptions = {
      method: "GET",
      url: `${apiUrl}/wallet/fiat/${walletId}`,
      headers: {
        accept: "application/json",
        "content-type": "application/json",
        authorization: `Bearer ${apiKey}`,
      },
    }
    const response = await axios.request(balanceOptions)
    return response.data
  } catch (error) {
    return error
  }
}
