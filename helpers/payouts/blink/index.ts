import axios, { AxiosRequestConfig } from "axios"
import {
  blinkGaloryUrl,
  blinkOnerampBtcWalletId,
  onerampBlinkKey,
} from "../../../constants"
import { LnAddressPaymentSendInput } from "./types"

export const getBlinkBalance = async () => {
  try {
    const data = JSON.stringify({
      query: `query me {
                me {
                    defaultAccount {
                        wallets {
                            id
                            walletCurrency
                            balance
                        }
                    }
                }
            }`,
      variables: {},
    })

    const config: AxiosRequestConfig = {
      method: "post",
      maxBodyLength: Infinity,
      url: blinkGaloryUrl,
      headers: {
        "Content-Type": "application/json",
        "X-API-KEY": onerampBlinkKey,
      },
      data: data,
    }

    const response = await axios.request(config)

    const wallets = response.data.data.me.defaultAccount.wallets

    return { success: true, response: wallets }
  } catch (error: any) {
    return { success: false, message: error.message }
  }
}

export const sendBlinkPayment = async (amount: string, lnAddress: string) => {
  try {
    const input: LnAddressPaymentSendInput = {
      walletId: blinkOnerampBtcWalletId,
      amount,
      lnAddress,
    }

    const data = JSON.stringify({
      query: `mutation LnAddressPaymentSend($input: LnAddressPaymentSendInput!) {
                lnAddressPaymentSend(input: $input) {
                    status
                    errors {
                        code
                        message
                        path
                    }
                }
            }`,
      variables: { input },
    })

    const config: AxiosRequestConfig = {
      method: "post",
      url: blinkGaloryUrl,
      headers: {
        "Content-Type": "application/json",
        "X-API-KEY": onerampBlinkKey,
      },
      data: data,
    }

    const response = await axios.request(config)

    const paymentResponse = response.data

    return { success: true, data: paymentResponse }
  } catch (error: any) {
    return { success: false, message: error.message }
  }
}
