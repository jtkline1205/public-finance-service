import { ChipDenomination, BillDenomination, CHIP_DENOMINATIONS, BILL_DENOMINATIONS } from "./types";
import { ItemStack } from "./ItemStack";

const chipDenominationToColumnMap: Record<ChipDenomination, string> = {
  ONE: "chip_ones",
  TWO_FIFTY: "chip_twofifties",
  FIVE: "chip_fives",
  TWENTY_FIVE: "chip_twentyfives",
  HUNDRED: "chip_hundreds",
};

const billDenominationToColumnMap: Record<BillDenomination, string> = {
  ONE: "ones",
  FIVE: "fives",
  TEN: "tens",
  TWENTY: "twenties",
  FIFTY: "fifties",
  HUNDRED: "hundreds",
};

// export async function getChipStackFromWallet(walletId: string): Promise<ItemStack> {
//   const chipStack = ItemStack.emptyChipStack();

//   for (const denom of CHIP_DENOMINATIONS) {
//     const column = chipDenominationToColumnMap[denom];
//     const newChips = await fetchColumn("wallets", column, "wallet_id", walletId);
//     chipStack.modify(denom, newChips);
//   }

//   return chipStack;
// }

// export async function getChipQuantityFromWallet(denom: ChipDenomination, walletId: string): Promise<number> {
//   const column = chipDenominationToColumnMap[denom];
//   const chips = await fetchColumn("wallets", column, "wallet_id", walletId);

//   return chips;
// }

// export async function getBillStackFromWallet(walletId: string): Promise<ItemStack> {
//   const billStack = new ItemStack({
//     ONE: 0,
//     FIVE: 0,
//     TEN: 0,
//     TWENTY: 0,
//     FIFTY: 0,
//     HUNDRED: 0,
//   });

//   for (const denom of BILL_DENOMINATIONS) {
//     const column = billDenominationToColumnMap[denom];
//     const newBills = await fetchColumn("wallets", column, "wallet_id", walletId);
//     billStack.modify(denom, newBills);
//   }

//   return billStack;
// }


