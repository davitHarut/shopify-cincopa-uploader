import { authenticate } from "../shopify.server";
import { createSelfGeneratedTempTokenV3getTempAPIKeyV2 } from "../utils/createTempTokenV3.js";

export async function getCincopaTempToken({ request }) {
  await authenticate.admin(request);

  const CINCOPA_API_TOKEN = process.env.CINCOPA_API_TOKEN;

  if (!CINCOPA_API_TOKEN) {
    throw new Error("Empty parent_token not allowed");
  }

  const expire = new Date(Date.now() + 10 * 60 * 1000);

  const tempToken = createSelfGeneratedTempTokenV3getTempAPIKeyV2(
    CINCOPA_API_TOKEN,
    expire
  );
  return { temp_token: tempToken, expire: expire.toISOString() };
}
