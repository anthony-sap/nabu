import robots from "../robots";

describe("robots", () => {
  it("should return correct robots configuration", () => {
    const result = robots();

    expect(result).toEqual({
      rules: {
        userAgent: "*",
        allow: "/",
      },
    });
  });
});
