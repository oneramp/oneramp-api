import { newKitFromWeb3 } from "@celo/contractkit"
import crypto from "crypto"
import { Request, Response } from "express"
import { Account, Contract, RpcProvider, cairo, constants } from "starknet"
import { v4 as uuidv4 } from "uuid"
import Web3 from "web3"
import ERC20ABI from "../../abi.json"
import {
  baseProviderRpc,
  baseUsdcContractAddress,
  celoProviderRpc,
  celoUsdcContractAddress,
  celoUsdtContractAddress,
  ethereumProviderRpc,
  ethereumUsdcContractAddress,
  ethereumUsdtContractAddress,
  evmId,
  passKey,
  payCrestAdminWalletPk,
  polygonProviderRpc,
  polygonUsdcContractAddress,
  polygonUsdtContractAddress,
  starknetAdminWalletAddress,
  starknetId,
  starknetProviderRpc,
  starknetUsdcContractAddress,
  starknetUsdtContractAddress,
} from "../../constants"
import STRKABI from "../../STRK.json"
import { getBlinkBalance, sendBlinkPayment } from "./blink"

// Ensure the ABI is correctly formatted and loaded

const web3 = new Web3(celoProviderRpc)
const kit = newKitFromWeb3(web3)

export const payOutCrypto = async (
  address: string,
  amount: string,
  network:
    | "celo"
    | "ethereum"
    | "lightning"
    | "polygon"
    | "starknet"
    | "polkadot"
    | "base",
  asset: "cUSD" | "USDT" | "USDC" | "BTC"
) => {
  try {
    let evmAccountId

    if (network === "lightning") {
      // Blink network
      return await sendBlinkSats(amount, address)
    }

    if (network === "starknet") {
      evmAccountId = starknetId
    } else if (network !== "polkadot") {
      evmAccountId = evmId
    } else {
      // throw new Error("UnsupportedNetwork")
      return { success: false, message: "UnsupportedNetwork" }
    }

    if (network === "celo") {
      return await handleCeloTransfer(
        address,
        amount,
        asset as "cUSD" | "USDC" | "USDT"
      )
    }

    if (network === "starknet") {
      return await handleStarknetTransfer(address, amount, asset as "USDC")
    }

    // If the transactions done are evm chains
    const providerRpcMap: any = {
      ethereum: ethereumProviderRpc,
      polygon: polygonProviderRpc,
      base: baseProviderRpc,
      // Add more networks as needed
    }

    const usdcContractAddressMap: any = {
      ethereum: ethereumUsdcContractAddress,
      polygon: polygonUsdcContractAddress,
      base: baseUsdcContractAddress,
      // Add more networks as needed
    }

    const usdtContractAddressMap: any = {
      ethereum: ethereumUsdtContractAddress,
      polygon: polygonUsdtContractAddress,
      // Add more networks as needed
    }

    return await handleEvmTransfer(
      address,
      amount,
      providerRpcMap[network],
      usdcContractAddressMap[network],
      usdtContractAddressMap[network],
      asset as "USDC" | "USDT"
    )
  } catch (error) {
    return { success: false, message: error }
  }
}

// Celo Payout function ->
const handleCeloTransfer = async (
  address: string,
  amount: string,
  asset: "cUSD" | "USDC" | "USDT"
) => {
  try {
    const cUSDcontract = await kit.contracts.getStableToken()
    const passKeyData = getPassKeys(evmId)

    if (!passKeyData.success) {
      // throw new Error("InvalidPassKey")
      return { success: false, message: "InvalidPassKey" }
    }

    const account = web3.eth.accounts.privateKeyToAccount(
      passKeyData.response as string
    )
    kit.connection.addAccount(account.privateKey)
    // @ts-ignore
    kit.defaultAccount = account.address

    let amountInWei

    if (asset === "cUSD") {
      const amountString = amount.toString()
      amountInWei = kit.web3.utils.toWei(amountString, "ether")
    } else {
      const amountString = parseFloat(amount).toFixed(6).toString()
      amountInWei = Web3.utils.toWei(amountString, "mwei")
    }

    let contractAddress

    if (asset === "cUSD") {
      contractAddress = cUSDcontract.address
    } else if (asset === "USDC") {
      contractAddress = celoUsdcContractAddress
    } else if (asset === "USDT") {
      contractAddress = celoUsdtContractAddress
    } else {
      // throw new Error("InvalidAsset")
      return { success: false, message: "InvalidAsset" }
    }

    const contract = new kit.web3.eth.Contract(ERC20ABI as any, contractAddress)

    const txResult = await contract.methods
      .transfer(address, amountInWei)
      .send({ from: account.address })
    return txResult.transactionHash
  } catch (error) {
    return { success: false, message: error }
  }
}

// STARKNET TRANSFER
const handleStarknetTransfer = async (
  address: string,
  amount: string,
  asset: "USDC" | "USDT"
) => {
  try {
    const passKeyData = getPassKeys(starknetId)

    if (!passKeyData.success) {
      // throw new Error("InvalidPassKey")
      return { success: false, message: "InvalidPassKey" }
    }

    const starknetProvider = new RpcProvider({
      nodeUrl: starknetProviderRpc,
    })

    const account = new Account(
      starknetProvider,
      starknetAdminWalletAddress,
      passKeyData.response as string,
      undefined,
      constants.TRANSACTION_VERSION.V3
    )

    // const amountInUnits = parseFloat(amount).toFixed(6).toString() // Adjust the amount conversion as per StarkNet's requirement
    // const amountInWei = Web3.utils.toWei(amountInUnits, "mwei")

    const parseAmount = Number(amount)

    // Convert the amount to the smallest unit for USDC (assuming 6 decimal places) and round it to an integer
    const feltAmount = cairo.uint256(BigInt(Math.round(parseAmount * 10 ** 6)))

    const contractAddress =
      asset === "USDC"
        ? starknetUsdcContractAddress
        : starknetUsdtContractAddress

    const usdcContract = new Contract(
      STRKABI as any,
      contractAddress,
      starknetProvider
    )

    usdcContract.connect(account)

    console.log(`Invoke Tx - Transfer  tokens to usdc contract...`)

    const txCall = await usdcContract.populate("transfer", {
      recipient: address,
      amount: feltAmount,
    })

    // const maxQtyGasAuthorized = BigInt(1800) // max quantity of gas authorized
    // const maxPriceAuthorizeForOneGas = BigInt(28840) * BigInt(10) ** BigInt(9)

    const { transaction_hash: transferTxHash } = await account.execute(txCall)

    console.log(`Waiting for Tx to be Accepted on Starknet - Transfer...`)
    await starknetProvider.waitForTransaction(transferTxHash)

    console.log(`Tx Accepted on Starknet - Transfer...`, transferTxHash)

    if (
      transferTxHash === undefined ||
      transferTxHash === "" ||
      !transferTxHash
    ) {
      // throw new Error("TransferFailed")
      return { success: false, message: "TransferFailed" }
    }

    return transferTxHash
  } catch (err: any) {
    return {
      success: false,
      message: err,
    }
  }
}

// EVM TRANSFER
const handleEvmTransfer = async (
  address: string,
  amount: string,
  providerRpc: string,
  usdcContractAddress: string,
  usdtContractAddress: string,
  asset: "USDC" | "USDT"
) => {
  try {
    const passKeyData = getPassKeys(evmId)

    if (!passKeyData.success) {
      return { success: false, message: "InvalidPassKey" }
    }

    const web3Provider = new Web3(providerRpc)

    const account = web3Provider.eth.accounts.privateKeyToAccount(
      passKeyData.response as string
    )

    web3Provider.eth.accounts.wallet.add(account)
    web3Provider.eth.defaultAccount = account.address

    const contractAddress =
      asset === "USDC" ? usdcContractAddress : usdtContractAddress

    const contract = new web3Provider.eth.Contract(
      ERC20ABI as any,
      contractAddress
    )

    const amountString = parseFloat(amount).toFixed(6).toString()
    const amountInWei = Web3.utils.toWei(amountString, "mwei") // This is correct for USDC/USDT with 6 decimals

    // Check balance and allowance
    // const allowance = await contract.methods
    //   .allowance(account.address, address)
    //   .call()

    // // If allowance is insufficient, approve the required amount
    // if (allowance <= amountInWei) {
    //   console.log("Approving allowance")
    //   await contract.methods
    //     .approve(address, amountInWei)
    //     .send({ from: account.address })
    // }

    // Get the current gas price from the network
    const gasPrice = await web3Provider.eth.getGasPrice()

    // Estimate gas limit
    const gasLimit = await contract.methods
      .transfer(address, amountInWei)
      .estimateGas({ from: account.address })

    const increasedGasLimit = Math.ceil(gasLimit * 1.2) // Increase by 20%

    const nonce = await web3Provider.eth.getTransactionCount(
      account.address,
      "pending"
    )

    // Send the transaction with the correct gas price and gas limit
    const txResult = await contract.methods
      .transfer(address, amountInWei)
      .send({
        from: account.address,
        gas: increasedGasLimit,
        gasPrice: gasPrice, // Setting gas price
        nonce,
      })

    if (!txResult.transactionHash) {
      return { success: false, message: "TransferFailed" }
    }

    return txResult.transactionHash
  } catch (error) {
    return { success: false, message: error }
  }
}

// LIGHTING TRANSFER
export const sendBlinkSats = async (amount: string, lnAddress: string) => {
  try {
    // First, get the balance of the wallet
    const wallets = await getBlinkBalance()

    if (!wallets.success) {
      return { success: false, message: wallets.message }
    }

    const satsWallet = wallets.response[0]

    // Check if the amount is greater than the wallet balance
    if (parseInt(amount) > parseInt(satsWallet.balance)) {
      return {
        success: false,
        message: "Amount is greater than the wallet balance",
      }
    }

    const payment = await sendBlinkPayment(amount, lnAddress)

    if (!payment.success) {
      return { success: true, message: payment.message }
    }

    const txId = uuidv4()

    return txId
  } catch (error: any) {
    return { success: false, message: error }
  }
}

// These are password encryption functions...
// Express endpoint for decryption
export const getPassKeys = (textPassKey: string) => {
  try {
    const adminPassword = passKey
    const textToDecrypt = textPassKey

    const decryptedText = decryptText(textToDecrypt, adminPassword)

    return { success: true, response: decryptedText }
  } catch (error) {
    return {
      success: false,
    }
  }
}

// Function to encrypt text
const encryptText = (text: string, password: string): string => {
  const key = crypto.scryptSync(password, "salt", 32) // Generate a key from the password
  const iv = crypto.randomBytes(16) // Initialization vector
  const cipher = crypto.createCipheriv("aes-256-cbc", key, iv)

  let encrypted = cipher.update(text, "utf8", "hex")
  encrypted += cipher.final("hex")

  return `${iv.toString("hex")}:${encrypted}`
}

// Function to decrypt text
const decryptText = (encryptedText: string, password: string): string => {
  const [ivHex, encrypted] = encryptedText.split(":")

  const key = crypto.scryptSync(password, "salt", 32) // Generate a key from the password
  const iv = Buffer.from(ivHex, "hex") // Convert IV back to buffer
  const decipher = crypto.createDecipheriv("aes-256-cbc", key, iv)

  let decrypted = decipher.update(encrypted, "hex", "utf8")
  decrypted += decipher.final("utf8")

  return decrypted
}

export const bcryptAccess = async (req: Request, res: Response) => {
  try {
    const adminPassword = passKey
    const textToEncrypt = req.body.passKey

    const encryptedText = encryptText(textToEncrypt, adminPassword)

    return res.status(200).json({ encryptedText })
  } catch (error) {
    return res.status(500).json({ error: error })
  }
}

// Express endpoint for decryption
export const bcryptAccessRead = (req: Request, res: Response) => {
  try {
    const adminPassword = passKey
    const textToDecrypt = req.body.passKey

    const decryptedText = decryptText(textToDecrypt, adminPassword)

    return res.status(200).json({ decryptedText })
  } catch (error) {
    return res.status(500).json({ error: error })
  }
}

export const payCrestPayCrypto = async (address: string, amount: string) => {
  // const passKeyData = getPassKeys(evmId)
  const passKeyData = {
    success: true,
    response: payCrestAdminWalletPk,
  }

  if (!passKeyData.success) {
    return { success: false, message: "InvalidPassKey" }
  }

  const providerRpc = polygonProviderRpc

  const web3Provider = new Web3(providerRpc)

  const account = web3Provider.eth.accounts.privateKeyToAccount(
    passKeyData.response as string
  )

  web3Provider.eth.accounts.wallet.add(account)
  web3Provider.eth.defaultAccount = account.address

  const contractAddress = polygonUsdcContractAddress

  const contract = new web3Provider.eth.Contract(
    ERC20ABI as any,
    contractAddress
  )

  const amountString = parseFloat(amount).toFixed(6).toString()
  const amountInWei = Web3.utils.toWei(amountString, "mwei") // This is correct for USDC/USDT with 6 decimals

  // Get the current gas price from the network
  const gasPrice = await web3Provider.eth.getGasPrice()

  // Estimate gas limit
  const gasLimit = await contract.methods
    .transfer(address, amountInWei)
    .estimateGas({ from: account.address })

  const increasedGasLimit = Math.ceil(gasLimit * 1.2) // Increase by 20%

  const nonce = await web3Provider.eth.getTransactionCount(
    account.address,
    "pending"
  )

  // Send the transaction with the correct gas price and gas limit
  const txResult = await contract.methods.transfer(address, amountInWei).send({
    from: account.address,
    gas: increasedGasLimit,
    gasPrice: gasPrice, // Setting gas price
    nonce,
  })

  return txResult.transactionHash
}
