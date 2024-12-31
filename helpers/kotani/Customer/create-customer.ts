import axios from "axios"
import dotenv from "dotenv"
import {
  kotaniApiKey,
  kotaniCountryPrefixes,
  kotaniGhanaNetworks,
  kotaniUrl,
} from "../../../constants"
import CustomerModel from "../../../models/CustomerModel"

dotenv.config()

const apiKey = kotaniApiKey
const countryPrefixes = kotaniCountryPrefixes
const ghanaNetworks = kotaniGhanaNetworks

export const createNewKotaniCustomer = async (
  phoneNumber: string,
  orderId: string,
  network: string
) => {
  try {
    if (!phoneNumber.startsWith("+")) {
      return { error: "Phone number must start with +" }
    }

    // Replace + with %2B
    //   const formattedPhoneNumber = phoneNumber.replace('+', '%2B');
    let countryCode: string | null = null

    for (const prefix in countryPrefixes) {
      if (phoneNumber.startsWith(prefix)) {
        countryCode = countryPrefixes[prefix]
        break
      }
    }

    if (!countryCode) {
      return { error: "Unsupported country code" }
    }

    const newCustomer = {
      method: "POST",
      url: `${kotaniUrl}/customer/mobile-money`,
      headers: {
        accept: "application/json",
        "content-type": "application/json",
        authorization: `Bearer ${apiKey}`,
      },
      data: {
        country_code: countryCode,
        phone_number: phoneNumber,
        network: network,
        account_name: "oneramp",
      },
    }

    const response = await axios.request(newCustomer)

    const result = response.data

    if (result.success) {
      // Create the customer model
      await CustomerModel.create({
        customerKey: result.data.customer_key,
        countryCode,
        phoneNumber,
        network,
        accountName: "OneRamp Client",
        activeOrderId: orderId,
      })
    }

    return result.data.customer_key
  } catch (error) {
    return error
  }
}

// newCustomer("+254705343984")
