import axios from "axios"

export const appWebhook = async (
  callback: string,
  requestBody: IAppWebhook,
  webhookSecret: string
) => {
  try {
    // Make a call to the user's server
    // Make webhook call to the user's server here....
    // with the depositResponse.data.reference_id

    const APP_WEBHOOK_SECRET = webhookSecret

    const response = await axios.post(callback, requestBody, {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${APP_WEBHOOK_SECRET}`,
      },
    })

    return response.data
  } catch (error) {
    return error
  }
}

export interface IAppWebhook {
  eventType: "TransferStarted" | "TransferComplete" | "TransferFailed"
  transferType: "TransferIn" | "TransferOut"
  status: `TransferStatusEnum`
  fiatType: string
  cryptoType: string
  amountProvided: string
  amountReceived: string
  fee?: string
  transferId: string
  transferAddress: string
  txHash?: string
}
