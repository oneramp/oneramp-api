import CustomerModel from "../../models/CustomerModel"
import { createNewKotaniCustomer } from "../kotani/Customer/create-customer"
import { createKotaniWithdraw } from "../kotani/withdraw/kotani-withdraw"

// Handle payout via Mobile Money (MoMo)
export const sendMomoPayout = async (
  phone: string,
  orderId: string,
  operator: string,
  country: string,
  amount: number
) => {
  try {
    let createdCustomerKey
    let customer = await CustomerModel.findOne({ phoneNumber: phone })

    if (operator === "safaricom") {
      operator = "MPESA"
    }

    if (!customer) {
      createdCustomerKey = await createNewKotaniCustomer(
        phone,
        orderId,
        operator.toUpperCase()
      )
    } else {
      createdCustomerKey = customer.customerKey
      customer.activeOrderId = orderId
      await customer.save()
    }

    const withdrawResponse = await createKotaniWithdraw(
      createdCustomerKey,
      country,
      amount
    )

    if (withdrawResponse && withdrawResponse.success) {
      // throw new Error("InvalidSchema")
      // await changeOrderStatusFunc(order, "DONE", "0x")
      return {
        success: true,
        message: "Payout successful",
        response: withdrawResponse.data,
      }
    } else {
      return {
        success: false,
        message: "Payout failed",
      }
    }
  } catch (error) {
    return {
      success: false,
      message: "Payout failed",
    }
  }
}
