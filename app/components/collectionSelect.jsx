import { useEffect, useState } from "react";
import {
  InlineStack,
  Select,
  Banner,
  Box,
  Text as PolarisText,
} from "@shopify/polaris";


export default function CollectionSelect({ onSelect }) {
  const [collections, setCollections] = useState([]);
  const [selectedId, setSelectedId] = useState("");

  useEffect(() => {
    fetch("/api/collections")
      .then((res) => res.json())
      .then((data) => {
        setCollections(data);

        if (data.length > 0) {
          const defaultId = data[0].id;
          setSelectedId(defaultId);
          onSelect(defaultId);
        }
      });
  }, []);

  const handleChange = (value) => {
    setSelectedId(value);
    onSelect(value);
  };

  return (
    <Box>
        {/* <Banner
          title="Warning"
          status="warning"
        >
          Products will be saved in the <strong>Cincopa assets</strong> collection.
          Please create this collection first in Shopify Admin before proceeding.
        </Banner> */}

        <Box paddingBlockStart="400" paddingBlockEnd="600">
            <InlineStack align="start" gap="300" wrap={false}>
                <InlineStack align="center">
                    <PolarisText as="label" variant="bodyMd" fontWeight="medium">
                    Collection:
                    </PolarisText>
                </InlineStack>
                <Box width="50%">
                    <Select
                    id="collection"
                    options={[
                        { label: "-- Choose a collection --", value: "" },
                        ...collections.map((col) => ({
                        label: col.title,
                        value: col.id,
                        })),
                    ]}
                    onChange={handleChange}
                    value={selectedId}
                    />
                </Box>
            </InlineStack>
        </Box>
    </Box>
  );
}
