
# How to Add a New Asset to the API

This document provides instructions on how to add a new asset to the existing API configuration.

## Step 1: Define the Asset

Add the new asset details to the `allowedAssets` array in the `types.ts` file. Each asset should have an `id`, `name`, and `network` fields defined.

Example:

```typescript
{
    id: 6,  // Increment based on the last asset's ID
    name: "NEW_ASSET_NAME",
    network: ["NETWORK1", "NETWORK2"]  // Specify the networks the asset is supported on
}
```

## Step 2: Register the Asset Name

Add the new asset's name to the `assetNames` array.

Example:

```typescript
export const assetNames = ["BTC", "cUSD", "USDC", "USDT", "NEW_ASSET_NAME"];  // Add the new asset name
```

## Step 3: Register the Network Name

If the new asset is introduced on a new network that is not already listed in the `networkNames` array, add the new network name.

Example:

```typescript
export const networkNames = [
  "lightning",
  "celo",
  "starknet",
  "ethereum",
  "polygon",
  "NEW_NETWORK_NAME"  // Add new network name if necessary
];
```

## Step 4: Map the Admin Address for the New Network

If a new network is being added, provide an admin address for the network by updating the `networkAddressMap`.

Example:

```typescript
export const networkAddressMap: Record<string, string> = {
  lightning: "oneramp@blink.sv",
  celo: "your_wallet_address",
  starknet: "your_other_wallet_address",
  NEW_NETWORK_NAME: "new_network_admin_address"  // Add new network admin address
};
```

By following these steps, you can successfully add new assets to the API, allowing for broader asset support and interoperability.
