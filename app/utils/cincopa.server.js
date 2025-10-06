import { authenticate } from "../shopify.server";

// This function ONLY runs on the server.
export async function getCincopaTempToken({ request }) {
    // We still authenticate for security, but we don't return an HTTP response yet.
    await authenticate.admin(request); 

    const CINCOPA_API_TOKEN = process.env.CINCOPA_API_TOKEN;

    if (!CINCOPA_API_TOKEN) {
        console.error("Cincopa API token is not configured in .env file.");
        // Throw an error or return a structured error object
        throw new Error("Application is not configured correctly.");
    }

    const cincopaUrl = `https://api.cincopa.com/v2/token.get_temp.json?api_token=${CINCOPA_API_TOKEN}&ttl=600`;

    try {
        const response = await fetch(cincopaUrl);

        if (!response.ok) {
            const errorData = await response.json();
            console.error("Cincopa API Error:", errorData);
            throw new Error("Failed to get token from Cincopa.");
        }
        
        // Return the raw data object, not a Remix Response, so it's easy to use.
        return await response.json(); 

    } catch (error) {
        console.error("Error fetching Cincopa temp token:", error);
        throw new Error("Failed to fetch temporary token due to a server error.");
    }
}