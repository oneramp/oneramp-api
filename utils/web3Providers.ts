import Web3 from "web3"
import { newKitFromWeb3 } from "@celo/contractkit"
import {
  celoProviderRpc,
  ethereumProviderRpc,
  polygonProviderRpc,
} from "../constants"

export const celoWeb3 = new Web3(celoProviderRpc)
export const kit = newKitFromWeb3(celoWeb3)

export const ethereumWeb3 = new Web3(ethereumProviderRpc)
export const polygonWeb3 = new Web3(polygonProviderRpc)
