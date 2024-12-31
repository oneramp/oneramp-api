import { ethers } from "ethers"
import { Contract, hash, num, RpcProvider } from "starknet"
import ERC20 from "../../../abi.json"
import {
  celoUsdcContractAddress,
  celoUsdtContractAddress,
  celoWssRpc,
  cUSDAddress,
  ethereumUsdcContractAddress,
  ethereumUsdtContractAddress,
  ethereumWssRpc,
  kotaniPhonePrefixes,
  polygonUsdcContractAddress,
  polygonUsdtContractAddress,
  polygonWssRpc,
  starknetId,
  starknetProviderRpc,
  starknetUsdcContractAddress,
} from "../../../constants"
import { changeOrderStatusFunc } from "../../../controllers/kotani/kotani-controllers"
import CustomerModel from "../../../models/CustomerModel"
import OrdersModel from "../../../models/OrderModel"
import { IQuote } from "../../../models/QuoteModel"
import STRKABI from "../../../STRKERC20ABI.json"
import { getPassKeys } from "../../payouts"
import { createNewKotaniCustomer } from "../Customer/create-customer"
import { createKotaniWithdraw } from "./kotani-withdraw"

// Main function to listen for on-chain payments
export const listenToOnChainPayment = async (
  quote: IQuote,
  adminAddress: string,
  orderId: string,
  operator: string,
  phone: string
) => {
  const countryPrefix = kotaniPhonePrefixes[quote.country]

  // Validate phone number format
  const isValidPhone = phone.startsWith(countryPrefix)
  const formattedPhone = isValidPhone
    ? phone
    : `${countryPrefix}${phone.replace(/^0+/, "")}`

  if (!countryPrefix) {
    // throw new Error("InvalidCountry")
    return { success: false, message: "Invalid country" }
  }

  const {
    network,
    address,
    cryptoType: asset,
    fiatAmount,
    cryptoAmount,
  } = quote

  const fiatAmountParsed = Number(fiatAmount).toFixed()

  // Listen to the corresponding network
  switch (network) {
    case "celo":
      await listenToCelo(
        address!,
        adminAddress,
        asset as "cUSD" | "USDC" | "USDT",
        formattedPhone,
        orderId,
        operator,
        quote.country,
        Number(fiatAmountParsed),
        Number(cryptoAmount)
      )
      break
    case "ethereum":
      await listenToEthereum(
        address!,
        adminAddress,
        asset as "USDC" | "USDT",
        formattedPhone,
        orderId,
        operator,
        quote.country,
        Number(fiatAmountParsed),
        Number(cryptoAmount)
      )
      break
    case "polygon":
      await listenToPolygon(
        address!,
        adminAddress,
        asset as "USDC" | "USDT",
        formattedPhone,
        orderId,
        operator,
        quote.country,
        Number(fiatAmountParsed),
        Number(cryptoAmount)
      )
      break

    // case "starknet":
    //   await listenToStarknet(
    //     address!,
    //     adminAddress,
    //     asset as "USDC",
    //     formattedPhone,
    //     orderId,
    //     operator,
    //     quote.country,
    //     Number(fiatAmount),
    //     Number(cryptoAmount)
    //   )
    //   break
    default:
      // throw new Error("Unsupported network")
      return { success: false, message: "Unsupported network" }
  }
}

// Listen to Celo network
const listenToCelo = async (
  fromAddress: string,
  adminAddress: string,
  asset: "cUSD" | "USDC" | "USDT",
  phone: string,
  orderId: string,
  operator: string,
  country: string,
  amount: number,
  cryptoAmount: number
) => {
  try {
    const provider = new ethers.WebSocketProvider(celoWssRpc)
    const contractAddress = getContractAddress("celo", asset)

    if (!contractAddress) {
      // throw new Error("Invalid contract address")
      return { success: false, message: "Invalid contract address" }
    }

    const contract = new ethers.Contract(contractAddress, ERC20, provider)

    contract.on("Transfer", async (from, to, value) => {
      if (
        from.toLowerCase() === fromAddress.toLowerCase() &&
        to.toLowerCase() === adminAddress.toLowerCase()
      ) {
        console.log("CELO: Withdrawal started")
        const paidValue = ethers.formatUnits(value, 6)

        // Check if the amount paid is equal to the expected amount
        if (Number(paidValue) >= cryptoAmount) {
          await payoutMomo(phone, orderId, operator, country, amount)
        }
      }
    })
  } catch (error) {
    return error
  }
}

// Listen to Ethereum network
const listenToEthereum = async (
  fromAddress: string,
  adminAddress: string,
  asset: "USDC" | "USDT",
  phone: string,
  orderId: string,
  operator: string,
  country: string,
  amount: number,
  cryptoAmount: number
) => {
  try {
    const provider = new ethers.WebSocketProvider(ethereumWssRpc)
    const contractAddress = getContractAddress("ethereum", asset)

    if (!contractAddress) {
      // throw new Error("Invalid contract address")
      return { success: false, message: "Invalid contract address" }
    }

    const contract = new ethers.Contract(contractAddress, ERC20, provider)

    contract.on("Transfer", async (from, to, value) => {
      if (
        from.toLowerCase() === fromAddress.toLowerCase() &&
        to.toLowerCase() === adminAddress.toLowerCase()
      ) {
        console.log("ETH: Withdrawal detected")
        const paidValue = ethers.formatUnits(value, 6)

        if (Number(paidValue) >= cryptoAmount) {
          await payoutMomo(phone, orderId, operator, country, amount)
        }
      }
    })
  } catch (error) {
    return error
  }
}

// Listen to Polygon network
const listenToPolygon = async (
  fromAddress: string,
  adminAddress: string,
  asset: "USDC" | "USDT",
  phone: string,
  orderId: string,
  operator: string,
  country: string,
  amount: number,
  cryptoAmount: number
) => {
  try {
    const provider = new ethers.WebSocketProvider(polygonWssRpc)
    const contractAddress = getContractAddress("polygon", asset)

    if (!contractAddress) {
      // throw new Error("Invalid contract address")
      return { success: false, message: "Invalid contract address" }
    }

    const contract = new ethers.Contract(contractAddress, ERC20, provider)

    contract.on("Transfer", async (from, to, value) => {
      if (
        from.toLowerCase() === fromAddress.toLowerCase() &&
        to.toLowerCase() === adminAddress.toLowerCase()
      ) {
        console.log("Polygon: Withdrawal detected")
        const paidValue = ethers.formatUnits(value, 6)

        if (Number(paidValue) >= cryptoAmount) {
          await payoutMomo(phone, orderId, operator, country, amount)
        }
      }
    })
  } catch (error) {
    return error
  }
}

// Listen to Starknet network
const listenToStarknet = async (
  fromAddress: string,
  adminAddress: string,
  asset: "USDC",
  phone: string,
  orderId: string,
  operator: string,
  country: string,
  amount: number,
  cryptoAmount: number,
  queryLimit = 10
) => {
  try {
    if (asset !== "USDC") {
      return { success: false, message: "InvalidAsset" }
    }

    const passKeyData = getPassKeys(starknetId)

    if (!passKeyData.success) {
      return { success: false, message: "InvalidPassKey" }
    }

    const starknetProvider = new RpcProvider({
      nodeUrl: starknetProviderRpc,
    })

    let queryCount = 0 // Initialize query counter

    const usdcContract = new Contract(
      STRKABI as any,
      starknetUsdcContractAddress,
      starknetProvider
    )

    // Function to handle new block events
    const handleNewBlock = async () => {
      // if (queryCount >= queryLimit) {
      //   console.log("Query limit reached. Stopping further queries.")
      //   clearInterval(intervalId) // Clear the interval to stop querying
      //   return
      // }

      queryCount++ // Increment query counter

      const latestBlock = await starknetProvider.getBlock("latest")
      const keyFilter = [[num.toHex(hash.starknetKeccak("Transfer"))]]

      const eventsList = await starknetProvider.getEvents({
        address: starknetUsdcContractAddress,
        // address: adminAddress,
        from_block: { block_number: latestBlock.block_number - 9 },
        to_block: { block_number: latestBlock.block_number },
        keys: keyFilter,
        chunk_size: 10,
      })

      eventsList.events.forEach((event) => {
        const [from, to, value] = event.data

        if (
          num.cleanHex(event.from_address) ===
          num.cleanHex(starknetUsdcContractAddress)
        ) {
          const [from, to, value] = event.data

          if (
            (num.cleanHex(to) === num.cleanHex(adminAddress) ||
              num.cleanHex(to) === num.cleanHex(fromAddress)) &&
            (num.cleanHex(from) === num.cleanHex(adminAddress) ||
              num.cleanHex(from) === num.cleanHex(fromAddress))
          ) {
            console.log(
              `Transfer detected: From ${from} to ${to}, Value: ${value}`
            )
            // Perform further processing or send notifications
          }
        }
      })
    }

    // Polling for new blocks (adjust the interval as necessary)
    const intervalId = setInterval(handleNewBlock, 10000) // Check every 15 seconds
  } catch (error: any) {
    console.error("Error:", error)
    return { success: false, message: error.message }
  }
}

// Handle payout via Mobile Money (MoMo)
const payoutMomo = async (
  phone: string,
  orderId: string,
  operator: string,
  country: string,
  amount: number
) => {
  try {
    let createdCustomerKey
    let customer = await CustomerModel.findOne({ phoneNumber: phone })

    const order = await OrdersModel.findById(orderId)

    if (!order) {
      // throw new Error("InvalidOrder")
      return { success: false, message: "Invalid order" }
    }

    if (order.status === "DONE") {
      return { success: false, message: "Order already completed" }
    }

    if (!customer) {
      createdCustomerKey = await createNewKotaniCustomer(
        phone,
        orderId,
        operator
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
    // console.log("Withdraw response: ", withdrawResponse)

    if (withdrawResponse && withdrawResponse.success) {
      // throw new Error("InvalidSchema")
      await changeOrderStatusFunc(order, "DONE", "0x")
    }
  } catch (error) {
    return error
  }
}

// Get contract address based on network and asset type
const getContractAddress = (
  network: string,
  asset: "cUSD" | "USDC" | "USDT"
) => {
  switch (network) {
    case "celo":
      if (asset === "cUSD") return cUSDAddress
      if (asset === "USDC") return celoUsdcContractAddress
      if (asset === "USDT") return celoUsdtContractAddress
      break
    case "ethereum":
      if (asset === "USDC") return ethereumUsdcContractAddress
      if (asset === "USDT") return ethereumUsdtContractAddress
      break
    case "polygon":
      if (asset === "USDC") return polygonUsdcContractAddress
      if (asset === "USDT") return polygonUsdtContractAddress
      break
    default:
      return null
  }
}
