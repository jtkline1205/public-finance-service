import { ItemStack } from "./ItemStack";

const chipStack237P5 = new ItemStack({
    ONE: 5,
    TWO_FIFTY: 3,
    FIVE: 0,
    TWENTY_FIVE: 1,
    HUNDRED: 2
});

const billStack229 = new ItemStack({
    ONE: 4,
    FIVE: 3,
    TEN: 0,
    TWENTY: 3,
    FIFTY: 1,
    HUNDRED: 1
})

const billStack282 = ItemStack.generateBillStackFromTotal(282);
const billStack715 = ItemStack.generateBillStackFromTotal(715);
const billStack215 = ItemStack.generateBillStackFromTotal(215);
const chipStack745 = ItemStack.generateChipStackFromTotal(745);
const billStack817 = ItemStack.generateBillStackFromTotal(817);
const chipStack135 = ItemStack.generateChipStackFromTotal(135);
const billStack134 = ItemStack.generateBillStackFromTotal(134);
const billStack34 = ItemStack.generateBillStackFromTotal(34);
const billStack217 = ItemStack.generateBillStackFromTotal(217);

const chipStack0 = ItemStack.generateChipStackFromTotal(0);

describe("count", () => {
    it("returns the correct count", () => {
        expect(chipStack237P5.count("TWENTY_FIVE")).toEqual(1);
    });

});

describe("add", () => {
    it("adds stacks correctly", () => {
        expect(chipStack237P5.add(new ItemStack({ FIVE: 2, ONE: 1 })).count("FIVE")).toEqual(2);
        expect((billStack215.add(billStack715)).getValue()).toEqual(930);
    });
});

describe("subtract", () => {
    it("subtracts stacks correctly", () => {
        expect(chipStack237P5.subtract(new ItemStack({ FIVE: 2, ONE: 1 })).count("ONE")).toEqual(4);
        expect(billStack715.subtract(billStack215).getValue()).toEqual(500);
    });
});

describe("modify", () => {
    it("modifies the stack correctly", () => {
        expect(chipStack237P5.modify('FIVE', 4).count('FIVE')).toEqual(4);
    });
});

describe("getValue", () => {
    it("gets the stack value correctly", () => {
        expect(chipStack237P5.getValue()).toEqual(237.50);
    });
});

describe("multiplyStackByFactor", () => {
    it("multiplies by factors correctly", () => {
        expect(chipStack237P5.multiplyStackByFactor(1.5).getValue()).toEqual(353);
        expect(chipStack135.multiplyStackByFactor(1.5).getValue()).toEqual(202.5);
        expect(chipStack237P5.multiplyStackByFactor(2).getValue()).toEqual(475);
        expect(chipStack135.multiplyStackByFactor(3).getValue()).toEqual(405);
    });
});

describe("findBillCombination", () => {
    it("finds a valid combination", () => {
        expect(billStack229.findBillCombination(52)).toEqual(new ItemStack({ FIFTY: 1, ONE: 2 }));
        const billCombination = billStack282.findBillCombination(61);
        expect(billCombination?.count("FIFTY")).toEqual(1);
        expect(billCombination?.count("TEN")).toEqual(1);
        expect(billCombination?.count("ONE")).toEqual(1);
    });
});

describe("generateChipStackFromTotal", () => {
    it("generates correctly", () => {
        expect(chipStack745.count("ONE")).toEqual(0);
        expect(chipStack745.count("FIVE")).toEqual(4);
        expect(chipStack745.count("TWENTY_FIVE")).toEqual(1);
        expect(chipStack745.count("HUNDRED")).toEqual(7);

        expect(chipStack0.count("HUNDRED")).toEqual(0);
        expect(chipStack0.count("FIVE")).toEqual(0);
    });
});

describe("generateBillStackFromTotal", () => {
    it("generates correctly", () => {
        expect(billStack817.count("HUNDRED")).toEqual(8);
        expect(billStack817.count("TEN")).toEqual(1);
        expect(billStack817.count("FIVE")).toEqual(1);
        expect(billStack817.count("ONE")).toEqual(2);
    });
});

describe("contains", () => {
    it("checks containment correctly", () => {
        expect(billStack715.contains(billStack215)).toEqual(true);
        expect(billStack715.contains(billStack229)).toEqual(false);
        expect(billStack134.contains(billStack34)).toEqual(true);
        expect(billStack134.contains(billStack217)).toEqual(false);
    });
});








