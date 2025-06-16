import { useEffect, useState, useRef } from "react";
import { useFetcher, useSearchParams } from "@remix-run/react";
import { EditIcon, UploadIcon } from '@shopify/polaris-icons';
import {
  Page,
  Layout,
  InlineGrid,
  TextField,
  Card,
  BlockStack,
  Box,
  Button,
  ChoiceList,
  Banner,
} from "@shopify/polaris";
import { TitleBar, useAppBridge } from "@shopify/app-bridge-react";
import { authenticate } from "../shopify.server";
import { apiAssetSetMeta, apiAssetList, apiGetUploadUrl } from '../constants/apiUrls'
import EmbedCode from './embedCode'

export const action = async ({ request }) => {
  const formData = await request.formData();
  const title = formData.get("title") || "Cincopa example product";
  const rid = formData.get("rid");
  const asset_type = formData.get("type");

  const { admin } = await authenticate.admin(request);

  const response = await admin.graphql(
    `#graphql
      mutation populateProduct($product: ProductCreateInput!) {
        productCreate(product: $product) {
          product {
            id
            title
            handle
            status
            variants(first: 10) {
              edges {
                node {
                  id
                  price
                  barcode
                  createdAt
                }
              }
            }
          }
        }
      }`,
    {
      variables: {
        product: {
          title,
        },
      },
    }
  );

  const responseJson = await response.json();
  const product = responseJson.data.productCreate.product;
  const variantId = product.variants.edges[0].node.id;

  const variantResponse = await admin.graphql(
    `#graphql
    mutation shopifyRemixTemplateUpdateVariant($productId: ID!, $variants: [ProductVariantsBulkInput!]!) {
      productVariantsBulkUpdate(productId: $productId, variants: $variants) {
        productVariants {
          id
          price
          barcode
          createdAt
        }
      }
    }`,
    {
      variables: {
        productId: product.id,
        variants: [{ id: variantId, price: "100.00" }],
      },
    }
  );

  const variantResponseJson = await variantResponse.json();

  // Create metafield definitions for rid and type
  const createMetafieldDefinition = async (definition) => {
    const res = await admin.graphql(
      `#graphql
      mutation CreateMetafieldDefinition($definition: MetafieldDefinitionInput!) {
        metafieldDefinitionCreate(definition: $definition) {
          createdDefinition {
            id
            name
          }
          userErrors {
            field
            message
            code
          }
        }
      }`,
      { variables: { definition } }
    );
    return res.json();
  };

  const dataMetaRid = await createMetafieldDefinition({
    name: "Cincopa Asset RID",
    namespace: "cincopa",
    key: "cincopa_asset_rid",
    description: "Asset rid ...",
    type: "single_line_text_field",
    ownerType: "PRODUCT",
  });

  const dataMetaType = await createMetafieldDefinition({
    name: "Cincopa Asset Type",
    namespace: "cincopa",
    key: "cincopa_asset_type",
    description: "Asset type (image/video/music)",
    type: "single_line_text_field",
    ownerType: "PRODUCT",
  });

  const responseMetaSet = await admin.graphql(
    `#graphql
    mutation MetafieldsSet($metafields: [MetafieldsSetInput!]!) {
      metafieldsSet(metafields: $metafields) {
        metafields {
          key
          namespace
          value
          createdAt
          updatedAt
        }
        userErrors {
          field
          message
          code
        }
      }
    }`,
    {
      variables: {
        metafields: [
          {
            key: "cincopa_asset_rid",
            namespace: "cincopa",
            ownerId: product.id,
            type: "single_line_text_field",
            value: rid,
          },
          {
            key: "cincopa_asset_type",
            namespace: "cincopa",
            ownerId: product.id,
            type: "single_line_text_field",
            value: asset_type,
          },
        ],
      },
    }
  );

  const dataMetaSet = await responseMetaSet.json();

  return {
    product: product,
    variant: variantResponseJson.data.productVariantsBulkUpdate.productVariants,
    meta: { rid: dataMetaRid, type: dataMetaType, set: dataMetaSet },
    success: true,
    productId: product.id,
  };
};

export default function Index() {
  const fetcher = useFetcher();
  const shopify = useAppBridge();
  const uploaderRef = useRef(null);
  const hasInitialized = useRef(false);
  const [title, setTitle] = useState("");
  const [uploadUrl, setUploadUrl] = useState(null);
  // const [newUpload, setNewUpload] = useState(false);
  const [assetData, setAssetData] = useState({});
  const [assetRid, setAssetRid] = useState('');
  const [assetTitle, setAssetTitle] = useState('');
  const [selectedType, setSelectedType] = useState(['video']);
  const [assetDate, setAssetDate] = useState('');
  const [assetDescription, setAssetDescription] = useState('');
  const [assetNotes, setAssetNotes] = useState('');
  const [relatedLinkText, setRelatedLinkText] = useState('');
  const [relatedLinkUrl, setRelatedLinkUrl] = useState('');
  const [assetReferenceId, setAssetReferenceId] = useState('');
  const [status, setStatus] = useState(null);
  const [searchParams] = useSearchParams();
  const productIdParam = searchParams.get("productId");
  const assetRidParam = searchParams.get("assetRid");
  const accessToken = '230692iojeswdxdgkmnxklh25rivovgmpc';
  

  useEffect(() => {
    if (fetcher.data?.success) {
      setStatus(`✅ Product created with ID: ${fetcher.data.productId}`);
    } else if (fetcher.data?.error) {
      setStatus(`❌ ${fetcher.data.error}`);
    }
  }, [fetcher.data]);

  useEffect(() => {
    getUploadUrl();
  }, [accessToken]);

  useEffect(() => {
    fetchAssetData(assetRidParam);
    if(!assetRid){
      // setNewUpload(false);
    }
  }, [assetRidParam]);

  useEffect(() => {
    if (!uploadUrl || !uploaderRef.current || hasInitialized.current) return;

    const script = document.createElement("script");
    script.src = "https://wwwcdn.cincopa.com/_cms/ugc/uploaderui.js";
    script.async = true;
    document.body.appendChild(script);

    script.onload = () => {
      if (window.cpUploadUI && uploaderRef.current && !hasInitialized.current) {
        const uploadUI = new cpUploadUI(uploaderRef.current, {
          upload_url: uploadUrl,
          multiple: false,
          width: "auto",
          height: "auto",
          onUploadComplete: function (data) {
            if (data.uploadState === "Complete" && data.rid) {
              let assetType = getMimeCategory(data?.type || data?.file?.type);
              setSelectedType(assetType);
              fetcher.submit(
                {
                  title,
                  rid: data.rid,
                  type: assetType,
                },
                { method: "POST" }
              );
              setMeta(data.rid);
              setAssetRid(data.rid);
              setAssetTitle('Example Title');
              setAssetDate(new Date().toISOString());
            }
          },
        });

        uploadUI.start();
        hasInitialized.current = true;
      }
    };
  }, [uploadUrl, title]);

  const getUploadUrl = async() => {
    try {
        const response = await fetch(`${apiGetUploadUrl}?api_token=${accessToken}`);
        if (!response.ok) throw new Error('Failed to fetch data');
        const result = await response.json();
        setUploadUrl(result?.upload_url);
    } catch (err) {
        console.error('Error: Get Upload Url', err);
    }
  }

  const getMimeCategory = (mimeType) => {
    if (typeof mimeType !== "string") return "unknown";
    const [type] = mimeType.toLowerCase().split("/");
    switch (type) {
      case "image":
      case "video":
      case "music":
        return type;
      default:
        return "unknown";
    }
  };

  const setMeta = async(rid) =>{
    try {
      const response = await fetch(`${apiAssetSetMeta}?api_token=${accessToken}&rid=${rid}&reference_id=shopify`);
      if (!response.ok) {
        throw new Error('Failed to fetch data');
      }

      const result = await response.json();
      console.log(result, 'rrrrr');
    } catch (err) {
      console.log(err, 'Error: Asset Set Meta Data');
    }
  };

  const fetchAssetData = async (rid) => {
    try {
        const response = await fetch(`${apiAssetList}?api_token=${accessToken}&rid=${rid}`);

        if (!response.ok) {
            throw new Error('Failed to fetch data');
        }

        const result = await response.json();
        const asset = result?.items?.[0];
        if (!asset) return;
        setAssetData(asset);

        setAssetRid(asset.rid || '');
        setAssetTitle(asset.caption || asset.filename);
        setSelectedType([getMimeCategory(asset.type)]);
        setAssetDate(asset.uploaded || '');
        setAssetDescription(asset.description || '');
        setAssetNotes(asset.long_description || '');
        setRelatedLinkText(asset.related_link_text || '');
        setRelatedLinkUrl(asset.related_link_url || '');
        setAssetReferenceId(asset.reference_id || '');

    } catch (err) {
      console.error('Error: Fetch Asset Data', err);
    }
  };

  const handleAssetClick = (rid) => {
    if(!accessToken) return;

    const loadScripts = async () => {
      try {
        await loadScript("//wwwcdn.cincopa.com/_cms/media-platform/libasync.js");

      } catch (error) {
          console.error("Error loading scripts:", error);
      }
    };

    loadScripts();

    let editor = {
        load_modules: [
            {
              name: 'info',
              title: 'Asset Info',
              order: 0
            },
            {
              name: 'thumbnail',
              title: 'Set Thumbnail',
              order: 4
            },
            {
              name: 'video-trim',
              title: 'Trimming',
              order: 5
            },
            {
              name: 'partitioning-speaker',
              title: 'Auto Transcribe & CC',
              feature: 'assets-subtitles',
              order: 7
            },
            {
              name: 'chapters',
              feature: 'assets-timeline',
              order: 8
            },
            {
              name: 'annotations',
              feature: 'assets-timeline',
              order: 9
            },
            {
              name: 'call-to-action',
              feature: 'assets-timeline',
              order: 10
            },
            {
              name: 'replace-asset',
              order: 11
            },
            {
              name: 'video-renditions',
              feature: 'video-renditions',
              title: 'Renditions',
              order: 12
            },
            {
              name: "video-analytics",
              order: 14
            },
            {
              name: 'downloads-asset',
              title: 'Attached Files & Links',
              order: 15
            },
            {
              title: 'Lead Generation',
              name: "lead-generation",
              order: 16
            },
          ],
    token: accessToken,
    rid,
    editorV2: true,
    }

    cincopa?.loadEditor(editor);
  };

  const loadScript = (src) => {
    return new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = src;
      script.async = true;
      script.onload = () => resolve();
      script.onerror = (err) => reject(new Error(`Script load error: ${src}`));
      document.body.appendChild(script);
    });
  };

  // const uploadNew = () => {
  //   setNewUpload(false);
  // };

  const saveAsset = () => {

  };

  return (
    <Page>
      <TitleBar title="Cincopa Uploader App" />
      <BlockStack gap="500">
        <Layout>
          <Layout.Section>
            <Card title="Upload Media and Create Product" sectioned>
              <BlockStack gap="400">
                {productIdParam && 
                  <InlineGrid gap="400" columns={5}>
                    <Button variant="primary" icon={EditIcon} onClick={() => handleAssetClick(assetRidParam)}>Edit Asset</Button>
                    {/* <Button variant="primary" icon={UploadIcon} onClick={() => uploadNew()}>Upload</Button> */}
                    <Button variant="primary" onClick={() => saveAsset()}>Save</Button>
                  </InlineGrid>
                }   
                <Box>
                  {!productIdParam && (
                    <div ref={uploaderRef} />
                  )}
                </Box>
                {status && (
                  <Banner title="Status" status="info">
                    {status}
                  </Banner>
                )}
                {Object.keys(assetData).length && (
                  <EmbedCode
                        asset={assetData}
                    />
                )}             
                <TextField
                  label="Asset RID"
                  value={assetRid}
                  autoComplete="off"
                />
                <TextField
                  label="Asset Title"
                  value={assetTitle}
                  onChange={setTitle}
                  autoComplete="off"
                />
                <ChoiceList
                  title="Asset Type"
                  choices={[
                    {label: 'Video', value: 'video'},
                    {label: 'Image', value: 'image'},
                    {label: 'Audio', value: 'music'},
                    {label: 'Unknown', value: 'unknown'},
                  ]}
                  selected={selectedType}
                />
                <TextField
                  label="Asset Description"
                  value={assetDescription}
                  autoComplete="off"
                  multiline={4}
                />
                <TextField
                  label="Asset Notes"
                  value={assetNotes}
                  autoComplete="off"
                  multiline={4}
                />
                <TextField
                  label="Asset Related Link Text"
                  value={relatedLinkText}
                  autoComplete="off"
                />
                <TextField
                  label="Asset Related Link Url"
                  value={relatedLinkUrl}
                  autoComplete="off"
                />
                <TextField
                  label="Asset Reference ID"
                  value={assetReferenceId}
                  autoComplete="off"
                />
                <TextField
                  label="Asset Uploaded"
                  autoComplete="off"
                  value={assetDate}
                />
              </BlockStack>
            </Card>
          </Layout.Section>
        </Layout>
      </BlockStack>
    </Page>
  );
}
