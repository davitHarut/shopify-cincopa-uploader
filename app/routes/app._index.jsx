import { useEffect, useState, useRef } from "react";
import { useFetcher, useSearchParams, useLoaderData } from "@remix-run/react";
import {
  Page,
  Layout,
  ButtonGroup,
  Button,
  TextField,
  Card,
  BlockStack,
  Box,
  ChoiceList,
  Banner,
} from "@shopify/polaris";
import { EditIcon, SearchListIcon } from '@shopify/polaris-icons';
import { TitleBar } from "@shopify/app-bridge-react";
import { authenticate } from "../shopify.server";
import { apiAssetSetMeta, apiAssetList, apiGetUploadUrl } from '../constants/apiUrls';
import EmbedCode from '../components/embedCode';
// import CollectionSelect from "../components/collectionSelect";
import SearchAssets from "../components/searchAssets"

import { json } from "@remix-run/node";
import { getCincopaTempToken } from "../utils/cincopa.server";

export const loader = async ({ request }) => {
    try {
        const data = await getCincopaTempToken({ request });
        return json(data);
    } catch (error) {
        return json({ error: error.message }, { status: 500 });
    }
};

export const action = async ({ request }) => {
  const formData = await request.formData();
  // const collection_id = formData.get("collectionId");
  const title = formData.get("title") || "Cincopa asset";
  // const collectionId = formData.get("collectionId");
  const rid = formData.get("rid");
  const asset_type = formData.get("type");
  const productIdParam = formData.get("productId");
  const { admin } = await authenticate.admin(request);
  let product_id;
  let product = null;

  if(!productIdParam){
    const response = await admin.graphql(
      `#graphql
        mutation populateProduct($product: ProductCreateInput!, $media: [CreateMediaInput!]) {
          productCreate(product: $product, media: $media) {
            product {
              id
              title
              handle
              status
              media(first: 10) {
                nodes {
                  alt
                  mediaContentType
                  preview {
                    status
                  }
                }
              }
            }
            userErrors {
              field
              message
            }
          }
        }`,
      {
        variables: {
          "product": {
            "title": title,
            "status": "ACTIVE"
          }
        },
      }
    );

    const responseJson = await response.json();
    const product = responseJson.data.productCreate.product;
    product_id = product.id;
  }else{
    product_id = 'gid://shopify/Product/' + productIdParam;
  }
  console.log(product_id)
  // if (/*collectionId && */product_id) {
  //   const resCollection = await admin.graphql(
  //     `#graphql
  //     mutation AddProductToCollection($id: ID!, $productIds: [ID!]!) {
  //       collectionAddProducts(id: $id, productIds: $productIds) {
  //         collection {
  //           id
  //           title
  //         }
  //         userErrors {
  //           field
  //           message
  //         }
  //       }
  //     }`,
  //     {
  //       variables: {
  //         // id: collection_id,
  //         productIds: [product_id],
  //       },
  //     }
  //   );
  // }  

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

  const dataMetaRelatedProduct = await createMetafieldDefinition({
    name: "Cincopa Assets",
    namespace: "cincopa",
    key: "cincopa_assets_related",
    description: "Link to a Cincopa Assets",
    type: "list.product_reference",
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
            ownerId: product_id,
            type: "single_line_text_field",
            value: rid,
          },
          {
            key: "cincopa_asset_type",
            namespace: "cincopa",
            ownerId: product_id,
            type: "single_line_text_field",
            value: asset_type,
          },
          {
            key: "cincopa_assets_related",
            namespace: "cincopa",
            ownerId: product_id,
            type: "list.product_reference",
            value: JSON.stringify([]),
          },
        ],
      },
    }
  );

  const dataMetaSet = await responseMetaSet.json();
  return {
    product,
    meta: { rid: dataMetaRid, type: dataMetaType, set: dataMetaSet },
    success: true,
    productId: product_id,
  };
};

export default function Index() {
  const loaderData = useLoaderData(); 
  const cincopaTempToken = loaderData.token; 

  const fetcher = useFetcher();
  const uploaderRef = useRef(null);
  const hasInitialized = useRef(false);

  const [searchParams] = useSearchParams();
  const productIdParam = searchParams.get("productId");
  const assetRidParam = searchParams.get("assetRid");

  const [uploadUrl, setUploadUrl] = useState(null);
  const [status, setStatus] = useState(null);

  // Asset States
  const [assetData, setAssetData] = useState({});
  const [assetRid, setAssetRid] = useState('');
  const [assetTitle, setAssetTitle] = useState('');
  const [assetDate, setAssetDate] = useState('');
  const [assetDescription, setAssetDescription] = useState('');
  const [assetNotes, setAssetNotes] = useState('');
  const [selectedType, setSelectedType] = useState(['video']);
  const [relatedLinkText, setRelatedLinkText] = useState('');
  const [relatedLinkUrl, setRelatedLinkUrl] = useState('');
  const [assetReferenceId, setAssetReferenceId] = useState('');
  const [showUploader, setShowUploader] = useState(true);
  // const [collectionId, setCollectionId] = useState("");
  const [openSearchModal, setOpenSearchModal] = useState(false)

// To initiate the call:


  useEffect(() => {
    if (fetcher.data?.success) {
      setStatus(`✅ Product created with ID: ${fetcher.data.productId}`);
    } else if (fetcher.data?.error) {
      setStatus(`❌ ${fetcher.data.error}`);
    }
  }, [fetcher.data]);

  useEffect(() => {
    if(productIdParam){
      setShowUploader(false);
      hasInitialized.current = false;
    }else{
      setShowUploader(true);
    }
  }, [productIdParam])

  // Get Cincopa Upload URL
  useEffect(() => {
    if (!cincopaTempToken) return;
    const fetchUploadUrl = async () => {
      try {     
        const res = await fetch(`${apiGetUploadUrl}?api_token=${cincopaTempToken}`);
        const data = await res.json();
        setUploadUrl(data?.upload_url);
      } catch (error) {
        console.error("Upload URL fetch error", error);
      }
    };
    fetchUploadUrl();
  }, [cincopaTempToken]);

  // Fetch asset data from Cincopa
  useEffect(() => {
    if (!assetRidParam) return;
    fetchAssetData(assetRidParam);
  }, [assetRidParam]);

  // Load uploader script and initialize UI
  useEffect(() => {
    if (!uploadUrl || !uploaderRef.current || hasInitialized.current) return;

    const script = document.createElement("script");
    script.src = "https://wwwcdn.cincopa.com/_cms/ugc/uploaderui.js";
    script.async = true;

    script.onload = () => {
      if (window.cpUploadUI && uploaderRef.current) {
        const uploadUI = new cpUploadUI(uploaderRef.current, {
          upload_url: uploadUrl,
          multiple: false,
          onUploadComplete: handleUploadComplete,
        });
        uploadUI.start();
        hasInitialized.current = true;
      }
    };

    document.body.appendChild(script);
  }, [uploadUrl, showUploader]);
  

  const handleUploadComplete = async (data) => {
    if (data.uploadState === "Complete" && data.rid) {
    const assetType = getMimeCategory(data?.type || data?.file?.type);
    const params = {
      title: assetTitle,
      rid: data.rid,
      type: assetType
    }

    if(productIdParam){
      params.productId = productIdParam;
    }

    // if(collectionId){
    //   params.collectionId = collectionId;
    // }

    fetcher.submit(params, { method: "POST" }
    );

    setSelectedType([assetType]);
    setAssetRid(data.rid);
    setAssetTitle('Example Title');
    setAssetDate(new Date().toISOString());

    await setMeta(data.rid);
    await fetchAssetData(data.rid);

    // if (productIdParam) {
    //   setShowUploader(true);
    // } else {
    //   setShowUploader(false);
    // }
  }
  };

  const fetchAssetData = async (rid) => {
    try {
      const res = await fetch(`${apiAssetList}?api_token=${cincopaTempToken}&rid=${rid}`);
      const { items } = await res.json();
      const asset = items?.[0];
      if (!asset) return;

      setAssetData(asset);
      setAssetRid(asset.rid);
      setAssetTitle(asset.caption || asset.filename);
      setSelectedType([getMimeCategory(asset.type)]);
      setAssetDate(asset.uploaded || '');
      setAssetDescription(asset.description || '');
      setAssetNotes(asset.long_description || '');
      setRelatedLinkText(asset.related_link_text || '');
      setRelatedLinkUrl(asset.related_link_url || '');
      setAssetReferenceId(asset.reference_id || '');
    } catch (error) {
      console.error("Fetch asset error", error);
    }
  };

  const setMeta = async (rid) => {
    try {
      await fetch(`${apiAssetSetMeta}?api_token=${cincopaTempToken}&rid=${rid}&reference_id=shopify`);
    } catch (error) {
      console.error("Set meta error", error);
    }
  };

  const handleAssetClick = async (rid) => {
    if (!cincopaTempToken) return;
    await loadScript("//wwwcdn.cincopa.com/_cms/media-platform/libasync.js");

    const editorConfig = {
      load_modules: [
        { name: 'info', title: 'Asset Info', order: 0 },
        { name: 'thumbnail', title: 'Set Thumbnail', order: 4 },
        { name: 'video-trim', title: 'Trimming', order: 5 },
        { name: 'partitioning-speaker', title: 'Auto Transcribe & CC', feature: 'assets-subtitles', order: 7 },
        { name: 'chapters', feature: 'assets-timeline', order: 8 },
        { name: 'annotations', feature: 'assets-timeline', order: 9 },
        { name: 'call-to-action', feature: 'assets-timeline', order: 10 },
        { name: 'replace-asset', order: 11 },
        { name: 'video-renditions', feature: 'video-renditions', title: 'Renditions', order: 12 },
        { name: 'video-analytics', order: 14 },
        { name: 'downloads-asset', title: 'Attached Files & Links', order: 15 },
        { name: 'lead-generation', title: 'Lead Generation', order: 16 },
      ],
      token: cincopaTempToken,
      rid,
      editorV2: true,
    };

    cincopa?.loadEditor(editorConfig);
  };

  const loadScript = (src) =>
    new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = src;
      script.async = true;
      script.onload = resolve;
      script.onerror = () => reject(new Error(`Script load error: ${src}`));
      document.body.appendChild(script);
    });

  const getMimeCategory = (mimeType) => {
    const [type] = (mimeType || "").toLowerCase().split("/");
    return ["image", "video", "music"].includes(type) ? type : "unknown";
  };

  const handleAssetSelect = (asset) => {

    if(!asset?.selected_asset) return;

    setShowUploader(false);
    setOpenSearchModal(false);
    setAssetRid(asset.selected_asset.rid);
    setAssetTitle(asset.selected_asset.caption || asset.selected_asset.filename);
    setSelectedType([asset.selected_asset.type]);

    const params = {
      rid: asset.selected_asset.rid,
      type: asset.selected_asset.type,
      title: asset.selected_asset.caption || asset.selected_asset.filename,
    };

    if (productIdParam) {
      params.productId = productIdParam;
    }

    // if (collectionId) {
    //   params.collectionId = collectionId;
    // }
    console.log(params, 'params');
    fetcher.submit(params, { method: 'POST' });
  };


  return (
    <Page>
      <TitleBar title="Cincopa Uploader App" />
      <BlockStack gap="500">
        <Layout>
          <Layout.Section>
            <Card title="Upload Media and Create Product" sectioned>
              <div
                // style={{
                //   pointerEvents: collectionId ? "auto" : "none",
                //   opacity: collectionId ? 1 : 0.4,
                // }}
              >
                {productIdParam && (
                  <ButtonGroup>
                    <Button variant="primary" icon={EditIcon} onClick={() => handleAssetClick(assetRidParam)}>Edit Asset</Button>
                      <Button variant="primary" onClick={() => setShowUploader(true)}>
                        Upload New Asset
                      </Button>
                      <Button variant="primary" icon={SearchListIcon} onClick={() => setOpenSearchModal(true)}>Search</Button>
                  </ButtonGroup>
                )}
              </div>
              {/* <Box paddingBlockStart="400">
                <form method="post">
                  <CollectionSelect onSelect={setCollectionId} />
                  <input type="hidden" name="collectionId" value={collectionId} />
                </form>
              </Box> */}
            <div
              // style={{
              //   pointerEvents: collectionId ? "auto" : "none",
              //   opacity: collectionId ? 1 : 0.4,
              // }}
            >
                <BlockStack gap="400">
                  {showUploader && ( <div ref={uploaderRef} />)}
                  {status && <Banner title="Status" status="info">{status}</Banner>}
                  {Object.keys(assetData).length > 0 && (
                    <EmbedCode asset={assetData} />
                  )}

                  <TextField label="Asset RID" value={assetRid} autoComplete="off" />
                  <TextField label="Asset Title" value={assetTitle} onChange={setAssetTitle} autoComplete="off" />
                  <ChoiceList
                    title="Asset Type"
                    choices={[
                      { label: "Video", value: "video" },
                      { label: "Image", value: "image" },
                      { label: "Audio", value: "music" },
                      { label: "Unknown", value: "unknown" },
                    ]}
                    selected={selectedType}
                  />
                  <TextField label="Asset Description" value={assetDescription} multiline={4} autoComplete="off" />
                  <TextField label="Asset Notes" value={assetNotes} multiline={4} autoComplete="off" />
                  <TextField label="Related Link Text" value={relatedLinkText} autoComplete="off" />
                  <TextField label="Related Link URL" value={relatedLinkUrl} autoComplete="off" />
                  <TextField label="Reference ID" value={assetReferenceId} autoComplete="off" />
                  <TextField label="Uploaded" value={assetDate} autoComplete="off" />
                </BlockStack>
              </div>
            </Card>
            <SearchAssets 
              cincopaTempToken={cincopaTempToken} 
              openSearchModal={openSearchModal} 
              onClose={() => setOpenSearchModal(false)}
              onSelect={handleAssetSelect}
            />
          </Layout.Section>
        </Layout>
      </BlockStack>
    </Page>
  );
}
