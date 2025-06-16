import {
  reactExtension,
  useApi,
  BlockStack,
  Text,
} from '@shopify/ui-extensions-react/admin';
import {useState, useEffect} from 'react';

// The target used here must match the target used in the extension's toml file (./shopify.extension.toml)
export default reactExtension('admin.product-variant-details.configuration.render', () => <App />);

function App() {
  
  const {extension: {target}, i18n} = useApi();
  
  const productVariant = useProductVariant();
  return (
    <BlockStack>
      <Text>
        {i18n.translate('welcome', {target})}
      </Text>
      {productVariant?.productVariantComponents.map((component) =>
        <Text key={component.id}>{component.title}</Text>
      )}
    </BlockStack>
  );
}

function useProductVariant() {
  
  const {data, query} = useApi();
  const productId = data?.selected[0].id;
  const [product, setProduct] = useState(null);
  

  useEffect(() => {
    query(
      `#graphql
      query GetProductVariant($id: ID!) {
        productVariant(id: $id) {
          id
          title
          productVariantComponents(first: 100) {
            nodes {
              productVariant {
                id
                title
              }
            }
          }
        }
      }
      `,
      {variables: {id: productVariantId}}
    ).then(({data, errors}) => {
      if (errors) {
        console.error(errors);
      } else {
        
        const {productVariantComponents, ...productVariant} = data.productVariant;
        
        setProductVariant({
          ...productVariant,
          productVariantComponents: productVariantComponents.nodes.map(({productVariant}) => ({
            ...productVariant
          }))
        })
      }
    })
  }, [productVariantId, query])

  return productVariant;
}