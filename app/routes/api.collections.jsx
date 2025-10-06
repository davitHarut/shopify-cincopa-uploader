import { json } from '@remix-run/node';
import { authenticate } from "../shopify.server";

export const loader = async ({ request }) => {
  const { admin } = await authenticate.admin(request);

  const response = await admin.graphql(
    `#graphql
    query GetCollections($first: Int!) {
      collections(first: $first) {
        edges {
          node {
            id
            title
            handle
            updatedAt
          }
        }
      }
    }`,
    { variables: { first: 100 } }
  );

  const jsonResponse = await response.json();

  if (jsonResponse.errors) {
    return json({ error: jsonResponse.errors }, { status: 500 });
  }

  const collections = jsonResponse.data.collections.edges
    .map(edge => edge.node)
    .filter(col => col.handle === "cincopa-assets");
  return json(collections);
};
