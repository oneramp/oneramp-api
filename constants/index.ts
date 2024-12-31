import dotenv from "dotenv"
import { AssetsI, Countries } from "../types"

// Load environment variables from .env file
dotenv.config()

const {
  CELO_PROVIDER_URL,
  ADMIN_WALLET_ADDRESS,
  HOW_TO_PAY_URL,
  BINANCE_STABLECOIN_RATE_URL,
  CUSD_ADDRESS,
  APP_DORMAIN,
  APP_URI,
  VERSION,
  CELO_CHAIN_ID,
  MTN_MOMO_CODE,
  AIRTEL_MOMO_CODE,
  PLATFORM_PERCENTAGE,
  COINGECKO_BTC_USD_RATE_URL,
  BINANCE_BTC_USDC_RATE_URL,
  COINGECKO_STABLECOIN_RATE_URL,
  SAFARI_MOMO_CODE,
  MTN_MERCHANT_NAME,
  AIRTEL_MERCHANT_NAME,
  SAFARICOM_MERCHANT_NAME,
  AIRTEL_KENYA_MOMO_CODE,
  AIRTEL_KENYA_MERCHANT_NAME,
  SHUKURU_BOLT_TOKEN,
  SHUKURU_BACKEND_TOKEN,
  STARKNET_ADMIN_WALLET_ADDRESS,
  POLKDOT_ADMIN_WALLET_ADDRESS,
  KOTANI_API_KEY,
  KOTANI_URL,
  KOTANI_WALLET_ID,
  KOTANI_INTEGRATOR_ID,

  KOTANI_WALLET_ID_TZ,
  KOTANI_WALLET_ID_ZAMBIA,
  KOTANI_WALLET_ID_UG,
  KOTANI_WALLET_ID_CAMEROON,

  PASS_KEY,
  STARKNET_ID,
  EVM_ID,
  KOTANI_WALLET_ID_KENYA,
  KOTANI_WALLET_ID_GHANA,
  ONERAMP_ROOT_URL,
  CELO_PROVIDER_RPC,
  CELO_USDC_CONTRACT_ADDRESS,
  CELO_USDT_CONTRACT_ADDRESS,

  POLYGON_PROVIDER_RPC,
  POLYGON_USDC_CONTRACT_ADDRESS,
  POLYGON_USDT_CONTRACT_ADDRESS,
  POLYGON_WSS_RPC,

  BASE_PROVIDER_RPC,
  BASE_WSS_RPC,
  BASE_USDC_CONTRACT_ADDRESS,

  ETHEREUM_PROVIDER_RPC,
  ETHEREUM_USDC_CONTRACT_ADDRESS,
  ETHEREUM_USDT_CONTRACT_ADDRESS,

  STARKNET_PROVIDER_RPC,
  STARKNET_USDC_CONTRACT_ADDRESS,
  STARKNET_USDT_CONTRACT_ADDRESS,
  ETHEREUM_WSS_RPC,

  CELO_WSS_RPC,

  WIDGET_SECRET,
  BLINK_GALORY_URL,
  ONERAMP_BLINK_KEY,
  PAYCREST_PAYER_ADMIN_WALLET_PK,

  BLINK_ONERAMP_BTC_WALLET_ID,
  BLINK_ONERAMP_USD_WALLET_ID,
} = process.env as Record<string, string>

export interface IfcOneNetworksAddresses {
  contract: string
  usdt: string
  stable: string
  dai: string
  "0xc0EBB770F2c9CA7eD0dDeBa58Af101695Cf1BDc1"?: string
}

export const celoProviderUrl = CELO_PROVIDER_URL as string

// Replace 'your_wallet_address' with your actual wallet address
export const adminWalletAddress = ADMIN_WALLET_ADDRESS as string

export const starknetAdminWalletAddress =
  STARKNET_ADMIN_WALLET_ADDRESS as string
export const howToPayUrl = HOW_TO_PAY_URL as string
export const polkadotAdminWalletAddress = POLKDOT_ADMIN_WALLET_ADDRESS as string

export const kotaniApiKey = KOTANI_API_KEY as string
export const kotaniUrl = KOTANI_URL as string
export const kotaniWalletId = KOTANI_WALLET_ID as string
export const kotaniWalletIdKenya = KOTANI_WALLET_ID_KENYA as string
export const kotaniWalletIdGhana = KOTANI_WALLET_ID_GHANA as string
export const kotaniWalletIdTz = KOTANI_WALLET_ID_TZ as string
export const kotaniWalletIdZambia = KOTANI_WALLET_ID_ZAMBIA as string
export const kotaniWalletIdUg = KOTANI_WALLET_ID_UG as string
export const kotaniWalletIdCameroon = KOTANI_WALLET_ID_CAMEROON as string

export const kotaniIntegratorId = KOTANI_INTEGRATOR_ID as string
export const passKey = PASS_KEY as string
export const starknetId = STARKNET_ID as string
export const evmId = EVM_ID as string
export const onerampRootUrl = ONERAMP_ROOT_URL as string
export const celoProviderRpc = CELO_PROVIDER_RPC as string
export const celoUsdcContractAddress = CELO_USDC_CONTRACT_ADDRESS as string
export const celoUsdtContractAddress = CELO_USDT_CONTRACT_ADDRESS as string
export const ethereumWssRpc = ETHEREUM_WSS_RPC as string
export const celoWssRpc = CELO_WSS_RPC as string
export const widgetSecret = WIDGET_SECRET as string

export const blinkGaloryUrl = BLINK_GALORY_URL as string
export const onerampBlinkKey = ONERAMP_BLINK_KEY as string
export const blinkOnerampBtcWalletId = BLINK_ONERAMP_BTC_WALLET_ID as string
export const blinkOnerampUsdWalletId = BLINK_ONERAMP_USD_WALLET_ID as string

export const polygonProviderRpc = POLYGON_PROVIDER_RPC as string
export const polygonUsdcContractAddress =
  POLYGON_USDC_CONTRACT_ADDRESS as string
export const polygonUsdtContractAddress =
  POLYGON_USDT_CONTRACT_ADDRESS as string

export const polygonWssRpc = POLYGON_WSS_RPC as string
export const payCrestAdminWalletPk = PAYCREST_PAYER_ADMIN_WALLET_PK as string

export const baseProviderRpc = BASE_PROVIDER_RPC as string
export const baseWssRpc = BASE_WSS_RPC as string
export const baseUsdcContractAddress = BASE_USDC_CONTRACT_ADDRESS as string

export const ethereumProviderRpc = ETHEREUM_PROVIDER_RPC as string
export const ethereumUsdcContractAddress =
  ETHEREUM_USDC_CONTRACT_ADDRESS as string
export const ethereumUsdtContractAddress =
  ETHEREUM_USDT_CONTRACT_ADDRESS as string

export const starknetProviderRpc = STARKNET_PROVIDER_RPC as string
export const starknetUsdcContractAddress =
  STARKNET_USDC_CONTRACT_ADDRESS as string

export const starknetUsdtContractAddress =
  STARKNET_USDC_CONTRACT_ADDRESS as string

export const shukuruBoltToken = SHUKURU_BOLT_TOKEN as string
export const shukuruBackendToken = SHUKURU_BACKEND_TOKEN as string
export const shukuruBackendUrl = "https://shukuru.up.railway.app/app"
export const shukuruUserId = "653f5da3c2d75f5781fdc55b"

// Replace 'token_address' with the actual address of the ERC-20 token
export const cUSDAddress = CUSD_ADDRESS
export const COINGECKO_URL =
  "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd"

export const CONVERTOR_URL = `https://open.er-api.com/v6/latest/USD`

export const binanceStableCoinRateUrl = BINANCE_STABLECOIN_RATE_URL
export const binanceBtcUsdcRateUrl = BINANCE_BTC_USDC_RATE_URL
export const coingeckoBtcUsdRateUrl = COINGECKO_BTC_USD_RATE_URL
export const coingeckoStableCoinRateUrl = COINGECKO_STABLECOIN_RATE_URL

export const mtnMomoCode = MTN_MOMO_CODE
export const airtelMomoCode = AIRTEL_MOMO_CODE
export const platformCharge = Number(PLATFORM_PERCENTAGE)

export const mainDomain = APP_DORMAIN as string
export const appUri = APP_URI as string
export const appDomain = APP_DORMAIN as string

export const MAX_EXPIRATION_TIME_MS = 4 * 60 * 60 * 1000 // 4 hours
export const codeVersion = VERSION as string

// export const celoChainId = 1
export const celoChainId = Number(CELO_CHAIN_ID)

export interface IfcAddresses {
  celo: IfcOneNetworksAddresses
  alfajores: IfcOneNetworksAddresses
  bsc: IfcOneNetworksAddresses
  bscTestnet: IfcOneNetworksAddresses
  mumbai: IfcOneNetworksAddresses
  starknet: IfcOneNetworksAddresses
}
const addresses: IfcAddresses = {
  celo: {
    contract: "0x1fC72f58a675ac93980E597cE6Da531d40b24c60",
    usdt: "0x02De4766C272abc10Bc88c220D214A26960a7e92",
    stable: "0xc0EBB770F2c9CA7eD0dDeBa58Af101695Cf1BDc1",
    dai: "0xc0EBB770F2c9CA7eD0dDeBa58Af101695Cf1BDc1",
  },
  alfajores: {
    contract: "0x1fC72f58a675ac93980E597cE6Da531d40b24c60",
    usdt: "0x02De4766C272abc10Bc88c220D214A26960a7e92",
    stable: "0xc0EBB770F2c9CA7eD0dDeBa58Af101695Cf1BDc1",
    dai: "0xc0EBB770F2c9CA7eD0dDeBa58Af101695Cf1BDc1",
  },
  bsc: {
    contract: "0x0CcB0071e8B8B716A2a5998aB4d97b83790873Fe",
    usdt: "0x02De4766C272abc10Bc88c220D214A26960a7e92",
    stable: "0xc0EBB770F2c9CA7eD0dDeBa58Af101695Cf1BDc1",
    dai: "0xc0EBB770F2c9CA7eD0dDeBa58Af101695Cf1BDc1",
  },
  bscTestnet: {
    contract: "0x9bD1Dd6A2D2d377467490D15AB2131968C1BfF09",
    usdt: "0x711f93dda8Fb716e4126E8a5249707d583E219DE",
    stable: "0x6f7434e055b8C33a59f2b1504A5d8cC197d7dE55",
    dai: "0xC435B79FD4819CC1a81c696182439cEEa7E65c9A",
  },
  mumbai: {
    contract: "0xd0a75B3e7d50683b7941b4f14Ce5F4e38B498892",
    usdt: "0xB3c6eEdd57E4eE14D1fbC0877fBa749F8c436991",
    stable: "0x758a8a69c682449DDEA8A67e25257bfa4138824e",
    dai: "0xb3D4f37dBedCbb4f91C61424a61fb85c7724914b",
  },
  starknet: {
    contract: "0xd0a75B3e7d50683b7941b4f14Ce5F4e38B498892",
    usdt: "0xB3c6eEdd57E4eE14D1fbC0877fBa749F8c436991",
    stable: "0x758a8a69c682449DDEA8A67e25257bfa4138824e",
    dai: "0xb3D4f37dBedCbb4f91C61424a61fb85c7724914b",
  },
}
export default addresses

export const dummyKYC = {
  firstName: "Alice",
  lastName: "Bob",
  middleName: "Foo",
  dateOfBirth: {
    day: "12",
    year: "1994",
    month: "4",
  },
  phoneNumber: "07037205555",
  selfieDocument: `BASE64_IMAGE`,
  address: {
    city: "Kampala",
    address1: "Bukoto SouthSide",
    address2: "Kisuule Primary School",
    postalCode: "00501",
    isoRegionCode: "UG-30",
    isoCountryCode: "UG",
  },
}

export const allowedAssets: AssetsI[] = [
  {
    id: 1,
    name: "BTC",
    network: ["lightning"],
    fees: 0.0001,
  },
  {
    id: 2,
    name: "cUSD",
    network: ["celo"],
    fees: 0.02,
  },
  {
    id: 3,
    name: "USDC",
    network: ["starknet", "celo", "ethereum", "polygon", "base"],
    fees: 0.02,
  },
  {
    id: 4,
    name: "USDT",
    network: ["starknet", "celo", "ethereum", "polygon"],
    fees: 0.02,
  },
  {
    id: 5,
    name: "USDC",
    network: ["starknet", "celo", "ethereum", "polygon", "polkadot", "base"],
    fees: 0.02,
  },
  // 1. <--- Add new assets here
]

export const supportedCountries = ["UG", "KE", "GHA", "TZ", "ZM", "NG"] //"CMR","ZM" ZAMBIA,CAMEROON

export const assetNames = ["BTC", "cUSD", "USDC", "USDT"] // 2. <--- Add new asset name here
export const networkNames = [
  "lightning",
  "celo",
  "starknet",
  "ethereum",
  "polygon",
  "polkadot",
  "base",
] // 3. <--- Add new network name here

export const supportedNetwordAssets: {
  [key: string]: string[]
} = {
  lightning: ["BTC"],
  celo: ["cUSD", "USDT", "USDC"],
  starknet: ["USDC"],
  ethereum: ["USDC", "USDT"],
  polygon: ["USDC", "USDT"],
  polkadot: ["USDC", "USDT"],
  base: ["USDC"],
} // 4. <--- Add new network asset here

export const supportedProviders: { [key: string]: string[] } = {
  uganda: ["mtn", "airtel"],
  kenya: ["safaricom", "airtel"],
  ghana: ["vodafone", "tigo"],
  tanzania: ["vodacom", "tigo"],
  zambia: ["mtn", "airtel"],
} // 5. <--- Add new country providers here

export const supportedCountriesDetails: {
  [key: string]: {
    name: string
    currency: string
    flag: string
    code: string
  }
} = {
  uganda: {
    name: "Uganda",
    currency: "UGX",
    flag: "🇺🇬",
    code: "UG",
  },
  kenya: {
    name: "Kenya",
    currency: "KES",
    flag: "🇰🇪",
    code: "KE",
  },
  ghana: {
    name: "Ghana",
    currency: "GHS",
    flag: "🇬🇭",
    code: "GHA",
  },
  tanzania: {
    name: "Tanzania",
    currency: "TZS",
    flag: "🇹🇿",
    code: "TZ",
  },
  zambia: {
    name: "Zambia",
    currency: "ZMW",
    flag: "🇿🇲",
    code: "ZM",
  },
  nigeria: {
    name: "Nigeria",
    currency: "NGN",
    flag: "🇳🇬",
    code: "NG",
  },
} // 6. <--- Add new country details here

export const mtnNumberCodes = ["31", "39", "78", "77", "76"]

export const networkAddressMap: Record<string, string> = {
  lightning: "oneramp@blink.sv",
  celo: adminWalletAddress,
  starknet: starknetAdminWalletAddress,
  ethereum: adminWalletAddress,
  polygon: adminWalletAddress,
  polkadot: polkadotAdminWalletAddress,
  base: adminWalletAddress,
} // Option 4: <--- Add new admin address here

export interface AdditionalIds {
  [key: string]: {
    merchantId: string
    name: string
  } // Country code as key and the additional ID as value
}

export interface MerchantAccountI {
  merchantId: string
  additionalIds?: AdditionalIds
  name: string
  country: Countries
  operationalCountries: Countries[] | string[]
}

export interface MerchantAccountInfo {
  [key: string]: MerchantAccountI
}

export const onerampMerchantAccounts: MerchantAccountInfo = {
  mtn: {
    merchantId: MTN_MOMO_CODE,
    name: MTN_MERCHANT_NAME,
    country: Countries.UG,
    operationalCountries: [Countries.UG, Countries.GHA, "ZM"],
  },
  airtel: {
    merchantId: AIRTEL_MOMO_CODE,
    additionalIds: {
      KE: {
        merchantId: AIRTEL_KENYA_MOMO_CODE,
        name: AIRTEL_KENYA_MERCHANT_NAME,
      },
      GHA: {
        merchantId: AIRTEL_MOMO_CODE,
        name: AIRTEL_MERCHANT_NAME,
      },
      TZ: {
        merchantId: AIRTEL_MOMO_CODE,
        name: AIRTEL_MERCHANT_NAME,
      },
      ZM: {
        merchantId: AIRTEL_MOMO_CODE,
        name: AIRTEL_MERCHANT_NAME,
      },
    },
    name: AIRTEL_MERCHANT_NAME,
    country: Countries.UG,
    operationalCountries: [
      Countries.UG,
      Countries.KE,
      Countries.GHA,
      Countries.TZ,
      "ZM",
    ],
  },
  safaricom: {
    merchantId: SAFARI_MOMO_CODE,
    name: SAFARICOM_MERCHANT_NAME,
    country: Countries.KE,
    operationalCountries: [Countries.KE],
  },
  vodafone: {
    merchantId: "VODAFONE",
    name: "VODAFONE",
    country: Countries.GHA,
    operationalCountries: [Countries.GHA],
  },
  tigo: {
    merchantId: "TIGO",
    name: "TIGO",
    country: Countries.GHA,
    operationalCountries: [Countries.GHA, Countries.TZ],
  },
  vodacom: {
    merchantId: "VODACOM",
    name: "VODACOM",
    country: Countries.TZ,
    operationalCountries: [Countries.TZ],
  },
  bank: {
    merchantId: "BANK",
    name: "BANK",
    // @ts-ignore
    country: "NG",
    operationalCountries: ["NG", Countries.KE],
  },
}

// Kotani Constants
export const kotaniSupportedCountries = ["GHA", "KE", "TZ", "UG", "ZM"] //"CMR","ZM" ZAMBIA, CAMEROON

export const kotaniCountryPrefixes: { [key: string]: string } = {
  "+233": "GHA",
  "+234": "NG",
  "+254": "KE",
  "+27": "ZA",
  "+225": "CIV",
  "+260": "ZM",
  "+237": "CMR",
  "+243": "COD",
  "+221": "SEN",
  "+255": "TZ",
  "+265": "MWI",
  "+256": "UG",
  "+20": "EG",
  "+250": "RW",
}

export const kotaniPhonePrefixes: { [key: string]: string } = {
  GHA: "+233",
  NG: "+234",
  KE: "+254",
  ZA: "+27",
  CIV: "+225",
  ZM: "+260",
  CMR: "+237",
  COD: "+243",
  SEN: "+221",
  TZ: "+255",
  MWI: "+265",
  UG: "+256",
  EG: "+20",
  RW: "+250",
}

export const kotaniGhanaNetworks = [
  "MTN",
  "AIRTEL",
  "VODAFONE",
  "TIGO",
  "ORANGE",
  "NOT_SUPPORTED",
  "ZAMTEL",
  "MEPESA",
]

export const kotaniWalletIds: { [key: string]: string } = {
  GHA: kotaniWalletIdGhana,
  KE: kotaniWalletIdKenya,
  TZ: kotaniWalletIdTz,
  ZM: kotaniWalletIdZambia,
  UG: kotaniWalletIdUg,
  CMR: kotaniWalletIdCameroon,
}

// LOCAL EXCHANGE RATES TO BE CHANGED AND STORED IN THE DATABASE
export const localExchangeRates = {
  UG: {
    buying: 3804.44,
    selling: 3620.82,
    feeRate: 0.0,
    kotaniBuyingRate: 0.04,
    kotaniSellingRate: 0.04,
  },
  KE: {
    buying: 133.15,
    selling: 127.5,
    feeRate: 0.0,
    kotaniBuyingRate: 0.025,
    kotaniSellingRate: 0.026,
  },
  GHA: {
    buying: 16.35,
    selling: 15.17,
    feeRate: 0.0,
    kotaniBuyingRate: 0.06,
    kotaniSellingRate: 0.017,
  },
  TZ: {
    buying: 2941.0,
    selling: 2866.0513,
    feeRate: 0.0,
    kotaniBuyingRate: 0.035,
    kotaniSellingRate: 0.04,
  },
  ZM: {
    buying: 26.22,
    selling: 25.12,
    feeRate: 0.0,
    kotaniBuyingRate: 0.25,
    kotaniSellingRate: 0.12,
  },
  NG: {
    buying: 1649.09,
    selling: 1643.07,
    feeRate: 0.0,
    kotaniBuyingRate: 0.25,
    kotaniSellingRate: 0.12,
  },
  // <--- Add new country exchange rates here
}

export const feeRanges = {
  KE: {
    min: 100,
    max: 100000,
  },
}

export const localProvidersRates = {
  mtn: {
    uganda: {
      5000: 100,
      60_000: 500,
      5_000_000: 1_000,
    },
    ghana: {},
  },
  airtel: {
    uganda: {
      5000: 100,
      60_000: 500,
      5_000_000: 1_000,
    },
    kenya: {
      500: 6,
      1_000: 11,
      1_500: 20,
      2_500: 30,
      3_500: 50,
      7_500: 70,
      10_000: 80,
      15_000: 90,
      20_000: 95,
      35_000: 100,
      50_000: 105,
    },
  },
}
