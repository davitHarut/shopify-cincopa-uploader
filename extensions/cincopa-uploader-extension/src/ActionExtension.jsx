import {useEffect, useState} from 'react';

import {
  reactExtension,
  useApi,
  AdminAction,
  BlockStack,
  Button,
  Text,
} from '@shopify/ui-extensions-react/admin';

const TARGET = 'admin.product-details.action.render';

export default reactExtension(TARGET, () => <App />);

function App() {
  console.log(1111111)
  const {i18n, close, data} = useApi(TARGET);
  console.log({data});
  const [productTitle, setProductTitle] = useState('');

  useEffect(() => {
    (async function getProductInfo() {
      const getProductQuery = {
        query: `query Product($id: ID!) {
          product(id: $id) {
            title
          }
        }`,
        variables: {id: data.selected[0].id},
      };

      const res = await fetch("shopify:admin/api/graphql.json", {
        method: "POST",
        body: JSON.stringify(getProductQuery),
      });

      if (!res.ok) {
        console.error('Network error');
      }

      const productData = await res.json();
      console.log(productData, 'productData 111222')
      setProductTitle(productData.data.product.title);
    })();
  }, [data.selected]);
  return (
    // The AdminAction component provides an API for setting the title and actions of the Action extension wrapper.
    <AdminAction
      primaryAction={
        <Button
          onPress={() => {
            console.log('saving');
            close();
          }}
        >
          Done
        </Button>
      }
      secondaryAction={
        <Button
          onPress={() => {
            console.log('closing');
            close();
          }}
        >
          Close
        </Button>
      }
    >
      <BlockStack>
        {/* Set the translation values for each supported language in the locales directory */}
        <Text fontWeight="bold">{i18n.translate('welcome', {target: TARGET})}</Text>
        <Text>Current product: {productTitle}</Text>
      </BlockStack>
    </AdminAction>
  );
}