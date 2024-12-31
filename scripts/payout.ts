import axios from "axios"
import {
  kotaniApiKey,
  kotaniUrl,
  kotaniWalletIds,
  onerampRootUrl,
} from "../constants"
import { getKotaniTxStatus } from "../helpers/kotani/status"
import { Response } from "express"
import CustomerModel from "../models/CustomerModel"

const apiKey = kotaniApiKey
const apiUrl = kotaniUrl

export const createKotaniManualPayout = async (req: any, res: Response) => {
  const { customerKey, amount, country } = req.body

  const walletId = kotaniWalletIds[country]

  if (!walletId) {
    throw new Error("Invalid country")
  }

  const customer = await CustomerModel.findOne({ customerKey })

  if (!customer) {
    throw new Error("Customer not found")
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
      const txStatus = await getKotaniTxStatus(result.data.reference_id)

      if (
        txStatus.status === "CANCELLED" ||
        txStatus.status === "FAILED" ||
        txStatus.status === "DECLINED" ||
        txStatus.status === "PENDING"
      ) {
        // Handle the payment here...
      }
    }

    return res.status(200).json(result)
  } catch (error: any) {
    return res.status(500).json({ error: error.message })
  }
}

export const getKotaniCustomer = async (req: any, res: Response) => {
  const { customerKey } = req.params

  const customer = await CustomerModel.findOne({ customerKey })

  if (!customer) {
    throw new Error("Customer not found")
  }

  try {
    const depositOptions = {
      method: "GET",
      url: `${apiUrl}/customer/mobile-money/${customerKey}/`,
      headers: {
        accept: "application/json",
        "content-type": "application/json",
        authorization: `Bearer ${apiKey}`,
      },
    }

    const response = await axios.request(depositOptions)
    const result = response.data

    return res.status(200).json(result)
  } catch (error: any) {
    return res.status(500).json({ error: error.message })
  }
}

export const updateKotaniCustomer = async (req: any, res: Response) => {
  try {
    const allCustomersOptions = {
      method: "GET",
      url: `${apiUrl}/customer/mobile-money`,
      headers: {
        accept: "application/json",
        "content-type": "application/json",
        authorization: `Bearer ${apiKey}`,
      },
    }

    const response = await axios.request(allCustomersOptions)

    let customers = response.data.data

    // // Update customers with country_code "KE" and network "NOT_SUPPORTED"
    // let updatedCustomers = customers.map(async (customer: any) => {
    //   if (
    //     customer.country_code === "KE" &&
    //     customer.network === "NOT_SUPPORTED" &&
    //     customer
    //   ) {
    //     // customer.network = "MPESA"
    //     await updateKotaniCutomerFunction(customer)
    //   }
    //   return customer
    // })

    return res.status(200).json(customers)
  } catch (error: any) {
    return res.status(500).json({ error: error.message })
  }
}

export const updateKotaniCustomerNetwork = async (req: any, res: Response) => {
  try {
    const customerData = {
      phone_number: "+256704817780",
      country_code: "UG",
      customer_key: "T8x6UvYmRnBw2NHEqFw3",
      integrator: "669f7e2380c35b82ac8a6c1d",
      account_name: "oneramp",
      network: "AIRTEL",
    }

    const updateOptions = {
      method: "PATCH",
      url: `${apiUrl}/customer/mobile-money/${customerData.customer_key}/`,
      headers: {
        accept: "application/json",
        "content-type": "application/json",
        authorization: `Bearer ${apiKey}`,
      },
      data: {
        network: "AIRTEL",
      },
    }

    const response = await axios.request(updateOptions)

    return res.status(200).json(response.data)
  } catch (error: any) {
    return res.status(500).json({ error })
  }
}

const updateKotaniCutomerFunction = async (customer: any) => {
  try {
    const updateOptions = {
      method: "PUT",
      url: `${apiUrl}/customer/mobile-money/${customer.customer_key}/`,
      headers: {
        accept: "application/json",
        "content-type": "application/json",
        authorization: `Bearer ${apiKey}`,
      },
      data: {
        ...customer,
        network: "MPESA",
      },
    }

    const response = await axios.request(updateOptions)

    return response.data
  } catch (error: any) {
    return { error: error.message }
  }
}
