import { kotaniPhonePrefixes } from "../../../constants"
import CustomerModel from "../../../models/CustomerModel"
import { IQuote } from "../../../models/QuoteModel"
import { appWebhook, IAppWebhook } from "../../../webhooks"
import { createNewKotaniCustomer } from "../Customer/create-customer"
import { createKotaniDeposit } from "../deposit/kotani-deposit"

export const makeKotaniPayTx = async (
  quote: IQuote,
  phone: string,
  operator: string,
  orderId: string,
  callback?: string,
  webhookSecret?: string,
  transferId?: string
) => {
  // If the country is GHA, find or create a customer model
  // if (quote.country !== "GHA") return

  const countryPrefix = kotaniPhonePrefixes[quote.country]

  if (operator === "safaricom") {
    operator = "MPESA"
  }

  if (!countryPrefix) {
    // throw new Error("InvalidCountry")
    return { success: false, message: "Invalid country." }
  }

  try {
    // Phone validation for GHANA to start with +233
    const isValidPhone = phone.startsWith(countryPrefix) // TODO: Uncomment this line
    // const isValidPhone = phone.startsWith("+254") // TODO: Remove this line

    const formattedPhone = isValidPhone
      ? phone
      : `${countryPrefix}${phone.replace(/^0+/, "")}`

    if (!isValidPhone && !phone.startsWith("0")) {
      const errorResponse = {
        error: "InvalidPhoneNumber",
        message: "Phone number must start with +2XX or 0.",
      }
      return { success: false, message: errorResponse.message }
    }

    let createdCustomerKey

    let customer = await CustomerModel.findOne({ phoneNumber: formattedPhone })

    if (!customer) {
      // Call the Kotani create Customer endpoint
      createdCustomerKey = await createNewKotaniCustomer(
        formattedPhone,
        orderId,
        operator.toUpperCase()
      )
    } else {
      createdCustomerKey = customer.customerKey
      customer.activeOrderId = orderId

      await customer.save()
    }

    if (!createdCustomerKey) {
      return { success: false, message: "Failed to create customer" }
    }

    // Call the deposit
    const depositResponse = await createKotaniDeposit(
      createdCustomerKey,
      Number(quote.amountPaid),
      quote.country
    )

    if (!depositResponse.success) {
      if (callback && webhookSecret) {
        const webhookRequest: IAppWebhook = {
          eventType: "TransferFailed",
          transferType: "TransferIn",
          status: "TransferStatusEnum",
          fiatType: quote.fiatType,
          cryptoType: quote.cryptoType,
          amountProvided: quote.amountPaid,
          amountReceived: quote.cryptoAmount
            ? quote.cryptoAmount
            : quote.fiatAmount,
          fee: quote.fee,
          transferId: transferId
            ? transferId
            : depositResponse.data.reference_id,
          transferAddress: quote.address ? quote.address : "",
        }

        await appWebhook(callback, webhookRequest, webhookSecret)
      }

      // throw new Error("InvalidSchema")
      return { success: false, message: depositResponse.message }
    }

    // Send crypto to the user's wallet here....
    if (callback && webhookSecret) {
      // Make a call to the user's server
      // Make webhook call to the user's server here....
      // with the depositResponse.data.reference_id

      const webhookRequest: IAppWebhook = {
        eventType: "TransferStarted",
        transferType: "TransferIn",
        status: "TransferStatusEnum",
        fiatType: quote.fiatType,
        cryptoType: quote.cryptoType,
        amountProvided: quote.amountPaid,
        amountReceived: quote.cryptoAmount
          ? quote.cryptoAmount
          : quote.fiatAmount,
        fee: quote.fee,
        transferId: transferId ? transferId : depositResponse.data.reference_id,
        transferAddress: quote.address ? quote.address : "",
      }

      await appWebhook(callback, webhookRequest, webhookSecret)
    }

    return depositResponse.data.reference_id
  } catch (error) {
    return error
  }
}
