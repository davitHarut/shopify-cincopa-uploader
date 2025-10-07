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
import SearchAssets from "../components/searchAssets";

import { json } from "@remix-run/node";
import { getCincopaTempToken } from "../utils/cincopa.server";

export const headers = () => ({
  "Content-Security-Policy": `
    frame-ancestors https://admin.shopify.com;
    script-src 'self' https://wwwcdn.cincopa.com;
    connect-src 'self' https://wwwcdn.cincopa.com;
  `,
  "X-Frame-Options": "ALLOWALL",
});


export const loader = async ({ request }) => {
  try {
    const data = await getCincopaTempToken({ request });
    const { admin } = await authenticate.admin(request);

    const createDefinition = async (definition) => {
      const res = await admin.graphql(
        `#graphql
        mutation CreateMetafieldDefinition($definition: MetafieldDefinitionInput!) {
          metafieldDefinitionCreate(definition: $definition) {
            createdDefinition {
              id
              name
            }
            userErrors {
              message
              code
            }
          }
        }`,
        { variables: { definition } }
      );
      return res.json();
    };

    await createDefinition({
      name: "Cincopa Asset RID",
      namespace: "cincopa",
      key: "cincopa_asset_rid",
      description: "Cincopa asset RID reference",
      type: "single_line_text_field",
      ownerType: "PRODUCT",
    });

    await createDefinition({
      name: "Cincopa Asset Type",
      namespace: "cincopa",
      key: "cincopa_asset_type",
      description: "Cincopa asset type (image/video/music)",
      type: "single_line_text_field",
      ownerType: "PRODUCT",
    });

    return json(data, { headers: headers() });
  } catch (error) {
    return json({ error: error.message }, { status: 500, headers: headers() });
  }
};

export const action = async ({ request }) => {
  const formData = await request.formData();
  const rid = formData.get("rid");
  const asset_type = formData.get("type");
  const productIdParam = formData.get("productId");

  if (!productIdParam) {
    return json({ error: "Missing productId" }, { status: 400 });
  }

  const { admin } = await authenticate.admin(request);
  const product_id = `gid://shopify/Product/${productIdParam}`;

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
        ],
      },
    }
  );

  const dataMetaSet = await responseMetaSet.json();
  return json({ success: true, meta: dataMetaSet });
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
  const [openSearchModal, setOpenSearchModal] = useState(false)

  useEffect(() => {
    if (fetcher.data?.success) {
      setStatus(`✅ Product updated!`);
    } else if (fetcher.data?.error) {
      setStatus(`❌ ${fetcher.data.error}`);
    }
  }, [fetcher.data]);

  useEffect(() => {
    if(assetRidParam){
      setShowUploader(false);
      hasInitialized.current = false;
    }else{
      setShowUploader(true);
    }
  }, [assetRidParam]);

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

      // Update component state
      setSelectedType([assetType]);
      setAssetRid(data.rid);
      setAssetTitle('Example Title');
      setAssetDate(new Date().toISOString());

      if (productIdParam) {
        fetcher.submit(
          {
            rid: data.rid,
            type: assetType,
            title: assetTitle,
            productId: productIdParam,
          },
          { method: "POST" }
        );
      }

      await setMeta(data.rid);
      await fetchAssetData(data.rid);
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

    fetcher.submit(params, { method: 'POST' });
  };


  return (
    <Page>
      <TitleBar title="Cincopa Uploader App" />
      <BlockStack gap="500">
        <Layout>
          <Layout.Section>
            {productIdParam && (
              <Card title="Upload Media and Create Product" sectioned>
                {assetRidParam && (
                  <Box paddingBlockEnd="400">
                    <ButtonGroup>
                      <Button variant="primary" icon={EditIcon} onClick={() => handleAssetClick(assetRidParam)}>Edit Asset</Button>
                        <Button variant="primary" onClick={() => setShowUploader(true)}>
                          Upload New Asset
                        </Button>
                        <Button variant="primary" icon={SearchListIcon} onClick={() => setOpenSearchModal(true)}>Search</Button>
                    </ButtonGroup>
                  </Box>
                )}            
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
              </Card>
            )}
            {productIdParam && (
              <SearchAssets 
                cincopaTempToken={cincopaTempToken} 
                openSearchModal={openSearchModal} 
                onClose={() => setOpenSearchModal(false)}
                onSelect={handleAssetSelect}
              />
            )}
            {!productIdParam && (
              <Box>
                <Banner
                  title="Create or Open a Product"
                  status="warning"
                >
                  To use Cincopa assets, you must first <strong>open or create a product</strong> in Shopify. 
                  Once on the product page, you can access this Cincopa uploader to <strong>edit or upload assets</strong>.
                </Banner>
              </Box>
            )}
          </Layout.Section>
        </Layout>
      </BlockStack>
    </Page>
  );
}
