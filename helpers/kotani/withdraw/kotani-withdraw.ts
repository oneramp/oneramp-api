import axios from "axios"
import dotenv from "dotenv"
import {
  kotaniApiKey,
  kotaniUrl,
  kotaniWalletIds,
  onerampRootUrl,
} from "../../../constants"
dotenv.config()

const apiKey = kotaniApiKey
const apiUrl = kotaniUrl

export const createKotaniWithdraw = async (
  customerKey: string,
  country: string,
  amount: number
) => {
  try {
    // let walletId

    // if (country === "GHA") {
    //   walletId = kotaniWalletIdGhana
    // } else if (country === "KE") {
    //   walletId = kotaniWalletIdKenya
    // } else {
    //   throw new Error("Invalid country")
    // }

    const walletId = kotaniWalletIds[country]

    if (!walletId) {
      throw new Error("Invalid country")
    }

    const parsedAmount = Number(amount)

    const withDrawOptions = {
      method: "POST",
      url: `${apiUrl}/withdraw/mobile-money`,
      headers: {
        accept: "application/json",
        "content-type": "application/json",
        authorization: `Bearer ${apiKey}`,
      },
      data: {
        customer_key: customerKey,
        amount: parsedAmount,
        walletId: walletId,
        callbackUrl: `${onerampRootUrl}/merchant/callback/withdraw`,
      },
    }

    const response = await axios.request(withDrawOptions)
    return response.data
  } catch (error) {
    return error
  }
}

// Withdraw("+254705343984", 10)

export const getKotaniOrderStatus = async (orderRef: string) => {
  try {
    const withDrawOptions = {
      method: "GET",
      url: `${apiUrl}/deposit/mobile-money/status/${orderRef}`,
      headers: {
        accept: "application/json",
        "content-type": "application/json",
        authorization: `Bearer ${apiKey}`,
      },
    }

    const response = await axios.request(withDrawOptions)
    return response.data
  } catch (error) {
    return error
  }
}

export const getKotaniOrderWithdrawStatus = async (orderRef: string) => {
  try {
    const withDrawOptions = {
      method: "GET",
      url: `${apiUrl}/withdraw/status/${orderRef}`,
      headers: {
        accept: "application/json",
        "content-type": "application/json",
        authorization: `Bearer ${apiKey}`,
      },
    }

    const response = await axios.request(withDrawOptions)
    return response.data
  } catch (error) {
    return {
      success: false,
      error: error,
    }
  }
}

// Withdraw("+254705343984", 10)
