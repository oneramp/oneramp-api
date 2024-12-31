export interface IfcOneNetworksAddresses {
  contract: string
  usdt: string
  stable: string
  dai: string
  "0xc0EBB770F2c9CA7eD0dDeBa58Af101695Cf1BDc1"?: string
}

export interface IfcAddresses {
  celo: IfcOneNetworksAddresses
  alfajores: IfcOneNetworksAddresses
  bsc: IfcOneNetworksAddresses
  bscTestnet: IfcOneNetworksAddresses
  mumbai: IfcOneNetworksAddresses
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
    contract: "0x9CCC5B8A082bC9A1fA7Cb9338B93828Cd8e37FBA",
    usdt: "0x0A50229182a25cFf077AFc6DcB168348f7d917dd",
    stable: "0x758a8a69c682449DDEA8A67e25257bfa4138824e",
    dai: "0xb3D4f37dBedCbb4f91C61424a61fb85c7724914b",
  },
}
export default addresses
