import { ContractKit, newKitFromWeb3 } from "@celo/contractkit"
import Web3 from "web3"
import { celoWeb3, ethereumWeb3, polygonWeb3 } from "./web3Providers"

export function getWeb3Provider(network: string): Web3 {
  switch (network) {
    case "celo":
      return celoWeb3
    case "ethereum":
      return ethereumWeb3
    case "polygon":
      return polygonWeb3
    default:
      throw new Error("UnsupportedNetwork")
  }
}

export function getKit(web3: Web3): ContractKit {
  return newKitFromWeb3(web3)
}

export function getContract(web3: Web3, address: string, abi: any) {
  return new web3.eth.Contract(abi, address)
}

export function getPassKeys(accountId: string): {
  success: boolean
  response?: string
} {
  // Mock implementation, replace with your actual implementation
  return { success: true, response: "your-private-key" }
}
