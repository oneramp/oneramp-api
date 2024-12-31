import axios from "axios"
import dotenv from "dotenv"
import { kotaniApiKey, kotaniUrl } from "../../../constants"
dotenv.config()

const apiKey = kotaniApiKey
const apiUrl = kotaniUrl

export const getKotaniTxStatus = async (referenceId: string) => {
  try {
    const depositOptions = {
      method: "GET",
      url: `${apiUrl}/deposit/mobile-money/status/${referenceId}`,
      headers: {
        accept: "application/json",
        "content-type": "application/json",
        authorization: `Bearer ${apiKey}`,
      },
    }
    const response = await axios.request(depositOptions)
    const result = response.data

    // if (result.success && result.data.reference_id) {
    //   // Call the reference id to get the deposit status
    // }

    return result.data
  } catch (error) {
    return error
  }
}
// deposit("+254705343984", 200)
