import {
  ChipCounts,
  ALL_DENOMINATIONS,
  CHIP_DENOMINATION_LIST_DESCENDING,
  BILL_DENOMINATION_LIST_DESCENDING,
  ChipDenomination
} from "../constants/denominations";

export class ItemStack {
  private items: Record<string, number>;

  constructor(initialItems: Record<string, number> = {}) {
    this.items = { ...initialItems };
  }

  static chipStackFromChipCounts(counts: ChipCounts): ItemStack {
    let chipStack = ItemStack.emptyChipStack();

    // chipStack = chipStack.modify('ONE', counts.ONE);
    // chipStack = chipStack.modify('TWO_FIFTY', counts.TWO_FIFTY);
    // chipStack = chipStack.modify('FIVE', counts.FIVE);
    // chipStack = chipStack.modify('TWENTY_FIVE', counts.TWENTY_FIVE);
    // chipStack = chipStack.modify('HUNDRED', counts.HUNDRED);

    for (const denomination of CHIP_DENOMINATION_LIST_DESCENDING) {
      chipStack = chipStack.modify(denomination, counts[denomination]);
    }

    return chipStack;
  }

  static emptyChipStack(): ItemStack {
    return new ItemStack({
      ONE: 0,
      TWO_FIFTY: 0,
      FIVE: 0,
      TWENTY_FIVE: 0,
      HUNDRED: 0
    });
  }

  static emptyBillStack(): ItemStack {
    return new ItemStack({
      ONE: 0,
      FIVE: 0,
      TEN: 0,
      TWENTY: 0,
      FIFTY: 0,
      HUNDRED: 0
    });
  }

  findBillCombination(total: number): ItemStack | null {
    const itemList: string[] = [];
    for (const denomination of BILL_DENOMINATION_LIST_DESCENDING) {
      const count = this.items[denomination] || 0;
      for (let i = 0; i < count; i++) {
        itemList.push(denomination);
      }
    }

    const combination = this.findItemCombination(total, itemList);

    if (combination === null) {
      return null;
    } else {
      let stack = new ItemStack();
      for (const item of combination) {
        stack = stack.modify(item, 1);
      }
      return stack;
    }
  }

  private findItemCombination(target: number, items: string[]): string[] | null {
    if (target === 0) {
      return [];
    } else if (target < 0 || items.length === 0) {
      return null;
    } else {
      const item = items[0];
      const newTarget = target - ALL_DENOMINATIONS[item];
      const withItem = this.findItemCombination(newTarget, items.slice(1));

      if (withItem !== null) {
        withItem.push(item);
        return withItem;
      } else {
        const withoutItem = this.findItemCombination(target, items.slice(1));
        return withoutItem;
      }
    }
  }

  count(denomination: string): number {
    return this.items[denomination] ?? 0;
  }

  add(stackToAdd: ItemStack): ItemStack {
    const newItems: Record<string, number> = { ...this.items };
    for (const denom of Object.keys(stackToAdd.items) as string[]) {
      newItems[denom] = (newItems[denom] ?? 0) + (stackToAdd.items[denom] ?? 0);
    }
    return new ItemStack(newItems);
  }

  subtract(stackToSubtract: ItemStack): ItemStack {
    const newItems: Record<string, number> = { ...this.items };
    for (const denom of Object.keys(stackToSubtract.items) as string[]) {
      newItems[denom] = (newItems[denom] ?? 0) - (stackToSubtract.items[denom] ?? 0);
      if (newItems[denom] < 0) {
        newItems[denom] = 0;
      }
    }
    return new ItemStack(newItems);
  }

  modify(denomination: string, quantity: number): ItemStack { // mixing functional here
    const newItems = { ...this.items };
    newItems[denomination] = Math.max((newItems[denomination] ?? 0) + quantity, 0);
    return new ItemStack(newItems);
  }

  getValue(): number {
    let sum = 0;
    for (const denom of Object.keys(this.items)) {
      sum = sum + (ALL_DENOMINATIONS[denom] * this.items[denom]);
    }
    return sum;
  }

  isEmpty(): boolean {
    return this.getValue() == 0;
  }

  contains(stack: ItemStack): boolean {
    for (const denom of Object.keys(stack.items)) {
      const stackQty = stack.items[denom] ?? 0;
      const myQty = this.items[denom] ?? 0;

      if (stackQty > myQty) {
        return false;
      }
    }
    return true;
  }

  toObject(): Readonly<Record<string, number>> {
    return { ...this.items };
  }

  multiplyStackByFactor(factor: number): ItemStack {
    const newMap = { ...this.items };

    if (factor === 1.5) {
      for (const [denomination, operandChips] of Object.entries(this.items)) {
        if (operandChips > 0) {
          const halfMap: Record<string, [string, number][]> = {
            "HUNDRED": [["TWENTY_FIVE", 2]],
            "TWENTY_FIVE": [["FIVE", 2], ["TWO_FIFTY", 1]],
            "FIVE": [["TWO_FIFTY", 1]],
            "TWO_FIFTY": [["ONE", 1]],
            "ONE": [],
          };

          const halfList = halfMap[denomination] || [];

          for (const [denom, quantity] of halfList) {
            const originalQuantity = newMap[denom] || 0;
            newMap[denom] = originalQuantity + (quantity * operandChips);
          }
        }
      }
    } else {
      for (const denomination of Object.keys(newMap)) {
        newMap[denomination] = Math.floor((newMap[denomination] || 0) * factor);
      }
    }

    return new ItemStack(newMap);
  }

  getItems(): Record<string, number> {
    return { ...this.items };
  }


  static generateBillStackFromTotal(total: number): ItemStack {
    let billStack = ItemStack.emptyBillStack();
    let remainder = total;

    for (const denomination of BILL_DENOMINATION_LIST_DESCENDING) {
      const value = ALL_DENOMINATIONS[denomination];
      const numberOfBills = Math.floor(remainder / value);
      remainder = remainder % value;
      billStack = billStack.modify(denomination, numberOfBills);
    }

    return billStack;
  }

  static generateChipStackFromTotal(total: number): ItemStack {
    let chipStack = ItemStack.emptyChipStack();
    let remainder = total;

    for (const denomination of CHIP_DENOMINATION_LIST_DESCENDING) {
      const value = ALL_DENOMINATIONS[denomination];
      const numberOfChips = Math.floor(remainder / value);
      remainder = remainder % value;
      chipStack = chipStack.modify(denomination, numberOfChips);
    }

    return chipStack;
  }


}

