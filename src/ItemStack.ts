export class ItemStack {
  private items: Record<string, number>;

  private static readonly BILL_DENOMINATION_LIST_DESCENDING = [
    "HUNDRED", "FIFTY", "TWENTY", "TEN", "FIVE", "ONE"
  ] as const;

  private static readonly CHIP_DENOMINATION_LIST_DESCENDING = [
    "HUNDRED", "TWENTY_FIVE", "FIVE", "TWO_FIFTY", "ONE"
  ] as const;

  private static resource_name_map: Record<string, number> = {
    ZERO: 0.0,
    ONE: 1.0,
    TWO_FIFTY: 2.50,
    FIVE: 5.0,
    TEN: 10.0,
    TWENTY: 20.0,
    TWENTY_FIVE: 25.0,
    FIFTY: 50.0,
    HUNDRED: 100.0
  }

  constructor(initialItems: Record<string, number> = {}) {
    this.items = { ...initialItems };
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
    for (const denomination of ItemStack.BILL_DENOMINATION_LIST_DESCENDING) {
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
      const newTarget = target - ItemStack.resource_name_map[item];
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

  modify(denomination: string, quantity: number): ItemStack {
    const newItems = { ...this.items };
    newItems[denomination] = Math.max((newItems[denomination] ?? 0) + quantity, 0);
    return new ItemStack(newItems);
  }

  getValue(): number {
    let sum = 0;
    for (const denom of Object.keys(this.items)) {
      sum = sum + (ItemStack.resource_name_map[denom] * this.items[denom]);
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

    for (const denomination of ItemStack.BILL_DENOMINATION_LIST_DESCENDING) {
      const value = ItemStack.resource_name_map[denomination];
      const numberOfBills = Math.floor(remainder / value);
      remainder = remainder % value;
      billStack = billStack.modify(denomination, numberOfBills);
    }

    return billStack;
  }

  static generateChipStackFromTotal(total: number): ItemStack {
    let chipStack = ItemStack.emptyChipStack();
    let remainder = total;

    for (const denomination of ItemStack.CHIP_DENOMINATION_LIST_DESCENDING) {
      const value = ItemStack.resource_name_map[denomination];
      const numberOfChips = Math.floor(remainder / value);
      remainder = remainder % value;
      chipStack = chipStack.modify(denomination, numberOfChips);
    }

    return chipStack;
  }


}

