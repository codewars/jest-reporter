const add = (a, b) => {
  console.log(a, b);
  return a + b;
};

describe("group 1", () => {
  test("test 1", () => {
    expect(add(1, 1)).toBe(2);
  });
});
