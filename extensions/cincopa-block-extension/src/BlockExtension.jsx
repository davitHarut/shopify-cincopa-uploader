import {
  reactExtension,
  useApi,
  AdminBlock,
  BlockStack,
  Link,
  Text,
  Button,
} from '@shopify/ui-extensions-react/admin';
import {useState, useEffect} from 'react';

// The target used here must match the target used in the extension's toml file (./shopify.extension.toml)
const TARGET = 'admin.product-details.block.render';

export default reactExtension(TARGET, () => <App />);

function App() {
  // The useApi hook provides access to several useful APIs like i18n and data.
  const {i18n, data} = useApi(TARGET);
  console.log({data});
  const product = useProduct();
  const productId = data?.selected?.[0]?.id?.split("/")?.pop();

  function useProduct() {
    
    const {data, query} = useApi();
    const productId = data?.selected[0].id;
    const [product, setProduct] = useState(null);
  
    useEffect(() => {
      query(
        `#graphql
        query GetProduct($id: ID!) {
          product(id: $id) {
            id
            title

            metafield(namespace: "cincopa", key: "cincopa_asset_rid") {
              id
              namespace
              key
              value
              type
            }

            bundleComponents(first: 100) {
              nodes {
                componentProduct {
                  id
                  title
                }
              }
            }
          }
        }
        `,
        {variables: {id: productId}}
      ).then(({data, errors}) => {
        if (errors) {
          console.error(errors);
        } else {
          
          const {bundleComponents, ...product} = data.product;
          
          setProduct({
            ...product,
            bundleComponents: bundleComponents.nodes.map(({componentProduct}) => ({
              ...componentProduct
            }))
          })
        }
      })
    }, [productId, query]);
  
    return product;
  }

  return (
    <AdminBlock title="Cincopa Asset">
      <BlockStack>
        <Link
          to={
            product?.metafield?.value
              ? `/?productId=${productId}&assetRid=${product.metafield.value}`
              : `/?productId=${productId}`
          }
          rel="noopener noreferrer"
        >
          Edit Cincopa Asset
        </Link>
      </BlockStack>
    </AdminBlock>
  );
}