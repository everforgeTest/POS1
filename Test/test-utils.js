function assertEqual(a, b, msg) {
  if (a !== b) throw new Error(`AssertEqual failed: ${msg} (${a} !== ${b})`);
}

function assertSuccessResponse(res, msg) {
  if (!res || !res.success) throw new Error(`AssertSuccess failed: ${msg}`);
}

function assertErrorResponse(res, code, msg) {
  if (!res || !res.error || res.error.code !== code) {
    throw new Error(`AssertError failed: ${msg}`);
  }
}

module.exports = { assertEqual, assertSuccessResponse, assertErrorResponse };
