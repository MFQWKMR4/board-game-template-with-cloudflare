
type MatchFn<T extends string | number | symbol, R> = (value: T, cases: Record<T, R>, defaultCase: R) => R;

export const match: MatchFn<any, any> = (value, cases, defaultCase) =>
    value in cases ? cases[value] : defaultCase;

// 使用例
// const result = match("b", {
//     a: "Apple",
//     b: "Banana",
//     c: "Cherry",
// }, "Unknown"); // "Banana"

// const numberResult = match(1, {
//     1: "One",
//     2: "Two",
//     3: "Three",
// }, "Unknown"); // "One"
